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
    ValidateTokenView,
    ProfileView,
    ChangePasswordView,
    check_profile_completion,
)
from .notification_views import NotificationView
from .admin_views import (
    AdminUserListView,
    AdminUserStateView,
    AdminUserDetailView
)

urlpatterns = [
    path('register', RegisterView.as_view(), name='register'),
    path('login', LoginView.as_view(), name='login'),
    path('profile', ProfileView.as_view(), name='profile'),
    path('change-password', ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-otp', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password', ResetPasswordView.as_view(), name='reset_password'),
    path('validate-token', ValidateTokenView.as_view(), name='validate_token'),
    path('profile/check-completion', check_profile_completion, name='check_profile_completion'),
    
    # Notifications
    path('notifications', NotificationView.as_view(), name='notifications'),
    path('notifications/<int:pk>', NotificationView.as_view(), name='notification_detail'),
    
    # Admin Routes
    path('admin/users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('admin/users/<int:user_id>/<str:action>/', AdminUserStateView.as_view(), name='admin_user_state'),
    path('admin/users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
]
