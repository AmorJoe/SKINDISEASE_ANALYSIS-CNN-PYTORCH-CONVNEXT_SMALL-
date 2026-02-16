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
    const bodyMapContainer = document.querySelector('.body-map-container');

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

    // --- BODY MAP PAGE OR OTHER AUTHENTICATED PAGES ---
    if (bodyMapContainer || (!loginForm && !dropArea)) {
        // Check authentication and reveal protected elements
        if (requireAuth()) {
            const protectedElements = document.querySelectorAll('.auth-protected');
            protectedElements.forEach(el => {
                el.classList.remove('auth-protected');
                el.style.display = '';
            });
        }
        initNavigation();
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
    const closeChatBtn = document.getElementById('close-chat');
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

    // SHOW DASHBOARD CONTENT (Remove Auth Protection)
    const protectedElements = document.querySelectorAll('.auth-protected');
    protectedElements.forEach(el => {
        el.classList.remove('auth-protected');
        // Force display flex for nav and hero if needed, but CSS removal should suffice if default is flex
        // The default styles in style.css will take over.
        el.style.display = '';
    });

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

                // Reset Body Location Dropdown
                const quickLocation = document.getElementById('quickBodyLocation');
                if (quickLocation) {
                    quickLocation.selectedIndex = 0; // Reset to "Select location..."
                    // Clear previous location from storage to avoid carrying over old data
                    localStorage.removeItem('latest_scan_location');

                    // Add listener to save immediately on change
                    quickLocation.onchange = function () {
                        if (this.value) {
                            localStorage.setItem('latest_scan_location', this.value);
                            console.log('Location tagged for report:', this.value);
                            // Clear validation styling when user selects a location
                            this.style.borderColor = '';
                            this.style.boxShadow = '';
                            this.classList.remove('shake-highlight');
                        }
                    };
                }

                // View Report Button — requires body location
                const viewReportBtn = document.getElementById('view-report-btn');
                if (viewReportBtn) {
                    viewReportBtn.onclick = function () {
                        const loc = document.getElementById('quickBodyLocation');
                        if (!loc || !loc.value) {
                            // Highlight the dropdown
                            loc.style.borderColor = '#e74c3c';
                            loc.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.25)';
                            loc.classList.add('shake-highlight');
                            loc.focus();
                            loc.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Remove shake after animation
                            setTimeout(() => loc.classList.remove('shake-highlight'), 600);
                            return;
                        }
                        window.location.href = 'report.html';
                    };
                }

                // SAVE DATA FOR REPORT
                localStorage.setItem('latest_scan_result', JSON.stringify(prediction));
                localStorage.setItem('needs_autosave', 'true'); // Trigger auto-save on report load

                // Save Image (already read in previewFile, but we need to ensure it's saved)
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);
                reader.onloadend = function () {
                    localStorage.setItem('latest_scan_image', reader.result);
                };

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
    typingMsg.classList.add('typing-indicator'); // Use specific class, not generic message
    typingMsg.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatBody.appendChild(typingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Retrieve Context from LocalStorage
    const scanResult = localStorage.getItem('latest_scan_result');
    let context = "";
    if (scanResult) {
        try {
            const prediction = JSON.parse(scanResult);
            context = `User's latest image scan detected: ${prediction.disease_name} with ${prediction.confidence}% confidence.`;
        } catch (e) {
            console.error("Error parsing scan result for context", e);
        }
    }

    try {
        // Send to Django backend
        const response = await fetch(`${API_BASE_URL}/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                message: message,
                context: context // Send context separately
            })
        });

        // Remove typing indicator
        typingMsg.remove();

        const data = await response.json();

        // Helper to format bot messages (Links, Bold, Newlines)
        function formatMessage(text) {
            // 1. Escape HTML (prevent XSS)
            let safeText = text.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            // 2. Bold (**text**)
            safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // 3. Markdown links [text](url) — must run BEFORE raw URL detection
            safeText = safeText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (match, linkText, url) {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
            });

            // 4. Raw URLs — split by existing <a> tags so we don't double-link
            const parts = safeText.split(/(<a\s[^>]*>.*?<\/a>)/g);
            safeText = parts.map(part => {
                if (part.startsWith('<a ')) return part; // Already a link, skip
                return part.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
                });
            }).join('');

            // 5. Newlines to <br>
            return safeText.replace(/\n/g, '<br>');
        }

        // ... inside sendMessage ...
        if (data.status === 'success') {
            // Bot Response
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerHTML = formatMessage(data.data.bot_message); // Use innerHTML with formatting
            chatBody.appendChild(botMsg);
            // Scroll to the top of the new message (User Request)
            botMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (response.status === 401 || response.status === 403) {
            // Token expired or not authenticated
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = "Session expired. Please log in again.";
            chatBody.appendChild(botMsg);
        } else {
            // Error handling
            console.error('Chatbot error response:', response.status, data);
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = data.message || "Sorry, I couldn't process that. Please try again.";
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
        // Scroll to the top of the new message
        botMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // 3. Analysis Submenu Toggle
    initAnalysisSubmenu();

    // 4. Load User Avatar
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
    const html = document.documentElement;

    // 1. Load Saved Settings
    const savedMode = localStorage.getItem('skinscan_mode') || 'light';
    const savedPalette = localStorage.getItem('skinscan_palette') || 'default';

    // 2. Apply Settings
    html.setAttribute('data-mode', savedMode);
    html.setAttribute('data-palette', savedPalette);

    // Legacy support for css that uses data-theme="dark"
    if (savedMode === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }

    // 3. Sync Settings Toggle (if exists)
    const settingsToggle = document.getElementById('settings-theme-toggle');
    if (settingsToggle) {
        settingsToggle.checked = (savedMode === 'dark');

        settingsToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'dark' : 'light';
            html.setAttribute('data-mode', newMode);
            localStorage.setItem('skinscan_mode', newMode);

            // Legacy support
            if (newMode === 'dark') {
                html.setAttribute('data-theme', 'dark');
            } else {
                html.removeAttribute('data-theme');
            }
        });
    }

    // 4. Notification Logic
    const notifBtn = document.getElementById('notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            alert("You have 0 new notifications.");
        });
    }
}

function setThemePalette(paletteName) {
    const html = document.documentElement;
    html.setAttribute('data-palette', paletteName);
    localStorage.setItem('skinscan_palette', paletteName);
    console.log(`Theme palette set to: ${paletteName}`);
}





// ============================================
// MODAL LOGIC
// ============================================
function initModals() {
    const profileModal = document.getElementById('profile-modal');
    const passwordModal = document.getElementById('password-modal');

    const openProfileBtn = document.getElementById('nav-profile-link');
    const openPasswordBtn = document.getElementById('nav-change-password');

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

    // Initialize Analysis Submenu
    initAnalysisSubmenu();
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

    // Populate Settings Form (if exists)
    safeSetValue('settings-first-name', user.first_name);
    safeSetValue('settings-last-name', user.last_name);
    safeSetValue('settings-email', user.email);
    safeSetValue('settings-phone', user.phone);
    safeSetValue('settings-dob', user.date_of_birth);
    safeSetValue('settings-gender', user.gender);
    safeSetValue('settings-country', user.country);
    safeSetValue('settings-address', user.address);
    safeSetValue('settings-skin-type', user.skin_type);
    safeSetValue('settings-skin-tone', user.skin_tone);

    if (document.getElementById('settings-display-name')) {
        document.getElementById('settings-display-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
    }
    if (document.getElementById('settings-display-email')) {
        document.getElementById('settings-display-email').textContent = user.email || 'user@example.com';
    }

    // Avatar
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const navAvatar = document.getElementById('nav-avatar');

    if (user.avatar) {
        const avatarSrc = user.avatar.startsWith('http') || user.avatar.startsWith('data:')
            ? user.avatar
            : `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
        profileAvatarLarge.src = avatarSrc;
        // Report Page Elements
        const reportName = document.getElementById('userName');
        const reportEmail = document.getElementById('userEmail');
        const reportAvatar = document.getElementById('userAvatar');

        if (reportName) reportName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
        if (reportEmail) reportEmail.textContent = user.email || 'user@example.com';
        if (reportAvatar && user.avatar) {
            const avatarSrc = user.avatar.startsWith('http') || user.avatar.startsWith('data:')
                ? user.avatar
                : `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
            reportAvatar.src = avatarSrc;
        }
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
            alert(`âš ï¸ Please fill in the following required fields:\n\nâ€¢ ${missingFields.join('\nâ€¢ ')}`);
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

// ============================================
// Nested Submenu Toggle Functionality
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const analysisMenu = document.getElementById('nav-analysis');
    const analysisSubmenu = document.getElementById('analysis-submenu');

    if (analysisMenu && analysisSubmenu) {
        analysisMenu.addEventListener('click', (e) => {
            e.preventDefault();

            // Toggle active class on parent
            analysisMenu.classList.toggle('active');

            // Toggle expanded class on submenu
            analysisSubmenu.classList.toggle('expanded');
        });
    }
});

// ============================================
// BODY MAP PAGE - SPECIFIC FUNCTIONALITY
// ============================================

// State Management for Body Map
let bodyMapState = {
    selectedLocation: null,
    selectedDiseases: [],
    filteredScans: [],
    searchQuery: '',
    sortBy: 'date-desc',
    allScans: [],
    isLoading: false
};

// ============================================
// BODY MAP INITIALIZATION
// ============================================
function initBodyMapPage() {
    // DOM Elements specific to body map
    const bodyParts = document.querySelectorAll('.body-part');
    const scanGrid = document.getElementById('scanGrid');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const selectedLocationTitle = document.getElementById('selectedLocation');
    const resultsCount = document.getElementById('resultsCount');
    const clearFilterBtn = document.getElementById('clearFilter');
    const totalScansEl = document.getElementById('totalScans');
    const locationsScannedEl = document.getElementById('locationsScanned');
    const recentScansEl = document.getElementById('recentScans');
    const searchInput = document.getElementById('searchInput');
    const diseaseFilterBtn = document.getElementById('diseaseFilterBtn');
    const diseaseFilterMenu = document.getElementById('diseaseFilterMenu');
    const diseaseFilterLabel = document.getElementById('diseaseFilterLabel');
    const diseaseCheckboxes = document.querySelectorAll('.disease-checkbox');
    const clearDiseasesBtn = document.getElementById('clearDiseasesBtn');
    const sortSelect = document.getElementById('sortSelect');
    const exportBtn = document.getElementById('exportBtn');
    const bodyTooltip = document.getElementById('bodyTooltip');

    // Debug logging
    console.log('Body Map Elements:', {
        bodyParts: bodyParts.length,
        diseaseFilterBtn: diseaseFilterBtn,
        diseaseFilterMenu: diseaseFilterMenu
    });

    // ============================================
    // TOGGLE DISEASE FILTER (Global for inline onclick)
    // ============================================
    window.toggleDiseaseFilter = function (event) {
        console.log('=== toggleDiseaseFilter called ===');
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const menu = document.getElementById('diseaseFilterMenu');
        if (menu) {
            menu.classList.toggle('show');
            console.log('Menu toggled. Show class present:', menu.classList.contains('show'));
        } else {
            console.error('Disease filter menu not found in DOM!');
        }
    };

    // ============================================
    // FETCH SCAN HISTORY FROM API
    // ============================================
    async function fetchScanHistory() {
        const token = getAuthToken();

        if (!token) {
            console.error('No authentication token found');
            showEmptyState('Please log in to view your scan history');
            return [];
        }

        try {
            bodyMapState.isLoading = true;
            loadingState.style.display = 'flex';
            emptyState.style.display = 'none';
            scanGrid.style.display = 'none';

            const response = await fetch(`${API_BASE_URL}/predict/scan-history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.data && data.data.scans) {
                const scans = data.data.scans.map(scan => ({
                    id: scan.id,
                    title: scan.title || `${scan.disease_name} - ${scan.body_location}`,
                    date: scan.date,
                    disease: scan.disease_name,
                    confidence: scan.confidence,
                    bodyLocation: scan.body_location,
                    // Construct full URL for local media
                    image: scan.image_url.startsWith('http')
                        ? scan.image_url
                        : `${API_BASE_URL.replace('/api', '')}/media/${scan.image_url}`,
                    severity: scan.severity
                }));

                bodyMapState.isLoading = false;
                loadingState.style.display = 'none';
                return scans;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error fetching scan history:', error);
            bodyMapState.isLoading = false;
            loadingState.style.display = 'none';
            showEmptyState('Failed to load scan history. Please try again.');
            return [];
        }
    }

    function showEmptyState(message) {
        emptyState.style.display = 'flex';
        scanGrid.style.display = 'none';
        const emptyText = emptyState.querySelector('p');
        if (emptyText && message) {
            emptyText.textContent = message;
        }
    }

    // ============================================
    // INIT BODY MAP
    // ============================================
    async function initBodyMap() {
        try {
            setupBodyMapEventListeners();
            initializeTooltips();

            const scans = await fetchScanHistory();
            bodyMapState.allScans = scans || [];

            updateStats();
            highlightBodyPartsWithScans();
            showAllScans();
        } catch (error) {
            console.error('Error during body map initialization:', error);
            bodyMapState.allScans = [];
            showAllScans();
        }
    }

    // ============================================
    // STATS UPDATE
    // ============================================
    function updateStats() {
        totalScansEl.textContent = bodyMapState.allScans.length;
        animateNumber(totalScansEl, bodyMapState.allScans.length);

        const uniqueLocations = new Set(bodyMapState.allScans.map(scan => scan.bodyLocation));
        locationsScannedEl.textContent = uniqueLocations.size;
        animateNumber(locationsScannedEl, uniqueLocations.size);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentScansCount = bodyMapState.allScans.filter(scan =>
            new Date(scan.date) >= thirtyDaysAgo
        ).length;
        recentScansEl.textContent = recentScansCount;
        animateNumber(recentScansEl, recentScansCount);
    }

    function animateNumber(element, target) {
        const duration = 1000;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * easeOutQuart);

            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target;
            }
        }

        requestAnimationFrame(update);
    }

    // ============================================
    // HIGHLIGHT BODY PARTS WITH SCANS
    // ============================================
    function highlightBodyPartsWithScans() {
        const locationsWithScans = new Set(bodyMapState.allScans.map(scan => scan.bodyLocation));

        bodyParts.forEach(part => {
            const location = part.getAttribute('data-location');
            if (locationsWithScans.has(location)) {
                part.classList.add('has-scans');
            }
        });
    }

    // ============================================
    // INITIALIZE TOOLTIPS
    // ============================================
    function initializeTooltips() {
        bodyParts.forEach(part => {
            part.addEventListener('mouseenter', showTooltip);
            part.addEventListener('mousemove', updateTooltipPosition);
            part.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltip(event) {
        const location = event.target.getAttribute('data-location');
        const scansForLocation = bodyMapState.allScans.filter(scan => scan.bodyLocation === location);
        const count = scansForLocation.length;

        if (count > 0) {
            const tooltipTitle = bodyTooltip.querySelector('.tooltip-title');
            const tooltipCount = bodyTooltip.querySelector('.tooltip-count');

            tooltipTitle.textContent = location;
            tooltipCount.textContent = `${count} scan${count !== 1 ? 's' : ''}`;

            bodyTooltip.style.display = 'block';
            updateTooltipPosition(event);
        }
    }

    function updateTooltipPosition(event) {
        const offset = 15;
        bodyTooltip.style.left = (event.pageX + offset) + 'px';
        bodyTooltip.style.top = (event.pageY + offset) + 'px';
    }

    function hideTooltip() {
        bodyTooltip.style.display = 'none';
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    function setupBodyMapEventListeners() {
        // Body part clicks
        bodyParts.forEach(part => {
            part.addEventListener('click', () => {
                const location = part.getAttribute('data-location');
                selectBodyPart(location);
            });
        });

        // Clear filter button
        clearFilterBtn.addEventListener('click', clearFilter);

        // Search input
        searchInput.addEventListener('input', debounce(handleSearch, 300));

        // Sort select
        sortSelect.addEventListener('change', handleSort);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const btn = document.getElementById('diseaseFilterBtn');
            const menu = document.getElementById('diseaseFilterMenu');

            if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('show');
            }
        });

        // Disease checkboxes
        if (diseaseCheckboxes && diseaseCheckboxes.length > 0) {
            diseaseCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', handleDiseaseCheckboxChange);
            });
        }

        // Clear diseases button
        if (clearDiseasesBtn) {
            clearDiseasesBtn.addEventListener('click', clearAllDiseases);
        }

        // Export button
        exportBtn.addEventListener('click', handleExport);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================
    // SELECT BODY PART
    // ============================================
    function selectBodyPart(location) {
        bodyMapState.selectedLocation = location;

        bodyParts.forEach(part => {
            if (part.getAttribute('data-location') === location) {
                part.classList.add('active');
            } else {
                part.classList.remove('active');
            }
        });

        applyFilters();
        selectedLocationTitle.textContent = location;
        clearFilterBtn.style.display = 'flex';
    }

    // ============================================
    // CLEAR FILTER
    // ============================================
    function clearFilter() {
        bodyMapState.selectedLocation = null;
        bodyMapState.selectedDiseases = [];
        bodyMapState.searchQuery = '';
        searchInput.value = '';

        diseaseCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateDiseaseFilterLabel();

        bodyParts.forEach(part => {
            part.classList.remove('active');
        });

        showAllScans();
    }

    // ============================================
    // SHOW ALL SCANS
    // ============================================
    function showAllScans() {
        selectedLocationTitle.textContent = 'All Scans';
        clearFilterBtn.style.display = 'none';
        applyFilters();
    }

    // ============================================
    // HANDLE SEARCH
    // ============================================
    function handleSearch(event) {
        bodyMapState.searchQuery = event.target.value.toLowerCase();
        applyFilters();
    }

    // ============================================
    // HANDLE SORT
    // ============================================
    function handleSort(event) {
        bodyMapState.sortBy = event.target.value;
        applyFilters();
    }

    // ============================================
    // HANDLE DISEASE CHECKBOX CHANGE
    // ============================================
    function handleDiseaseCheckboxChange(event) {
        const disease = event.target.value;

        if (event.target.checked) {
            if (!bodyMapState.selectedDiseases.includes(disease)) {
                bodyMapState.selectedDiseases.push(disease);
            }
        } else {
            bodyMapState.selectedDiseases = bodyMapState.selectedDiseases.filter(d => d !== disease);
        }

        updateDiseaseFilterLabel();
        applyFilters();
    }

    // ============================================
    // CLEAR ALL DISEASES
    // ============================================
    function clearAllDiseases() {
        bodyMapState.selectedDiseases = [];

        if (diseaseCheckboxes && diseaseCheckboxes.length > 0) {
            diseaseCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }

        updateDiseaseFilterLabel();
        applyFilters();
    }

    // ============================================
    // UPDATE DISEASE FILTER LABEL
    // ============================================
    function updateDiseaseFilterLabel() {
        if (!diseaseFilterLabel) return;

        const count = bodyMapState.selectedDiseases.length;
        if (count === 0) {
            diseaseFilterLabel.textContent = 'All Diseases';
        } else if (count === 1) {
            diseaseFilterLabel.textContent = bodyMapState.selectedDiseases[0];
        } else {
            diseaseFilterLabel.textContent = `${count} Diseases`;
        }
    }

    // ============================================
    // APPLY FILTERS
    // ============================================
    function applyFilters() {
        let filtered = [...bodyMapState.allScans];

        if (bodyMapState.selectedLocation) {
            filtered = filtered.filter(scan => scan.bodyLocation === bodyMapState.selectedLocation);
        }

        if (bodyMapState.selectedDiseases.length > 0) {
            filtered = filtered.filter(scan => bodyMapState.selectedDiseases.includes(scan.disease));
        }

        if (bodyMapState.searchQuery) {
            filtered = filtered.filter(scan =>
                scan.title.toLowerCase().includes(bodyMapState.searchQuery) ||
                scan.disease.toLowerCase().includes(bodyMapState.searchQuery) ||
                scan.bodyLocation.toLowerCase().includes(bodyMapState.searchQuery)
            );
        }

        filtered = sortScans(filtered, bodyMapState.sortBy);
        bodyMapState.filteredScans = filtered;
        renderScans(filtered);
    }

    // ============================================
    // SORT SCANS
    // ============================================
    function sortScans(scans, sortBy) {
        const sorted = [...scans];

        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'confidence-desc':
                return sorted.sort((a, b) => b.confidence - a.confidence);
            case 'confidence-asc':
                return sorted.sort((a, b) => a.confidence - b.confidence);
            default:
                return sorted;
        }
    }

    // ============================================
    // RENDER SCANS
    // ============================================
    function renderScans(scans) {
        scanGrid.innerHTML = '';
        resultsCount.textContent = `(${scans.length})`;

        if (scans.length === 0) {
            emptyState.style.display = 'flex';
            scanGrid.style.display = 'none';

            if (bodyMapState.selectedLocation || bodyMapState.searchQuery) {
                const emptyIcon = emptyState.querySelector('.empty-icon i');
                const emptyTitle = emptyState.querySelector('h3');
                const emptyText = emptyState.querySelector('p');

                emptyIcon.className = 'fas fa-search';
                emptyTitle.textContent = 'No Scans Found';

                if (bodyMapState.searchQuery) {
                    emptyText.textContent = `No scans match your search: "${bodyMapState.searchQuery}"`;
                } else {
                    emptyText.textContent = `No scans found for ${bodyMapState.selectedLocation}`;
                }
            }
        } else {
            emptyState.style.display = 'none';
            scanGrid.style.display = 'grid';

            scans.forEach((scan, index) => {
                const card = createScanCard(scan, index);
                scanGrid.appendChild(card);
            });
        }
    }

    // ============================================
    // CREATE SCAN CARD
    // ============================================
    function createScanCard(scan, index) {
        const card = document.createElement('div');
        card.className = 'scan-card';
        card.onclick = () => viewScanReport(scan.id);
        card.style.animationDelay = `${index * 0.05}s`;

        const formattedDate = formatDate(scan.date);
        const confidenceColor = getConfidenceColor(scan.confidence);

        card.innerHTML = `
            <img src="${scan.image}" alt="${scan.title}" class="scan-card-image" loading="lazy">
            <div class="scan-card-content">
                <div class="scan-card-title">${escapeHtml(scan.title)}</div>
                <div class="scan-card-disease">${escapeHtml(scan.disease)}</div>
                <div class="scan-card-meta">
                    <span class="scan-card-date">
                        <i class="fas fa-calendar-alt"></i> ${formattedDate}
                    </span>
                    <span class="confidence-badge" style="background: ${confidenceColor}">
                        ${scan.confidence}%
                    </span>
                </div>
            </div>
        `;

        return card;
    }

    function getConfidenceColor(confidence) {
        if (confidence >= 90) {
            return 'linear-gradient(135deg, #28A745, #20c997)';
        } else if (confidence >= 75) {
            return 'linear-gradient(135deg, #FFC107, #FFB300)';
        } else {
            return 'linear-gradient(135deg, #FF6B6B, #EE5A6F)';
        }
    }

    function viewScanReport(scanId) {
        scanGrid.style.opacity = '0.5';
        setTimeout(() => {
            window.location.href = `report.html?scan_id=${scanId}`;
        }, 200);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ============================================
    // HANDLE EXPORT
    // ============================================
    function handleExport() {
        const scansToExport = bodyMapState.filteredScans.length > 0 ? bodyMapState.filteredScans : bodyMapState.allScans;

        const csvData = prepareCsvData(scansToExport);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        const filename = bodyMapState.selectedLocation
            ? `scans_${bodyMapState.selectedLocation.replace(/\s+/g, '_')}_${getCurrentDate()}.csv`
            : `all_scans_${getCurrentDate()}.csv`;

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showExportFeedback();
    }

    function prepareCsvData(scans) {
        const headers = ['ID', 'Title', 'Date', 'Diagnosis', 'Confidence (%)', 'Body Location'];
        const rows = scans.map(scan => [
            scan.id,
            `"${scan.title}"`,
            scan.date,
            `"${scan.disease}"`,
            scan.confidence,
            `"${scan.bodyLocation}"`
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    function getCurrentDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function showExportFeedback() {
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-check-circle"></i> Exported';
        exportBtn.style.background = 'var(--medical-success)';

        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.style.background = 'var(--medical-primary)';
        }, 2000);
    }

    // Initialize body map
    initBodyMap();

    // Refresh data when page becomes visible (e.g., after saving from report page)
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            console.log('Body Map page visible - refreshing data...');
            const scans = await fetchScanHistory();
            bodyMapState.allScans = scans || [];
            updateStats();
            highlightBodyPartsWithScans();
            applyFilters(); // Re-apply current filters to show updated data
        }
    });
}

// Check if we're on the body map page and initialize
if (document.querySelector('.body-map-container')) {
    initBodyMapPage();
}

// ============================================
// === ANALYSIS DROPDOWN JS START ===
// ============================================
function initAnalysisSubmenu() {
    const analysisToggle = document.getElementById('nav-analysis-toggle');
    const analysisSubmenu = document.getElementById('analysis-submenu');

    if (analysisToggle && analysisSubmenu) {
        console.log('Analysis Submenu Initialized'); // Debug Log
        analysisToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Analysis Toggle Clicked'); // Debug Log

            const expanded = analysisToggle.getAttribute('aria-expanded') === 'true';
            analysisToggle.setAttribute('aria-expanded', !expanded);
            analysisSubmenu.classList.toggle('show');
            console.log('Submenu toggled:', analysisSubmenu.classList.contains('show'));
        });

        analysisSubmenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// 👇 ADD THIS - Actually call the function!
document.addEventListener('DOMContentLoaded', initAnalysisSubmenu);

// OR simply call it directly if script is at bottom of body:
// initAnalysisSubmenu();

// ============================================
// === ANALYSIS DROPDOWN JS END ===
// ============================================

// ============================================
// PROFILE AVATAR PREVIEW
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const avatarInput = document.getElementById('avatar-input');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');

    if (avatarInput && profileAvatarLarge) {
        avatarInput.addEventListener('change', function (e) {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    profileAvatarLarge.src = e.target.result;
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});

