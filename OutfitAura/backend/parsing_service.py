import os
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from PIL import Image
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

custom_model_path = os.getenv("PARSING_MODEL_PATH")


candidate_paths = []
if custom_model_path:
    candidate_paths.append(Path(custom_model_path))

candidate_paths.extend(
    [
        BACKEND_DIR / "parsing_model" / "segformer-b2-human-parse-24",
        PROJECT_ROOT / "parsing_model" / "segformer-b2-human-parse-24",
    ]
)

PARSING_MODEL_PATH = next((path for path in candidate_paths if path.exists() and path.is_dir()), None)

if not PARSING_MODEL_PATH:
   
    PARSING_MODEL_PATH = "segformer-b2-human-parse-24"
    print(f" Local model not found, will use HuggingFace: {PARSING_MODEL_PATH}")


class ParsingService:
    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        output_dir: Optional[Path] = None,
    ) -> None:
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        
        # Use provided path or default
        model_path = model_path or (str(PARSING_MODEL_PATH) if isinstance(PARSING_MODEL_PATH, Path) else PARSING_MODEL_PATH)
        
        self.output_dir = output_dir or (BACKEND_DIR / "static" / "parsing")
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.num_classes = 24  # Segformer model has 24 classes
        self.palette = self._build_palette(self.num_classes)

        print(f"Loading Segformer model from: {model_path}")
        # Load processor and model
        self.processor = SegformerImageProcessor.from_pretrained(model_path)
        self.model = SegformerForSemanticSegmentation.from_pretrained(model_path)
        self.model.to(self.device)
        self.model.eval()
        print(f"Segformer model loaded successfully on {self.device}")

    def _build_palette(self, num_cls: int) -> list[int]:
        """Build color palette for segmentation visualization."""
        palette = [0] * (num_cls * 3)
        for j in range(num_cls):
            lab = j
            i = 0
            while lab:
                palette[j * 3 + 0] |= (((lab >> 0) & 1) << (7 - i))
                palette[j * 3 + 1] |= (((lab >> 1) & 1) << (7 - i))
                palette[j * 3 + 2] |= (((lab >> 2) & 1) << (7 - i))
                i += 1
                lab >>= 3
        return palette

    def generate_parsing(self, image_path: Path) -> Path:
        """
        Generate human parsing segmentation mask using Segformer model.
        
        Args:
            image_path: Path to input person image
            
        Returns:
            Path to saved parsing mask image in static/parsing directory
        """
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        # Load and convert image
        image = Image.open(image_path).convert("RGB")
        orig_w, orig_h = image.size

        # Prepare input
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits

            # Upsample logits to original image size
            upsampled_logits = torch.nn.functional.interpolate(
                logits,
                size=(orig_h, orig_w),  # (height, width)
                mode="bilinear",
                align_corners=False
            )

            # Get prediction map (values 0-23)
            parsing = upsampled_logits.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)

        # Save parsing mask with palette
        output_path = self.output_dir / f"{uuid.uuid4().hex}_parsing.png"
        parsing_img = Image.fromarray(parsing, mode="P")
        parsing_img.putpalette(self.palette)
        parsing_img.save(output_path)

        print(f"Parsing mask saved to: {output_path}")
        return output_path


# Create a singleton instance that can be reused across FastAPI requests
parsing_service = ParsingService()
