from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.models import User
from authentication.serializers import UserSerializer
from .permissions import IsAdminUser
import os
import logging
from datetime import datetime
from django.conf import settings
from prediction.models import PredictionResult, SkinImage, ScanHistory
from .models import DiseaseInfo, AppSetting
from .serializers import DiseaseInfoSerializer, AppSettingSerializer

class UserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-created_at')
        serializer = UserSerializer(users, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

class UserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user)
            return Response({
                'status': 'success',
                'data': serializer.data
            })
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                # Allow admin to change is_admin and assigned_model
                if 'is_admin' in request.data:
                    user.is_admin = request.data['is_admin']
                if 'assigned_model' in request.data:
                    user.assigned_model = request.data['assigned_model']
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'User updated successfully',
                    'data': serializer.data
                })
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)

    def post(self, request, pk, action=None):
        if not action:
            return Response({'error': 'Action required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=pk)
            if action == 'lock':
                user.account_status = 'LOCKED'
            elif action == 'unlock':
                user.account_status = 'ACTIVE'
            elif action == 'ban':
                user.account_status = 'BANNED'
            elif action == 'promote':
                user.is_admin = True
            elif action == 'demote':
                user.is_admin = False
            else:
                return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.save()
            return Response({
                'status': 'success',
                'message': f'User {action}ed successfully',
                'data': {
                    'account_status': user.account_status,
                    'is_admin': user.is_admin
                }
            })
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.delete()
            return Response({
                'status': 'success',
                'message': 'User deleted successfully'
            })
        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'User not found'}, status=404)

class ModelModeratorView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        model_dir = os.path.join(settings.BASE_DIR, 'ml_models')
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        models_data = []
        for filename in os.listdir(model_dir):
            if filename.endswith('.pth'):
                file_path = os.path.join(model_dir, filename)
                stats = os.stat(file_path)
                
                # Format size and date
                size_mb = round(stats.st_size / (1024 * 1024), 2)
                mod_date = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M')
                
                models_data.append({
                    'name': filename,
                    'size': f"{size_mb} MB",
                    'last_modified': mod_date,
                    'is_pytorch': True,
                    'architecture': 'ConvNeXt Small'  # Known architecture from prediction module
                })
        
        return Response({
            'status': 'success',
            'data': {
                'available_models': models_data,
                'global_default': os.path.basename(str(getattr(settings, 'MODEL_PATH', ''))),
                'disease_classes': getattr(settings, 'DISEASE_CLASSES', [])
            }
        })

    def delete(self, request):
        """Delete a local model file"""
        model_name = request.data.get('model_name')
        if not model_name:
            return Response({'error': 'model_name required'}, status=400)
            
        # Prevent deletion of active model
        active_model = os.path.basename(str(getattr(settings, 'MODEL_PATH', '')))
        if model_name == active_model:
            return Response({'error': 'Cannot delete the active production model'}, status=400)
            
        model_path = os.path.join(settings.BASE_DIR, 'ml_models', model_name)
        if not os.path.exists(model_path):
            return Response({'error': 'Model file not found'}, status=404)
            
        try:
            os.remove(model_path)
            return Response({'status': 'success', 'message': f'Model {model_name} deleted successfully'})
        except Exception as e:
            return Response({'error': f'Failed to delete model: {str(e)}'}, status=500)

    def post(self, request):
        """Set the global default model"""
        model_name = request.data.get('model_name')
        if not model_name:
            return Response({'error': 'model_name required'}, status=400)
        
        model_path = os.path.join(settings.BASE_DIR, 'ml_models', model_name)
        if not os.path.exists(model_path):
            return Response({'error': 'Model file not found'}, status=404)
        
        # In a real app, we'd update settings.py or a DB config
        # For this setup, we'll update the AppSetting model if it exists
        setting, _ = AppSetting.objects.get_or_create(key='GLOBAL_MODEL_PATH')
        setting.value = model_path
        setting.save()
        
        # Also update the runtime setting if possible (volatile)
        settings.MODEL_PATH = model_path
        
        return Response({
            'status': 'success',
            'message': f'Global default model set to {model_name}'
        })

class ModelUploadView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        file_obj = request.FILES.get('model_file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=400)
        
        if not file_obj.name.endswith('.pth'):
            return Response({'error': 'Only .pth files are allowed'}, status=400)
        
        model_dir = os.path.join(settings.BASE_DIR, 'ml_models')
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        file_path = os.path.join(model_dir, file_obj.name)
        
        # Save the file
        with open(file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
        
        return Response({
            'status': 'success',
            'message': f'Model {file_obj.name} uploaded successfully',
            'data': {
                'filename': file_obj.name,
                'path': file_path
            }
        })

class AdminReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        if user_id:
            reports = PredictionResult.objects.filter(user_id=user_id).order_by('-created_at')
        else:
            reports = PredictionResult.objects.all().order_by('-created_at')
        
        # Simple serialization for demonstration
        data = [{
            'id': r.id,
            'user': r.user.email,
            'disease': r.disease_name,
            'confidence': r.confidence_score,
            'created_at': r.created_at,
            'image_url': r.image.image_url if r.image else None
        } for r in reports]
        
        return Response({
            'status': 'success',
            'data': data
        })

    def delete(self, request, pk):
        try:
            report = PredictionResult.objects.get(pk=pk)
            # Optionally delete physical file if stored locally
            if report.report and os.path.exists(report.report.path):
                os.remove(report.report.path)
            
            report.delete()
            return Response({
                'status': 'success',
                'message': 'Report deleted successfully'
            })
        except PredictionResult.DoesNotExist:
            return Response({'status': 'error', 'message': 'Report not found'}, status=404)

class DiseaseInfoView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk=None):
        if pk:
            try:
                disease = DiseaseInfo.objects.get(pk=pk)
                serializer = DiseaseInfoSerializer(disease)
                return Response({'status': 'success', 'data': serializer.data})
            except DiseaseInfo.DoesNotExist:
                return Response({'status': 'error', 'message': 'Not found'}, status=404)
        
        diseases = DiseaseInfo.objects.all().order_by('name')
        serializer = DiseaseInfoSerializer(diseases, many=True)
        return Response({'status': 'success', 'data': serializer.data})

    def post(self, request):
        serializer = DiseaseInfoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success', 'data': serializer.data}, status=201)
        return Response({'status': 'error', 'errors': serializer.errors}, status=400)

    def patch(self, request, pk):
        try:
            disease = DiseaseInfo.objects.get(pk=pk)
            serializer = DiseaseInfoSerializer(disease, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'status': 'success', 'data': serializer.data})
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
        except DiseaseInfo.DoesNotExist:
            return Response({'status': 'error', 'message': 'Not found'}, status=404)

    def delete(self, request, pk):
        try:
            disease = DiseaseInfo.objects.get(pk=pk)
            disease.delete()
            return Response({'status': 'success', 'message': 'Deleted successfully'})
        except DiseaseInfo.DoesNotExist:
            return Response({'status': 'error', 'message': 'Not found'}, status=404)
