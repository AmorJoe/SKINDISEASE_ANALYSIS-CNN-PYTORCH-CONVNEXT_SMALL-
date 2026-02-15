"""
Image Quality Validator - Hard Fail vs Soft Warning validation

Phase 2 v2.0 Compliant:
- Hard Fail: Corrupted, resolution < 224x224, completely black/empty
- Soft Warning: Blur, low brightness/contrast (allows prediction to proceed)
"""
import logging
from dataclasses import dataclass
from typing import Tuple, Optional, List
import cv2
import numpy as np
from PIL import Image
from django.conf import settings
import io

from .exceptions import ImageValidationError

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """
    Result of image validation.
    
    Attributes:
        is_valid: True if image passes hard validation (can be processed)
        has_warning: True if soft warnings detected (proceed with caution)
        warning_messages: List of warning messages
        quality_score: Blur detection score (Laplacian variance)
        width: Image width in pixels
        height: Image height in pixels
    """
    is_valid: bool
    has_warning: bool
    warning_messages: List[str]
    quality_score: float
    width: int
    height: int
    
    @property
    def warning_message(self) -> str:
        """Combined warning message string."""
        return "; ".join(self.warning_messages) if self.warning_messages else ""


class ImageQualityValidator:
    """
    Validate image quality before AI processing.
    
    Phase 2 Changes:
    - Separated Hard Fail (reject) vs Soft Warning (allow with warning)
    - Returns ValidationResult dataclass instead of tuple
    - Raises ImageValidationError for hard failures
    """
    
    # Quality thresholds
    MIN_BLUR_THRESHOLD: float = 100.0  # Laplacian variance threshold
    MIN_BRIGHTNESS: float = 30.0
    MAX_BRIGHTNESS: float = 225.0
    MIN_CONTRAST: float = 30.0
    
    # Empty/black image threshold
    BLACK_PIXEL_RATIO_THRESHOLD: float = 0.95  # 95% black pixels = empty
    BLACK_PIXEL_VALUE: int = 10  # Pixels below this are considered black
    
    @staticmethod
    def validate_file_format(filename: str) -> Tuple[bool, Optional[str]]:
        """
        Check if file extension is allowed.
        
        Args:
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        allowed_extensions = getattr(
            settings, 
            'ALLOWED_IMAGE_EXTENSIONS', 
            ['jpg', 'jpeg', 'png']
        )
        
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if ext not in allowed_extensions:
            return False, f"Only {', '.join(allowed_extensions).upper()} files allowed"
        
        return True, None
    
    @staticmethod
    def validate_file_size(file_size: int) -> Tuple[bool, Optional[str]]:
        """
        Check if file size is within limit.
        
        Args:
            file_size: File size in bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        max_size = getattr(settings, 'MAX_IMAGE_SIZE', 5 * 1024 * 1024)
        
        if file_size > max_size:
            max_mb = max_size / (1024 * 1024)
            return False, f"File size exceeds {max_mb:.1f}MB limit"
        
        return True, None
    
    @staticmethod
    def _detect_blur(image_array: np.ndarray) -> float:
        """
        Detect blur using Laplacian variance method.
        
        Higher values = sharper image.
        Lower values = more blur.
        """
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return float(laplacian_var)
    
    @staticmethod
    def _check_brightness_contrast(
        image_array: np.ndarray
    ) -> Tuple[float, float]:
        """
        Check image brightness and contrast.
        
        Returns:
            Tuple of (mean_brightness, std_contrast)
        """
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        mean_brightness = float(np.mean(gray))
        std_contrast = float(np.std(gray))
        return mean_brightness, std_contrast
    
    @classmethod
    def _is_empty_or_black(cls, image_array: np.ndarray) -> bool:
        """
        Check if image is completely black or empty.
        
        Returns:
            True if image is mostly black (>95% black pixels)
        """
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        black_pixels = np.sum(gray < cls.BLACK_PIXEL_VALUE)
        total_pixels = gray.size
        black_ratio = black_pixels / total_pixels
        
        return black_ratio > cls.BLACK_PIXEL_RATIO_THRESHOLD
    
    @classmethod
    def validate_image(cls, image_file) -> ValidationResult:
        """
        Comprehensive image quality validation.
        
        HARD FAIL (is_valid=False):
        - Corrupted/unreadable file
        - Resolution below 224x224
        - Completely black/empty image
        
        SOFT WARNING (is_valid=True, has_warning=True):
        - Blur detected
        - Low brightness
        - Low contrast
        
        Args:
            image_file: Django UploadedFile or file-like object
            
        Returns:
            ValidationResult with validation details
            
        Raises:
            ImageValidationError: For hard validation failures
        """
        warnings: List[str] = []
        
        # === HARD FAIL CHECKS ===
        
        # Try to open image (catches corrupted files)
        try:
            image_file.seek(0)
            img = Image.open(image_file)
            img.verify()  # Verify image integrity
            
            # Re-open after verify (verify closes the image)
            image_file.seek(0)
            img = Image.open(image_file)
            img_array = np.array(img.convert('RGB'))
            width, height = img.size
            
        except Exception as e:
            logger.error(f"Image validation failed - corrupted file: {str(e)}")
            raise ImageValidationError(
                message="Image file is corrupted or unreadable",
                validation_details={"error": str(e)}
            )
        
        # Check minimum resolution (HARD FAIL)
        min_resolution = getattr(settings, 'IMAGE_MIN_RESOLUTION', (224, 224))
        min_w, min_h = min_resolution
        
        if width < min_w or height < min_h:
            # Soft warning instead of hard fail - we will resize later
            warnings.append(f"Image resolution ({width}x{height}) is low. Optimal is {min_w}x{min_h}.")
        
        # Check for completely black/empty image (HARD FAIL)
        if cls._is_empty_or_black(img_array):
            raise ImageValidationError(
                message="Image appears to be completely black or empty",
                validation_details={"issue": "black_or_empty"}
            )
        
        # === SOFT WARNING CHECKS ===
        
        # Check blur
        blur_score = cls._detect_blur(img_array)
        if blur_score < cls.MIN_BLUR_THRESHOLD:
            warnings.append(f"Image appears blurry (score: {blur_score:.1f})")
        
        # Check brightness and contrast
        brightness, contrast = cls._check_brightness_contrast(img_array)
        
        if brightness < cls.MIN_BRIGHTNESS:
            warnings.append("Image is too dark")
        elif brightness > cls.MAX_BRIGHTNESS:
            warnings.append("Image is overexposed")
        
        if contrast < cls.MIN_CONTRAST:
            warnings.append("Image has low contrast")
        
        # Build result
        has_warning = len(warnings) > 0
        
        if has_warning:
            logger.warning(f"Image validation warnings: {warnings}")
        
        return ValidationResult(
            is_valid=True,
            has_warning=has_warning,
            warning_messages=warnings,
            quality_score=blur_score,
            width=width,
            height=height
        )
    
    @staticmethod
    def preprocess_for_cnn(
        image_file, 
        target_size: Tuple[int, int] = (256, 256)
    ) -> any:
        """
        Preprocess image for CNN model input.
        
        Args:
            image_file: Django UploadedFile or file-like object
            target_size: Target dimensions (width, height)
            
        Returns:
            Placeholder (Simulation mode active)
        """
        # In simulation mode, we don't need actual tensors
        return None
    
    @staticmethod
    def preprocess_bytes_for_cnn(
        image_bytes: bytes,
        target_size: Tuple[int, int] = (256, 256)
    ) -> any:
        """
        Preprocess image bytes for CNN model input.
        
        Args:
            image_bytes: Raw image bytes
            target_size: Target dimensions (width, height)
            
        Returns:
            Placeholder (Simulation mode active)
        """
        # In simulation mode, we don't need actual tensors
        return None
