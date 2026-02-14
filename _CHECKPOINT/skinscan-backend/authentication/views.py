"""
Authentication Views - Register, Login, Password Reset
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import User, Login, PasswordResetOTP, AccountStatus
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    ForgotPasswordSerializer, VerifyOTPSerializer,
    ResetPasswordSerializer, UserSerializer
)
from .jwt_auth import generate_jwt_token


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create(
            full_name=serializer.validated_data['full_name'],
            email=serializer.validated_data['email'],
            account_status=AccountStatus.ACTIVE
        )
        
        # Create login credentials
        login = Login.objects.create(user=user)
        login.set_password(serializer.validated_data['password'])
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        return Response({
            'status': 'success',
            'message': 'Registration successful',
            'data': {
                'user': UserSerializer(user).data,
                'token': token
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            login = Login.objects.get(user=user)
        except (User.DoesNotExist, Login.DoesNotExist):
            return Response({
                'status': 'error',
                'error_code': 'AUTH_INVALID_CREDENTIALS',
                'message': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if account is locked
        if login.is_locked():
            return Response({
                'status': 'error',
                'error_code': 'AUTH_ACCOUNT_LOCKED',
                'message': 'Account temporarily locked due to multiple failed attempts'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check account status
        if user.account_status == AccountStatus.LOCKED:
            return Response({
                'status': 'error',
                'error_code': 'AUTH_ACCOUNT_LOCKED',
                'message': 'Account is locked. Contact support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.account_status == AccountStatus.DELETED:
            return Response({
                'status': 'error',
                'error_code': 'AUTH_ACCOUNT_DELETED',
                'message': 'Account has been deleted'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Verify password
        if not login.check_password(password):
            login.increment_login_attempts()
            return Response({
                'status': 'error',
                'error_code': 'AUTH_INVALID_CREDENTIALS',
                'message': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Reset login attempts on success
        login.reset_login_attempts()
        
        # Generate JWT token
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
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        
        # Generate OTP
        otp_code = PasswordResetOTP.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRATION_MINUTES)
        
        # Save OTP
        PasswordResetOTP.objects.create(
            user=user,
            otp_code=otp_code,
            expires_at=expires_at,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email (if configured)
        email_sent = False
        try:
            if settings.EMAIL_HOST_USER:
                send_mail(
                    'SkinScan AI - Password Reset OTP',
                    f'Your OTP code is: {otp_code}\nValid for {settings.OTP_EXPIRATION_MINUTES} minutes.',
                    settings.EMAIL_HOST_USER,
                    [email],
                    fail_silently=False,
                )
                email_sent = True
        except Exception as e:
            # For development: OTP will be returned in response
            pass
        
        response_data = {
            'status': 'success',
            'message': 'OTP sent to your email',
            'data': {
                'email': email,
                'expires_in_minutes': settings.OTP_EXPIRATION_MINUTES
            }
        }
        
        # Include OTP in response for development (REMOVE IN PRODUCTION)
        if settings.DEBUG and not email_sent:
            response_data['data']['otp_code'] = otp_code
        
        return Response(response_data, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """Verify OTP code"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        
        try:
            user = User.objects.get(email=email)
            otp = PasswordResetOTP.objects.filter(
                user=user,
                otp_code=otp_code
            ).latest('created_at')
        except (User.DoesNotExist, PasswordResetOTP.DoesNotExist):
            return Response({
                'status': 'error',
                'error_code': 'OTP_INVALID',
                'message': 'Invalid OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not otp.is_valid():
            return Response({
                'status': 'error',
                'error_code': 'OTP_EXPIRED',
                'message': 'OTP has expired or already used'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'status': 'success',
            'message': 'OTP verified successfully',
            'data': {
                'email': email,
                'can_reset_password': True
            }
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """Reset password after OTP verification"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        new_password = serializer.validated_data['new_password']
        
        try:
            user = User.objects.get(email=email)
            otp = PasswordResetOTP.objects.filter(
                user=user,
                otp_code=otp_code
            ).latest('created_at')
        except (User.DoesNotExist, PasswordResetOTP.DoesNotExist):
            return Response({
                'status': 'error',
                'error_code': 'OTP_INVALID',
                'message': 'Invalid OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not otp.is_valid():
            return Response({
                'status': 'error',
                'error_code': 'OTP_EXPIRED',
                'message': 'OTP has expired or already used'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        login = Login.objects.get(user=user)
        login.set_password(new_password)
        
        # Mark OTP as used
        otp.mark_as_used()
        
        return Response({
            'status': 'success',
            'message': 'Password reset successful'
        }, status=status.HTTP_200_OK)


class ValidateTokenView(APIView):
    """Validate JWT token"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            'status': 'success',
            'message': 'Token is valid',
            'data': {
                'user': UserSerializer(request.user).data
            }
        }, status=status.HTTP_200_OK)
