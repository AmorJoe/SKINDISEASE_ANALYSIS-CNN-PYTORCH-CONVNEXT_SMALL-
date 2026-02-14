"""
Prediction URL Routes

Phase 2 v2.0 Endpoints:
- POST /upload - Async image upload, returns job_id
- GET /status/<job_id> - Check job status and get results
- GET /history - User's prediction history
- GET /result/<prediction_id> - Detailed prediction result
- POST /feedback/<prediction_id> - Submit user feedback
"""
from django.urls import path
from .views import (
    ImageUploadView,
    JobStatusView,
    PredictionHistoryView,
    PredictionDetailView,
    PredictionFeedbackView,
    ImageUploadAndPredictView  # Legacy compatibility
)

urlpatterns = [
    # Phase 2 async endpoints
    path('upload', ImageUploadView.as_view(), name='upload_images'),
    path('status/<str:job_id>', JobStatusView.as_view(), name='job_status'),
    path('history', PredictionHistoryView.as_view(), name='prediction_history'),
    path('result/<int:prediction_id>', PredictionDetailView.as_view(), name='prediction_detail'),
    # User feedback (FR-DATA-LOOP)
    path('feedback/<int:prediction_id>', PredictionFeedbackView.as_view(), name='prediction_feedback'),
]
