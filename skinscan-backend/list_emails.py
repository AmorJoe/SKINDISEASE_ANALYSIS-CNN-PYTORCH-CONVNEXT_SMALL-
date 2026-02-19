import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User
for user in User.objects.all():
    print(user.email)
