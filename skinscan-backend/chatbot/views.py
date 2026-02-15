"""
Chatbot Views - Message handling and chat history
"""
import requests
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import ChatHistory # Correct model
import uuid
from django.conf import settings
# from .serializers import ChatMessageSerializer # Removed as it doesn't exist

SKINSCAN_SYSTEM_INSTRUCTION = """
You are SkinScan AI, a specialized dermatologist assistant.
Your goal is to provide accurate, helpful, and safety-conscious information about skin health.

CORE RESPONSIBILITIES:
1.  **Analyze Context**: If the user provides a skin condition or prediction context, use it to tailor your advice.
2.  **Provide Recommendations**: Always provide 3-4 distinct, actionable recommendations for care or next steps.
3.  **External Resources**: At the end of your response, ALWAYS include a hyperlink to https://dermnetnz.org for the specific condition discussed. Format it as: [Learn More ->](https://dermnetnz.org/topics/<condition-name>). Use only this single trusted source.
4.  **Tone**: Professional, empathetic, and clear. Avoid jargon where possible.
5.  **Safety First**: You are an AI, not a doctor. Always include a disclaimer. If a condition looks serious (e.g., Melanoma), urge the user to see a doctor immediately.

FORMATTING:
- Use bullet points for recommendations.
- Use **bold** for key terms.
- Keep responses concise but informative.
"""

class ChatMessageView(APIView):
    """Handle chatbot messages using Google Gemini AI (REST API)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Process user message and generate bot response"""
        
        message = request.data.get('message', '').strip()
        context_data = request.data.get('context', '').strip()
        session_id = request.data.get('session_id', str(uuid.uuid4()))
        
        if not message:
            return Response({
                'status': 'error',
                'error_code': 'MESSAGE_REQUIRED',
                'message': 'Message cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save User Message
        ChatHistory.objects.create(
            user=request.user,
            role='user',
            message=message,
            session_id=session_id
        )
        
        # Generate Bot Response (with Context)
        full_prompt = message
        if context_data:
            full_prompt = f"Context from SkinScan App: {context_data}\n\nUser Question: {message}"
            
        bot_response = self.generate_bot_response(full_prompt)
        
        # Save Bot Response
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
        """Generate chatbot response using Gemini REST API"""
        
        # 1. Check for API Key
        api_key = settings.GOOGLE_API_KEY
        if api_key:
            api_key = api_key.strip()
            
        if not api_key:
             if settings.DEBUG: print("❌ Log: Missing API Key")
             return self._fallback_response(user_message, "Config Error: No Google API Key found.")

        try:
            # 2. Prepare REST Request
            model_name = settings.GEMINI_MODEL_NAME or 'gemini-1.5-flash'
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            
            headers = {'Content-Type': 'application/json'}
            
            payload = {
                "contents": [{
                    "parts": [{"text": user_message}]
                }],
                "systemInstruction": {
                    "parts": [{"text": SKINSCAN_SYSTEM_INSTRUCTION}]
                },
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 800,
                }
            }
            
            # 3. Call API
            if settings.DEBUG: print(f"⏳ Calling Gemini REST API: {url[:60]}...")
            
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                # Parse response
                try:
                    bot_text = data['candidates'][0]['content']['parts'][0]['text']
                    return bot_text
                except (KeyError, IndexError):
                     if settings.DEBUG: print(f"❌ Parse Error: {data}")
                     return "I'm having trouble formulating a response. Please try again."
            else:
                if settings.DEBUG: print(f"❌ API Error {response.status_code}: {response.text}")
                return "I'm having trouble connecting to my AI services. Please try again later."

        except Exception as e:
            if settings.DEBUG: print(f"❌ Exception: {str(e)}")
            return self._fallback_response(user_message, f"Exception: {str(e)}")

    def _fallback_response(self, user_message, debug_info=None):
        """Rule-based fallback if AI fails"""
        message_lower = user_message.lower()
        disclaimer = "\n\n⚠️ Disclaimer: I provide general information only. Always consult a dermatologist for medical advice."
        
        if debug_info and settings.DEBUG:
             print(f"Fallback triggered: {debug_info}")

        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return "Hello! I'm your SkinCare Assistant. I'm currently running in offline mode. How can I help you?" + disclaimer
        
        elif 'accuracy' in message_lower:
             return "Our AI model uses advanced computer vision for preliminary screening. Accuracy depends on image quality." + disclaimer
             
        return "I am currently experiencing connection issues with my AI brain. Please try again later, or ask me about 'accuracy' or saying 'hello'." + disclaimer



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
