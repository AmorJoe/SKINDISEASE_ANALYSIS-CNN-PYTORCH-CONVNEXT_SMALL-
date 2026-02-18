from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import User
from .serializers import UserSerializer

class IsAdminUser(IsAuthenticated):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        is_auth = super().has_permission(request, view)
        return is_auth and bool(request.user and request.user.is_admin)

class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-created_at')
        serializer = UserSerializer(users, many=True)
        return Response({'status': 'success', 'data': serializer.data})

class AdminUserStateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id, action):
        user = get_object_or_404(User, id=user_id)
        
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
        return Response({'status': 'success', 'account_status': user.account_status, 'is_admin': user.is_admin})

class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        user.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
