import os
import sys
import django
from django.core.management import call_command
from django.conf import settings

def run_check():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skinscan.settings")
    django.setup()
    try:
        call_command('check')
        print("Check passed!")
    except Exception as e:
        with open('check_errors.log', 'w') as f:
            f.write(f"Check failed with error type: {type(e).__name__}\n")
            if hasattr(e, 'messages'):
                f.write("\nSpecific Check Errors:\n")
                for msg in e.messages:
                    f.write(f" - [{msg.id}] {msg.msg}\n")
                    if msg.hint:
                        f.write(f"   Hint: {msg.hint}\n")
            else:
                f.write(f"Error details: {e}\n")
                import traceback
                traceback.print_exc(file=f)
        print("Errors written to check_errors.log")

if __name__ == "__main__":
    run_check()
