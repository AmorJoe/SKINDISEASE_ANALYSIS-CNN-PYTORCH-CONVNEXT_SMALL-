import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'skinscan.settings'
django.setup()

from authentication.models import User, DoctorProfile

# Test 1: Check doctor users
print("=== Doctor Users ===")
doctors = User.objects.filter(is_doctor=True).select_related('doctor_profile').order_by('-created_at')
print(f"Count: {doctors.count()}")

for doc in doctors:
    profile = getattr(doc, 'doctor_profile', None)
    print(f"ID={doc.id} Email={doc.email} is_doctor={doc.is_doctor}")
    if profile:
        print(f"  Profile: mrn={profile.medical_license_number} spec={profile.specialization} verified={profile.is_verified}")
    else:
        print("  NO PROFILE FOUND")

# Test 2: Simulate the view response
print("\n=== Simulated View Response ===")
pending = []
active = []

for doc in doctors:
    profile = getattr(doc, 'doctor_profile', None)
    doc_data = {
        'id': doc.id,
        'email': doc.email,
        'first_name': doc.first_name,
        'last_name': doc.last_name,
        'created_at': str(doc.created_at),
        'mrn': profile.medical_license_number if profile else 'N/A',
        'specialization': profile.specialization if profile else 'N/A',
        'is_verified': profile.is_verified if profile else False
    }
    
    if profile and profile.is_verified:
        active.append(doc_data)
    else:
        pending.append(doc_data)

print(f"Pending: {pending}")
print(f"Active: {active}")
