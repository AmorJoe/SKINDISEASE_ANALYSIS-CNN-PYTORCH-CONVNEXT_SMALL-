"""
Chatbot URL Routes
"""
from django.urls import path
from .views import (
    ChatMessageView,
    ChatHistoryView,
    ClearChatHistoryView
)

urlpatterns = [
    path('message', ChatMessageView.as_view(), name='chat_message'),
    path('history', ChatHistoryView.as_view(), name='chat_history'),
    path('clear-history', ClearChatHistoryView.as_view(), name='clear_chat_history'),
]
