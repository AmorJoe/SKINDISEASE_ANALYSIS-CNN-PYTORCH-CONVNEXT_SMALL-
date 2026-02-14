"""
Authentication URL Routes
"""
from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ForgotPasswordView,
    VerifyOTPView,
    ResetPasswordView,
    ValidateTokenView
)

urlpatterns = [
    path('register', RegisterView.as_view(), name='register'),
    path('login', LoginView.as_view(), name='login'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-otp', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password', ResetPasswordView.as_view(), name='reset_password'),
    path('validate-token', ValidateTokenView.as_view(), name='validate_token'),
]
