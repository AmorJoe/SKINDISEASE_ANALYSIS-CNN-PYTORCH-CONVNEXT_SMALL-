from django.contrib import admin
from .models import SkinImage, PredictionResult, DiseaseInfo


@admin.register(SkinImage)
class SkinImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'original_filename', 'is_valid', 'quality_score', 'uploaded_at']
    list_filter = ['is_valid', 'uploaded_at']
    search_fields = ['user__email', 'original_filename']


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'image', 'disease_name', 'confidence_score', 'model_version', 'created_at']
    list_filter = ['disease_name', 'model_version', 'created_at']
    search_fields = ['disease_name']


@admin.register(DiseaseInfo)
class DiseaseInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'disease_name', 'severity_level', 'is_contagious']
    list_filter = ['severity_level', 'is_contagious']
    search_fields = ['disease_name']
