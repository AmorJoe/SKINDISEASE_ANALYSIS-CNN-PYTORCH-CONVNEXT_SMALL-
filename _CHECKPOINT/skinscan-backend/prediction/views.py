"""
Prediction Views - Async image upload and AI analysis

Phase 2 v2.0 Compliant:
- Async processing with job-based workflow
- Cloud storage (no local filesystem)
- Multi-image support (1-3 images)
- Medical safety gating
- Hard/soft image validation
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
import uuid

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from PIL import Image
import io

from .models import PredictionJob, PredictionResult, SkinImage, JobStatus
from .image_validator import ImageQualityValidator, ValidationResult
from .cnn_inference import get_predictor, PredictionOutput
from .storage_service import get_storage_service
from .exceptions import (
    ImageValidationError,
    ModelUnavailableError,
    StorageError,
    JobNotFoundError
)
from .serializers import (
    MultiImageUploadSerializer,
    JobStatusSerializer,
    PredictionResultSerializer,
    PredictionFeedbackSerializer
)

logger = logging.getLogger(__name__)

# Thread pool for background processing
_executor = ThreadPoolExecutor(max_workers=4)


def _process_prediction_job(job_id: uuid.UUID) -> None:
    """
    Background worker to process a prediction job.
    
    This function runs in a separate thread and:
    1. Updates job status to PROCESSING
    2. Retrieves images from cloud storage
    3. Runs CNN inference
    4. Creates prediction result
    5. Updates job status to COMPLETED or FAILED
    """
    from django.db import connection
    
    try:
        # Get job and its images
        job = PredictionJob.objects.get(id=job_id)
        job.mark_processing()
        
        images = list(job.images.all())
        
        if not images:
            job.mark_failed("No images found for this job")
            return
        
        # Preprocess all images for CNN
        predictor = get_predictor()
        preprocessed_images = []
        
        for skin_image in images:
            # For now, we'll use the stored image bytes
            # In production, you would fetch from cloud storage
            # For Phase 2, we store image bytes temporarily during upload
            img_bytes = getattr(skin_image, '_image_bytes', None)
            
            if img_bytes:
                preprocessed = ImageQualityValidator.preprocess_bytes_for_cnn(img_bytes)
                preprocessed_images.append(preprocessed)
        
        if not preprocessed_images:
            job.mark_failed("Could not preprocess images for inference")
            return
        
        # Run prediction
        if len(preprocessed_images) == 1:
            prediction_output = predictor.predict(preprocessed_images[0])
        else:
            prediction_output = predictor.predict_multi(preprocessed_images)
        
        # Create prediction result
        PredictionResult.objects.create(
            job=job,
            image=images[0] if images else None,
            disease_name=prediction_output.disease_name,
            confidence_score=prediction_output.confidence,
            raw_probabilities=prediction_output.all_probabilities,
            recommendation=prediction_output.recommendation,
            model_version=predictor.model_version,
            processing_time=prediction_output.processing_time,
            is_inconclusive=prediction_output.is_inconclusive,
            aggregated_from_count=len(images)
        )
        
        job.mark_completed()
        logger.info(f"Job {job_id} completed successfully")
        
    except ModelUnavailableError as e:
        logger.error(f"Job {job_id} failed - model unavailable: {str(e)}")
        try:
            job = PredictionJob.objects.get(id=job_id)
            job.mark_failed(f"AI model unavailable: {str(e)}")
        except PredictionJob.DoesNotExist:
            pass
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        try:
            job = PredictionJob.objects.get(id=job_id)
            job.mark_failed(f"Processing error: {str(e)}")
        except PredictionJob.DoesNotExist:
            pass
    
    finally:
        # Close database connection for this thread
        connection.close()


class ImageUploadView(APIView):
    """
    Upload images and create prediction job.
    
    POST /api/predict/upload
    
    Accepts 1-3 images, validates them, uploads to cloud storage,
    creates a PredictionJob, and returns job_id immediately.
    Processing happens asynchronously in the background.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle image upload and create prediction job."""
        
        # Check if images are provided
        images = request.FILES.getlist('images')
        
        # Also check for single 'image' field for backward compatibility
        if not images and 'image' in request.FILES:
            images = [request.FILES['image']]
        
        if not images:
            return Response({
                'status': 'error',
                'error_code': 'IMAGES_REQUIRED',
                'message': 'At least one image file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(images) > 3:
            return Response({
                'status': 'error',
                'error_code': 'TOO_MANY_IMAGES',
                'message': 'Maximum 3 images allowed per request'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all images before processing
        validated_images = []
        
        for idx, image_file in enumerate(images):
            # Validate file format
            is_valid, error_msg = ImageQualityValidator.validate_file_format(
                image_file.name
            )
            if not is_valid:
                return Response({
                    'status': 'error',
                    'error_code': 'INVALID_FORMAT',
                    'message': f"Image {idx + 1}: {error_msg}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size
            is_valid, error_msg = ImageQualityValidator.validate_file_size(
                image_file.size
            )
            if not is_valid:
                return Response({
                    'status': 'error',
                    'error_code': 'FILE_TOO_LARGE',
                    'message': f"Image {idx + 1}: {error_msg}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate image quality (hard fail checks)
            try:
                validation_result = ImageQualityValidator.validate_image(image_file)
                validated_images.append({
                    'file': image_file,
                    'validation': validation_result
                })
            except ImageValidationError as e:
                return Response({
                    'status': 'error',
                    'error_code': e.error_code,
                    'message': f"Image {idx + 1}: {e.message}",
                    'details': e.validation_details
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # All images validated - create job and upload to cloud
        try:
            storage = get_storage_service()
            
            # Create prediction job
            job = PredictionJob.objects.create(
                user=request.user,
                status=JobStatus.PENDING,
                image_count=len(validated_images)
            )
            
            # Upload images and create SkinImage records
            skin_images = []
            
            for item in validated_images:
                image_file = item['file']
                validation = item['validation']
                
                # Read image bytes
                image_file.seek(0)
                image_bytes = image_file.read()
                
                # Upload to cloud storage
                cloud_url = storage.upload_image(
                    file_bytes=image_bytes,
                    filename=image_file.name,
                    user_id=request.user.id
                )
                
                # Create SkinImage record
                skin_image = SkinImage.objects.create(
                    user=request.user,
                    job=job,
                    image_url=cloud_url,
                    original_filename=image_file.name,
                    file_size=len(image_bytes),
                    image_width=validation.width,
                    image_height=validation.height,
                    quality_score=validation.quality_score,
                    is_valid=True,
                    has_quality_warning=validation.has_warning,
                    quality_warning_message=validation.warning_message if validation.has_warning else None
                )
                
                # Store bytes temporarily for background processing
                skin_image._image_bytes = image_bytes
                skin_images.append(skin_image)
            
            # Store image bytes in a way the background thread can access
            # This is a temporary solution - in production, fetch from cloud
            _image_bytes_cache[str(job.id)] = [
                {'id': img.id, 'bytes': img._image_bytes}
                for img in skin_images
            ]
            
            # Submit job for background processing
            _executor.submit(_process_prediction_job_with_bytes, job.id)
            
            # Build response with warnings if any
            warnings = []
            for idx, item in enumerate(validated_images):
                if item['validation'].has_warning:
                    warnings.append({
                        'image': idx + 1,
                        'message': item['validation'].warning_message
                    })
            
            response_data = {
                'status': 'success',
                'message': 'Prediction job created successfully',
                'data': {
                    'job_id': str(job.id),
                    'status': job.status,
                    'image_count': len(validated_images),
                    'created_at': job.created_at.isoformat()
                }
            }
            
            if warnings:
                response_data['data']['quality_warnings'] = warnings
            
            return Response(response_data, status=status.HTTP_202_ACCEPTED)
            
        except StorageError as e:
            logger.error(f"Storage error: {str(e)}")
            return Response({
                'status': 'error',
                'error_code': 'STORAGE_ERROR',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        except Exception as e:
            logger.error(f"Upload error: {str(e)}")
            return Response({
                'status': 'error',
                'error_code': 'UPLOAD_FAILED',
                'message': 'Failed to process upload'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Temporary cache for image bytes (in production, fetch from cloud)
_image_bytes_cache = {}


def _process_prediction_job_with_bytes(job_id: uuid.UUID) -> None:
    """
    Background worker with access to cached image bytes.
    """
    from django.db import connection
    
    try:
        job = PredictionJob.objects.get(id=job_id)
        job.mark_processing()
        
        # Get cached image bytes
        cached_data = _image_bytes_cache.pop(str(job_id), [])
        
        if not cached_data:
            job.mark_failed("Image data not found in cache")
            return
        
        # Preprocess all images for CNN
        predictor = get_predictor()
        preprocessed_images = []
        
        for item in cached_data:
            preprocessed = ImageQualityValidator.preprocess_bytes_for_cnn(
                item['bytes']
            )
            preprocessed_images.append(preprocessed)
        
        # Run prediction
        if len(preprocessed_images) == 1:
            prediction_output = predictor.predict(preprocessed_images[0])
        else:
            prediction_output = predictor.predict_multi(preprocessed_images)
        
        # Get first image for backward compatibility
        images = list(job.images.all())
        first_image = images[0] if images else None
        
        # Create prediction result
        PredictionResult.objects.create(
            job=job,
            image=first_image,
            disease_name=prediction_output.disease_name,
            confidence_score=prediction_output.confidence,
            raw_probabilities=prediction_output.all_probabilities,
            recommendation=prediction_output.recommendation,
            model_version=predictor.model_version,
            processing_time=prediction_output.processing_time,
            is_inconclusive=prediction_output.is_inconclusive,
            aggregated_from_count=len(cached_data)
        )
        
        job.mark_completed()
        logger.info(f"Job {job_id} completed successfully")
        
    except ModelUnavailableError as e:
        logger.error(f"Job {job_id} failed - model unavailable: {str(e)}")
        try:
            job = PredictionJob.objects.get(id=job_id)
            job.mark_failed(f"AI model unavailable: {str(e)}")
        except PredictionJob.DoesNotExist:
            pass
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        try:
            job = PredictionJob.objects.get(id=job_id)
            job.mark_failed(f"Processing error: {str(e)}")
        except PredictionJob.DoesNotExist:
            pass
    
    finally:
        connection.close()


class JobStatusView(APIView):
    """
    Check prediction job status.
    
    GET /api/predict/status/<job_id>
    
    Returns job status and result if completed.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, job_id: str):
        """Get job status and result."""
        try:
            job = PredictionJob.objects.get(
                id=job_id,
                user=request.user
            )
        except PredictionJob.DoesNotExist:
            return Response({
                'status': 'error',
                'error_code': 'JOB_NOT_FOUND',
                'message': 'Prediction job not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({
                'status': 'error',
                'error_code': 'INVALID_JOB_ID',
                'message': 'Invalid job ID format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response_data = {
            'status': 'success',
            'data': {
                'job_id': str(job.id),
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                'image_count': job.image_count
            }
        }
        
        # Include error message if failed
        if job.status == JobStatus.FAILED:
            response_data['data']['error_message'] = job.error_message
        
        # Include result if completed
        if job.status == JobStatus.COMPLETED:
            try:
                result = job.result
                images = job.images.all()
                
                response_data['data']['result'] = {
                    'prediction_id': result.id,
                    'disease_name': result.disease_name,
                    'confidence': round(result.confidence_score, 2),
                    'is_inconclusive': result.is_inconclusive,
                    'recommendation': result.recommendation,
                    'all_probabilities': {
                        k: round(v, 2) 
                        for k, v in (result.raw_probabilities or {}).items()
                    },
                    'model_version': result.model_version,
                    'processing_time': round(result.processing_time, 3),
                    'images': [
                        {
                            'id': img.id,
                            'url': img.image_url,
                            'width': img.image_width,
                            'height': img.image_height,
                            'quality_score': round(img.quality_score, 2),
                            'has_warning': img.has_quality_warning,
                            'warning_message': img.quality_warning_message
                        }
                        for img in images
                    ]
                }
            except PredictionResult.DoesNotExist:
                response_data['data']['error_message'] = "Result not found"
        
        return Response(response_data, status=status.HTTP_200_OK)


class PredictionHistoryView(APIView):
    """
    Get user's prediction history.
    
    GET /api/predict/history
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Retrieve all predictions for current user."""
        
        # Get completed jobs with results
        jobs = PredictionJob.objects.filter(
            user=request.user,
            status=JobStatus.COMPLETED
        ).select_related('result').prefetch_related('images').order_by('-created_at')
        
        history = []
        for job in jobs:
            try:
                result = job.result
                history.append({
                    'job_id': str(job.id),
                    'prediction_id': result.id,
                    'disease_name': result.disease_name,
                    'confidence': round(result.confidence_score, 2),
                    'is_inconclusive': result.is_inconclusive,
                    'image_count': job.image_count,
                    'created_at': result.created_at.isoformat()
                })
            except PredictionResult.DoesNotExist:
                continue
        
        return Response({
            'status': 'success',
            'message': 'Prediction history retrieved',
            'data': {
                'total_predictions': len(history),
                'history': history
            }
        }, status=status.HTTP_200_OK)


class PredictionDetailView(APIView):
    """
    Get detailed prediction result.
    
    GET /api/predict/result/<prediction_id>
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, prediction_id: int):
        """Get full details of a specific prediction."""
        
        try:
            result = PredictionResult.objects.select_related('job').get(
                id=prediction_id
            )
            
            # Check ownership via job or image
            if result.job and result.job.user_id != request.user.id:
                raise PredictionResult.DoesNotExist()
            elif result.image and result.image.user_id != request.user.id:
                raise PredictionResult.DoesNotExist()
                
        except PredictionResult.DoesNotExist:
            return Response({
                'status': 'error',
                'error_code': 'PREDICTION_NOT_FOUND',
                'message': 'Prediction not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get images
        images = []
        if result.job:
            for img in result.job.images.all():
                images.append({
                    'id': img.id,
                    'url': img.image_url,
                    'width': img.image_width,
                    'height': img.image_height,
                    'quality_score': round(img.quality_score, 2),
                    'has_warning': img.has_quality_warning,
                    'warning_message': img.quality_warning_message,
                    'uploaded_at': img.uploaded_at.isoformat()
                })
        elif result.image:
            img = result.image
            images.append({
                'id': img.id,
                'url': img.image_url,
                'width': img.image_width,
                'height': img.image_height,
                'quality_score': round(img.quality_score, 2),
                'has_warning': img.has_quality_warning,
                'warning_message': img.quality_warning_message,
                'uploaded_at': img.uploaded_at.isoformat()
            })
        
        return Response({
            'status': 'success',
            'data': {
                'prediction_id': result.id,
                'job_id': str(result.job.id) if result.job else None,
                'disease_name': result.disease_name,
                'confidence': round(result.confidence_score, 2),
                'is_inconclusive': result.is_inconclusive,
                'recommendation': result.recommendation,
                'all_probabilities': {
                    k: round(v, 2)
                    for k, v in (result.raw_probabilities or {}).items()
                },
                'model_version': result.model_version,
                'processing_time': round(result.processing_time, 3),
                'images': images,
                'created_at': result.created_at.isoformat()
            }
        }, status=status.HTTP_200_OK)


# Legacy endpoint for backward compatibility
class ImageUploadAndPredictView(ImageUploadView):
    """
    Legacy endpoint - redirects to new async upload.
    
    Kept for backward compatibility with existing API consumers.
    """
    pass


class PredictionFeedbackView(APIView):
    """
    Submit user feedback on a prediction.
    
    POST /api/predict/feedback/<prediction_id>
    
    FR-DATA-LOOP: Enables feedback collection for future model review
    and external retraining. No training occurs in the deployed system.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, prediction_id: int):
        """Submit feedback on a prediction the user owns."""
        
        # Validate input
        serializer = PredictionFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'error_code': 'INVALID_INPUT',
                'message': 'Invalid feedback data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the prediction and verify ownership
        try:
            result = PredictionResult.objects.select_related('job', 'image').get(
                id=prediction_id
            )
            
            # Check ownership via job or image
            is_owner = False
            if result.job and result.job.user_id == request.user.id:
                is_owner = True
            elif result.image and result.image.user_id == request.user.id:
                is_owner = True
            
            if not is_owner:
                raise PredictionResult.DoesNotExist()
                
        except PredictionResult.DoesNotExist:
            return Response({
                'status': 'error',
                'error_code': 'PREDICTION_NOT_FOUND',
                'message': 'Prediction not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Save feedback
        feedback_text = serializer.validated_data.get('feedback', '')
        is_incorrect = serializer.validated_data.get('is_incorrect', False)
        
        result.user_feedback = feedback_text
        result.is_user_reported_incorrect = is_incorrect
        result.feedback_timestamp = timezone.now()
        result.save(update_fields=[
            'user_feedback', 
            'is_user_reported_incorrect', 
            'feedback_timestamp'
        ])
        
        logger.info(
            f"Feedback submitted for prediction {prediction_id} by user {request.user.id}"
        )
        
        return Response({
            'status': 'success',
            'message': 'Feedback submitted successfully',
            'data': {
                'prediction_id': prediction_id,
                'feedback_recorded': True,
                'is_reported_incorrect': is_incorrect
            }
        }, status=status.HTTP_200_OK)
