"""
Prediction Views - Async image upload and AI analysis
(Database removed - Using In-Memory Storage for Demo)
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
import uuid
import time
from datetime import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from PIL import Image
import io

# Models restored for saving
from .models import PredictionResult, SkinImage
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
    PredictionFeedbackSerializer,
    ScanHistorySerializer
)

logger = logging.getLogger(__name__)

# Thread pool for background processing
_executor = ThreadPoolExecutor(max_workers=4)

# IN-MEMORY STORE (Replaces Database)
# Structure: { job_id_str: { 'status': 'PENDING', 'data': {...}, 'result': {...} } }
_JOBS_STORE: Dict[str, Any] = {}

class JobStatus:
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'


# ... (Existing memory logic skipped for brevity) ...

class SaveReportView(APIView):
    """
    Save the generated PDF report and prediction metadata to the database.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # User is now a real model instance thanks to JWT refactor
            user = request.user
            
            # Extract Data
            report_pdf = request.FILES.get('report')
            image_file = request.FILES.get('image')
            disease_name = request.data.get('disease_name')
            confidence = request.data.get('confidence')
            recommendation = request.data.get('recommendation')
            body_location = request.data.get('body_location', 'Unspecified')
            title = request.data.get('title', '')

            # Security: File validation for PDF
            if report_pdf:
                # Validate file size (max 10MB)
                max_size = 10 * 1024 * 1024  # 10MB in bytes
                if report_pdf.size > max_size:
                    return Response({
                        'status': 'error',
                        'message': 'File size exceeds 10MB limit'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate file type
                if not report_pdf.name.endswith('.pdf'):
                    return Response({
                        'status': 'error',
                        'message': 'Only PDF files are allowed'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # 1. Create SkinImage Entry with actual uploaded image
            image_url = 'placeholder.jpg'
            file_size = 0
            original_filename = 'scan_image.jpg'

            if image_file:
                try:
                    from django.core.files.storage import default_storage
                    import os
                    import uuid

                    # Generate unique filename to avoid collisions and issues
                    ext = os.path.splitext(image_file.name)[1]
                    filename = f"scan_{uuid.uuid4().hex}{ext}"
                    file_path = os.path.join('uploads', filename)
                    
                    logger.info(f"Saving image to {file_path}")
                    
                    # Save the file
                    saved_path = default_storage.save(file_path, image_file)
                    image_url = saved_path
                    file_size = image_file.size
                    original_filename = image_file.name
                    logger.info(f"Image saved successfully at {saved_path}")
                except Exception as e:
                    logger.error(f"Failed to save image file: {e}")
                    # Continue without saving the file, using placeholder
                    image_url = 'placeholder.jpg'

            logger.info("Creating SkinImage record...")
            skin_image = SkinImage.objects.create(
                user=user,
                image_url=image_url,
                original_filename=original_filename,
                file_size=file_size
            )
            logger.info(f"SkinImage created: {skin_image.id}")

            # 2. Save Prediction Result with Report
            try:
                confidence_val = float(confidence)
            except (ValueError, TypeError):
                confidence_val = 0.0

            logger.info("Creating PredictionResult record...")
            prediction = PredictionResult.objects.create(
                user=user,
                image=skin_image,
                disease_name=disease_name,
                confidence_score=confidence_val,
                recommendation=recommendation,
                report=report_pdf  # Saves to 'reports/'
            )
            logger.info(f"PredictionResult created: {prediction.id}")

            # 3. Create ScanHistory Entry for Body Map
            from .models import ScanHistory
            
            # Use title if provided, otherwise generate default
            if not title:
                import datetime
                date_str = datetime.datetime.now().strftime("%b %d")
                title = f"Scan on {date_str} - {body_location}"
            
            logger.info("Creating ScanHistory record...")
            scan_history = ScanHistory.objects.create(
                user=user,
                image=skin_image,
                result=prediction,
                title=title,
                body_location=body_location,
                severity_tag='Moderate'  # Default, can be updated later
            )
            logger.info(f"ScanHistory created: {scan_history.id}")

            response_data = {
                'status': 'success',
                'message': 'Report saved successfully',
                'data': {
                    'prediction_id': prediction.id,
                    'scan_history_id': scan_history.id
                }
            }
            logger.info("Returning success response")
            return Response(response_data, status=201)

        except Exception as e:
            logger.error(f"Failed to save report: {e}")
            return Response({'status': 'error', 'message': str(e)}, status=500)



def _process_prediction_job_in_memory(job_id: str, image_bytes_list: List[bytes]) -> None:
    """
    Background worker using in-memory store.
    """
    try:
        job = _JOBS_STORE.get(job_id)
        if not job:
            return

        job['status'] = JobStatus.PROCESSING
        
        # Preprocess all images for CNN
        predictor = get_predictor()
        preprocessed_images = []
        
        for img_bytes in image_bytes_list:
            preprocessed = ImageQualityValidator.preprocess_bytes_for_cnn(img_bytes)
            preprocessed_images.append(preprocessed)
        
        # Run prediction
        if len(preprocessed_images) == 1:
            prediction_output = predictor.predict(preprocessed_images[0])
        else:
            prediction_output = predictor.predict_multi(preprocessed_images)
        
        # Create result object (dict)
        result = {
            'prediction_id': int(time.time()), # Mock ID
            'disease_name': prediction_output.disease_name,
            'confidence': prediction_output.confidence,
            'raw_probabilities': prediction_output.all_probabilities,
            'recommendation': prediction_output.recommendation,
            'model_version': predictor.model_version,
            'processing_time': prediction_output.processing_time,
            'is_inconclusive': prediction_output.is_inconclusive,
            'created_at': datetime.now().isoformat(),
            'images': [] # Simplified
        }
        
        job['result'] = result
        job['status'] = JobStatus.COMPLETED
        job['completed_at'] = datetime.now().isoformat()
        
        logger.info(f"Job {job_id} completed successfully (In-Memory)")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        if job:
            job['status'] = JobStatus.FAILED
            job['error_message'] = str(e)


class ImageUploadView(APIView):
    """
    Upload images and create prediction job.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        images = request.FILES.getlist('images')
        if not images and 'image' in request.FILES:
            images = [request.FILES['image']]
        
        if not images:
            return Response({'status': 'error', 'message': 'No images provided'}, status=400)

        # Validate images (simplified)
        validated_bytes = []
        for img in images:
            try:
                ImageQualityValidator.validate_image(img)
                img.seek(0)
                validated_bytes.append(img.read())
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=400)

        # ---------------------------------------------------------
        # SYNCHRONOUS PREDICTION (Fix for "undefined" in frontend)
        # ---------------------------------------------------------
        try:
            # Preprocess all images for CNN
            predictor = get_predictor()
            preprocessed_images = []
            
            for img_bytes in validated_bytes:
                preprocessed = ImageQualityValidator.preprocess_bytes_for_cnn(img_bytes)
                preprocessed_images.append(preprocessed)
            
            # Run prediction
            if len(preprocessed_images) == 1:
                prediction_output = predictor.predict(preprocessed_images[0])
            else:
                prediction_output = predictor.predict_multi(preprocessed_images)
            
            # Create result object (dict)
            result = {
                'prediction_id': int(time.time()), # Mock ID
                'disease_name': prediction_output.disease_name,
                'confidence': prediction_output.confidence,
                'raw_probabilities': prediction_output.all_probabilities,
                'recommendation': prediction_output.recommendation,
                'model_version': predictor.model_version,
                'processing_time': prediction_output.processing_time,
                'is_inconclusive': prediction_output.is_inconclusive,
                'created_at': datetime.now().isoformat(),
                'images': [] # Simplified
            }

            # Return DIRECTLY to frontend (matches script.js expectation)
            return Response({
                'status': 'success',
                'message': 'Prediction completed successfully',
                'data': result
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return Response({'status': 'error', 'message': str(e)}, status=500)


class JobStatusView(APIView):
    """Check prediction job status."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, job_id: str):
        job = _JOBS_STORE.get(job_id)
        
        if not job:
             return Response({'status': 'error', 'error_code': 'JOB_NOT_FOUND'}, status=404)
        
        response_data = {
            'status': 'success',
            'data': {
                'job_id': job_id,
                'status': job['status'],
                'created_at': job['created_at'],
                'image_count': job['image_count']
            }
        }
        
        if job['status'] == JobStatus.COMPLETED:
            response_data['data']['result'] = job['result']
        elif job['status'] == JobStatus.FAILED:
            response_data['data']['error_message'] = job.get('error_message')
            
        return Response(response_data, status=200)


class PredictionHistoryView(APIView):
    """Get history (Empty for now)."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            predictions = PredictionResult.objects.filter(user=request.user)
            serializer = PredictionResultSerializer(predictions, many=True)
            return Response({
                'status': 'success',
                'data': {'history': serializer.data}
            }, status=200)
        except Exception as e:
            logger.error(f"Error fetching prediction history: {str(e)}")
            return Response({'status': 'error', 'message': str(e)}, status=500)


class PredictionDetailView(APIView):
    """Get detail (Not supported in memory mode)."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, prediction_id):
        return Response({'status': 'error', 'message': 'Detail view not available in cleanup mode'}, status=404)


class PredictionFeedbackView(APIView):
    """Submit feedback (Mock)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, prediction_id):
        return Response({'status': 'success', 'message': 'Feedback recorded (Mock)'}, status=200)


class UpdateDoctorNotesView(APIView):
    """Update doctor's notes for a prediction result with auto-save."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, prediction_id):
        try:
            # Get the prediction result
            prediction = PredictionResult.objects.get(id=prediction_id, user=request.user)
            
            # Get notes from request
            notes = request.data.get('notes', '')
            
            # Validate notes length (max 10000 characters)
            if len(notes) > 10000:
                return Response({
                    'status': 'error',
                    'message': 'Notes exceed maximum length of 10000 characters'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update notes and timestamp
            prediction.doctor_notes = notes
            prediction.notes_updated_at = timezone.now()
            prediction.save()
            
            return Response({
                'status': 'success',
                'message': 'Notes saved successfully',
                'notes_updated_at': prediction.notes_updated_at.isoformat()
            }, status=status.HTTP_200_OK)
            
        except PredictionResult.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Prediction result not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating doctor notes: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to save notes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ScanHistoryView(APIView):
    """
    Get scan history for the authenticated user.
    Supports filtering by body location for the body map feature.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from .models import ScanHistory
            
            # Get all scan history for the user
            # Robustly filter by ID since request.user might be SimpleUser or User model
            scan_history = ScanHistory.objects.filter(user_id=request.user.id).select_related(
                'image', 'result'
            )
            
            # Optional: Filter by body location
            body_location = request.query_params.get('body_location')
            if body_location:
                scan_history = scan_history.filter(body_location=body_location)
            
            # Prepare data for serializer
            scan_data = []
            for scan in scan_history:
                scan_data.append({
                    'id': scan.id,
                    'title': scan.title,
                    'body_location': scan.body_location,
                    'disease_name': scan.result.disease_name,
                    'confidence': scan.result.confidence_score,
                    'image_url': scan.image.image_url,
                    'date': scan.created_at,  # Frontend expects 'date'
                    'severity': scan.severity_tag,  # Frontend expects 'severity'
                    'notes': scan.notes,
                    'is_bookmarked': scan.is_bookmarked
                })
            
            # Serialize the data
            serializer = ScanHistorySerializer(scan_data, many=True)
            
            return Response({
                'status': 'success',
                'data': {
                    'scans': serializer.data,
                    'total': len(serializer.data)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching scan history: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to fetch scan history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Legacy
class ImageUploadAndPredictView(ImageUploadView):
    pass

