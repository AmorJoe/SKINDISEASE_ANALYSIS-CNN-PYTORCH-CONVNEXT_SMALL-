"""
Authentication Serializers - Data validation
"""
from rest_framework import serializers
from .models import User


class UserRegistrationSerializer(serializers.Serializer):
    """Validate user registration data"""
    full_name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=6, write_only=True, required=True)
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered")
        return value.lower()
    
    def validate_full_name(self, value):
        """Validate name format"""
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters")
        return value.strip()
    
    def validate_password(self, value):
        """Enforce password strength"""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters")
        return value


class UserLoginSerializer(serializers.Serializer):
    """Validate login credentials"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    remember_me = serializers.BooleanField(required=False, default=False)
    
    def validate_email(self, value):
        return value.lower()


class UserSerializer(serializers.ModelSerializer):
    """User data representation"""
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'account_status', 'created_at']
        read_only_fields = ['id', 'created_at']


class ForgotPasswordSerializer(serializers.Serializer):
    """Request password reset OTP"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Check if user exists"""
        if not User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("No account found with this email")
        return value.lower()


class VerifyOTPSerializer(serializers.Serializer):
    """Validate OTP code"""
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    
    def validate_otp_code(self, value):
        """Ensure OTP is numeric"""
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Set new password after OTP verification"""
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, required=True)
    new_password = serializers.CharField(min_length=6, write_only=True, required=True)
    
    def validate_new_password(self, value):
        """Enforce password strength"""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters")
        return value
