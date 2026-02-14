from django.contrib import admin
from .models import User, Login, PasswordResetOTP


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'email', 'account_status', 'created_at']
    list_filter = ['account_status', 'created_at']
    search_fields = ['full_name', 'email']


@admin.register(Login)
class LoginAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'last_login', 'login_attempts']
    list_filter = ['last_login']


@admin.register(PasswordResetOTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'otp_code', 'is_used', 'expires_at', 'created_at']
    list_filter = ['is_used', 'created_at']
