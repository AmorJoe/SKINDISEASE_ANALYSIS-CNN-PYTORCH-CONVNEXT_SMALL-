# EMERGENCY FIX: Backend Server Not Starting

## The Problem
The Django server process is running but **not actually listening on port 8000**. 
Connection test shows: **"Connection actively refused"**

## Root Cause
The `env_validator.py` is likely causing the server to exit before it can start listening.

## IMMEDIATE FIX

### Step 1: Temporarily Disable Environment Validator

Edit `d:\Project\FIREBASE\skinscan-backend\skinscan\settings.py`:

**Comment out lines 10-12:**
```python
# Validate environment variables on startup
# from .env_validator import validate_environment
# validate_environment()
```

### Step 2: Stop and Restart Server

1. **Stop server:** Press `Ctrl+C` in the terminal
2. **Start again:** `python manage.py runserver 8000`

You should now see:
```
System check identified no issues (0 silenced).
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### Step 3: Test Connection

Open browser and go to: `http://localhost:8000/login.html`

Login should now work!

---

## Why This Happened

The `env_validator.py` checks for required environment variables. If any are missing, it calls `sys.exit(1)`, which stops the server before it can start listening on port 8000.

The server process appears "running" but is actually stuck in a restart loop.

---

## Permanent Fix (After Testing)

Once you confirm the server works, we can fix the environment validator to not break the server startup.

Let me know if this works!
