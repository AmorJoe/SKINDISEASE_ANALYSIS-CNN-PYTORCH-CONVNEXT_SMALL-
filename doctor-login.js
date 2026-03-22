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
        } else if (data.requires_verification) {
            // Email not verified — show OTP modal
            btn.innerHTML = '<span>Access Portal</span>';
            btn.disabled = false;
            btn.style.background = 'var(--primary-blue)';
            showOTPModal(email, 'doctor');
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
            btn.style.background = '#2e7d32';
            btn.innerHTML = '<i class="fas fa-check"></i> Application Received!';

            // Show OTP verification modal
            setTimeout(() => {
                btn.innerHTML = '<span>Submit Application</span>';
                btn.style.background = 'var(--primary-blue)';
                btn.disabled = false;
                showOTPModal(email, 'doctor');
            }, 800);
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

// ============================================
// OTP VERIFICATION MODAL (Doctor Portal)
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
            <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:50%;background:linear-gradient(135deg,#0288d1,#01579b);display:flex;align-items:center;justify-content:center;">
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
            <button id="otp-verify-btn" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0288d1,#01579b);color:#fff;font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:16px;transition:opacity 0.2s;">Verify Email</button>
            <p style="color:#888;font-size:0.85rem;">Didn't receive the code? <a href="#" id="otp-resend-link" style="color:#0288d1;text-decoration:none;font-weight:600;">Resend</a></p>
        </div>
    `;
    document.body.appendChild(modal);

    const digits = modal.querySelectorAll('.otp-digit');
    digits.forEach((input, idx) => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && idx < digits.length - 1) digits[idx + 1].focus();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) digits[idx - 1].focus();
        });
        input.addEventListener('focus', function () { this.style.borderColor = '#0288d1'; });
        input.addEventListener('blur', function () { this.style.borderColor = '#e0e0e0'; });
    });
}

function showOTPModal(email, portal) {
    createOTPModal();
    const modal = document.getElementById('otp-verification-modal');
    modal.style.display = 'flex';
    document.getElementById('otp-modal-subtitle').textContent = `We've sent a 6-digit code to ${email}`;
    document.getElementById('otp-error-msg').textContent = '';

    const digits = modal.querySelectorAll('.otp-digit');
    digits.forEach(d => d.value = '');
    digits[0].focus();

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
                btn.textContent = '✓ Verified!';
                btn.style.background = '#2e7d32';
                setTimeout(() => {
                    modal.style.display = 'none';
                    switchToLogin();
                    alert('OTP verified successfully. Your request has been sent for admin approval.');
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

    let resendCooldown = 0;
    
    document.getElementById('otp-resend-link').onclick = async (e) => {
        e.preventDefault();
        
        if (resendCooldown > 0) {
            return;
        }

        const resendLink = document.getElementById('otp-resend-link');
        const originalText = resendLink.textContent;
        
        try {
            resendLink.style.pointerEvents = 'none';
            resendLink.style.opacity = '0.5';
            
            const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                document.getElementById('otp-error-msg').style.color = '#10b981';
                document.getElementById('otp-error-msg').textContent = data.message || 'New code sent!';
                setTimeout(() => {
                    document.getElementById('otp-error-msg').style.color = '#ef4444';
                    document.getElementById('otp-error-msg').textContent = '';
                }, 3000);
                
                // Start cooldown
                resendCooldown = 60;
                const interval = setInterval(() => {
                    resendCooldown--;
                    if (resendCooldown > 0) {
                        resendLink.textContent = `Resend (${resendCooldown}s)`;
                    } else {
                        clearInterval(interval);
                        resendLink.textContent = 'Resend';
                        resendLink.style.pointerEvents = 'auto';
                        resendLink.style.opacity = '1';
                    }
                }, 1000);
            } else {
                document.getElementById('otp-error-msg').textContent = data.message || 'Failed to resend. Try again.';
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
            }
        } catch (err) {
            document.getElementById('otp-error-msg').textContent = 'Failed to resend. Try again.';
            resendLink.style.pointerEvents = 'auto';
            resendLink.style.opacity = '1';
        }
    };
}
