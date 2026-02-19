
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

def run_sql(sql):
    with connection.cursor() as cursor:
        try:
            cursor.execute(sql)
            print(f"Successfully executed: {sql}")
        except Exception as e:
            print(f"Error executing {sql}: {e}")

# Add disease_name to prediction_results
run_sql("ALTER TABLE prediction_results ADD COLUMN IF NOT EXISTS disease_name varchar(100) DEFAULT 'Unknown';")

# Add body_location to scan_history
run_sql("ALTER TABLE scan_history ADD COLUMN IF NOT EXISTS body_location varchar(50) DEFAULT '';")

print("Schema patch complete.")
