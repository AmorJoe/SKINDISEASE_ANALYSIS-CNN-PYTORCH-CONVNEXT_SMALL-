"""
Treatment Plan Generator - Dual Model Support (Gemini + Meta LLaMA via NVIDIA)
Generates structured, AI-powered treatment plans after disease detection.
"""
import requests
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Shared prompt template for both models
TREATMENT_PROMPT_TEMPLATE = """You are a board-certified dermatologist AI assistant.
A patient has been diagnosed with "{disease_name}" with {confidence}% AI confidence.

Generate a structured treatment plan. You MUST respond with ONLY valid JSON, no markdown, no extra text.

Response format:
{{
  "steps": [
    {{"step": 1, "title": "Short Title", "description": "1-2 sentence actionable advice"}},
    {{"step": 2, "title": "Short Title", "description": "1-2 sentence actionable advice"}},
    {{"step": 3, "title": "Short Title", "description": "1-2 sentence actionable advice"}},
    {{"step": 4, "title": "Short Title", "description": "1-2 sentence actionable advice"}}
  ],
  "severity": "Low|Moderate|High|Critical",
  "tip": "One practical lifestyle tip for managing this condition"
}}

Rules:
- Steps must be medically accurate, actionable, and specific to {disease_name}
- Step 1: Immediate care / first aid
- Step 2: Topical or OTC treatment
- Step 3: Lifestyle / prevention
- Step 4: When to see a specialist
- Severity should reflect medical consensus for typical cases
- Include a disclaimer that this is AI-generated and not a substitute for professional medical advice
"""

# ============================================
# FALLBACK (used when both APIs fail)
# ============================================
def _fallback_plan(disease_name, confidence):
    """Basic fallback when AI APIs are unavailable."""
    return {
        'steps': [
            {
                'step': 1,
                'title': 'Consult a Dermatologist',
                'description': f'Schedule an appointment with a board-certified dermatologist regarding {disease_name}.'
            },
            {
                'step': 2,
                'title': 'Document Your Symptoms',
                'description': 'Take clear photos and note any changes in size, color, or texture over time.'
            },
            {
                'step': 3,
                'title': 'Avoid Irritation',
                'description': 'Keep the affected area clean and moisturized. Avoid scratching or applying unknown products.'
            },
            {
                'step': 4,
                'title': 'Follow Up',
                'description': 'Return for a follow-up scan after consulting your doctor to track any changes.'
            }
        ],
        'severity': 'Moderate',
        'tip': 'Keep the affected area clean and avoid exposure to harsh chemicals or extreme temperatures.',
        'model_used': 'fallback'
    }


def _parse_ai_response(text, model_name):
    """Parse AI response text into structured treatment plan dict."""
    try:
        # Try to extract JSON from the response
        # Sometimes models wrap JSON in markdown code blocks
        cleaned = text.strip()
        if cleaned.startswith('```'):
            # Remove markdown code block
            lines = cleaned.split('\n')
            # Remove first and last lines (``` markers)
            json_lines = []
            inside_block = False
            for line in lines:
                if line.strip().startswith('```') and not inside_block:
                    inside_block = True
                    continue
                elif line.strip().startswith('```') and inside_block:
                    break
                elif inside_block:
                    json_lines.append(line)
            cleaned = '\n'.join(json_lines)
        
        # Find JSON object in the text
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        
        data = json.loads(cleaned)
        
        # Validate structure
        if 'steps' not in data or not isinstance(data['steps'], list):
            raise ValueError("Missing 'steps' array")
        
        # Ensure steps have required fields
        for i, step in enumerate(data['steps']):
            step['step'] = step.get('step', i + 1)
            step['title'] = step.get('title', f'Step {i + 1}')
            step['description'] = step.get('description', '')
        
        result = {
            'steps': data['steps'][:4],  # Max 4 steps
            'severity': data.get('severity', 'Moderate'),
            'tip': data.get('tip', 'Consult a healthcare professional for personalized advice.'),
            'model_used': model_name
        }
        return result
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger.error(f"Failed to parse {model_name} response: {e}\nRaw text: {text[:500]}")
        return None


# ============================================
# GEMINI PROVIDER
# ============================================
def generate_with_gemini(disease_name, confidence):
    """Generate treatment plan using Google Gemini."""
    api_key = getattr(settings, 'GOOGLE_API_KEY', None)
    if not api_key:
        logger.warning("Gemini API key not configured")
        return None
    
    api_key = api_key.strip()
    model_name = getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    prompt = TREATMENT_PROMPT_TEMPLATE.format(
        disease_name=disease_name,
        confidence=confidence
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1000,
        }
    }
    
    try:
        logger.info(f"Calling Gemini for treatment plan: {disease_name}")
        response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            return _parse_ai_response(text, 'gemini')
        else:
            logger.error(f"Gemini API error {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        logger.error(f"Gemini treatment generation failed: {e}")
        return None


# ============================================
# META LLAMA PROVIDER (NVIDIA NIM)
# ============================================
def generate_with_llama(disease_name, confidence):
    """Generate treatment plan using Meta LLaMA via NVIDIA API."""
    api_key = getattr(settings, 'NVIDIA_API_KEY', None)
    if not api_key:
        logger.warning("NVIDIA API key not configured")
        return None
    
    api_key = api_key.strip()
    model_name = getattr(settings, 'NVIDIA_MODEL_NAME', 'meta/llama-3.1-8b-instruct')
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    prompt = TREATMENT_PROMPT_TEMPLATE.format(
        disease_name=disease_name,
        confidence=confidence
    )
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "You are a medical AI assistant. Always respond with valid JSON only, no markdown formatting."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.4,
        "max_tokens": 1000,
    }
    
    try:
        logger.info(f"Calling NVIDIA LLaMA for treatment plan: {disease_name}")
        response = requests.post(url, json=payload, headers=headers, timeout=20)
        
        if response.status_code == 200:
            data = response.json()
            text = data['choices'][0]['message']['content']
            return _parse_ai_response(text, 'llama')
        else:
            logger.error(f"NVIDIA API error {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        logger.error(f"LLaMA treatment generation failed: {e}")
        return None


# ============================================
# MAIN DISPATCHER
# ============================================
def generate_treatment_plan(disease_name, confidence, model='gemini'):
    """
    Generate a structured treatment plan using the specified AI model.
    
    Args:
        disease_name: The detected disease/condition name
        confidence: AI confidence score (0-100)
        model: 'gemini' or 'llama'
    
    Returns:
        dict with keys: steps, severity, tip, model_used
    """
    result = None
    
    if model == 'llama':
        result = generate_with_llama(disease_name, confidence)
        if not result:
            logger.info("LLaMA failed, falling back to Gemini")
            result = generate_with_gemini(disease_name, confidence)
    else:
        result = generate_with_gemini(disease_name, confidence)
        if not result:
            logger.info("Gemini failed, falling back to LLaMA")
            result = generate_with_llama(disease_name, confidence)
    
    # Ultimate fallback
    if not result:
        logger.warning("All AI providers failed, using static fallback")
        result = _fallback_plan(disease_name, confidence)
    
    return result
