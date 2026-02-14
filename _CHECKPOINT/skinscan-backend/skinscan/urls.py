"""
SkinScan AI URL Configuration
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import HttpResponseRedirect
import os

# Path to frontend files (parent directory)
FRONTEND_DIR = settings.BASE_DIR.parent

def serve_frontend(request, filename='login.html'):
    """Serve frontend HTML files"""
    filepath = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(filepath):
        return serve(request, filename, document_root=FRONTEND_DIR)
    return serve(request, 'login.html', document_root=FRONTEND_DIR)

def redirect_to_login(request):
    """Redirect root to login page"""
    return HttpResponseRedirect('/login.html')

urlpatterns = [
    # Root redirect to login
    path('', redirect_to_login),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('authentication.urls')),
    path('api/predict/', include('prediction.urls')),
    path('api/chat/', include('chatbot.urls')),
    
    # Serve frontend files
    re_path(r'^(?P<filename>[\w\-\.]+\.html)$', serve_frontend),
    re_path(r'^(?P<filename>[\w\-\.]+\.css)$', serve_frontend),
    re_path(r'^(?P<filename>[\w\-\.]+\.js)$', serve_frontend),
    re_path(r'^(?P<filename>[\w\-\.]+\.(jpg|jpeg|png|gif|ico|svg))$', serve_frontend),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
