"""
Authentication Models - User, Login, and OTP
"""
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
import random


class AccountStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    UNVERIFIED = 'UNVERIFIED', 'Unverified'
    LOCKED = 'LOCKED', 'Locked'
    DELETED = 'DELETED', 'Deleted'


class User(models.Model):
    """User account information"""
    id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    def is_active(self):
        return self.account_status == AccountStatus.ACTIVE


class Login(models.Model):
    """User authentication credentials"""
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='login')
    password_hash = models.CharField(max_length=255)
    last_login = models.DateTimeField(blank=True, null=True)
    login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'login'
    
    def set_password(self, raw_password):
        """Hash and store password"""
        self.password_hash = make_password(raw_password)
        self.save()
    
    def check_password(self, raw_password):
        """Verify password"""
        return check_password(raw_password, self.password_hash)
    
    def increment_login_attempts(self):
        """Track failed login attempts"""
        self.login_attempts += 1
        if self.login_attempts >= 5:
            self.locked_until = timezone.now() + timedelta(hours=1)
        self.save()
    
    def reset_login_attempts(self):
        """Reset after successful login"""
        self.login_attempts = 0
        self.locked_until = None
        self.last_login = timezone.now()
        self.save()
    
    def is_locked(self):
        """Check if account is temporarily locked"""
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False


class PasswordResetOTP(models.Model):
    """One-Time Password for password recovery"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_requests')
    otp_code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    
    class Meta:
        db_table = 'password_reset_otp'
        ordering = ['-created_at']
    
    def is_valid(self):
        """Check if OTP is still valid"""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def mark_as_used(self):
        """Mark OTP as consumed"""
        self.is_used = True
        self.save()
    
    @staticmethod
    def generate_otp():
        """Generate 6-digit OTP"""
        return str(random.randint(100000, 999999))
