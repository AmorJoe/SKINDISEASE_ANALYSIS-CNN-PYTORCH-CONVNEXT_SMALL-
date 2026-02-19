
from authentication.models import User
from django.contrib.auth.hashers import make_password

def create_admin():
    email = "admin@skinscan.com"
    if not User.objects.filter(email=email).exists():
        User.objects.create(
            email=email,
            password_hash=make_password("admin123"),
            first_name="Admin",
            last_name="User",
            is_admin=True,
            account_status="ACTIVE"
        )
        print(f"Created admin user: {email}")
    else:
        print(f"Admin user {email} already exists")

if __name__ == "__main__":
    create_admin()
