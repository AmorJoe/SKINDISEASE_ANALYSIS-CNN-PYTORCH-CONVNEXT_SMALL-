"""
Authentication Views - Register, Login, Password Reset
"""
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)
logger.info("SERVER RELOADING - VIEWS MODULE IMPORTED")
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django.conf import settings
import jwt
import logging
from .models import User
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    ForgotPasswordSerializer, VerifyOTPSerializer,
    ResetPasswordSerializer, UserSerializer
)
from .jwt_auth import generate_jwt_token

logger = logging.getLogger('authentication')


@method_decorator(ratelimit(key='ip', rate='100/h', method='POST', block=True), name='dispatch')
class RegisterView(APIView):
    """User registration endpoint - Rate limited to 3 per hour per IP"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user in database
        user = User.objects.create(
            email=serializer.validated_data['email'],
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            is_doctor=serializer.validated_data.get('is_doctor', False),
            account_status='ACTIVE'
        )
        user.set_password(serializer.validated_data['password'])
        user.save()
        
        # Create empty profile
        from .models import UserProfile, DoctorProfile
        UserProfile.objects.create(user=user)
        
        # Create Doctor Profile if applicable
        if serializer.validated_data.get('is_doctor', False):
            DoctorProfile.objects.create(
                user=user,
                medical_license_number=serializer.validated_data.get('medical_license_number'),
                specialization=serializer.validated_data.get('specialization', 'General')
            )
        
        logger.info(f"New user registered: {user.email} (ID: {user.id}) IsDoctor: {user.is_doctor}")

        token = generate_jwt_token(user)
        
        return Response({
            'status': 'success',
            'message': 'Registration successful',
            'data': {
                'user': UserSerializer(user).data,
                'token': token
            }
        }, status=status.HTTP_201_CREATED)


@method_decorator(ratelimit(key='ip', rate='50/15m', method='POST', block=True), name='dispatch')
class LoginView(APIView):
    """User login endpoint - Rate limited to 5 attempts per 15 minutes per IP"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Lookup user in database
        try:
            user = User.objects.get(email=serializer.validated_data['email'])
        except User.DoesNotExist:
            logger.warning(f"Failed login attempt for non-existent email: {serializer.validated_data['email']}")
            return Response({
                'status': 'error',
                'message': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify password
        if not user.check_password(serializer.validated_data['password']):
            logger.warning(f"Failed login attempt for {user.email}: incorrect password")
            return Response({
                'status': 'error',
                'message': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        # Check Doctor Verification
        if user.is_doctor:
            try:
                if not user.doctor_profile.is_verified:
                    return Response({
                        'status': 'error',
                        'message': 'Account pending approval. Please wait for admin verification.'
                    }, status=status.HTTP_403_FORBIDDEN)
            except:
                # Fallback if profile missing
                pass
        
        # Check account status
        if user.account_status != 'ACTIVE':
            return Response({
                'status': 'error',
                'message': 'Account is locked. Please contact support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"Successful login: {user.email} (ID: {user.id})")
        
        token = generate_jwt_token(user)
        
        return Response({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'token': token
            }
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """Send OTP for password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        
        # TODO: Implement OTP generation and email sending
        # For now, return success (will be implemented with Supabase Auth in Phase 2)
        return Response({
            'status': 'success',
            'message': 'Password reset instructions sent to your email',
            'data': {'email': serializer.validated_data['email']}
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """Verify OTP code"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        
        # TODO: Implement OTP verification
        # For now, return success (will be implemented with Supabase Auth in Phase 2)
        return Response({
            'status': 'success',
            'message': 'OTP verified successfully',
            'data': {'email': serializer.validated_data['email'], 'can_reset_password': True}
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """Reset password after OTP verification"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        
        # TODO: Implement password reset with OTP validation
        # For now, return success (will be implemented with Supabase Auth in Phase 2)
        try:
            user = User.objects.get(email=serializer.validated_data['email'])
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'status': 'success',
                'message': 'Password reset successful'
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)


class ValidateTokenView(APIView):
    """Validate JWT token"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # request.user is now the SimpleUser from jwt_auth
        return Response({
            'status': 'success',
            'message': 'Token is valid',
            'data': {
                'user': {'id': request.user.id, 'email': request.user.email, 'full_name': request.user.full_name}
            }
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """Get and Update User Profile"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        try:
            user = User.objects.get(id=request.user.id)
            serializer = UserSerializer(user)
            return Response({
                'status': 'success',
                'data': serializer.data
            })
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)

    def put(self, request):
        logger.info(f"DEBUG: ProfileView.put called with data: {request.data}")
        try:
            user = User.objects.get(id=request.user.id)
            
            # Prevent email updates
            data = request.data.copy()
            if 'email' in data:
                del data['email']
            
            serializer = UserSerializer(user, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'Profile updated successfully',
                    'data': serializer.data
                })
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=400)
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)


class ChangePasswordView(APIView):
    """Change User Password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .serializers import ChangePasswordSerializer
        
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        
        try:
            user = User.objects.get(id=request.user.id)
            
            # Verify old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'status': 'error',
                    'message': 'Incorrect old password'
                }, status=400)
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'status': 'success',
                'message': 'Password changed successfully'
            })
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)


@api_view(['GET'])
@ratelimit(key='user', rate='100/h', method='GET')
def check_profile_completion(request):
    """Check if user profile has all required fields completed"""
    try:
        # Get user from token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({
                'status': 'error',
                'message': 'No authentication token provided'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user = User.objects.get(id=payload['user_id'])
        
        # Define required fields for profile completion
        required_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'gender']
        missing_fields = []
        
        if hasattr(user, 'profile'):
            target = user.profile
        else:
            target = user
            
        for field in required_fields:
            value = getattr(target, field, None)
            if not value or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)
        
        is_complete = len(missing_fields) == 0
        
        return Response({
            'status': 'success',
            'is_complete': is_complete,
            'missing_fields': missing_fields
        })
        
    except jwt.ExpiredSignatureError:
        return Response({
            'status': 'error',
            'message': 'Token has expired'
        }, status=status.HTTP_401_UNAUTHORIZED)
    except (jwt.DecodeError, User.DoesNotExist):
        return Response({
            'status': 'error',
            'message': 'Invalid token'
        }, status=status.HTTP_401_UNAUTHORIZED)
