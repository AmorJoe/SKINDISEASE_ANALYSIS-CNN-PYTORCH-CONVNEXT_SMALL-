import os
import sys
import django

# Force UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from django.db import connection
from authentication.models import User

print("Starting schema synchronization...")

with connection.cursor() as cursor:
    # Get existing columns via introspection
    table_desc = connection.introspection.get_table_description(cursor, User._meta.db_table)
    existing_columns = {col.name for col in table_desc}
    print(f"Existing columns in '{User._meta.db_table}': {existing_columns}")

    # Check model fields and add missing ones
    with connection.schema_editor() as schema_editor:
        for field in User._meta.local_fields:
            if field.column not in existing_columns:
                print(f"⚠️  Missing column: {field.column}. Adding...")
                try:
                    schema_editor.add_field(User, field)
                    print(f"✅ Added {field.column}")
                except Exception as e:
                    print(f"❌ Failed to add {field.column}: {e}")
            else:
                pass

    # Verify again
    cursor.execute(f"SELECT * FROM {User._meta.db_table} LIMIT 0")
    final_cols = [col[0] for col in cursor.description]
    print(f"Final columns: {final_cols}")

print("\nVerifying user creation...")
try:
    if not User.objects.filter(email='schema_test@test.com').exists():
        u = User(
            email='schema_test@test.com',
            first_name='Schema',
            last_name='Test',
            skin_type='Oily',
            skin_tone='IV',
            country='TestLand',
            address='123 Schema Rd'
        )
        u.set_password('pass123')
        u.save()
        print("✅ User created successfully with all profile fields!")
        u.delete()
        print("✅ Test user deleted.")
    else:
        print("Test user already exists.")
except Exception as e:
    print(f"❌ User creation FAILED: {e}")
    import traceback
    traceback.print_exc()

print("Schema sync completed.")
