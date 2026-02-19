
import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User, DoctorProfile

def revert_doctor():
    email = 'amorjoe0414@gmail.com'
    try:
        user = User.objects.get(email=email)
        print(f"Found user: {user.email}")
        
        if user.is_doctor:
            print("Reverting user from Doctor to Standard User...")
            user.is_doctor = False
            user.save()
            print("User is_doctor set to False.")
            
        # Optional: Delete profile if you want to be thorough, 
        # but safely keeping it is also fine. 
        # For a clean revert, let's keep it but just disable the flag.
        
    except User.DoesNotExist:
        print(f"User {email} not found!")

if __name__ == '__main__':
    revert_doctor()
