"""
CNN Inference - Skin disease prediction using TensorFlow model

Phase 2 v2.0 Compliant:
- NO random/mock predictions
- ModelUnavailableError for missing model
- Inconclusive state for confidence < 50%
- Confidence-based recommendation gating
"""
import logging
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
from django.conf import settings

from .exceptions import ModelUnavailableError

logger = logging.getLogger(__name__)


# Medical safety thresholds (FR-CONF-R)
INCONCLUSIVE_THRESHOLD: float = 60.0  # Below this = "Inconclusive" (no disease label)
MODERATE_CONFIDENCE_THRESHOLD: float = 60.0  # 60-79% = show disease + strong uncertainty warning
HIGH_CONFIDENCE_THRESHOLD: float = 80.0  # Above this = disease-specific recommendation


# Strong uncertainty warning for 60-79% confidence (FR-CONF-R)
STRONG_UNCERTAINTY_WARNING: str = (
    "⚠️ STRONG UNCERTAINTY WARNING: The AI confidence is moderate (60-79%). "
    "This prediction should be treated with caution. "
    "Please consult a dermatologist for confirmation.\n\n"
)

# Generic recommendation for low-confidence predictions
GENERIC_RECOMMENDATION: str = (
    "The AI analysis shows low confidence in the prediction. "
    "This could be due to image quality, unusual presentation, or a condition "
    "not in our database. Please consult a dermatologist for accurate diagnosis.\n\n"
    "⚠️ DISCLAIMER: This is an AI-based preliminary screening tool only. "
    "Not a substitute for professional medical diagnosis."
)

# Inconclusive recommendation
INCONCLUSIVE_RECOMMENDATION: str = (
    "The AI was unable to determine a specific condition with sufficient confidence. "
    "This may indicate:\n"
    "• The image quality is insufficient for analysis\n"
    "• The skin condition is not in our database\n"
    "• Multiple conditions may be present\n\n"
    "Please consult a qualified dermatologist for proper diagnosis.\n\n"
    "⚠️ DISCLAIMER: This is an AI-based preliminary screening tool only. "
    "Not a substitute for professional medical diagnosis."
)


@dataclass
class PredictionOutput:
    """
    Structured prediction output.
    
    Attributes:
        disease_name: Predicted disease or "Inconclusive"
        confidence: Confidence percentage (0-100)
        all_probabilities: Dict of all class probabilities
        recommendation: Medical recommendation based on confidence
        processing_time: Time taken for inference in seconds
        is_inconclusive: True if confidence < 50%
    """
    disease_name: str
    confidence: float
    all_probabilities: Dict[str, float]
    recommendation: str
    processing_time: float
    is_inconclusive: bool


class CNNPredictor:
    """
    CNN model wrapper for skin disease prediction.
    
    Phase 2 Medical Safety Features:
    - Raises ModelUnavailableError if model cannot be loaded (NO mock predictions)
    - Returns "Inconclusive" for confidence < 50%
    - Disease-specific recommendations only for confidence ≥ 80%
    """
    
    def __init__(self):
        self.model = None
        self.disease_classes: List[str] = getattr(
            settings, 
            'DISEASE_CLASSES', 
            [
                'Acne', 'Eczema', 'Melanoma', 'Psoriasis',
                'Rosacea', 'Fungal Infection', 'Vitiligo', 'Warts'
            ]
        )
        self.model_version: str = "v2.0"
        self.is_loaded: bool = False
        
        # Disease-specific recommendations (for high-confidence predictions)
        self._disease_recommendations: Dict[str, str] = {
            'Acne': (
                "Keep skin clean and avoid touching face. Consider over-the-counter "
                "benzoyl peroxide products. If severe or persistent, consult a dermatologist "
                "for prescription treatments like retinoids or antibiotics."
            ),
            'Eczema': (
                "Use gentle, fragrance-free moisturizers regularly. Avoid known irritants "
                "and triggers. For flare-ups, topical corticosteroids may be prescribed by "
                "a dermatologist. Consider allergy testing if symptoms persist."
            ),
            'Melanoma': (
                "⚠️ URGENT: This may be a serious condition requiring immediate attention. "
                "Seek evaluation by a dermatologist or oncologist as soon as possible. "
                "Early detection and treatment are critical for melanoma. "
                "Do NOT delay seeking professional medical care."
            ),
            'Psoriasis': (
                "Use moisturizers regularly to manage dryness. Avoid skin trauma (Koebner phenomenon). "
                "Consult a dermatologist for treatment options including topical corticosteroids, "
                "vitamin D analogues, or systemic treatments for moderate-to-severe cases."
            ),
            'Rosacea': (
                "Avoid known triggers (sun exposure, spicy food, alcohol, stress). "
                "Use gentle, non-irritating skincare products. Sun protection is essential. "
                "Consult a dermatologist for prescription treatments like topical metronidazole "
                "or oral antibiotics."
            ),
            'Fungal Infection': (
                "Keep the affected area clean and dry. Over-the-counter antifungal creams "
                "(clotrimazole, miconazole) may help for mild cases. If symptoms persist beyond "
                "2 weeks or spread, consult a doctor for prescription antifungals."
            ),
            'Vitiligo': (
                "Use broad-spectrum sunscreen on affected areas to prevent sunburn. "
                "Treatment options include topical corticosteroids, calcineurin inhibitors, "
                "or phototherapy. Consult a dermatologist for a personalized management plan."
            ),
            'Warts': (
                "Over-the-counter salicylic acid treatments may help remove warts. "
                "Avoid picking or scratching warts to prevent spreading. If warts are painful, "
                "spreading, or not responding to treatment, consult a doctor for cryotherapy or "
                "other treatments."
            ),
        }
        
        # Attempt to load model on initialization
        self._load_model()
    
    def _load_model(self) -> None:
        """
        Load CNN model from file.
        
        Raises:
            ModelUnavailableError: If model cannot be loaded
        """
        model_path = getattr(settings, 'MODEL_PATH', None)
        
        if not model_path:
            logger.error("MODEL_PATH not configured in settings")
            self.is_loaded = False
            return
        
        try:
            import tensorflow as tf
            
            if not model_path.exists():
                logger.error(f"Model file not found: {model_path}")
                self.is_loaded = False
                return
            
            self.model = tf.keras.models.load_model(str(model_path))
            self.is_loaded = True
            logger.info(f"✓ CNN model loaded successfully from {model_path}")
            
        except ImportError:
            logger.error("TensorFlow is not installed")
            self.is_loaded = False
        except Exception as e:
            logger.error(f"Failed to load CNN model: {str(e)}")
            self.is_loaded = False
    
    def _ensure_model_loaded(self) -> None:
        """
        Ensure model is loaded before prediction.
        
        Raises:
            ModelUnavailableError: If model is not available
        """
        if not self.is_loaded or self.model is None:
            raise ModelUnavailableError(
                "CNN model is not available. Predictions cannot be made. "
                "Please ensure the model file exists and TensorFlow is installed."
            )
    
    def predict(self, preprocessed_image: np.ndarray) -> PredictionOutput:
        """
        Perform inference on preprocessed image.
        
        Args:
            preprocessed_image: Numpy array of shape (1, 224, 224, 3)
            
        Returns:
            PredictionOutput with disease name, confidence, and recommendation
            
        Raises:
            ModelUnavailableError: If model is not loaded
        """
        self._ensure_model_loaded()
        
        start_time = time.time()
        
        # Run model prediction
        predictions = self.model.predict(preprocessed_image, verbose=0)
        probabilities = predictions[0]
        
        # Get predicted class and confidence
        predicted_idx = int(np.argmax(probabilities))
        max_confidence = float(probabilities[predicted_idx] * 100)
        
        # Create probability dictionary
        all_probs = {
            cls: float(prob * 100)
            for cls, prob in zip(self.disease_classes, probabilities)
        }
        
        processing_time = time.time() - start_time
        
        # Apply medical safety gating
        if max_confidence < INCONCLUSIVE_THRESHOLD:
            # Inconclusive: confidence too low to make a diagnosis
            return PredictionOutput(
                disease_name="Inconclusive",
                confidence=max_confidence,
                all_probabilities=all_probs,
                recommendation=INCONCLUSIVE_RECOMMENDATION,
                processing_time=processing_time,
                is_inconclusive=True
            )
        
        # Get disease name
        disease_name = self.disease_classes[predicted_idx]
        
        # Get appropriate recommendation based on confidence
        recommendation = self._get_recommendation(disease_name, max_confidence)
        
        return PredictionOutput(
            disease_name=disease_name,
            confidence=max_confidence,
            all_probabilities=all_probs,
            recommendation=recommendation,
            processing_time=processing_time,
            is_inconclusive=False
        )
    
    def predict_multi(
        self, 
        preprocessed_images: List[np.ndarray]
    ) -> PredictionOutput:
        """
        Perform inference on multiple images and aggregate results.
        
        Averages confidence scores across all images and applies
        safety gating on the aggregated result.
        
        Args:
            preprocessed_images: List of numpy arrays, each (1, 224, 224, 3)
            
        Returns:
            Aggregated PredictionOutput
            
        Raises:
            ModelUnavailableError: If model is not loaded
        """
        if not preprocessed_images:
            raise ValueError("At least one image is required")
        
        if len(preprocessed_images) == 1:
            return self.predict(preprocessed_images[0])
        
        self._ensure_model_loaded()
        
        start_time = time.time()
        
        # Collect predictions from all images
        all_predictions = []
        for img in preprocessed_images:
            predictions = self.model.predict(img, verbose=0)
            all_predictions.append(predictions[0])
        
        # Average probabilities across all images
        avg_probabilities = np.mean(all_predictions, axis=0)
        
        # Get predicted class and confidence
        predicted_idx = int(np.argmax(avg_probabilities))
        max_confidence = float(avg_probabilities[predicted_idx] * 100)
        
        # Create probability dictionary
        all_probs = {
            cls: float(prob * 100)
            for cls, prob in zip(self.disease_classes, avg_probabilities)
        }
        
        processing_time = time.time() - start_time
        
        # Apply medical safety gating on aggregated result
        if max_confidence < INCONCLUSIVE_THRESHOLD:
            return PredictionOutput(
                disease_name="Inconclusive",
                confidence=max_confidence,
                all_probabilities=all_probs,
                recommendation=INCONCLUSIVE_RECOMMENDATION,
                processing_time=processing_time,
                is_inconclusive=True
            )
        
        disease_name = self.disease_classes[predicted_idx]
        recommendation = self._get_recommendation(disease_name, max_confidence)
        
        return PredictionOutput(
            disease_name=disease_name,
            confidence=max_confidence,
            all_probabilities=all_probs,
            recommendation=recommendation,
            processing_time=processing_time,
            is_inconclusive=False
        )
    
    def _get_recommendation(self, disease_name: str, confidence: float) -> str:
        """
        Generate medical recommendation based on prediction confidence.
        
        Medical Safety Gating:
        - confidence ≥ 80%: Disease-specific recommendation
        - confidence < 80%: Generic advice only
        
        Args:
            disease_name: Predicted disease name
            confidence: Confidence percentage
            
        Returns:
            Recommendation string
        """
        disclaimer = (
            "\n\n⚠️ DISCLAIMER: This is an AI-based preliminary screening tool only. "
            "Not a substitute for professional medical diagnosis. "
            "Always consult a qualified dermatologist for accurate diagnosis and treatment."
        )
        
        if confidence >= HIGH_CONFIDENCE_THRESHOLD:
            # High confidence (≥80%): provide disease-specific recommendation
            base_rec = self._disease_recommendations.get(
                disease_name,
                "Consult a dermatologist for proper diagnosis and treatment."
            )
            return base_rec + disclaimer
        elif confidence >= MODERATE_CONFIDENCE_THRESHOLD:
            # Moderate confidence (60-79%): show disease + strong uncertainty warning
            base_rec = self._disease_recommendations.get(
                disease_name,
                "Consult a dermatologist for proper diagnosis and treatment."
            )
            return STRONG_UNCERTAINTY_WARNING + base_rec + disclaimer
        else:
            # Low confidence (<60%): generic advice only (shouldn't reach here normally
            # since <60% is Inconclusive, but included for safety)
            return GENERIC_RECOMMENDATION


# Singleton instance
_predictor: Optional[CNNPredictor] = None


def get_predictor() -> CNNPredictor:
    """
    Get or create predictor instance.
    
    Returns:
        CNNPredictor singleton instance
    """
    global _predictor
    if _predictor is None:
        _predictor = CNNPredictor()
    return _predictor


def reset_predictor() -> None:
    """Reset the singleton (for testing purposes)."""
    global _predictor
    _predictor = None
