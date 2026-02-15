"""
CNN Inference - Simulation Mode (Model Removed)
"""
import logging
import time
import random
from dataclasses import dataclass
from typing import Dict, List, Optional
from django.conf import settings

from .exceptions import ModelUnavailableError

logger = logging.getLogger(__name__)


# Medical safety thresholds (FR-CONF-R)
INCONCLUSIVE_THRESHOLD: float = 60.0
MODERATE_CONFIDENCE_THRESHOLD: float = 60.0
HIGH_CONFIDENCE_THRESHOLD: float = 80.0


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
    """
    disease_name: str
    confidence: float
    all_probabilities: Dict[str, float]
    recommendation: str
    processing_time: float
    is_inconclusive: bool


class CNNPredictor:
    """
    CNN model wrapper - SIMULATION ONLY (Model Removed).
    """
    
    def __init__(self):
        self.simulation_mode: bool = True
        
        # Mapped classes (Alphabetical by folder name)
        self.disease_classes: List[str] = [
            'Eczema',
            'Warts Molluscum',
            'Melanoma',
            'Atopic Dermatitis',
            'Basal Cell Carcinoma',
            'Melanocytic Nevi',
            'Benign Keratosis-like Lesions',
            'Psoriasis',
            'Seborrheic Keratoses',
            'Tinea Ringworm Candidiasis'
        ]
        
        self.model_version: str = "v2.0-SIMULATION"
        
        # Disease-specific recommendations
        self._disease_recommendations: Dict[str, str] = {
            'Acne': (
                "Keep skin clean and avoid touching face. Consider over-the-counter "
                "benzoyl peroxide products. If severe or persistent, consult a dermatologist."
            ),
            'Eczema': (
                "Use gentle, fragrance-free moisturizers regularly. Avoid known irritants "
                "and triggers. For flare-ups, topical corticosteroids may be prescribed."
            ),
            'Atopic Dermatitis': (
                "Avoid scratching and keep skin moisturized. Identify and avoid triggers. "
                "Consult a dermatologist for management strategies."
            ),
            'Melanoma': (
                "⚠️ URGENT: This may be a serious condition. "
                "Seek evaluation by a dermatologist or oncologist IMMEDIATELY. "
                "Early detection is critical."
            ),
            'Basal Cell Carcinoma': (
                "⚠️ This is a common form of skin cancer. "
                "Consult a dermatologist for confirmation and removal options. "
                "Generally has a high cure rate if treated early."
            ),
            'Melanocytic Nevi': (
                "This appears to be a mole. Monitor for changes in size, shape, or color (ABCDE rule). "
                "If it changes or bleeds, see a dermatologist."
            ),
            'Benign Keratosis-like Lesions': (
                "This is likely a benign growth. If it becomes irritated or changes appearance, "
                "consult a dermatologist."
            ),
            'Psoriasis': (
                "Use moisturizers and avoids skin trauma. Consult a dermatologist for "
                "treatment options corresponding to severity."
            ),
            'Seborrheic Keratoses': (
                "Common harmless skin growth. No treatment usually needed unless irritated. "
                "Consult a dermatologist if you are unsure."
            ),
            'Tinea Ringworm Candidiasis': (
                "Keep area clean and dry. OTC antifungal creams may help. "
                "Consult a doctor if it persists."
            ),
            'Rosacea': (
                "Avoid triggers like sun and spice. Use gentle skincare. "
                "Consult a dermatologist."
            ),
            'Vitiligo': (
                "Sun protection is important. Consult a dermatologist for treatment options."
            ),
            'Warts Molluscum': (
                "OTC salicylic acid may help. Avoid picking. Consult a doctor if painful or spreading."
            ),
        }
    
    def _get_recommendation(self, disease_name: str, confidence: float) -> str:
        disclaimer = (
            "\n\n⚠️ DISCLAIMER: This is an AI-based preliminary screening tool only. "
            "Not a substitute for professional medical diagnosis."
        )
        
        base_rec = self._disease_recommendations.get(
            disease_name,
            "Consult a dermatologist for proper diagnosis and treatment."
        )
        
        if confidence >= HIGH_CONFIDENCE_THRESHOLD:
            return base_rec + disclaimer
        elif confidence >= MODERATE_CONFIDENCE_THRESHOLD:
            return STRONG_UNCERTAINTY_WARNING + base_rec + disclaimer
        else:
            return GENERIC_RECOMMENDATION

    def _predict_mock(self) -> PredictionOutput:
        """Generate a simulated prediction for testing."""
        time.sleep(0.5)
        disease = random.choice(self.disease_classes)
        confidence = random.uniform(70.0, 95.0)
        
        all_probs = {d: 0.0 for d in self.disease_classes}
        all_probs[disease] = confidence
        remaining = 100.0 - confidence
        for d in self.disease_classes:
            if d != disease:
                all_probs[d] = remaining / (len(self.disease_classes) - 1)
                
        return PredictionOutput(
            disease_name=disease,
            confidence=confidence,
            all_probabilities=all_probs,
            recommendation="🔍 [SIMULATION] " + self._get_recommendation(disease, confidence),
            processing_time=0.5,
            is_inconclusive=False
        )

    def predict(self, preprocessed_image: any) -> PredictionOutput:
        """
        Perform simulation inference.
        """
        return self._predict_mock()

    def predict_multi(self, preprocessed_images: List[any]) -> PredictionOutput:
        """
        Inference on multiple images (averaged simulation).
        """
        return self._predict_mock()


# Singleton
_predictor: Optional[CNNPredictor] = None

def get_predictor() -> CNNPredictor:
    global _predictor
    if _predictor is None:
        _predictor = CNNPredictor()
    return _predictor

def reset_predictor() -> None:
    global _predictor
    _predictor = None
