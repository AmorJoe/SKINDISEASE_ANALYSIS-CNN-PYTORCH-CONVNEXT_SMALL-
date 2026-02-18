"""
Authentication Serializers - Data validation
"""
from rest_framework import serializers
from .models import User
from .validators import validate_password_strength


class UserRegistrationSerializer(serializers.Serializer):
    """Validate user registration data"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered")
        return value.lower()
    
    def validate_password(self, value):
        """Enforce password strength"""
        return validate_password_strength(value)


class UserLoginSerializer(serializers.Serializer):
    """Validate login credentials"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    remember_me = serializers.BooleanField(required=False, default=False)
    
    def validate_email(self, value):
        return value.lower()


class UserSerializer(serializers.ModelSerializer):
    """User data representation"""
    age = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 
            'phone', 'date_of_birth', 'age', 'gender', 'country', 'address',
            'avatar', 'skin_type', 'skin_tone',
            'is_admin', 'assigned_model',
            'account_status', 'last_login', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'email', 'is_admin']

    def get_age(self, obj):
        """Calculate age from date_of_birth"""
        if not obj.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))


class ChangePasswordSerializer(serializers.Serializer):
    """Validate password change request"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(min_length=8, required=True)
    confirm_password = serializers.CharField(min_length=8, required=True)

    def validate_new_password(self, value):
        return validate_password_strength(value)
    
    def validate(self, data):
        """Validate that new_password and confirm_password match"""
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match'
            })
        return data


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
