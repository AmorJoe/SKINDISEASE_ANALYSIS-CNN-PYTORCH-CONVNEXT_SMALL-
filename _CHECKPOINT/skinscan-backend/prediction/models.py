"""
Prediction Models - SkinImage, PredictionResult, PredictionJob, DiseaseInfo

Phase 2 v2.0 Compliant:
- PredictionJob for async processing
- Cloud storage URLs (not local paths)
- Quality warning flags for soft validation
"""
import uuid
from django.db import models
from django.utils import timezone
from authentication.models import User
from typing import Optional


class JobStatus(models.TextChoices):
    """Status values for prediction jobs."""
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


class PredictionJob(models.Model):
    """
    Async prediction job tracking.
    
    Represents a batch prediction request that may contain 1-3 images.
    Jobs are processed asynchronously in the background.
    """
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='prediction_jobs'
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.PENDING
    )
    error_message = models.TextField(blank=True, null=True)
    image_count = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'prediction_jobs'
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"Job {self.id} ({self.status})"
    
    def mark_processing(self) -> None:
        """Update job status to PROCESSING."""
        self.status = JobStatus.PROCESSING
        self.save(update_fields=['status'])
    
    def mark_completed(self) -> None:
        """Update job status to COMPLETED."""
        self.status = JobStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
    
    def mark_failed(self, error_message: str) -> None:
        """Update job status to FAILED with error message."""
        self.status = JobStatus.FAILED
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])


class SkinImage(models.Model):
    """
    Uploaded skin lesion images.
    
    Phase 2 Changes:
    - image_url: Cloud storage URL (not local path)
    - has_quality_warning: True if soft validation issues detected
    - quality_warning_message: Description of quality concerns
    - job: Link to parent PredictionJob for multi-image support
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='uploaded_images'
    )
    job = models.ForeignKey(
        PredictionJob,
        on_delete=models.CASCADE,
        related_name='images',
        null=True,
        blank=True
    )
    # Cloud storage URL (gs://bucket/path or mock://storage/path)
    image_url = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # In bytes
    image_width = models.IntegerField()
    image_height = models.IntegerField()
    quality_score = models.FloatField(default=0.0)  # Blur detection score
    is_valid = models.BooleanField(default=True)
    # Soft validation warning fields
    has_quality_warning = models.BooleanField(default=False)
    quality_warning_message = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'skin_images'
        ordering = ['-uploaded_at']
    
    def __str__(self) -> str:
        return f"Image {self.id} by {self.user.email}"


class PredictionResult(models.Model):
    """
    AI prediction results.
    
    Phase 2 Changes:
    - disease_name can be "Inconclusive" for low confidence
    - recommendation follows confidence-based gating
    - is_inconclusive flag for easy filtering
    """
    id = models.AutoField(primary_key=True)
    job = models.OneToOneField(
        PredictionJob,
        on_delete=models.CASCADE,
        related_name='result',
        null=True,
        blank=True
    )
    # Keep backward compatibility - allow image link for single-image predictions
    image = models.ForeignKey(
        SkinImage, 
        on_delete=models.CASCADE, 
        related_name='predictions',
        null=True,
        blank=True
    )
    disease_name = models.CharField(max_length=100)
    confidence_score = models.FloatField()  # Percentage 0-100
    raw_probabilities = models.JSONField(blank=True, null=True)
    recommendation = models.TextField()
    model_version = models.CharField(max_length=50, default='v1.0')
    processing_time = models.FloatField(default=0.0)  # Seconds
    is_inconclusive = models.BooleanField(default=False)
    # For multi-image: stores aggregated confidence from all images
    aggregated_from_count = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    # User feedback fields (FR-DATA-LOOP)
    user_feedback = models.TextField(blank=True, null=True)
    is_user_reported_incorrect = models.BooleanField(default=False)
    feedback_timestamp = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'prediction_results'
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"{self.disease_name} ({self.confidence_score:.1f}%)"


class DiseaseInfo(models.Model):
    """Disease information database."""
    id = models.AutoField(primary_key=True)
    disease_name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    symptoms = models.TextField()
    causes = models.TextField()
    treatment = models.TextField()
    prevention = models.TextField()
    severity_level = models.CharField(max_length=20)  # Mild, Moderate, Severe
    is_contagious = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'disease_info'
        ordering = ['disease_name']
    
    def __str__(self) -> str:
        return self.disease_name
