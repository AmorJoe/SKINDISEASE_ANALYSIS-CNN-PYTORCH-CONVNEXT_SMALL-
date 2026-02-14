import os
import django
from django.db.models import Q

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()

from authentication.models import User
from prediction.models import SkinImage, PredictionResult, ScanHistory
from chatbot.models import ChatHistory

def check_model_emptiness(model_class, model_name):
    count = model_class.objects.count()
    print(f"Checking {model_name}...")
    
    if count == 0:
        print(f"  [EMPTY] Table '{model_class._meta.db_table}' has 0 rows.", flush=True)
    else:
        print(f"  [DATA] Table '{model_class._meta.db_table}' has {count} rows.", flush=True)
        
        # Check for empty/null values in specific interesting fields
        try:
            empty_fields = []
            for field in model_class._meta.fields:
                if field.null:
                    null_count = model_class.objects.filter(**{f"{field.name}__isnull": True}).count()
                    if null_count > 0:
                       empty_fields.append(f"{field.name}: {null_count} nulls")
                
                if isinstance(field, (django.db.models.CharField, django.db.models.TextField)) and field.blank:
                     # Check for empty strings if blank is allowed
                     blank_count = model_class.objects.filter(**{f"{field.name}": ""}).count()
                     if blank_count > 0:
                         empty_fields.append(f"{field.name}: {blank_count} empty strings")

            if empty_fields:
                print(f"    - Fields with empty/null values: {', '.join(empty_fields)}", flush=True)
            else:
                print("    - All fields populated (no nulls/empty strings in checked fields).", flush=True)
        except Exception as e:
            print(f"    - Error checking fields: {e}", flush=True)
    print("-" * 40, flush=True)

def main():
    print("=" * 40)
    print("DATABASE CONTENT REPORT")
    print("=" * 40)
    
    check_model_emptiness(User, "User")
    check_model_emptiness(SkinImage, "SkinImage")
    check_model_emptiness(PredictionResult, "PredictionResult")
    check_model_emptiness(ScanHistory, "ScanHistory")
    check_model_emptiness(ChatHistory, "ChatHistory")

if __name__ == '__main__':
    import sys
    with open('db_report_utf8.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        main()
