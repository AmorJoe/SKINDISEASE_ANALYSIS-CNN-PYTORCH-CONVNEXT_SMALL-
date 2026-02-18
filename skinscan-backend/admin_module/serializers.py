from rest_framework import serializers
from .models import DiseaseInfo, AppSetting

class DiseaseInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseInfo
        fields = '__all__'

class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = '__all__'
