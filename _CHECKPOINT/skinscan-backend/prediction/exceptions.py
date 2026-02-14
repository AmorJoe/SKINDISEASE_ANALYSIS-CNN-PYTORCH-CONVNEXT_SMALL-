"""
Prediction App Custom Exceptions

Custom exception classes for the prediction module.
These exceptions provide clear, specific error handling for:
- Model loading failures
- Storage operations
- Image validation errors
"""
from typing import Optional


class PredictionException(Exception):
    """Base exception for prediction module."""
    
    def __init__(self, message: str, error_code: str = "PREDICTION_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ModelUnavailableError(PredictionException):
    """
    Raised when the CNN model cannot be loaded or is unavailable.
    
    This is a critical error - predictions cannot proceed without a model.
    Do NOT fall back to mock/random predictions.
    """
    
    def __init__(self, message: str = "CNN model is unavailable"):
        super().__init__(
            message=message,
            error_code="MODEL_UNAVAILABLE"
        )


class StorageError(PredictionException):
    """
    Raised when cloud storage operations fail.
    
    Possible causes:
    - Missing credentials
    - Invalid bucket configuration
    - Network errors
    - Permission denied
    """
    
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        self.original_error = original_error
        super().__init__(
            message=message,
            error_code="STORAGE_ERROR"
        )


class ImageValidationError(PredictionException):
    """
    Raised for HARD validation failures (image must be rejected).
    
    Hard failures include:
    - Corrupted/unreadable file
    - Resolution below minimum (224x224)
    - Completely black/empty image
    
    Soft warnings (blur, low contrast) should NOT raise this exception.
    """
    
    def __init__(self, message: str, validation_details: Optional[dict] = None):
        self.validation_details = validation_details or {}
        super().__init__(
            message=message,
            error_code="IMAGE_VALIDATION_FAILED"
        )


class JobNotFoundError(PredictionException):
    """Raised when a prediction job ID does not exist."""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        super().__init__(
            message=f"Prediction job '{job_id}' not found",
            error_code="JOB_NOT_FOUND"
        )
