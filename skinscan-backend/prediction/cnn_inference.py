"""
CNN Inference - ConvNeXt Small (PyTorch)
"""
import os
import logging
import time

import io
from dataclasses import dataclass
from typing import Dict, List, Optional, Union

import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from torchvision import transforms
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

# --- Model Architecture from Notebook ---

class GeM(nn.Module):
    """Generalized Mean Pooling."""
    def __init__(self, p=3, eps=1e-6):
        super().__init__()
        self.p = nn.Parameter(torch.ones(1) * p)
        self.eps = eps
    
    def forward(self, x):
        return F.avg_pool2d(
            x.clamp(min=self.eps).pow(self.p),
            (x.size(-2), x.size(-1))
        ).pow(1. / self.p)

class ImageClassifier(nn.Module):
    """CNN Model for Skin Disease Classification."""
    def __init__(self, backbone='convnext_small.fb_in22k_ft_in1k', num_classes=10, 
                 drop_path_rate=0.3, dropout=0.4, use_gem=True, gem_p=3.0):
        super().__init__()
        
        self.backbone = timm.create_model(
            backbone,
            pretrained=False, # We load weights later
            num_classes=0,
            drop_path_rate=drop_path_rate,
            global_pool=''
        )
        
        # Determine features dim
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy_input)
            num_features = features.shape[1]
        
        if use_gem:
            self.global_pool = GeM(p=gem_p)
        else:
            self.global_pool = nn.AdaptiveAvgPool2d(1)
        
        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(num_features, num_classes)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        pooled = self.global_pool(features)
        pooled = pooled.view(pooled.size(0), -1)
        output = self.head(pooled)
        return output

# ----------------------------------------

class CNNPredictor:
    """
    CNN model wrapper using ConvNeXt Small.
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.model_load_error = None
        
        # Hardcoded for now, should match training
        self.disease_classes = settings.DISEASE_CLASSES
        self.model_version = "2.0.0" # ConvNeXt
        
        # Notebook uses 256x256
        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        self._load_model()

    def _load_model(self, model_path=None):
        import traceback as tb
        
        # Numpy compatibility shim: checkpoints saved with numpy 2.x reference
        # numpy._core, but numpy 1.x uses numpy.core. Redirect for compatibility.
        import numpy as np
        if not hasattr(np, '_core'):
            import sys as _sys
            import numpy.core
            import numpy.core.multiarray
            _sys.modules['numpy._core'] = numpy.core
            _sys.modules['numpy._core.multiarray'] = numpy.core.multiarray
        
        try:
            if not model_path:
                model_path = getattr(settings, 'MODEL_PATH', None)
            
            if not model_path or not os.path.exists(str(model_path)):
                err_msg = f"Model file not found at {model_path}"
                logger.error(f"[MODEL LOAD] {err_msg}")
                print(f"[CNN] ERROR: {err_msg}")
                self.model_load_error = err_msg
                return

            # Inject Config class into __main__ so torch.load can unpickle it.
            # The training notebook saved Config as __main__.Config in the checkpoint.
            import sys
            import types
            
            main_module = sys.modules.get('__main__')
            
            # Create a dummy Config class that accepts any attributes
            class Config:
                def __init__(self, **kwargs):
                    for k, v in kwargs.items():
                        setattr(self, k, v)
            
            # If __main__ is a built-in or doesn't support setattr, replace it
            try:
                if main_module is None or not hasattr(main_module, '__dict__'):
                    main_module = types.ModuleType('__main__')
                    sys.modules['__main__'] = main_module
                main_module.Config = Config
            except (TypeError, AttributeError):
                # __main__ might be a frozen/built-in module, create a new one
                main_module = types.ModuleType('__main__')
                main_module.Config = Config
                sys.modules['__main__'] = main_module

            logger.info(f"[MODEL LOAD] Loading model from {model_path}...")
            print(f"[CNN] Loading model from {model_path}...")
            
            # Load Checkpoint
            # weights_only=False is required for pickle-serialized objects like Config
            try:
                checkpoint = torch.load(str(model_path), map_location=self.device, weights_only=False)
            except TypeError:
                checkpoint = torch.load(str(model_path), map_location=self.device)
            
            logger.info(f"[MODEL LOAD] Checkpoint loaded, type={type(checkpoint).__name__}")
            print(f"[CNN] Checkpoint loaded OK")
            
            # Initialize Model Architecture
            self.model = ImageClassifier(
                backbone='convnext_small.fb_in22k_ft_in1k',
                num_classes=len(self.disease_classes),
                use_gem=True
            )
            
            # Load State Dict
            state_dict = None
            if isinstance(checkpoint, dict):
                logger.info(f"[MODEL LOAD] Checkpoint keys: {list(checkpoint.keys())}")
                if 'model_state_dict' in checkpoint:
                     state_dict = checkpoint['model_state_dict']
                elif 'ema_shadow' in checkpoint:
                     # Prefer EMA weights if available (usually better)
                     state_dict = checkpoint['ema_shadow']
                     logger.info("[MODEL LOAD] Using EMA weights from checkpoint.")
                elif 'state_dict' in checkpoint:
                     state_dict = checkpoint['state_dict']
                else:
                     state_dict = checkpoint
            else:
                 state_dict = checkpoint

            if state_dict:
                # Clean keys if needed (e.g. remove 'module.')
                clean_state_dict = {}
                for k, v in state_dict.items():
                    name = k.replace('module.', '')
                    clean_state_dict[name] = v
                
                logger.info(f"[MODEL LOAD] State dict has {len(clean_state_dict)} keys")
                
                # Careful load
                missing, unexpected = self.model.load_state_dict(clean_state_dict, strict=False)
                if missing:
                    logger.warning(f"[MODEL LOAD] Missing keys ({len(missing)}): {missing[:5]}...")
                if unexpected:
                    logger.warning(f"[MODEL LOAD] Unexpected keys ({len(unexpected)}): {unexpected[:5]}...")
                
                # If too many keys are missing, something is very wrong
                if len(missing) > 10:
                    logger.error(f"[MODEL LOAD] Too many missing keys ({len(missing)}), model may not work correctly!")
            
            self.model.to(self.device)
            self.model.eval()
            self.model_load_error = None
            self.active_model_path = str(model_path)
            logger.info(f"[MODEL LOAD] ✓ Model {os.path.basename(str(model_path))} loaded successfully on {self.device}")
            print(f"[CNN] ✓ Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"[MODEL LOAD] FAILED to load model: {e}")
            logger.error(f"[MODEL LOAD] Traceback:\n{tb.format_exc()}")
            print(f"[CNN] FAILED to load model: {e}")
            print(tb.format_exc())
            self.model_load_error = str(e)

    def predict(self, image_input: Union[bytes, Image.Image], user_model_path: Optional[str] = None) -> PredictionOutput:
        start_time = time.time()
        
        # Switch model if user has a specific one assigned and it's not the current one
        if user_model_path and user_model_path != getattr(self, 'active_model_path', ''):
             full_path = os.path.join(settings.BASE_DIR, 'ml_models', user_model_path)
             if os.path.exists(full_path):
                 self._load_model(full_path)
             else:
                 logger.warning(f"User specific model {user_model_path} not found. Using current.")
                 # Fallback to default if everything else fails
                 if not self.model:
                     self._load_model()

        if not self.model:
            raise ModelUnavailableError(
                message=f"CNN model is not loaded: {self.model_load_error or 'Unknown error'}"
            )

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
            raise ModelUnavailableError(message=f"Prediction failed: {str(e)}")

    def predict_multi(self, images: List[any]) -> PredictionOutput:
        return self.predict(images[0])

    def _prepare_image(self, image_input):
        if isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input)).convert('RGB')
        elif isinstance(image_input, Image.Image):
            return image_input.convert('RGB')
        return image_input

    def _get_recommendation(self, disease_name: str, confidence: float) -> str:
        base_rec = f"Consult a dermatologist regarding {disease_name}."
        if confidence < MODERATE_CONFIDENCE_THRESHOLD:
             return "Results inconclusive. Please consult a doctor."
        return base_rec



# Singleton
_predictor: Optional[CNNPredictor] = None

def get_predictor() -> CNNPredictor:
    global _predictor
    if _predictor is None:
        _predictor = CNNPredictor()
    return _predictor
