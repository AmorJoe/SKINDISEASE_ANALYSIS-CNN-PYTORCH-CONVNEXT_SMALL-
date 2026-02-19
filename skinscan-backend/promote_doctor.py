
import os
import django
import sys

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skinscan.settings")
django.setup()

from authentication.models import User

def promote_to_doctor(email, specialty="General Dermatologist"):
    try:
        user = User.objects.get(email=email)
        user.is_doctor = True
        user.specialty = specialty
        user.account_status = 'ACTIVE'
        user.save()
        print(f"Success! {user.email} is now a Doctor (Specialty: {specialty})")
    except User.DoesNotExist:
        print(f"Error: User with email '{email}' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_doctor.py <email> [specialty]")
    else:
        email = sys.argv[1]
        specialty = sys.argv[2] if len(sys.argv) > 2 else "General Dermatologist"
        promote_to_doctor(email, specialty)
