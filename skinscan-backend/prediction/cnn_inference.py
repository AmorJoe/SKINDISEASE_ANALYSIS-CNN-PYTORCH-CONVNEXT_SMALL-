"""
CNN Inference - EfficientNet-B0 (PyTorch)
"""
import os
import logging
import time
import random
import io
from dataclasses import dataclass
from typing import Dict, List, Optional, Union

import torch
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
from django.conf import settings

from .exceptions import ModelUnavailableError

logger = logging.getLogger(__name__)

# Medical safety thresholds
INCONCLUSIVE_THRESHOLD: float = 60.0
MODERATE_CONFIDENCE_THRESHOLD: float = 60.0
HIGH_CONFIDENCE_THRESHOLD: float = 80.0

@dataclass
class PredictionOutput:
    disease_name: str
    confidence: float
    all_probabilities: Dict[str, float]
    recommendation: str
    processing_time: float
    is_inconclusive: bool

class CNNPredictor:
    """
    CNN model wrapper using EfficientNet-B0.
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.simulation_mode = False
        
        # Hardcoded for now, should match training
        self.disease_classes = settings.DISEASE_CLASSES
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        self._load_model()

    def _load_model(self):
        try:
            model_path = getattr(settings, 'MODEL_PATH', None)
            if not model_path or not os.path.exists(model_path):
                logger.warning(f"Model file not found at {model_path}. Switching to Simulation Mode.")
                self.simulation_mode = True
                return

            logger.info(f"Loading model from {model_path}...")
            # Load Architecture
            self.model = models.efficientnet_b0(weights=None)
            
            # Adjust Classifier
            num_ftrs = self.model.classifier[1].in_features
            self.model.classifier[1] = torch.nn.Linear(num_ftrs, len(self.disease_classes))
            
            # Load Weights
            checkpoint = torch.load(model_path, map_location=self.device)
            if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                 self.model.load_state_dict(checkpoint['state_dict'])
            elif isinstance(checkpoint, dict):
                 self.model.load_state_dict(checkpoint)
            else:
                 self.model = checkpoint

            self.model.to(self.device)
            self.model.eval()
            logger.info("Model loaded successfully.")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}. Defaulting to simulation.")
            self.simulation_mode = True

    def predict(self, image_input: Union[bytes, Image.Image]) -> PredictionOutput:
        start_time = time.time()
        
        if self.simulation_mode:
            return self._predict_mock()

        try:
            # Preprocess
            img = self._prepare_image(image_input)
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)

            # Inference
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = F.softmax(outputs, dim=1)
                
                confidence, predicted_idx = torch.max(probabilities, 1)
                idx = predicted_idx.item()
                
                predicted_class = self.disease_classes[idx]
                confidence_score = float(confidence.item()) * 100
                
                all_probs = {
                    self.disease_classes[i]: float(probabilities[0][i].item()) * 100
                    for i in range(len(self.disease_classes))
                }

            is_inconclusive = confidence_score < INCONCLUSIVE_THRESHOLD
            
            return PredictionOutput(
                disease_name=predicted_class,
                confidence=round(confidence_score, 2),
                all_probabilities=all_probs,
                recommendation=self._get_recommendation(predicted_class, confidence_score),
                processing_time=time.time() - start_time,
                is_inconclusive=is_inconclusive
            )

        except Exception as e:
            logger.error(f"Prediction Error: {e}")
            # Fallback to mock if runtime error
            return self._predict_mock()

    def predict_multi(self, images: List[any]) -> PredictionOutput:
        # Simple ensemble: predict first image for now
        return self.predict(images[0])

    def _prepare_image(self, image_input):
        if isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input)).convert('RGB')
        elif isinstance(image_input, Image.Image):
            return image_input.convert('RGB')
        return image_input

    def _get_recommendation(self, disease_name: str, confidence: float) -> str:
        # ... Reuse existing logic ...
        base_rec = f"Consult a dermatologist regarding {disease_name}."
        if confidence < MODERATE_CONFIDENCE_THRESHOLD:
             return "Results inconclusive. Please consult a doctor."
        return base_rec

    def _predict_mock(self) -> PredictionOutput:
        # Fallback simulation
        disease = random.choice(self.disease_classes)
        confidence = random.uniform(70.0, 95.0)
        return PredictionOutput(
            disease_name=disease + " (Simulated)",
            confidence=round(confidence, 2),
            all_probabilities={},
            recommendation="Simulation Mode: Model not loaded.",
            processing_time=0.1,
            is_inconclusive=False
        )

# Singleton
_predictor: Optional[CNNPredictor] = None

def get_predictor() -> CNNPredictor:
    global _predictor
    if _predictor is None:
        _predictor = CNNPredictor()
    return _predictor
