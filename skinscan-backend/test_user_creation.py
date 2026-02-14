import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User

print("Testing user creation...")
try:
    user = User.objects.create(
        email='directtest@example.com',
        account_status='ACTIVE'
    )
    user.set_password('TestPass123!')
    user.save()
    print(f"✅ SUCCESS! User created with ID: {user.id}")
    print(f"   Email: {user.email}")
    print(f"   Account Status: {user.account_status}")
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   Message: {str(e)}")
    import traceback
    traceback.print_exc()
