from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .notification_serializers import NotificationSerializer

class NotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List unread notifications for the user"""
        notifications = Notification.objects.filter(user=request.user, is_read=False)
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

    def post(self, request, pk=None):
        """Mark notification as read"""
        if pk:
            try:
                notification = Notification.objects.get(pk=pk, user=request.user)
                notification.is_read = True
                notification.save()
                return Response({'status': 'success', 'message': 'Notification marked as read'})
            except Notification.DoesNotExist:
                return Response({'status': 'error', 'message': 'Notification not found'}, status=404)
        
        # Mark all as read
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'success', 'message': 'All notifications marked as read'})
