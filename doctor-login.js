// ============================================
// SkinScan AI - Doctor Portal Login/Signup
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

// Toggle Logic
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
        if (btn.dataset.form === 'login') switchToLogin();
        else switchToSignup();
    });
});

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('toggle-to-signup')) {
        e.preventDefault();
        switchToSignup();
    }
    if (e.target.classList.contains('toggle-to-login')) {
        e.preventDefault();
        switchToLogin();
    }
});

// Password Toggle
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function () {
        const input = document.getElementById(this.dataset.target);
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// Password Strength
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
        if (strength <= 2) {
            strengthFill.classList.add('weak');
            strengthText.textContent = 'Weak';
        } else if (strength === 3) {
            strengthFill.classList.add('medium');
            strengthText.textContent = 'Medium';
        } else {
            strengthFill.classList.add('strong');
            strengthText.textContent = 'Strong';
        }
    });
}

// Login Handler
// Login Handler
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorText = document.getElementById('login-password-error');

    // Reset UI
    errorText.textContent = '';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Check if user is actually a doctor
            if (!data.data.user.is_doctor && !data.data.user.is_admin) {
                throw new Error("Access Denied: This portal is for doctors only.");
            }

            sessionStorage.setItem('jwt_token', data.data.token);
            sessionStorage.setItem('user_data', JSON.stringify(data.data.user));

            btn.style.background = '#2e7d32'; // Success Green
            btn.innerHTML = '<i class="fas fa-check"></i> Welcome, Dr.';

            setTimeout(() => {
                window.location.href = 'doctor-dashboard.html';
            }, 800);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error(error);
        errorText.textContent = error.message;
        btn.innerHTML = '<span>Access Portal</span>';
        btn.disabled = false;
        btn.style.background = 'var(--primary-blue)';

        document.querySelector('.login-container').classList.add('shake');
        setTimeout(() => document.querySelector('.login-container').classList.remove('shake'), 500);
    }
});


// Registration Handler
// Registration Handler
document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm-password').value;
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const mrn = document.getElementById('signup-mrn').value;

    if (password !== confirm) {
        document.getElementById('signup-confirm-password-error').innerText = "Passwords do not match";
        return;
    }

    // Simple MRN Validation
    if (mrn.length < 5) {
        document.getElementById('signup-mrn-error').innerText = "Invalid Registration Number";
        return;
    }

    const btn = document.getElementById('signup-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting Application...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password,
                first_name: firstName,
                last_name: lastName,
                is_doctor: true,
                medical_license_number: mrn,
                specialization: 'General' // Default for now
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert("Application Submitted Successfully!\n\nYou can now log in to the Doctor Portal.");
            switchToLogin();
            btn.innerHTML = '<span>Submit Application</span>';
            document.getElementById('signupForm').reset();
            btn.disabled = false;
        } else {
            // Handle specific field errors
            if (data.errors) {
                if (data.errors.email) document.getElementById('signup-email-error').innerText = data.errors.email[0];
                if (data.errors.medical_license_number) document.getElementById('signup-mrn-error').innerText = data.errors.medical_license_number[0];
            }
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
        btn.innerHTML = '<span>Submit Application</span>';
        btn.disabled = false;
    }
});
