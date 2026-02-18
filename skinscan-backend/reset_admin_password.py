import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User

def reset_admin_password():
    user = User.objects.filter(is_admin=True).first()
    if user:
        user.set_password('Admin123!')
        user.save()
        print(f"Successfully reset password for {user.email} to 'Admin123!'")
    else:
        print("No admin user found to reset.")

if __name__ == '__main__':
    reset_admin_password()
