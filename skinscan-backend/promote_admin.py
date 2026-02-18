import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User

def promote_first_user():
    user = User.objects.first()
    if user:
        user.is_admin = True
        user.save()
        print(f"Successfully promoted {user.email} to Admin.")
    else:
        print("No users found to promote.")

if __name__ == '__main__':
    promote_first_user()
