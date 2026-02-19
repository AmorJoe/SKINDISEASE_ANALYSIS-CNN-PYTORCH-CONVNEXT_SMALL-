"""
Prediction Models - Image Upload & AI Results
"""
from django.db import models
from authentication.models import User


class SkinImage(models.Model):
    """
    Stores uploaded skin images
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    image_url = models.CharField(max_length=500)  # Supabase Storage URL
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # Bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'skin_images'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['user', '-uploaded_at'], name='idx_image_user_date'),
        ]
    
    def __str__(self):
        return f"{self.original_filename} (User: {self.user.email})"


class PredictionResult(models.Model):
    """
    Stores AI diagnosis results
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions')
    image = models.ForeignKey(SkinImage, on_delete=models.CASCADE, related_name='results')
    disease_name = models.CharField(max_length=100, blank=True, null=True, default='Unknown')
    confidence_score = models.FloatField()  # 0-100%
    recommendation = models.TextField()
    report = models.FileField(upload_to='reports/', blank=True, null=True)  # New Report Column
    doctor_notes = models.TextField(blank=True, null=True)  # Doctor's notes field
    notes_updated_at = models.DateTimeField(blank=True, null=True)  # Last update timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prediction_results'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_prediction_user_date'),
            models.Index(fields=['disease_name'], name='idx_prediction_disease'),
        ]
    
    def __str__(self):
        return f"{self.disease_name} ({self.confidence_score}%) - {self.user.email}"


class ScanHistory(models.Model):
    """
    NEW - Dashboard & tracking metadata for scans
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scan_history')
    image = models.ForeignKey(SkinImage, on_delete=models.CASCADE, related_name='scan_metadata')
    result = models.ForeignKey(PredictionResult, on_delete=models.CASCADE, related_name='scan_metadata')
    
    # User-defined metadata
    title = models.CharField(max_length=100, blank=True)  # e.g., "Left arm rash"
    notes = models.TextField(blank=True)
    is_bookmarked = models.BooleanField(default=False)
    
    # Medical tracking
    severity_tag = models.CharField(
        max_length=20,
        choices=[
            ('Mild', 'Mild'),
            ('Moderate', 'Moderate'),
            ('Severe', 'Severe')
        ],
        blank=True
    )
    body_location = models.CharField(max_length=50, blank=True)  # For body map feature
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scan_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_scan_user_date'),
            models.Index(fields=['body_location'], name='idx_scan_body_location'),
            models.Index(fields=['severity_tag'], name='idx_scan_severity'),
            models.Index(fields=['is_bookmarked'], name='idx_scan_bookmarked'),
        ]
    
    def __str__(self):
        return f"{self.title or 'Scan'} - {self.user.email}"


class Appointment(models.Model):
    """
    Doctor Appointment Booking
    """
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments_as_patient')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments_as_doctor')
    
    date = models.DateField()
    time_slot = models.CharField(max_length=50) # e.g. "10:00 AM - 10:30 AM"
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('CONFIRMED', 'Confirmed'),
            ('REJECTED', 'Rejected'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled')
        ],
        default='PENDING'
    )
    
    video_link = models.URLField(default="https://meet.google.com/xyz-abc-def", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['date', 'time_slot']
        
    def __str__(self):
        return f"Appointment: {self.patient.email} with {self.doctor.email} on {self.date}"


class SharedReport(models.Model):
    """
    Securely share a PredictionResult with a Doctor
    """
    report = models.ForeignKey(PredictionResult, on_delete=models.CASCADE, related_name='shares')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_reports')
    
    shared_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[('SENT', 'Sent'), ('REVIEWED', 'Reviewed')],
        default='SENT'
    )
    
    doctor_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'shared_reports'
        ordering = ['-shared_at']
        unique_together = ('report', 'doctor') # Avoid duplicate shares
        
    def __str__(self):
        return f"Report {self.report.id} shared with {self.doctor.email}"


