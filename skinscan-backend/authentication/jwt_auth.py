"""
JWT Authentication - Token generation and validation
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User


class JWTAuthentication(BaseAuthentication):
    """Custom JWT authentication class"""
    
    def authenticate(self, request):
        """Validate JWT token from Authorization header"""
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None
        
        try:
            # Extract token from "Bearer <token>"
            prefix, token = auth_header.split(' ')
            if prefix.lower() != 'bearer':
                raise AuthenticationFailed('Invalid token prefix')
            
            # Decode and verify token
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Get user from payload
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token payload')
            
            # Fetch actual user from database
            try:
                user = User.objects.get(id=user_id)
                if user.account_status != 'ACTIVE':
                    raise AuthenticationFailed('Account is locked')
            except User.DoesNotExist:
                raise AuthenticationFailed('User not found')
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except ValueError:
            raise AuthenticationFailed('Invalid authorization header format')


def generate_jwt_token(user):
    """Generate JWT token for user"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'is_admin': getattr(user, 'is_admin', False),
        'first_name': getattr(user, 'first_name', ''),
        'last_name': getattr(user, 'last_name', ''),
        'exp': datetime.utcnow() + settings.JWT_EXPIRATION_DELTA,
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token


def decode_jwt_token(token):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token has expired')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Invalid token')
