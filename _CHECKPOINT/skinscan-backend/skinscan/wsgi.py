"""
WSGI config for SkinScan AI project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
application = get_wsgi_application()
