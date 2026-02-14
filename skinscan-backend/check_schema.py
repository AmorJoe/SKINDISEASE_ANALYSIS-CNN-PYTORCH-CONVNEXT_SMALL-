import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from django.db import connection
from authentication.models import User

# Get database columns
cursor = connection.cursor()
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
""")
db_columns = {row[0] for row in cursor.fetchall()}

# Get model fields
model_fields = {f.column for f in User._meta.fields}

print("=" * 60)
print("DATABASE vs MODEL COMPARISON")
print("=" * 60)

print("\n✅ Columns in BOTH database and model:")
both = db_columns & model_fields
for col in sorted(both):
    print(f"  - {col}")

print("\n❌ Columns in MODEL but NOT in database:")
missing_in_db = model_fields - db_columns
for col in sorted(missing_in_db):
    print(f"  - {col}")

print("\n⚠️  Columns in DATABASE but NOT in model:")
extra_in_db = db_columns - model_fields
for col in sorted(extra_in_db):
    print(f"  - {col}")

print("\n" + "=" * 60)
print(f"Total DB columns: {len(db_columns)}")
print(f"Total Model fields: {len(model_fields)}")
print("=" * 60)
