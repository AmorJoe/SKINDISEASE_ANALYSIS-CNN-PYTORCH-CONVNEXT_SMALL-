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
    SaveReportView,
    UpdateDoctorNotesView,
    ScanHistoryView,
    DeleteScanView,
    GenerateTreatmentView,
    ImageUploadAndPredictView,  # Legacy compatibility
)
from .views_doctor import (
    DoctorListView,
    BookAppointmentView,
    UserAppointmentsView,
    # DoctorAppointmentManageView,
    ShareReportView,
    DoctorSharedReportsView
)

urlpatterns = [
    # Doctor Module Endpoints (Commented out until module is created)
    # path('doctor/stats', DoctorDashboardStatsView.as_view(), name='doctor_stats'),
    # path('doctor/patients', PatientListView.as_view(), name='doctor_patients'),
    # path('doctor/patient-scans/<int:user_id>', DoctorPatientScansView.as_view(), name='doctor_patient_scans'),
    # path('doctor/scan-detail/<int:prediction_id>', DoctorScanDetailView.as_view(), name='doctor_scan_detail'),
    # path('doctor/update-review/<int:prediction_id>', UpdateScanReviewView.as_view(), name='doctor_update_review'),

    # Diseases Info

    
    # Phase 2 async endpoints
    path('upload', ImageUploadView.as_view(), name='upload_images'),
    path('status/<str:job_id>', JobStatusView.as_view(), name='job_status'),
    path('history', PredictionHistoryView.as_view(), name='prediction_history'),
    path('result/<int:prediction_id>', PredictionDetailView.as_view(), name='prediction_detail'),
    # Data Persistence
    path('save-report', SaveReportView.as_view(), name='save_report'),
    path('update-notes/<int:prediction_id>', UpdateDoctorNotesView.as_view(), name='update_notes'),
    # Scan History for Body Map
    path('scan-history', ScanHistoryView.as_view(), name='scan_history'),
    path('scan-history/<int:scan_id>', DeleteScanView.as_view(), name='delete_scan'),
    # User feedback (FR-DATA-LOOP)
    path('feedback/<int:prediction_id>', PredictionFeedbackView.as_view(), name='prediction_feedback'),
    # AI Treatment Plan Regeneration
    path('generate-treatment', GenerateTreatmentView.as_view(), name='generate_treatment'),
    
    # Doctor Module Endpoints
    path('doctors', DoctorListView.as_view(), name='doctor_list'),
    path('appointments/book', BookAppointmentView.as_view(), name='book_appointment'),
    path('appointments/my', UserAppointmentsView.as_view(), name='my_appointments'),
    # path('appointments/manage/<int:appointment_id>', DoctorAppointmentManageView.as_view(), name='manage_appointment'),
    path('reports/share', ShareReportView.as_view(), name='share_report'),
    path('reports/shared', DoctorSharedReportsView.as_view(), name='doctor_shared_reports'),
]

