from django.contrib import admin
from .models import ChatHistory


@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'role', 'session_id', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['user__email', 'message']
