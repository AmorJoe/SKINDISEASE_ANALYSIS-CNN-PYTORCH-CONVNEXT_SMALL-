"""
Chatbot Models - Conversation History
"""
from django.db import models
from authentication.models import User


class ChatHistory(models.Model):
    """
    Stores chatbot conversation messages
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(
        max_length=10,
        choices=[('user', 'User'), ('bot', 'Bot')]
    )
    message = models.TextField()
    session_id = models.CharField(max_length=100, db_index=True)  # Groups messages
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_history'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.message[:50]}... (Session: {self.session_id})"
