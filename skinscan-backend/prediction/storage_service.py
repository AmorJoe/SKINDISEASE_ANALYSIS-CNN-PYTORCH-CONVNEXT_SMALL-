"""
Cloud Storage Service - Abstraction layer for image storage

This module provides a cloud storage abstraction that:
- Uploads images to cloud storage (GCS)
- Returns cloud reference URLs
- Raises clear errors when credentials are missing
- NEVER stores images on local filesystem

Usage:
    storage = get_storage_service()
    cloud_url = storage.upload_image(image_bytes, "image.jpg", user_id=123)
"""
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from django.conf import settings

from .exceptions import StorageError

logger = logging.getLogger(__name__)


class BaseStorageService(ABC):
    """Abstract base class for storage services."""
    
    @abstractmethod
    def upload_image(
        self, 
        file_bytes: bytes, 
        filename: str, 
        user_id: int
    ) -> str:
        """
        Upload image bytes to storage.
        
        Args:
            file_bytes: Raw image bytes
            filename: Original filename
            user_id: ID of the uploading user
            
        Returns:
            Cloud reference URL/path
            
        Raises:
            StorageError: If upload fails
        """
        pass
    
    @abstractmethod
    def delete_image(self, cloud_url: str) -> bool:
        """
        Delete image from storage.
        
        Args:
            cloud_url: Cloud reference URL to delete
            
        Returns:
            True if deleted, False otherwise
        """
        pass


class GCSStorageService(BaseStorageService):
    """
    Google Cloud Storage implementation.
    
    Requires:
    - GCS_BUCKET_NAME in settings
    - GCS_CREDENTIALS_FILE in settings (optional, uses default credentials if not set)
    """
    
    def __init__(self):
        self.bucket_name = getattr(settings, 'GCS_BUCKET_NAME', None)
        self.credentials_file = getattr(settings, 'GCS_CREDENTIALS_FILE', None)
        self._client = None
        self._bucket = None
        
        if not self.bucket_name:
            raise StorageError(
                "GCS_BUCKET_NAME is not configured in settings. "
                "Please set GCS_BUCKET_NAME to your Google Cloud Storage bucket name."
            )
    
    def _get_client(self):
        """Lazy-load the GCS client."""
        if self._client is None:
            try:
                from google.cloud import storage as gcs_storage
                
                if self.credentials_file:
                    self._client = gcs_storage.Client.from_service_account_json(
                        self.credentials_file
                    )
                else:
                    # Uses default credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
                    self._client = gcs_storage.Client()
                    
                self._bucket = self._client.bucket(self.bucket_name)
                
            except ImportError:
                raise StorageError(
                    "google-cloud-storage package is not installed. "
                    "Run: pip install google-cloud-storage"
                )
            except Exception as e:
                raise StorageError(
                    f"Failed to initialize GCS client: {str(e)}",
                    original_error=e
                )
        
        return self._client, self._bucket
    
    def _generate_cloud_path(self, filename: str, user_id: int) -> str:
        """Generate unique cloud storage path."""
        # Extract file extension
        ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
        
        # Create unique path: uploads/{year}/{month}/{user_id}/{uuid}.{ext}
        now = datetime.utcnow()
        unique_id = uuid.uuid4().hex
        
        return f"uploads/{now.year}/{now.month:02d}/user_{user_id}/{unique_id}.{ext}"
    
    def upload_image(
        self, 
        file_bytes: bytes, 
        filename: str, 
        user_id: int
    ) -> str:
        """Upload image to Google Cloud Storage."""
        try:
            _, bucket = self._get_client()
            
            cloud_path = self._generate_cloud_path(filename, user_id)
            blob = bucket.blob(cloud_path)
            
            # Determine content type
            ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
            content_type = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
            }.get(ext, 'image/jpeg')
            
            # Upload with content type
            blob.upload_from_string(file_bytes, content_type=content_type)
            
            # Return the GCS URL
            cloud_url = f"gs://{self.bucket_name}/{cloud_path}"
            
            logger.info(f"Uploaded image to {cloud_url}")
            return cloud_url
            
        except StorageError:
            raise
        except Exception as e:
            logger.error(f"Failed to upload image: {str(e)}")
            raise StorageError(
                f"Failed to upload image to cloud storage: {str(e)}",
                original_error=e
            )
    
    def delete_image(self, cloud_url: str) -> bool:
        """Delete image from Google Cloud Storage."""
        try:
            _, bucket = self._get_client()
            
            # Extract path from gs:// URL
            if cloud_url.startswith(f"gs://{self.bucket_name}/"):
                blob_path = cloud_url[len(f"gs://{self.bucket_name}/"):]
                blob = bucket.blob(blob_path)
                blob.delete()
                logger.info(f"Deleted image: {cloud_url}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete image: {str(e)}")
            return False


class MockStorageService(BaseStorageService):
    """
    Mock storage service for development/testing.
    
    WARNING: This service does NOT actually store images!
    It returns mock URLs for testing purposes only.
    
    Use only when USE_GCS=False in settings.
    """
    
    def __init__(self):
        logger.warning(
            "⚠️ Using MockStorageService - images are NOT being stored! "
            "Set USE_GCS=True and configure GCS credentials for production."
        )
    
    def _generate_mock_url(self, filename: str, user_id: int) -> str:
        """Generate a mock cloud URL."""
        ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
        unique_id = uuid.uuid4().hex
        now = datetime.utcnow()
        
        return f"mock://storage/{now.year}/{now.month:02d}/user_{user_id}/{unique_id}.{ext}"
    
    def upload_image(
        self, 
        file_bytes: bytes, 
        filename: str, 
        user_id: int
    ) -> str:
        """Return mock URL (does not actually store image)."""
        mock_url = self._generate_mock_url(filename, user_id)
        
        logger.warning(
            f"⚠️ Mock upload: {filename} ({len(file_bytes)} bytes) -> {mock_url}"
        )
        
        return mock_url
    
    def delete_image(self, cloud_url: str) -> bool:
        """Mock delete (always returns True)."""
        logger.warning(f"⚠️ Mock delete: {cloud_url}")
        return True


# Singleton instance
_storage_service: Optional[BaseStorageService] = None


def get_storage_service() -> BaseStorageService:
    """
    Get or create the storage service singleton.
    
    Returns GCSStorageService if USE_GCS=True, otherwise MockStorageService.
    
    Returns:
        Storage service instance
        
    Raises:
        StorageError: If GCS is enabled but misconfigured
    """
    global _storage_service
    
    if _storage_service is None:
        use_gcs = getattr(settings, 'USE_GCS', False)
        
        if use_gcs:
            _storage_service = GCSStorageService()
        else:
            _storage_service = MockStorageService()
    
    return _storage_service


def reset_storage_service() -> None:
    """Reset the singleton (for testing purposes)."""
    global _storage_service
    _storage_service = None
