# Quick Fix for "Network error. Is the backend server running?"

## ✅ Immediate Solution

**The issue:** Your frontend is likely being served from a different origin (like `file://` or Live Server on port 5500), and CORS isn't allowing the connection.

### Fix 1: Access Frontend Through Django (RECOMMENDED)

Instead of opening `login.html` directly, access it through the Django server:

1. **Open your browser**
2. **Go to:** `http://localhost:8000/login.html`
3. **Try logging in again**

This serves the frontend from the same origin as the backend, avoiding CORS issues entirely.

---

### Fix 2: If Using Live Server (Port 5500)

If you're using VS Code Live Server, we need to add it to CORS allowed origins:

**Edit `.env` file:**
```env
ALLOWED_HOSTS=localhost,127.0.0.1
```

**The CORS settings in `settings.py` already allow all origins in DEBUG mode**, so this should work.

---

## 🧪 Test the Connection

Open browser console (F12) and run:

```javascript
fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test@skinscan.com',
        password: 'test123'
    })
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

**Expected output:**
- Success: `{status: "success", message: "Login successful", ...}`
- User not found: `{status: "error", message: "Invalid email or password"}`
- Network error: Check if backend is actually running

---

## 🔍 Verify Backend is Running

**Check terminal where you ran `python manage.py runserver 8000`:**

You should see:
```
[OK] Environment variables validated successfully
System check identified no issues (0 silenced).
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

**If you see errors**, the backend isn't running properly.

---

## 📝 Create Test User (If Needed)

If login still fails with "Invalid email or password", create the test user:

```bash
python manage.py shell
```

```python
from authentication.models import User

# Check if user exists
if User.objects.filter(email='test@skinscan.com').exists():
    print("User already exists!")
else:
    # Create test user
    user = User.objects.create(
        full_name="Test User",
        email="test@skinscan.com",
        account_status="ACTIVE"
    )
    user.set_password("test123")
    user.save()
    print(f"✓ User created: {user.email}")

exit()
```

---

## ✅ Summary

1. **Access frontend via:** `http://localhost:8000/login.html` (not `file://` or Live Server)
2. **Test credentials:** `test@skinscan.com` / `test123`
3. **Check browser console (F12)** for detailed error messages
4. **Verify backend is running** on port 8000

**This should fix your "Network error" issue!**
