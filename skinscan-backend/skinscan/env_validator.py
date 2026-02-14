"""
Environment Variables Validation
Checks required environment variables on startup
"""
import os
import sys
from decouple import config


def validate_environment():
    """
    Validate that all required environment variables are set
    """
    required_vars = [
        'SECRET_KEY',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'DB_PORT',
    ]
    
    missing_vars = []
    
    for var in required_vars:
        try:
            value = config(var)
            if not value:
                missing_vars.append(var)
        except Exception:
            missing_vars.append(var)
    
    if missing_vars:
        print("\n" + "="*60)
        print("ERROR: ENVIRONMENT CONFIGURATION MISSING")
        print("="*60)
        print("\nThe following required environment variables are missing:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease check your .env file and ensure all required variables are set.")
        print("="*60 + "\n")
        sys.exit(1)
    
    print("[OK] Environment variables validated successfully")
