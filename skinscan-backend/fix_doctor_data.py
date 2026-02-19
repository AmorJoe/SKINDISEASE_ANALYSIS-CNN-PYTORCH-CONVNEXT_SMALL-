
import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User, DoctorProfile

def fix_doctor():
    email = 'amorjoe0414@gmail.com'
    try:
        user = User.objects.get(email=email)
        print(f"Found user: {user.email}")
        print(f"Current status - is_doctor: {user.is_doctor}")
        
        if not user.is_doctor:
            print("Updating user to Doctor...")
            user.is_doctor = True
            user.save()
            
        # Check/Create Profile
        profile, created = DoctorProfile.objects.get_or_create(user=user)
        if created:
            print("Created new DoctorProfile")
            profile.medical_license_number = "DOC-2026-TEST"
            profile.specialization = "Dermatologist"
            profile.is_verified = False # User probably wants to approve them manually or sees them in pending
            profile.save()
        else:
            print(f"DoctorProfile exists. Verified: {profile.is_verified}")
            
        print("Done. User should now appear in Doctors tab (Pending or Active).")
        
    except User.DoesNotExist:
        print(f"User {email} not found!")

if __name__ == '__main__':
    fix_doctor()
