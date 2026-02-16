"""
Prediction Serializers

Phase 2 v2.0 Compliant:
- Multi-image upload validation (1-3 images)
- Job status response serializers
- Full prediction result serializers
"""
from rest_framework import serializers
from typing import List


class ImageUploadSerializer(serializers.Serializer):
    """
    Validate single image upload.
    
    Validates file format and size at serializer level.
    Quality validation happens separately in the view.
    """
    image = serializers.ImageField(required=True)


class MultiImageUploadSerializer(serializers.Serializer):
    """
    Validate multi-image upload (1-3 images).
    
    Accepts images as a list under 'images' key.
    """
    images = serializers.ListField(
        child=serializers.ImageField(),
        min_length=1,
        max_length=3,
        required=True,
        help_text="Upload 1-3 skin lesion images"
    )
    
    def validate_images(self, images: List) -> List:
        """Validate each image in the list."""
        if not images:
            raise serializers.ValidationError("At least one image is required")
        
        if len(images) > 3:
            raise serializers.ValidationError("Maximum 3 images allowed per request")
        
        return images


class JobCreatedSerializer(serializers.Serializer):
    """Response when a prediction job is created."""
    job_id = serializers.UUIDField()
    status = serializers.CharField()
    message = serializers.CharField()
    image_count = serializers.IntegerField()


class JobStatusSerializer(serializers.Serializer):
    """Response for job status check."""
    job_id = serializers.UUIDField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    completed_at = serializers.DateTimeField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)
    result = serializers.DictField(allow_null=True)


class ImageDetailSerializer(serializers.Serializer):
    """Image details within a prediction result."""
    id = serializers.IntegerField()
    url = serializers.CharField()
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    quality_score = serializers.FloatField()
    has_warning = serializers.BooleanField()
    warning_message = serializers.CharField(allow_null=True, allow_blank=True)
    uploaded_at = serializers.DateTimeField()


class PredictionResultSerializer(serializers.Serializer):
    """Full prediction result representation."""
    prediction_id = serializers.IntegerField()
    job_id = serializers.UUIDField(allow_null=True)
    disease_name = serializers.CharField()
    confidence = serializers.FloatField()
    is_inconclusive = serializers.BooleanField()
    recommendation = serializers.CharField()
    all_probabilities = serializers.DictField(
        child=serializers.FloatField(),
        allow_null=True
    )
    model_version = serializers.CharField()
    processing_time = serializers.FloatField()
    images = ImageDetailSerializer(many=True)
    created_at = serializers.DateTimeField()


class PredictionHistoryItemSerializer(serializers.Serializer):
    """Condensed prediction for history list."""
    prediction_id = serializers.IntegerField()
    job_id = serializers.UUIDField(allow_null=True)
    disease_name = serializers.CharField()
    confidence = serializers.FloatField()
    is_inconclusive = serializers.BooleanField()
    image_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class PredictionFeedbackSerializer(serializers.Serializer):
    """
    Validate user feedback submission for a prediction.
    
    FR-DATA-LOOP: Enables feedback loop for future model review.
    """
    feedback = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=2000,
        help_text="Optional text feedback about the prediction"
    )
    is_incorrect = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Flag to mark prediction as incorrect"
    )


class ScanHistorySerializer(serializers.Serializer):
    """
    Serializer for scan history with body map support.
    
    Returns scan data including image, prediction results, and body location
    for display on the body map page.
    """
    id = serializers.IntegerField()
    title = serializers.CharField(allow_blank=True)
    body_location = serializers.CharField(allow_blank=True)
    disease_name = serializers.CharField()
    confidence = serializers.FloatField()
    image_url = serializers.CharField()
    date = serializers.DateTimeField()
    severity = serializers.CharField(allow_blank=True)
    notes = serializers.CharField(allow_blank=True)
    is_bookmarked = serializers.BooleanField()



