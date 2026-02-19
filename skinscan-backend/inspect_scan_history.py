
import os
import django
from django.db import connection
import sys

# Ensure stdout is unbuffered
sys.stdout.reconfigure(line_buffering=True)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

def inspect_table(table_name):
    with open('schema_validation.txt', 'w') as f:
        with connection.cursor() as cursor:
            try:
                cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}';")
                columns = cursor.fetchall()
                if not columns:
                    f.write(f"Table '{table_name}' not found or has no columns.\n")
                else:
                    f.write(f"Columns for table '{table_name}':\n")
                    for col in columns:
                        f.write(f"- {col[0]} ({col[1]})\n")
            except Exception as e:
                f.write(f"Error inspecting table '{table_name}': {e}\n")

inspect_table('scan_history')
