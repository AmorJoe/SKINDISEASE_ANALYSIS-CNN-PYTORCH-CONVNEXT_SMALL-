// ============================================
// SkinScan AI - Dashboard JavaScript
// Connected to Django Backend API
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

// Get JWT token from session storage
function getAuthToken() {
    return sessionStorage.getItem('jwt_token');
}

// Get user data from session storage
function getUserData() {
    const data = sessionStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout function
function logout() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Page Identification ---
    const loginForm = document.getElementById('loginForm');
    const dropArea = document.getElementById('drop-area');

    // --- LOGIN PAGE LOGIC ---
    if (loginForm) {
        initLoginPage();
    }

    // --- DASHBOARD PAGE LOGIC ---
    if (dropArea) {
        // Check authentication before initializing dashboard
        if (requireAuth()) {
            initDashboardPage();
            initNavigation(); // Initialize Nav & Menu
        }
    }

});

function initLoginPage() {
    const form = document.getElementById('loginForm');

    // Toggle active state for "Log In/Sign Up" buttons (Visual only for now)
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const username = form.username.value;
        const password = form.password.value;
        const errorMsg = document.getElementById('error-msg');
        const btn = document.querySelector('.btn-login');

        // Reset Error
        errorMsg.textContent = '';

        // Simulate API/Validation
        const originalText = btn.innerText;
        btn.innerText = 'Verifying...';
        btn.style.opacity = '0.7';

        setTimeout(() => {
            // Mock Credentials
            if (username === 'amor' && password === '1234') {
                btn.style.background = '#27AE60';
                btn.innerText = 'Success!';

                // Redirect to Dashboard
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            } else {
                errorMsg.textContent = 'Invalid username or password';
                btn.innerText = originalText;
                btn.style.opacity = '1';

                // Shake Animation
                form.style.animation = 'shake 0.3s';
                setTimeout(() => form.style.animation = '', 300);
            }
        }, 800);
    });
}

function initDashboardPage() {
    // --- File Upload Logic ---
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const uploadBtnTrigger = document.getElementById('upload-btn-trigger');
    const resetBtn = document.getElementById('reset-btn');
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('result-card');
    const imagePreview = document.getElementById('image-preview');
    const accuracyText = document.getElementById('accuracy-text');
    const meterFill = document.getElementById('meter-fill');
    const diseaseName = document.getElementById('disease-name');
    const recommendationEl = document.querySelector('.recommendation p');

    // Chat elements
    const chatWidgetBtn = document.querySelector('.chat-widget-btn');
    const closeChatBtn = document.querySelector('.chat-header .fa-times');
    const sendChatBtn = document.querySelector('.chat-input button');
    const userInput = document.getElementById('user-input');

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // Display user info (optional)
    const userData = getUserData();
    if (userData) {
        console.log('Logged in as:', userData.full_name);
    }

    // Store current file for upload
    let currentFile = null;

    // 1. Drag & Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

    // 2. Manual Upload
    if (fileInput) {
        fileInput.addEventListener('change', function () { handleFiles(this.files); });
    }
    if (uploadBtnTrigger && fileInput) {
        uploadBtnTrigger.addEventListener('click', () => fileInput.click());
    }

    // 3. Reset
    if (resetBtn) {
        resetBtn.addEventListener('click', resetUpload);
    }

    // --- Chatbot Logic ---
    if (chatWidgetBtn) {
        chatWidgetBtn.addEventListener('click', toggleChat);
    }
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', toggleChat);
    }
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendMessage);
    }
    if (userInput) {
        userInput.addEventListener('keypress', handleEnter);
    }

    // ============================================
    // IMAGE UPLOAD - Real API Integration
    // ============================================
    async function handleFiles(files) {
        const file = files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert("Please upload a valid image file.");
            return;
        }

        // Store file reference
        currentFile = file;

        // Preview file locally
        previewFile(file);

        // Show loader
        dropArea.style.display = 'none';
        loader.style.display = 'block';
        resultCard.style.display = 'none';

        try {
            // Create form data
            const formData = new FormData();
            formData.append('image', file);

            // Upload to Django backend
            const response = await fetch(`${API_BASE_URL}/predict/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData
            });

            const data = await response.json();

            // Hide loader
            loader.style.display = 'none';

            if (data.status === 'success') {
                // Show results
                resultCard.style.display = 'flex';

                const prediction = data.data;
                diseaseName.innerText = `Detected: ${prediction.disease_name}`;
                accuracyText.innerText = `${prediction.confidence}%`;

                // Update recommendation
                if (recommendationEl) {
                    recommendationEl.innerText = prediction.recommendation;
                }

                // Animate confidence bar
                setTimeout(() => {
                    meterFill.style.width = `${prediction.confidence}%`;
                }, 100);

                console.log('Prediction result:', prediction);

            } else if (response.status === 401) {
                // Token expired or invalid
                alert('Session expired. Please log in again.');
                logout();
            } else {
                // Handle errors (poor quality, etc.)
                alert(`Error: ${data.message}`);
                resetUpload();
            }

        } catch (error) {
            console.error('Upload error:', error);
            loader.style.display = 'none';
            alert('Network error. Is the backend server running at localhost:8000?');
            resetUpload();
        }
    }

    function previewFile(file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function () {
            imagePreview.style.backgroundImage = `url(${reader.result})`;
        }
    }

    function resetUpload() {
        resultCard.style.display = 'none';
        dropArea.style.display = 'block';
        meterFill.style.width = '0%';
        fileInput.value = '';
        currentFile = null;
    }
}

// --- Shared Helper Functions ---

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.style.display = (chatBox.style.display === 'flex') ? 'none' : 'flex';
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// ============================================
// CHATBOT - Real API Integration
// ============================================
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    const chatBody = document.getElementById('chat-body');

    if (!message) return;

    // User Message
    const userMsg = document.createElement('div');
    userMsg.classList.add('message', 'user');
    userMsg.innerText = message;
    chatBody.appendChild(userMsg);
    input.value = '';

    // Auto scroll
    setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 10);

    // Show typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.classList.add('message', 'bot', 'typing');
    typingMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Typing...';
    chatBody.appendChild(typingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        // Send to Django backend
        const response = await fetch(`${API_BASE_URL}/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                message: message
            })
        });

        // Remove typing indicator
        typingMsg.remove();

        const data = await response.json();

        if (data.status === 'success') {
            // Bot Response
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = data.data.bot_message;
            chatBody.appendChild(botMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        } else if (response.status === 401) {
            // Token expired
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = "Session expired. Please log in again.";
            chatBody.appendChild(botMsg);
        } else {
            // Error handling
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = "Sorry, I couldn't process that. Please try again.";
            chatBody.appendChild(botMsg);
        }
    } catch (error) {
        console.error('Chat error:', error);
        // Remove typing indicator
        typingMsg.remove();

        // Fallback to local responses if backend is down
        const botMsg = document.createElement('div');
        botMsg.classList.add('message', 'bot');

        const messageLower = message.toLowerCase();
        if (messageLower.includes('hello') || messageLower.includes('hi')) {
            botMsg.innerText = "Hello! I'm your SkinCare Assistant. How can I help you today?";
        } else if (messageLower.includes('accuracy')) {
            botMsg.innerText = "Our AI model has been trained on thousands of images and achieves good accuracy in preliminary screening.";
        } else {
            botMsg.innerText = "I'm having trouble connecting to the server. Please check if the backend is running.";
        }

        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

// ============================================
// NAVIGATION & USER MENU LOGIC
// ============================================
function initNavigation() {
    // 1. User Menu Dropdown
    const navAvatar = document.getElementById('nav-avatar');
    const dropdownContent = document.getElementById('nav-dropdown');
    const userMenu = document.querySelector('.user-menu');

    if (navAvatar && dropdownContent) {
        // Toggle Dropdown
        navAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });

        // Close Dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userMenu && !userMenu.contains(e.target)) {
                dropdownContent.classList.remove('show');
            }
        });
    }

    // 2. Logout
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // 3. Load User Avatar
    const userData = getUserData();
    if (userData && userData.avatar && navAvatar) {
        // Assuming avatar is a full URL or base64. If it's a relative path, prepend base URL.
        const avatarSrc = userData.avatar.startsWith('http') || userData.avatar.startsWith('data:')
            ? userData.avatar
            : `${API_BASE_URL.replace('/api', '')}${userData.avatar}`;

        navAvatar.src = avatarSrc;
    } else if (navAvatar) {
        // Default avatar handled by HTML, or we can set it here
        navAvatar.src = `https://ui-avatars.com/api/?name=${userData ? userData.first_name : 'User'}&background=0288d1&color=fff`;
    }

    // 4. Theme Toggle
    initTheme();

    // 5. Modal Handlers
    initModals();
}

function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    const html = document.documentElement;

    // Load saved theme
    const savedTheme = localStorage.getItem('skinscan_theme') || 'light';
    html.setAttribute('data-theme', savedTheme);

    // Update icon initial state
    if (savedTheme === 'dark') {
        icon.classList.replace('fa-moon', 'fa-sun');
    }

    // Toggle Event
    toggleBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('skinscan_theme', newTheme);

        // Icon Switch
        if (newTheme === 'dark') {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    });
}

// ============================================
// MODAL LOGIC
// ============================================
function initModals() {
    const profileModal = document.getElementById('profile-modal');
    const passwordModal = document.getElementById('password-modal');

    const openProfileBtn = document.getElementById('open-profile-modal');
    const openPasswordBtn = document.getElementById('open-password-modal');

    const closeProfileBtn = document.getElementById('close-profile-modal');
    const closePasswordBtn = document.getElementById('close-password-modal');

    // Open Profile Modal
    if (openProfileBtn) {
        openProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            profileModal.classList.add('show');
            document.getElementById('nav-dropdown').classList.remove('show');
            loadUserProfile();
        });
    }

    // Open Password Modal
    if (openPasswordBtn) {
        openPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            passwordModal.classList.add('show');
            document.getElementById('nav-dropdown').classList.remove('show');
        });
    }

    // Close Profile Modal
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.classList.remove('show');
        });
    }

    // Close Password Modal
    if (closePasswordBtn) {
        closePasswordBtn.addEventListener('click', () => {
            passwordModal.classList.remove('show');
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.classList.remove('show');
        }
        if (e.target === passwordModal) {
            passwordModal.classList.remove('show');
        }
    });

    // Profile Form Submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserProfile();
        });
    }

    // Password Form Submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }

    // Avatar Upload Preview
    const avatarInput = document.getElementById('avatar-input');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    if (avatarInput && profileAvatarLarge) {
        avatarInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    profileAvatarLarge.src = e.target.result;
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Password Toggle
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
}

// ============================================
// PROFILE COMPLETION CHECK
// ============================================
async function checkProfileCompletion() {
    if (!isAuthenticated()) return true; // Allow if not authenticated

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/check-completion`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.is_complete;
        }
        return false;
    } catch (error) {
        console.error('Error checking profile completion:', error);
        return false; // Fail closed - require profile completion on error
    }
}

async function loadUserProfile() {
    const userData = getUserData();

    // Try to load from backend if authenticated
    if (isAuthenticated()) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    populateProfileForm(data.data);
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    // Fallback to localStorage or mock data
    const localData = JSON.parse(localStorage.getItem('skinscan_user_profile'));
    const displayData = localData || userData || getMockData();
    populateProfileForm(displayData);
}

function populateProfileForm(user) {
    document.getElementById('display-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
    document.getElementById('display-email').textContent = user.email || 'user@example.com';

    document.getElementById('first-name').value = user.first_name || '';
    document.getElementById('last-name').value = user.last_name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('dob').value = user.date_of_birth || '';
    document.getElementById('gender').value = user.gender || '';
    document.getElementById('country').value = user.country || '';
    document.getElementById('address').value = user.address || '';
    document.getElementById('skin-type').value = user.skin_type || '';
    document.getElementById('skin-tone').value = user.skin_tone || '';

    // Avatar
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const navAvatar = document.getElementById('nav-avatar');

    if (user.avatar) {
        const avatarSrc = user.avatar.startsWith('http') || user.avatar.startsWith('data:')
            ? user.avatar
            : `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
        profileAvatarLarge.src = avatarSrc;
        if (navAvatar) navAvatar.src = avatarSrc;
    }
}

async function saveUserProfile() {
    const btnSave = document.getElementById('btn-save-profile');
    const originalText = btnSave.innerText;
    btnSave.innerText = 'Saving...';
    btnSave.disabled = true;

    try {
        // Validate required fields
        const requiredFields = {
            'first-name': 'First Name',
            'last-name': 'Last Name',
            'phone': 'Phone Number',
            'dob': 'Date of Birth',
            'gender': 'Gender'
        };

        const missingFields = [];
        for (const [fieldId, label] of Object.entries(requiredFields)) {
            const value = document.getElementById(fieldId).value;
            if (!value || !value.trim()) {
                missingFields.push(label);
            }
        }

        if (missingFields.length > 0) {
            alert(`⚠️ Please fill in the following required fields:\n\n• ${missingFields.join('\n• ')}`);
            btnSave.innerText = originalText;
            btnSave.disabled = false;
            return;
        }

        const newData = {
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            date_of_birth: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            country: document.getElementById('country').value,
            address: document.getElementById('address').value,
            skin_type: document.getElementById('skin-type').value,
            skin_tone: document.getElementById('skin-tone').value
        };

        // Handle Avatar
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput.files[0]) {
            newData.avatar = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(avatarInput.files[0]);
            });
        }

        // Save to localStorage
        const currentLocal = JSON.parse(localStorage.getItem('skinscan_user_profile')) || {};
        const mergedData = { ...getMockData(), ...currentLocal, ...newData };
        localStorage.setItem('skinscan_user_profile', JSON.stringify(mergedData));

        // Update UI
        populateProfileForm(mergedData);

        // Update nav avatar
        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar && mergedData.avatar) {
            navAvatar.src = mergedData.avatar;
        }

        // If authenticated, sync with backend
        if (isAuthenticated()) {
            const formData = new FormData();
            for (const key in newData) {
                if (key !== 'avatar') formData.append(key, newData[key]);
            }
            if (avatarInput.files[0]) {
                formData.append('avatar', avatarInput.files[0]);
            }

            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.status === 'success') {
                alert('Profile updated successfully!');

                // Check if profile is now complete and enable upload if so
                const isComplete = await checkProfileCompletion();
                if (isComplete) {
                    // Profile is complete, user can now upload
                    console.log('Profile completed! Upload feature enabled.');
                }
            } else {
                alert('Profile saved locally (Server update failed).');
            }
        } else {
            alert('Profile updated successfully!');
        }

        document.getElementById('profile-modal').classList.remove('show');

    } catch (error) {
        console.error('Error saving profile:', error);
        alert('An error occurred while saving.');
    } finally {
        btnSave.innerText = originalText;
        btnSave.disabled = false;
    }
}

async function changePassword() {
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const btnUpdate = document.getElementById('btn-update-password');

    if (newPass !== confirmPass) {
        alert("New passwords do not match!");
        return;
    }

    if (!isAuthenticated()) {
        alert("Please log in to change your password.");
        return;
    }

    const originalText = btnUpdate.innerText;
    btnUpdate.innerText = 'Updating...';
    btnUpdate.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                old_password: oldPass,
                new_password: newPass,
                confirm_password: confirmPass
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Password changed successfully!');
            document.getElementById('password-form').reset();
            document.getElementById('password-modal').classList.remove('show');
        } else {
            alert('Error: ' + (data.message || 'Failed to change password'));
        }
    } catch (error) {
        console.error('Password change error:', error);
        alert('Network error. Is the backend server running?');
    } finally {
        btnUpdate.innerText = originalText;
        btnUpdate.disabled = false;
    }
}

function getMockData() {
    return {
        first_name: "Demo",
        last_name: "User",
        email: "demo@skinscan.ai",
        phone: "+1 555 0199",
        date_of_birth: "1995-05-15",
        gender: "Female",
        country: "United States",
        address: "123 Innovation Dr, Tech City",
        skin_type: "Combination",
        skin_tone: "Type III",
        avatar: "https://ui-avatars.com/api/?name=Demo+User&background=0288d1&color=fff"
    };
}
