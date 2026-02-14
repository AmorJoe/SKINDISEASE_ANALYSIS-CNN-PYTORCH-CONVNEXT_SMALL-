"""
Chatbot Models - Chat history storage
"""
from django.db import models
from authentication.models import User


class ChatHistory(models.Model):
    """Store chatbot conversations"""
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    message = models.TextField()
    session_id = models.CharField(max_length=100, blank=True, null=True)  # Group related messages
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_history'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.message[:50]}..."
