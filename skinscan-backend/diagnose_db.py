import os
import sys
import django

# Force UTF-8 encoding for stdout/stderr to avoid UnicodeEncodeError
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from django.db import connection, OperationalError, ProgrammingError
from authentication.models import User

def check_columns():
    print("Checking 'users' table columns...")
    with connection.cursor() as cursor:
        try:
            # Use a query that works on most DBs (Postgres, SQLite, MySQL)
            cursor.execute("SELECT * FROM users LIMIT 0")
            columns = [col[0] for col in cursor.description]
            print(f"✅ Found columns: {', '.join(columns)}")
            return set(columns)
        except Exception as e:
            print(f"❌ Error getting columns: {e}")
            return set()

def test_create_user():
    print("\nTesting user creation...")
    try:
        # Create a user with all fields to ensure they exist
        user = User(
            email='diag_test@example.com',
            first_name='Diag',
            last_name='Test',
            account_status='ACTIVE',
            # Fields that were reported missing
            skin_type='Normal',
            skin_tone='Type I',
            country='TestCountry',
            address='123 Test St'
        )
        user.set_password('TestPass123!')
        user.save()
        print(f"✅ User created successfully (ID: {user.id})")
        # Cleanup
        user.delete()
        print("✅ Test user deleted")
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        # Print full traceback
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    current_cols = check_columns()
    
    # Check for specific expected columns
    expected = {'skin_type', 'skin_tone', 'address', 'country', 'first_name', 'last_name'}
    missing = expected - current_cols
    if missing:
        print(f"\nBSCHEMA MISMATCH! Missing columns in database: {missing}")
    else:
        print("\nSchema looks correct regarding expected profile fields.")
        
    check_full_name = 'full_name' in current_cols
    print(f"full_name column present: {check_full_name} (Should be False)")

    test_create_user()
