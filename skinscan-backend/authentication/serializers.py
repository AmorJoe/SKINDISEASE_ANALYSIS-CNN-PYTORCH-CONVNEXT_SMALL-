"""
Authentication Serializers - Data validation
"""
from rest_framework import serializers
from .models import User
from .validators import validate_password_strength
import logging

logger = logging.getLogger(__name__)


class UserRegistrationSerializer(serializers.Serializer):
    """Validate user registration data"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    
    # Optional Profile Fields
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    # Doctor Specific Fields
    is_doctor = serializers.BooleanField(required=False, default=False)
    medical_license_number = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered")
        return value.lower()
    
    def validate(self, data):
        """Cross-field validation"""
        if data.get('is_doctor'):
            if not data.get('medical_license_number'):
                raise serializers.ValidationError({"medical_license_number": "Required for doctor registration"})
        return data
    
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
    
    # Map fields to UserProfile
    first_name = serializers.CharField(source='profile.first_name', required=False, allow_null=True)
    last_name = serializers.CharField(source='profile.last_name', required=False, allow_null=True)
    phone = serializers.CharField(source='profile.phone', required=False, allow_null=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', required=False, allow_null=True)
    gender = serializers.CharField(source='profile.gender', required=False, allow_null=True)
    country = serializers.CharField(source='profile.country', required=False, allow_null=True)
    address = serializers.CharField(source='profile.address', required=False, allow_null=True)
    avatar = serializers.ImageField(source='profile.avatar', required=False, allow_null=True)
    skin_type = serializers.CharField(source='profile.skin_type', required=False, allow_null=True)
    skin_tone = serializers.CharField(source='profile.skin_tone', required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email',
            'phone', 'date_of_birth', 'age', 'gender', 'country', 'address',
            'avatar', 'skin_type', 'skin_tone',
            'is_admin', 'is_doctor', 'specialty', 'assigned_model',
            'account_status', 'last_login', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'email', 'is_admin']

    def get_age(self, obj):
        """Calculate age from date_of_birth"""
        dob = None
        # Prioritize profile, fallback to legacy if needed (though migration should fill profile)
        if hasattr(obj, 'profile') and obj.profile.date_of_birth:
             dob = obj.profile.date_of_birth
        elif hasattr(obj, 'date_of_birth'):
             dob = obj.date_of_birth
             
        if not dob:
            return None
            
        from datetime import date
        today = date.today()
        # Handle potential date vs datetime issues if legacy was datetime
        if hasattr(dob, 'date'):
            dob = dob.date()
            
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def update(self, instance, validated_data):
        """Handle updates to nested profile data"""
        logger.info(f"DEBUG: UserSerializer.update validated_data keys: {list(validated_data.keys())}")
        profile_data = validated_data.pop('profile', {})

        # Update only the fields that belong directly to the User model
        user_fields = ['is_doctor', 'specialty', 'assigned_model', 'account_status']
        user_changed = False
        for attr in user_fields:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
                user_changed = True
        if user_changed:
            instance.save()

        # Update or create UserProfile
        if profile_data:
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(user=instance)
            
            # Extract avatar file separately — it cannot go through setattr/save
            # because TemporaryUploadedFile contains a BufferedRandom handle
            # that cannot be pickled on Windows.
            avatar_file = profile_data.pop('avatar', None)
            
            # Set all non-file fields
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            
            # Handle avatar file upload separately using FieldFile.save()
            if avatar_file:
                file_name = getattr(avatar_file, 'name', 'avatar.jpg')
                profile.avatar.save(file_name, avatar_file, save=True)

        return instance

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
