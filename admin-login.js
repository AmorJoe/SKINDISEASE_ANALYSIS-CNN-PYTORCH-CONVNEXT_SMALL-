// ============================================
// Admin Login JavaScript
// ============================================

const API_BASE_URL = 'https://skinscan-hjxo.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    // Auto-redirect if already logged in as admin
    const userDataStr = sessionStorage.getItem('user_data');
    if (sessionStorage.getItem('jwt_token') && userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            if (userData.is_admin) {
                window.location.href = 'admin.html';
            }
        } catch (e) {
            console.error('Error parsing user data', e);
        }
    }

    const loginForm = document.getElementById('adminLoginForm');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        // Reset state
        errorMsg.textContent = '';
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span>';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.status === 'success') {
                const userData = data.data.user;

                // STRICT ADMIN CHECK
                if (!userData.is_admin) {
                    throw new Error('Access Denied: Admin privileges required.');
                }

                // Success
                sessionStorage.setItem('jwt_token', data.data.token);
                sessionStorage.setItem('user_data', JSON.stringify(userData));

                loginBtn.style.backgroundColor = '#10b981';
                loginBtn.innerHTML = '<i class="fas fa-check"></i>';

                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 800);
            } else {
                throw new Error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMsg.textContent = error.message;
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign in';

            // Shake effect
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 400);
        }
    });

    // Password Toggle Logic
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('admin-password');

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Toggle icon class
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });

    // Handle "Forget password?"
    document.querySelector('.forgot-link').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Please contact the head of system administration to reset your credentials.');
    });
});
