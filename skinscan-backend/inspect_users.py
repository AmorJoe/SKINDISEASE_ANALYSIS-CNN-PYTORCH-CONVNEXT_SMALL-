
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User

def inspect_users():
    users = User.objects.all()
    count = users.count()
    print(f"Total Users Found: {count}\n")
    
    empty_fields_summary = {}

    for user in users:
        print(f"User: {user.email} (ID: {user.id})")
        
        # Check specific fields
        fields_to_check = [
            'phone', 'date_of_birth', 'gender', 'last_login'
        ]
        
        user_empty_fields = []
        for field in fields_to_check:
            val = getattr(user, field)
            if val is None or val == "":
                user_empty_fields.append(field)
                
                if field not in empty_fields_summary:
                    empty_fields_summary[field] = 0
                empty_fields_summary[field] += 1
        
        if user_empty_fields:
            print(f"  Empty Fields: {', '.join(user_empty_fields)}")
        else:
            print("  All profile fields are filled.")
        print("-" * 30)

    print("\nSummary of Missing Data:")
    if not empty_fields_summary:
        print("No missing data in checked fields.")
    else:
        for field, count in empty_fields_summary.items():
            print(f"  - {field}: {count} users missing this info")

if __name__ == "__main__":
    inspect_users()
