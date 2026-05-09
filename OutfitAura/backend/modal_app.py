import io
import os
from pathlib import Path
import modal
from PIL import Image

# 1. Define the Modal App and Environment
app = modal.App("outfitaura-backend")

# Define the container image with all necessary dependencies
outfitaura_image = (
    modal.Image.debian_slim(python_version="3.13")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")  # Required for OpenCV
    .pip_install(
        "torch",
        "torchvision",
        "diffusers",
        "transformers",
        "accelerate",
        "scipy",
        "numpy",
        "pillow",
        "opencv-python",
        "huggingface_hub"
    )
    .add_local_dir(Path(__file__).parent / "checkpoints", remote_path="/root/checkpoints")
    .add_local_dir(Path(__file__).parent / "parsing_model", remote_path="/root/parsing_model")
)

# 2. Model Logic Wrapper
@app.cls(
    gpu="A10G",
    image=outfitaura_image,
    timeout=600,
    scaledown_window=300
)
class OutfitAuraModel:
    @modal.enter()
    def load_models(self):
        import torch
        from diffusers import AutoencoderKL, UNet2DConditionModel, DDPMScheduler
        from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading models on {self.device}...")

        # --- Load Segformer (Parsing) from local mount ---
        parsing_path = "/root/parsing_model/segformer-b2-human-parse-24"
        print(f"Loading parsing model from {parsing_path}")
        self.parsing_processor = SegformerImageProcessor.from_pretrained(parsing_path, local_files_only=True)
        self.parsing_model = SegformerForSemanticSegmentation.from_pretrained(parsing_path, local_files_only=True).to(self.device)
        self.parsing_model.eval()

        # --- Load CatVTON (Try-on) ---
        base_model = "stable-diffusion-v1-5/stable-diffusion-inpainting"
        self.vae = AutoencoderKL.from_pretrained(base_model, subfolder="vae").to(self.device)
        self.unet = UNet2DConditionModel.from_pretrained(base_model, subfolder="unet").to(self.device)
        self.noise_scheduler = DDPMScheduler.from_pretrained(base_model, subfolder="scheduler")
        
        # Load CatVTON specific weights from local mount
        weights_path = "/root/checkpoints/catvton/trainable_weights.pt"
        print(f"Loading CatVTON weights from {weights_path}")
        try:
            # Add weights_only=False to handle numpy scalars in older checkpoints
            checkpoint = torch.load(weights_path, map_location="cpu", weights_only=False)
            trainable_state = checkpoint.get("trainable_state_dict", checkpoint)
            current_state = self.unet.state_dict()
            for name, param in trainable_state.items():
                if name in current_state:
                    current_state[name].copy_(param)
            print("CatVTON weights loaded successfully.")
        except Exception as e:
            print(f"Error: Could not load CatVTON weights from {weights_path}: {e}")
        
        self.vae.eval()
        self.unet.eval()
        self.noise_scheduler.set_timesteps(50, device=self.device)
        
        # Pre-calculate unconditional embeddings
        self.uncond_embeddings = torch.zeros((1, 77, 768), device=self.device)

    def _generate_parsing(self, person_img: Image.Image):
        import torch
        import numpy as np
        inputs = self.parsing_processor(images=person_img, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.parsing_model(**inputs)
            logits = outputs.logits
            upsampled_logits = torch.nn.functional.interpolate(
                logits, size=person_img.size[::-1], mode="bilinear", align_corners=False
            )
            parsing = upsampled_logits.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
        return Image.fromarray(parsing, mode="P")

    @modal.method()
    def generate(self, person_bytes: bytes, garment_bytes: bytes):
        import torch
        import numpy as np
        from torchvision import transforms
        import torch.nn.functional as F
        import scipy.ndimage as ndimage
        import cv2

        # 1. Load Images
        person_img = Image.open(io.BytesIO(person_bytes)).convert("RGB")
        garment_img = Image.open(io.BytesIO(garment_bytes)).convert("RGB")
        
        # 2. Generate Parsing
        parse_map = self._generate_parsing(person_img)
        
        # 3. Create Agnostic Mask
        person_array = np.array(person_img)
        h, w = person_array.shape[:2]
        parse_array = np.array(parse_map.resize((w, h), Image.NEAREST))
        
        mask_labels = [5, 6, 7, 11, 15, 16, 21, 22] 
        binary_mask = np.isin(parse_array, mask_labels)
        filled_binary_mask = ndimage.binary_fill_holes(binary_mask)
        mask = filled_binary_mask.astype(np.uint8) * 255
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.dilate(mask, kernel, iterations=2)
        
        agnostic_array = person_array.copy()
        agnostic_array[mask > 0] = 0
        agnostic_img = Image.fromarray(agnostic_array)
        mask_img = Image.fromarray(mask)

        # 4. Preprocess for Diffusion
        target_size = (512, 384)
        pil_resize = (target_size[1], target_size[0])
        
        norm = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])
        
        cloth_t = norm(garment_img.resize(pil_resize, Image.BILINEAR)).unsqueeze(0).to(self.device)
        agnostic_t = norm(agnostic_img.resize(pil_resize, Image.BILINEAR)).unsqueeze(0).to(self.device)
        mask_t = transforms.ToTensor()(mask_img.resize(pil_resize, Image.NEAREST)).unsqueeze(0).to(self.device)

        # 5. Diffusion Inference
        with torch.no_grad():
            combined_input = torch.cat([agnostic_t, cloth_t], dim=3)
            zero_mask = torch.zeros_like(mask_t)
            combined_mask = torch.cat([mask_t, zero_mask], dim=3)

            latents = self.vae.encode(combined_input).latent_dist.sample()
            latents = latents * self.vae.config.scaling_factor
            
            mask_latent = F.interpolate(combined_mask, size=latents.shape[2:], mode="nearest")
            
            # Simplified Loop for cfg/sampling
            noise_latents = torch.randn_like(latents)
            self.noise_scheduler.set_timesteps(50)
            
            # Build Unconditional Latents
            garment_width = latents.shape[3] // 2
            uncond_latents = latents.clone()
            uncond_latents[:, :, :, garment_width:] = torch.randn_like(uncond_latents[:, :, :, garment_width:])
            uncond_mask_latent = torch.zeros_like(mask_latent)

            for t in self.noise_scheduler.timesteps:
                # Cond
                cond_input = torch.cat([noise_latents, mask_latent, latents], dim=1)
                noise_pred_cond = self.unet(cond_input, t, encoder_hidden_states=self.uncond_embeddings).sample
                
                # Uncond
                uncond_input = torch.cat([noise_latents, uncond_mask_latent, uncond_latents], dim=1)
                noise_pred_uncond = self.unet(uncond_input, t, encoder_hidden_states=self.uncond_embeddings).sample
                
                # CFG
                noise_pred = noise_pred_uncond + 2.0 * (noise_pred_cond - noise_pred_uncond)
                noise_latents = self.noise_scheduler.step(noise_pred, t, noise_latents).prev_sample

            latents = noise_latents / self.vae.config.scaling_factor
            decoded = self.vae.decode(latents).sample
            result = decoded[:, :, :, :decoded.shape[3]//2]
            result = torch.clamp((result + 1) / 2.0, 0, 1)
            
            output_np = (result[0].permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
            output_img = Image.fromarray(output_np)
            
        img_byte_arr = io.BytesIO()
        output_img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

@app.local_entrypoint()
def main():
    print("Modal app ready for deployment. Run 'modal deploy modal_app.py' to launch.")
