"""
Custom exception handler and utility functions.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response format
        custom_response = {
            'status': 'error',
            'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
            'error_code': exc.default_code if hasattr(exc, 'default_code') else 'UNKNOWN_ERROR',
        }
        
        # Include original errors if validation error
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
            custom_response['errors'] = exc.detail
        
        response.data = custom_response

    return response
