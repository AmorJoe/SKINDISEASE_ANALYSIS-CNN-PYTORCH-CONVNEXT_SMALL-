import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import DoctorProfile, User

print("--- Doctor Profiles ---")
profiles = DoctorProfile.objects.all()
if not profiles.exists():
    print("No doctor profiles found.")
else:
    for p in profiles:
        print(f"User: {p.user.email} | Verified: {p.is_verified} | License: {p.medical_license_number}")
