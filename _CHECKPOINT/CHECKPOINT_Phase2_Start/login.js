// ============================================
// SkinScan AI - Login/Signup JavaScript
// Connected to Django Backend API
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

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
                // Store JWT token in sessionStorage
                sessionStorage.setItem('jwt_token', data.data.token);
                sessionStorage.setItem('user_data', JSON.stringify(data.data.user));

                btn.classList.add('success');
                btn.innerHTML = '<i class="fas fa-check-circle"></i><span>Success!</span>';

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
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

                setTimeout(() => {
                    // Switch to login form
                    switchToLogin();
                    signupForm.reset();
                    btn.classList.remove('success');
                    btn.disabled = false;
                    btn.innerHTML = '<span>Register</span>';

                    // Show success message
                    alert('Registration successful! Please log in.');
                }, 1000);
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
