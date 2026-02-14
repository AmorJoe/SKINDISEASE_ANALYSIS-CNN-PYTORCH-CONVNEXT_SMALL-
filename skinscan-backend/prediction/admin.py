from django.contrib import admin
from .models import SkinImage, PredictionResult, ScanHistory


@admin.register(SkinImage)
class SkinImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'original_filename', 'file_size', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['user__email', 'original_filename']


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'disease_name', 'confidence_score', 'created_at']
    list_filter = ['disease_name', 'created_at']
    search_fields = ['disease_name', 'user__email']


@admin.register(ScanHistory)
class ScanHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'severity_tag', 'body_location', 'is_bookmarked', 'created_at']
    list_filter = ['severity_tag', 'body_location', 'is_bookmarked', 'created_at']
    search_fields = ['title', 'user__email']

