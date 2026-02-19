"""
Authentication Models - User Management
"""
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class User(models.Model):
    """
    User model - Merged from old 'users' and 'login' tables
    """
    # Basic Info
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    
    # Optional Profile Fields
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Medical Context
    skin_type = models.CharField(max_length=50, blank=True, null=True)  # Oily, Dry, Normal, Combination
    skin_tone = models.CharField(max_length=50, blank=True, null=True)  # Fitzpatrick Scale I-VI
    
    # Account Management
    is_admin = models.BooleanField(default=False)
    is_doctor = models.BooleanField(default=False)
    specialty = models.CharField(max_length=100, blank=True, help_text="Doctor's specialization (e.g., Dermatologist)")
    assigned_model = models.CharField(max_length=255, blank=True, null=True)
    account_status = models.CharField(
        max_length=20,
        default='ACTIVE',
        choices=[('ACTIVE', 'Active'), ('LOCKED', 'Locked'), ('BANNED', 'Banned')]
    )
    last_login = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_user_email'),
            models.Index(fields=['account_status'], name='idx_user_status'),
            models.Index(fields=['-created_at'], name='idx_user_created'),
        ]
    
    def __str__(self):
        name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        return f"{name or 'User'} ({self.email})"
    
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password"""
        return check_password(raw_password, self.password_hash)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return self.account_status == 'ACTIVE'

    @property
    def full_name(self):
        # Fallback to legacy fields if profile doesn't exist yet
        if hasattr(self, 'profile'):
            return f"{self.profile.first_name or ''} {self.profile.last_name or ''}".strip() or "User"
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or "User"


class UserProfile(models.Model):
    """
    3NF Separation: Stores personal & medical metadata
    Linked 1-to-1 with the core User auth model
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', null=True)
    
    # Personal Info
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    # Medical Context
    skin_type = models.CharField(max_length=50, blank=True, null=True)
    skin_tone = models.CharField(max_length=50, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        
    def __str__(self):
        return f"Profile for {self.user.email}"


class DoctorProfile(models.Model):
    """
    3NF Separation: Stores doctor-specific professional details
    Linked 1-to-1 with the core User auth model
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    
    # Professional Credentials
    medical_license_number = models.CharField(max_length=50, unique=True, help_text="Medical Registration Number (MRN)")
    specialization = models.CharField(max_length=100)
    years_of_experience = models.PositiveIntegerField(default=0)
    hospital_affiliation = models.CharField(max_length=200, blank=True, null=True)
    
    # Verification & Status
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(blank=True, null=True)
    
    # Availability & Fees
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    available_days = models.JSONField(default=list, help_text="List of available days e.g. ['Mon', 'Tue']")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctor_profiles'
        
    def __str__(self):
        return f"Dr. {self.user.last_name or self.user.email} ({self.specialization})"
class Notification(models.Model):
    """
    In-app notification system for users and doctors.
    """
    NOTIFICATION_TYPES = [
        ('APPOINTMENT_REQUEST', 'New Appointment Request'),
        ('SCAN_COMPLETED', 'AI Scan Completed'),
        ('DOCTOR_VERIFIED', 'Doctor Account Verified'),
        ('SYSTEM', 'System Alert')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} for {self.user.email} - Read: {self.is_read}"


class DoctorDocument(models.Model):
    """
    Files shared by Doctor with Patient (Prescriptions, Lab Results, etc.)
    """
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_documents')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_documents')
    document = models.FileField(upload_to='doctor_documents/')
    name = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doctor_documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"Doc: {self.name} from {self.doctor.email} to {self.patient.email}"
