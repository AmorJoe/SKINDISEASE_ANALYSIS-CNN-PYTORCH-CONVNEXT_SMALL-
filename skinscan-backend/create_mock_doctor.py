import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User, DoctorProfile

def create_mock_doctor(email, license_num, specialization):
    user = User.objects.get(email=email)
    user.is_doctor = True
    user.save()
    
    profile, created = DoctorProfile.objects.get_or_create(
        user=user,
        defaults={
            'medical_license_number': license_num,
            'specialization': specialization,
            'is_verified': False
        }
    )
    if not created:
        profile.is_verified = False
        profile.save()
    print(f"User {email} is now a pending doctor.")

# Create mock doctor
create_mock_doctor('amorjoe0414@gmail.com', 'MRN12345', 'Dermatologist')
