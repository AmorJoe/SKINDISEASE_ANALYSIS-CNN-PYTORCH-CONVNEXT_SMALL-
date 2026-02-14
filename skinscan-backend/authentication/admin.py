from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'first_name', 'last_name', 'email', 'account_status', 'created_at']
    list_filter = ['account_status', 'created_at']
    search_fields = ['first_name', 'last_name', 'email']

