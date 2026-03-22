// ============================================
// SkinScan AI - Login/Signup JavaScript
// Connected to Django Backend API
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

// Auto-redirect if already logged in
if (sessionStorage.getItem('jwt_token')) {
    window.location.href = 'index.html';
}


// Toggle between Login and Signup
const toggleBtns = document.querySelectorAll('.toggle-btn');
const loginWrapper = document.getElementById('login-form-wrapper');
const signupWrapper = document.getElementById('signup-form-wrapper');

function switchToLogin() {
    toggleBtns.forEach(b => b.classList.remove('active'));
    toggleBtns[0].classList.add('active');
    loginWrapper.classList.add('active');
    signupWrapper.classList.remove('active');
}

function switchToSignup() {
    toggleBtns.forEach(b => b.classList.remove('active'));
    toggleBtns[1].classList.add('active');
    signupWrapper.classList.add('active');
    loginWrapper.classList.remove('active');
}

toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const formType = btn.dataset.form;
        if (formType === 'login') {
            switchToLogin();
        } else {
            switchToSignup();
        }
    });
});

// Handle "Register" link in login form
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('toggle-to-signup')) {
        e.preventDefault();
        switchToSignup();
    }
});

// Handle "Log in here" link in signup form
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('toggle-to-login')) {
        e.preventDefault();
        switchToLogin();
    }
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function () {
        const targetId = this.dataset.target;
        const input = document.getElementById(targetId);

        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});

// Password strength checker
const signupPassword = document.getElementById('signup-password');
const strengthFill = document.getElementById('strength-fill');
const strengthText = document.getElementById('strength-text');

if (signupPassword) {
    signupPassword.addEventListener('input', function () {
        const password = this.value;
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;

        strengthFill.className = 'strength-fill';

        if (strength === 0) {
            strengthText.textContent = '';
        } else if (strength <= 2) {
            strengthFill.classList.add('weak');
            strengthText.textContent = 'Weak password';
        } else if (strength === 3) {
            strengthFill.classList.add('medium');
            strengthText.textContent = 'Medium password';
        } else {
            strengthFill.classList.add('strong');
            strengthText.textContent = 'Strong password';
        }
    });
}

// Real-time validation
function validateInput(input, errorElement, validationFn) {
    input.addEventListener('blur', function () {
        const error = validationFn(this.value);
        if (error) {
            this.classList.add('error');
            this.classList.remove('success');
            errorElement.textContent = error;
        } else {
            this.classList.remove('error');
            this.classList.add('success');
            errorElement.textContent = '';
        }
    });

    input.addEventListener('input', function () {
        if (this.classList.contains('error')) {
            const error = validationFn(this.value);
            if (!error) {
                this.classList.remove('error');
                this.classList.add('success');
                errorElement.textContent = '';
            }
        }
    });
}

// Validation functions
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!re.test(email)) return 'Invalid email format';
    return '';
};

const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
};

// Apply validation to signup form
const signupEmail = document.getElementById('signup-email');
const signupConfirmPassword = document.getElementById('signup-confirm-password');

if (signupEmail) {
    validateInput(signupEmail, document.getElementById('signup-email-error'), validateEmail);
}
if (signupPassword) {
    validateInput(signupPassword, document.getElementById('signup-password-error'), validatePassword);
}
if (signupConfirmPassword) {
    validateInput(signupConfirmPassword, document.getElementById('signup-confirm-password-error'), validatePassword);
}

// ============================================
// LOGIN FORM - Real API Integration
// ============================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const usernameError = document.getElementById('login-username-error');
        const passwordError = document.getElementById('login-password-error');

        // Clear errors
        usernameError.textContent = '';
        passwordError.textContent = '';

        // Show loading
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div><span>Verifying...</span>';

        try {
            // Call Django Backend API
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: username,  // Backend expects email
                    password: password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // EXCLUSIVITY CHECK: Admins must use the dedicated login page
                if (data.data.user.is_admin) {
                    passwordError.textContent = 'Admin access restricted. Please use the authorized Admin Login page.';
                    btn.disabled = false;
                    btn.innerHTML = '<span>Log In</span>';
                    loginForm.classList.add('shake');
                    setTimeout(() => loginForm.classList.remove('shake'), 300);
                    return;
                }

                // Store JWT token in sessionStorage
                sessionStorage.setItem('jwt_token', data.data.token);
                sessionStorage.setItem('user_data', JSON.stringify(data.data.user));

                btn.classList.add('success');
                btn.innerHTML = '<i class="fas fa-check-circle"></i><span>Success!</span>';

                setTimeout(() => {
                    if (data.data.user.is_admin) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 500);
            } else if (data.requires_verification) {
                // Email not verified — show OTP modal
                btn.disabled = false;
                btn.innerHTML = '<span>Log In</span>';
                showOTPModal(data.email);
            } else {
                // Show error from backend
                passwordError.textContent = data.message || 'Invalid username or password';
                btn.disabled = false;
                btn.innerHTML = '<span>Log In</span>';
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 300);
            }
        } catch (error) {
            console.error('Login error:', error);
            passwordError.textContent = 'Network error. Is the backend server running?';
            btn.disabled = false;
            btn.innerHTML = '<span>Log In</span>';
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 300);
        }
    });
}

// ============================================
// SIGNUP FORM - Real API Integration
// ============================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const btn = document.getElementById('signup-btn');

        // Clear previous errors
        document.getElementById('signup-email-error').textContent = '';
        document.getElementById('signup-password-error').textContent = '';
        document.getElementById('signup-confirm-password-error').textContent = '';

        // Validate
        const emailError = validateEmail(email);
        const passError = validatePassword(password);

        if (emailError || passError) {
            if (emailError) document.getElementById('signup-email-error').textContent = emailError;
            if (passError) document.getElementById('signup-password-error').textContent = passError;
            return;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            document.getElementById('signup-confirm-password-error').textContent = 'Passwords do not match';
            return;
        }

        // Show loading
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div><span>Registering...</span>';

        try {
            // Call Django Backend API
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                btn.classList.add('success');
                btn.innerHTML = '<i class="fas fa-check-circle"></i><span>Registered!</span>';

                // Show OTP verification modal instead of redirecting
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.disabled = false;
                    btn.innerHTML = '<span>Register</span>';
                    showOTPModal(email);
                }, 800);
            } else {
                // Show validation errors from backend
                if (data.errors) {
                    if (data.errors.email) {
                        document.getElementById('signup-email-error').textContent = data.errors.email[0];
                    }
                    if (data.errors.password) {
                        document.getElementById('signup-password-error').textContent = data.errors.password[0];
                    }
                } else {
                    alert(data.message || 'Registration failed');
                }
                btn.disabled = false;
                btn.innerHTML = '<span>Register</span>';
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Network error. Is the backend server running?');
            btn.disabled = false;
            btn.innerHTML = '<span>Register</span>';
        }
    });
}

// Forgot password link
const forgotLink = document.querySelector('.forgot-password');
if (forgotLink) {
    forgotLink.addEventListener('click', async function (e) {
        e.preventDefault();
        const email = prompt('Enter your email address to receive a password reset OTP:');

        if (email) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // In development mode, OTP is returned in response
                    if (data.data.otp_code) {
                        alert(`OTP sent! (Dev mode: ${data.data.otp_code})\nValid for ${data.data.expires_in_minutes} minutes.`);
                    } else {
                        alert('OTP sent to your email! Check your inbox.');
                    }
                } else {
                    alert(data.message || 'Failed to send OTP');
                }
            } catch (error) {
                alert('Network error. Is the backend server running?');
            }
        }
    });
}

// ============================================
// OTP VERIFICATION MODAL
// ============================================
function createOTPModal() {
    if (document.getElementById('otp-verification-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'otp-verification-modal';
    modal.style.cssText = `
        display:none; position:fixed; inset:0; z-index:9999;
        background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
        align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#fff; border-radius:16px; padding:40px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.3); animation:slideUp 0.3s ease-out;">
            <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-envelope-open-text" style="color:#fff;font-size:1.6rem;"></i>
            </div>
            <h2 style="margin-bottom:8px;color:#1a1a2e;font-size:1.4rem;">Verify Your Email</h2>
            <p id="otp-modal-subtitle" style="color:#666;font-size:0.9rem;margin-bottom:24px;">We've sent a 6-digit code to your email</p>
            <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
                <input type="text" maxlength="1" class="otp-digit" style="width:48px;height:56px;text-align:center;font-size:1.4rem;font-weight:700;border:2px solid #e0e0e0;border-radius:12px;outline:none;transition:border-color 0.2s;" />
            </div>
            <p id="otp-error-msg" style="color:#ef4444;font-size:0.85rem;min-height:20px;margin-bottom:12px;"></p>
            <button id="otp-verify-btn" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:16px;transition:opacity 0.2s;">Verify Email</button>
            <p style="color:#888;font-size:0.85rem;">Didn't receive the code? <a href="#" id="otp-resend-link" style="color:#667eea;text-decoration:none;font-weight:600;">Resend</a></p>
        </div>
    `;
    document.body.appendChild(modal);

    // Auto-focus and auto-advance digits
    const digits = modal.querySelectorAll('.otp-digit');
    digits.forEach((input, idx) => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && idx < digits.length - 1) digits[idx + 1].focus();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) digits[idx - 1].focus();
        });
        input.addEventListener('focus', function () {
            this.style.borderColor = '#667eea';
        });
        input.addEventListener('blur', function () {
            this.style.borderColor = '#e0e0e0';
        });
    });
}

function showOTPModal(email) {
    createOTPModal();
    const modal = document.getElementById('otp-verification-modal');
    modal.style.display = 'flex';
    document.getElementById('otp-modal-subtitle').textContent = `We've sent a 6-digit code to ${email}`;
    document.getElementById('otp-error-msg').textContent = '';

    // Clear digits
    const digits = modal.querySelectorAll('.otp-digit');
    digits.forEach(d => d.value = '');
    digits[0].focus();

    // Verify button
    document.getElementById('otp-verify-btn').onclick = async () => {
        const code = Array.from(digits).map(d => d.value).join('');
        if (code.length !== 6) {
            document.getElementById('otp-error-msg').textContent = 'Please enter all 6 digits';
            return;
        }

        const btn = document.getElementById('otp-verify-btn');
        btn.textContent = 'Verifying...';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, otp_code: code })
            });
            const data = await response.json();

            if (data.status === 'success') {
                // Store token and redirect
                if (data.data && data.data.token) {
                    sessionStorage.setItem('jwt_token', data.data.token);
                    sessionStorage.setItem('user_data', JSON.stringify(data.data.user));
                }
                btn.textContent = '✓ Verified!';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    modal.style.display = 'none';
                    switchToLogin();
                    alert('Email verified! Please log in.');
                }, 800);
            } else {
                document.getElementById('otp-error-msg').textContent = data.message || 'Verification failed';
                btn.textContent = 'Verify Email';
                btn.disabled = false;
            }
        } catch (err) {
            document.getElementById('otp-error-msg').textContent = 'Network error. Try again.';
            btn.textContent = 'Verify Email';
            btn.disabled = false;
        }
    };

    // Resend link
    document.getElementById('otp-resend-link').onclick = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();
            document.getElementById('otp-error-msg').style.color = '#10b981';
            document.getElementById('otp-error-msg').textContent = data.message || 'New code sent!';
            setTimeout(() => {
                document.getElementById('otp-error-msg').style.color = '#ef4444';
                document.getElementById('otp-error-msg').textContent = '';
            }, 3000);
        } catch (err) {
            document.getElementById('otp-error-msg').textContent = 'Failed to resend. Try again.';
        }
    };
}
