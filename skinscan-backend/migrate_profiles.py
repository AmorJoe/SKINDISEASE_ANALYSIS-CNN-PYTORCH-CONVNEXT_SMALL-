import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User, UserProfile

def migrate_data():
    print("Starting data migration from User to UserProfile...")
    
    users = User.objects.all()
    print(f"Found {users.count()} users.")
    
    migrated_count = 0
    
    for user in users:
        # Check if profile already exists
        if hasattr(user, 'profile'):
            print(f"Skipping {user.email}: Profile already exists.")
            continue
            
        print(f"Migrating {user.email}...")
        
        # Create Profile
        profile = UserProfile(
            user=user,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            date_of_birth=user.date_of_birth,
            gender=user.gender,
            country=user.country,
            address=user.address,
            avatar=user.avatar,
            skin_type=user.skin_type,
            skin_tone=user.skin_tone,
            # Timestamps
            created_at=user.created_at, # Preserve creation time if possible
            updated_at=user.updated_at
        )
        profile.save()
        migrated_count += 1
        
    print(f"Migration completed. {migrated_count} profiles created.")

if __name__ == '__main__':
    try:
        migrate_data()
    except Exception as e:
        print(f"Migration Failed: {e}")
        import traceback
        traceback.print_exc()
