import os
import uuid
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import scipy.ndimage as ndimage
import torch
import torch.nn.functional as F
from PIL import Image
from diffusers import AutoencoderKL, DDPMScheduler, UNet2DConditionModel
from torchvision import transforms


class CatVTONService:
    """
    Wraps the CatVTON inference logic so it can be reused from FastAPI.
    Expects Stable Diffusion inpainting weights plus a fine-tuned
    `trainable_weights.pt` file inside the checkpoint directory.
    """

    def __init__(
        self,
        checkpoint_dir: Optional[Path] = None,
        base_model: Optional[str] = None,
        output_dir: Optional[Path] = None,
        image_size: Tuple[int, int] = (512, 384),
    ) -> None:
        backend_dir = Path(__file__).resolve().parent
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.image_size = image_size  # (H, W)
        self.pil_resize = (image_size[1], image_size[0])  # (W, H) for PIL.resize

        self.checkpoint_dir = checkpoint_dir or backend_dir / "checkpoints" / "catvton"
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = output_dir or backend_dir / "static" / "tryon"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.base_model = base_model or os.getenv(
            "CATVTON_BASE_MODEL", "stable-diffusion-v1-5/stable-diffusion-inpainting"
        )

        weights_path = self.checkpoint_dir / "trainable_weights.pt"
        if not weights_path.exists():
            raise FileNotFoundError(
                f"CatVTON weights not found at {weights_path}. "
                "Place trainable_weights.pt in checkpoints/catvton/."
            )

        # Load base diffusion backbone
        self.vae = AutoencoderKL.from_pretrained(
            self.base_model, subfolder="vae", torch_dtype=torch.float32
        ).to(self.device)
        self.unet = UNet2DConditionModel.from_pretrained(
            self.base_model, subfolder="unet", torch_dtype=torch.float32
        ).to(self.device)
        self.noise_scheduler = DDPMScheduler.from_pretrained(
            self.base_model, subfolder="scheduler"
        )

        # Load fine-tuned attention weights
        checkpoint = torch.load(weights_path, map_location="cpu", weights_only=False)
        trainable_state = checkpoint.get("trainable_state_dict", checkpoint)
        current_state = self.unet.state_dict()
        loaded = 0
        for name, param in trainable_state.items():
            if name in current_state:
                current_state[name].copy_(param)
                loaded += 1
        print(f"Loaded {loaded} CatVTON parameters from {weights_path.name}")

        self.vae.eval()
        self.unet.eval()
        self.noise_scheduler.set_timesteps(50, device=self.device)
        # Dummy unconditional embeddings (CatVTON sets conditioning to zeros)
        self.uncond_embeddings = torch.zeros(
            (1, 77, 768), device=self.device, dtype=torch.float32
        )

        self.normalize_transform = transforms.Compose(
            [
                transforms.ToTensor(),
                transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
            ]
        )

    # ------------------------------------------------------------------
    # Image preparation helpers
    # ------------------------------------------------------------------
    def _create_agnostic_with_mask(
        self, person_img: Image.Image, parse_map: Image.Image
    ) -> Tuple[Image.Image, Image.Image]:
        """
        Enhanced agnostic function for UNPAIRED EVALUATION with new 24-class Segformer labels.
        - Includes dilation for better boundary coverage
        - Reduces artifacts around shoulders, neck, and sleeves
        
        Mask labels for 24-class Segformer model:
        - 5: upper_only_torso_region
        - 6: dresses_only_torso_region
        - 7: coat_only_torso_region
        - 11: skin_around_neck_region
        - 15: left_arm
        - 16: right_arm
        - 21: left_sleeve_for_upper
        - 22: right_sleeve_for_upper
        """
        person_array = np.array(person_img)
        h, w = person_array.shape[:2]
        
        # Resize parse map to match the person image
        parse_array = np.array(parse_map.resize((w, h), Image.NEAREST))
        
        # Define labels to mask (updated for 24-class Segformer model)
        mask_labels = [5, 6, 7, 11, 15, 16, 21, 22]
        
        # Create initial raw binary mask
        binary_mask = np.isin(parse_array, mask_labels)
        
        # Fill holes in upper body mask
        filled_binary_mask = ndimage.binary_fill_holes(binary_mask)
        mask = filled_binary_mask.astype(np.uint8) * 255
        
        # Mask dilation (padding) - helps remove holes and cover boundary gaps
        kernel = np.ones((5, 5), np.uint8)  # 5×5 kernel = +2–3 px effective padding
        mask = cv2.dilate(mask, kernel, iterations=2)  # Light dilation
        
        # Create agnostic person
        agnostic_array = person_array.copy()
        agnostic_array[mask > 0] = 0  # Masked area becomes black
        
        agnostic_img = Image.fromarray(agnostic_array)
        mask_img = Image.fromarray(mask)
        
        return agnostic_img, mask_img

    def _preprocess_images(
        self, person_path: Path, garment_path: Path, parsing_path: Path
    ):
        person_img = Image.open(person_path).convert("RGB")
        cloth_img = Image.open(garment_path).convert("RGB")
        parse_img = Image.open(parsing_path)

        agnostic_img, mask_img = self._create_agnostic_with_mask(person_img, parse_img)

        agnostic_img = agnostic_img.resize(self.pil_resize, Image.BILINEAR)
        cloth_img = cloth_img.resize(self.pil_resize, Image.BILINEAR)
        mask_img = mask_img.resize(self.pil_resize, Image.NEAREST)

        cloth = self.normalize_transform(cloth_img).unsqueeze(0)
        agnostic = self.normalize_transform(agnostic_img).unsqueeze(0)
        mask = transforms.ToTensor()(mask_img).unsqueeze(0)

        return cloth.to(self.device), agnostic.to(self.device), mask.to(self.device)

    # ------------------------------------------------------------------
    # Diffusion inference
    # ------------------------------------------------------------------
    def _get_conditioning(self, batch_size: int) -> torch.Tensor:
        return self.uncond_embeddings.repeat(batch_size, 1, 1)

    def _inference_with_cfg(
        self,
        latents: torch.Tensor,
        mask_latent: torch.Tensor,
        cfg_scale: float = 2.0,
        steps: int = 50,
    ) -> torch.Tensor:
        batch = latents.shape[0]
        noise_latents = torch.randn_like(latents, device=self.device)
        self.noise_scheduler.set_timesteps(steps, device=self.device)
        cond_embeddings = self._get_conditioning(batch)

        garment_width = latents.shape[3] // 2
        uncond_latents = latents.clone()
        uncond_latents[:, :, :, garment_width:] = torch.randn_like(
            uncond_latents[:, :, :, garment_width:], device=self.device
        )
        uncond_mask_latent = torch.zeros_like(mask_latent, device=self.device)

        for t in self.noise_scheduler.timesteps:
            latent_model_input = torch.cat([noise_latents, noise_latents], dim=0)

            cond_input = torch.cat([noise_latents, mask_latent, latents], dim=1)
            uncond_input = torch.cat([noise_latents, uncond_mask_latent, uncond_latents], dim=1)
            model_input = torch.cat([cond_input, uncond_input], dim=0)

            embeddings = torch.cat([cond_embeddings, cond_embeddings], dim=0)
            t_input = torch.cat([t.repeat(batch), t.repeat(batch)])

            noise_pred = self.unet(
                model_input,
                t_input,
                encoder_hidden_states=embeddings,
            ).sample

            noise_pred_cond, noise_pred_uncond = noise_pred.chunk(2, dim=0)
            noise_pred = noise_pred_uncond + cfg_scale * (
                noise_pred_cond - noise_pred_uncond
            )
            noise_latents = self.noise_scheduler.step(
                noise_pred, t, noise_latents
            ).prev_sample

        return noise_latents

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate_tryon(
        self,
        person_path: Path,
        garment_path: Path,
        parsing_path: Path,
        cfg_scale: float = 2.0,
        steps: int = 50,
    ) -> Path:
        cloth, agnostic, mask = self._preprocess_images(
            person_path, garment_path, parsing_path
        )

        combined_input = torch.cat([agnostic, cloth], dim=3)
        zero_mask = torch.zeros_like(mask)
        combined_mask = torch.cat([mask, zero_mask], dim=3)

        with torch.no_grad():
            combined_fp32 = combined_input.to(torch.float32)
            latents = self.vae.encode(combined_fp32).latent_dist.sample()
            latents = latents * self.vae.config.scaling_factor
            latents = latents.float()

            mask_latent = F.interpolate(
                combined_mask, size=latents.shape[2:], mode="nearest"
            )

            denoised_latents = self._inference_with_cfg(
                latents, mask_latent, cfg_scale=cfg_scale, steps=steps
            )

            latents_fp32 = denoised_latents.float() / self.vae.config.scaling_factor
            decoded = self.vae.decode(latents_fp32).sample
            w = decoded.shape[3]
            result = decoded[:, :, :, : w // 2]
            result = torch.clamp((result + 1) / 2.0, 0, 1)
            tryon_np = (
                result[0].permute(1, 2, 0).detach().cpu().numpy() * 255
            ).astype(np.uint8)

        output_path = self.output_dir / f"{uuid.uuid4().hex}_tryon.png"
        Image.fromarray(tryon_np).save(output_path)
        return output_path


# Singleton instance used by FastAPI
tryon_service = CatVTONService()

