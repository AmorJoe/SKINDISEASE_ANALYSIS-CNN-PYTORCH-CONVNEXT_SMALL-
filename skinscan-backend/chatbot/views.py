"""
Chatbot Views - Message handling and chat history
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import ChatHistory
import uuid


class ChatMessageView(APIView):
    """Handle chatbot messages"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Process user message and generate bot response"""
        
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id', str(uuid.uuid4()))
        
        if not message:
            return Response({
                'status': 'error',
                'error_code': 'MESSAGE_REQUIRED',
                'message': 'Message cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save user message
        ChatHistory.objects.create(
            user=request.user,
            role='user',
            message=message,
            session_id=session_id
        )
        
        # Generate bot response
        bot_response = self.generate_bot_response(message)
        
        # Save bot response
        ChatHistory.objects.create(
            user=request.user,
            role='bot',
            message=bot_response,
            session_id=session_id
        )
        
        return Response({
            'status': 'success',
            'data': {
                'bot_message': bot_response,
                'session_id': session_id
            }
        }, status=status.HTTP_200_OK)
    
    def generate_bot_response(self, user_message):
        """Generate chatbot response based on user input"""
        
        message_lower = user_message.lower()
        
        # Medical disclaimer
        disclaimer = "\n\n⚠️ Disclaimer: I provide general information only. Always consult a dermatologist for medical advice."
        
        # Response rules
        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return "Hello! I'm your SkinCare Assistant. How can I help you with your skin concerns today?" + disclaimer
        
        elif 'accuracy' in message_lower or 'confidence' in message_lower:
            return "Our AI model has been trained on thousands of dermatological images and achieves good accuracy in preliminary screening. However, this tool is meant to support, not replace, professional diagnosis." + disclaimer
        
        elif any(word in message_lower for word in ['acne', 'pimple']):
            return "Acne is common and treatable. Keep your face clean, avoid touching it, and consider over-the-counter treatments. If severe, consult a dermatologist for prescription options." + disclaimer
        
        elif 'eczema' in message_lower or 'atopic dermatitis' in message_lower:
            return "Eczema is a chronic condition that causes dry, itchy skin. Use gentle moisturizers, avoid irritants, and follow your dermatologist's treatment plan." + disclaimer
        
        elif 'melanoma' in message_lower or 'cancer' in message_lower:
            return "Melanoma is the most serious type of skin cancer. If you notice irregular moles, changes in color, or asymmetric growth, seek immediate medical evaluation. Early detection is crucial." + disclaimer
        
        elif 'psoriasis' in message_lower:
            return "Psoriasis is an autoimmune condition causing skin cells to build up rapidly. Treatment includes topical medications, phototherapy, and systemic medications. Consult a dermatologist for a personalized plan." + disclaimer
        
        elif any(word in message_lower for word in ['upload', 'scan', 'analyze']):
            return "To analyze your skin condition, click the upload button and select a clear, well-lit photo of the affected area. Our AI will provide a preliminary assessment." + disclaimer
        
        elif 'how' in message_lower and 'work' in message_lower:
            return "Our system uses Convolutional Neural Networks (CNN) trained on dermatological images. It analyzes patterns, colors, and textures to classify skin conditions. The system provides confidence scores to help you understand prediction reliability." + disclaimer
        
        elif any(word in message_lower for word in ['safe', 'privacy', 'secure']):
            return "Your data is secured with encryption. Images are stored securely and used only for your analysis. We follow strict privacy protocols and never share your information without consent." + disclaimer
        
        elif any(word in message_lower for word in ['thank', 'thanks']):
            return "You're welcome! If you have any more questions about skin health, feel free to ask. Stay healthy!"
        
        else:
            return "I can help you with information about skin conditions, how our AI works, or guide you through using the analysis tool. What would you like to know?" + disclaimer


class ChatHistoryView(APIView):
    """Retrieve user's chat history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all chat messages for current user"""
        history = ChatHistory.objects.filter(user=request.user)
        messages = [{
            'role': h.role,
            'message': h.message,
            'session_id': h.session_id,
            'created_at': h.created_at
        } for h in history]
        
        return Response({
            'status': 'success',
            'data': {
                'total_messages': len(messages),
                'messages': messages
            }
        }, status=status.HTTP_200_OK)


class ClearChatHistoryView(APIView):
    """Delete chat history"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        deleted_count, _ = ChatHistory.objects.filter(user=request.user).delete()
        return Response({
            'status': 'success',
            'message': f'Deleted {deleted_count} messages'
        }, status=status.HTTP_200_OK)
