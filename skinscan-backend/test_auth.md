# Test Authentication Endpoints

## Create Test User via Django Shell
```python
from authentication.models import User

# Create test user
user = User.objects.create(
    full_name="Test User",
    email="test@example.com",
    phone="1234567890",
    account_status="ACTIVE"
)
user.set_password("password123")
user.save()
print(f"Created user: {user.email}")
```

## Test Registration
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

## Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Test Token Validation
```bash
curl -X GET http://localhost:8000/api/auth/validate-token \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```
