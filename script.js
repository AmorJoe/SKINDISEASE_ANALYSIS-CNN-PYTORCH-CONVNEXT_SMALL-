// ============================================
// SkinScan AI - Dashboard JavaScript
// Connected to Django Backend API
// ============================================

const API_BASE_URL = 'https://skinscan-hjxo.onrender.com/api';

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
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// Logout function
function logout() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Page Identification ---
    initTheme(); // Initialize theme globally (Login, Dashboard, Settings, etc.)
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
            startNotificationPolling(); // Start notifications
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

            // Add selected AI model
            const selectedModel = localStorage.getItem('selected_model') || 'gemini';
            formData.append('model', selectedModel);

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
                const prediction = data.data;

                // --- IMAGE RECOGNITION GUARD ---
                if (prediction.is_inconclusive) {
                    // Show results card with "Couldn't Recognize"
                    resultCard.style.display = 'flex';
                    diseaseName.innerText = "Detected: Couldn't Recognize";
                    diseaseName.style.color = '#e74c3c';
                    accuracyText.innerText = `${prediction.confidence}%`;

                    // Hide View Report button and Body Location selector
                    const viewReportBtn = document.getElementById('view-report-btn');
                    if (viewReportBtn) viewReportBtn.style.display = 'none';

                    const locationSelector = document.querySelector('.body-location-selector');
                    if (locationSelector) locationSelector.style.display = 'none';

                    // Halt savings
                    localStorage.removeItem('latest_scan_result');
                    localStorage.removeItem('latest_scan_image');
                    localStorage.removeItem('latest_scan_location');

                    showNotificationToast('Recognition Error', 'The AI couldn\'t clearly recognize this image. Please ensure it\'s a clear skin photo.', 'warning');

                    // Animate confidence bar
                    setTimeout(() => {
                        meterFill.style.width = `${prediction.confidence}%`;
                        meterFill.style.background = '#e74c3c'; // Red for low confidence
                    }, 100);

                    console.warn('Inconclusive prediction - Saving halted:', prediction);
                    return; // HALT FURTHER PROCESSING
                }

                // --- NORMAL SUCCESS FLOW ---
                resultCard.style.display = 'flex';
                diseaseName.innerText = `Detected: ${prediction.disease_name}`;
                diseaseName.style.color = ''; // Reset color
                accuracyText.innerText = `${prediction.confidence}%`;

                // Ensure elements are visible
                const viewReportBtn = document.getElementById('view-report-btn');
                if (viewReportBtn) viewReportBtn.style.display = 'inline-flex';

                const locationSelector = document.querySelector('.body-location-selector');
                if (locationSelector) locationSelector.style.display = 'block';

                // Reset Body Location Dropdown
                const quickLocation = document.getElementById('quickBodyLocation');
                if (quickLocation) {
                    quickLocation.selectedIndex = 0; // Reset to "Select location..."
                    localStorage.removeItem('latest_scan_location');

                    quickLocation.onchange = function () {
                        if (this.value) {
                            localStorage.setItem('latest_scan_location', this.value);
                            this.style.borderColor = '';
                            this.style.boxShadow = '';
                            this.classList.remove('shake-highlight');
                        }
                    };
                }

                // View Report Button — requires body location
                if (viewReportBtn) {
                    viewReportBtn.onclick = function () {
                        const loc = document.getElementById('quickBodyLocation');
                        if (!loc || !loc.value) {
                            loc.style.borderColor = '#e74c3c';
                            loc.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.25)';
                            loc.classList.add('shake-highlight');
                            loc.focus();
                            loc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => loc.classList.remove('shake-highlight'), 600);
                            return;
                        }
                        localStorage.setItem('latest_scan_location', loc.value);
                        window.location.href = 'report.html';
                    };
                }

                // SAVE DATA FOR REPORT
                localStorage.setItem('latest_scan_result', JSON.stringify(prediction));

                // Clear previous session cache
                sessionStorage.removeItem('last_saved_prediction_id');
                sessionStorage.removeItem('last_saved_result_summary');
                sessionStorage.removeItem('scan_already_saved');

                showNotificationToast('Analysis Complete', 'Your skin has been successfully analyzed.', 'success');

                // Save Image
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);
                reader.onloadend = function () {
                    localStorage.setItem('latest_scan_image', reader.result);
                };

                // Animate confidence bar
                setTimeout(() => {
                    meterFill.style.width = `${prediction.confidence}%`;
                    meterFill.style.background = ''; // Reset to default
                }, 100);

                // Fire scan-complete notification
                if (typeof addNotification === 'function') {
                    addNotification(
                        'Scan Complete',
                        `Analysis finished: ${prediction.disease_name} (${prediction.confidence}% confidence)`,
                        'success'
                    );
                }

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

    // 4. Load User Avatar & Admin Link
    // 4. Load User Avatar & Admin Link
    let userData = getUserData();
    // Check localStorage for more recent profile data (especially avatar)
    try {
        const localProfile = JSON.parse(localStorage.getItem('skinscan_user_profile'));
        if (localProfile && localProfile.avatar) {
            // Merge or prefer local profile avatar
            userData = { ...userData, ...localProfile };
        }
    } catch (e) {
        console.error("Error reading local profile:", e);
    }

    if (userData && userData.is_admin) {
        // Add Admin Dashboard link if not already present
        if (!document.getElementById('nav-admin-link')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.id = 'nav-admin-link';
            adminLink.innerHTML = '<i class="fas fa-user-shield"></i> Admin Panel';

            // Insert before logout
            const navLogout = document.getElementById('nav-logout');
            if (navLogout) {
                navLogout.parentNode.insertBefore(adminLink, navLogout);
            }
        }
    }

    // navAvatar is already defined at top of function
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



    // 5. Modal Handlers
    initModals();
}

function initTheme() {
    // 1. Load Saved Settings (Unified Key)
    const savedMode = localStorage.getItem('skinscan_mode') || 'light';
    const savedPalette = localStorage.getItem('skinscan_palette') || 'default';

    const html = document.documentElement;
    const body = document.body;

    // Helper to apply mode
    const applyMode = (mode) => {
        html.setAttribute('data-mode', mode);
        localStorage.setItem('skinscan_mode', mode);

        // Legacy & Body Class Support
        if (mode === 'dark') {
            html.setAttribute('data-theme', 'dark');
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
        } else {
            html.removeAttribute('data-theme');
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
        }

        // Sync Toggles
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) toggleBtn.checked = (mode === 'dark');

        const settingsToggle = document.getElementById('settings-theme-toggle');
        if (settingsToggle) settingsToggle.checked = (mode === 'dark');
    };

    // 2. Apply Initial Settings
    html.setAttribute('data-palette', savedPalette);
    applyMode(savedMode);

    // 3. toggle Listener (Header Toggle)
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'dark' : 'light';
            applyMode(newMode);
        });
    }

    // 4. Settings Page Toggle
    const settingsToggle = document.getElementById('settings-theme-toggle');
    if (settingsToggle) {
        settingsToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'dark' : 'light';
            applyMode(newMode);
        });
    }

    // 5. Notification Logic (Kept here as it was in original function)
    const notifBtn = document.getElementById('notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationDropdown();
        });
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown && !dropdown.contains(e.target) && e.target !== notifBtn) {
                dropdown.classList.remove('show');
            }
        });
    }
    renderNotifications();
}

function setThemePalette(paletteName) {
    const html = document.documentElement;
    html.setAttribute('data-palette', paletteName);
    localStorage.setItem('skinscan_palette', paletteName);
    console.log(`Theme palette set to: ${paletteName}`);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem('skinscan_notifications') || '[]');
    } catch { return []; }
}

function saveNotifications(notifs) {
    localStorage.setItem('skinscan_notifications', JSON.stringify(notifs));
}

async function fetchNotifications() {
    if (!isAuthenticated()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/notifications`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            saveNotifications(data.data);
            renderNotifications();
        }
    } catch (e) { console.error("Poll Error:", e); }
}

function startNotificationPolling() {
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // Poll every 30s
}

function addNotification(title, message, type = 'info') {
    // For local immediate feedback, we still push to localStorage, 
    // but the real source of truth is the backend polling.
    const notifs = getNotifications();
    notifs.unshift({
        id: Date.now(),
        title,
        message,
        type,
        time: new Date().toISOString(),
        read: false
    });
    if (notifs.length > 20) notifs.length = 20;
    saveNotifications(notifs);
    renderNotifications();
    showNotificationToast(title, message, type);
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notification-badge');
    const notifs = getNotifications();

    if (!list) return;

    const unread = notifs.filter(n => !n.read).length;

    // Update badge with count
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    }

    // Update header count
    const headerSpan = document.querySelector('.notif-header span');
    if (headerSpan) {
        headerSpan.textContent = unread > 0 ? `Notifications (${unread})` : 'Notifications';
    }

    if (notifs.length === 0) {
        list.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <span>You're all caught up!</span>
            </div>`;
        return;
    }

    const iconMap = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    const bgMap = {
        success: 'rgba(40, 167, 69, 0.12)',
        info: 'rgba(2, 136, 209, 0.12)',
        warning: 'rgba(255, 193, 7, 0.12)'
    };
    const colorMap = {
        success: '#28a745',
        info: '#0288d1',
        warning: '#e67e00'
    };

    list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="markRead(${n.id})">
            <div class="notif-icon-wrap" style="background: ${bgMap[n.type] || bgMap.info}; color: ${colorMap[n.type] || colorMap.info}">
                <i class="fas ${iconMap[n.type] || iconMap.info}"></i>
            </div>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time"><i class="far fa-clock"></i> ${getTimeAgo(n.time)}</div>
            </div>
        </div>
    `).join('');
}

function showNotificationToast(title, message, type) {
    // Remove any existing toast
    const existing = document.getElementById('notif-toast');
    if (existing) existing.remove();

    const colorMap = { success: '#28a745', info: '#0288d1', warning: '#e67e00' };
    const iconMap = { success: 'fa-check-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const color = colorMap[type] || colorMap.info;

    const toast = document.createElement('div');
    toast.id = 'notif-toast';
    toast.className = 'notif-toast';
    toast.innerHTML = `
        <div class="notif-toast-accent" style="background: ${color}"></div>
        <div class="notif-toast-icon" style="color: ${color}">
            <i class="fas ${iconMap[type] || iconMap.info}"></i>
        </div>
        <div class="notif-toast-body">
            <div class="notif-toast-title">${title}</div>
            <div class="notif-toast-msg">${message}</div>
        </div>
        <button class="notif-toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('show');

    if (dropdown.classList.contains('show')) {
        const notifs = getNotifications();
        notifs.forEach(n => n.read = true);
        saveNotifications(notifs);
        renderNotifications();
        dropdown.classList.add('show');
    }
}

function markRead(id) {
    const notifs = getNotifications();
    const n = notifs.find(n => n.id === id);
    if (n) n.read = true;
    saveNotifications(notifs);
    renderNotifications();
}

function clearAllNotifications() {
    saveNotifications([]);
    renderNotifications();
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function getTimeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

    // Settings Page Password Form Submission
    const settingsPasswordForm = document.getElementById('settings-password-form');
    if (settingsPasswordForm) {
        settingsPasswordForm.addEventListener('submit', async (e) => {
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

function updateAllAvatars(src) {
    if (!src) return;

    // 1. Navigation Avatar
    const navAvatar = document.getElementById('nav-avatar');
    if (navAvatar) navAvatar.src = src;

    // 2. Profile Modal Large Avatar
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    if (profileAvatarLarge) profileAvatarLarge.src = src;

    // 3. Any other avatars (e.g., in reports or chat)
    const otherAvatars = document.querySelectorAll('.user-avatar, .profile-avatar');
    otherAvatars.forEach(img => img.src = src);
}

function safeSetValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.value = value || '';
    }
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

        updateAllAvatars(avatarSrc);

        // Report Page Elemente
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

        if (mergedData.avatar) {
            updateAllAvatars(mergedData.avatar);

            // Also update the nav avatar explicitly for immediate feedback
            const navAvatar = document.getElementById('nav-avatar');
            if (navAvatar) navAvatar.src = mergedData.avatar;
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

            try {
                const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server Error:', response.status, errorText);
                    alert(`Server Error (${response.status}): ${errorText.substring(0, 200)}...`);
                    throw new Error(`Server responded with ${response.status}`);
                }

                const data = await response.json();
                if (data.status === 'success') {
                    // Sync storage with server data
                    if (data.data) {
                        sessionStorage.setItem('user_data', JSON.stringify(data.data));
                        localStorage.setItem('skinscan_user_profile', JSON.stringify(data.data));
                        populateProfileForm(data.data);
                    }
                    alert('Profile updated successfully!');

                    // Check if profile is now complete and enable upload if so
                    const isComplete = await checkProfileCompletion();
                    if (isComplete) {
                        // Profile is complete, user can now upload
                        console.log('Profile completed! Upload feature enabled.');
                    }
                } else {
                    alert(`Profile saved locally, but server rejected: ${data.message || 'Unknown error'}`);
                }

            } catch (netError) {
                console.error('Network/Parsing Error:', netError);
                throw netError; // Re-throw to hit the outer catch block
            }
        } else {
            alert('Profile updated successfully!');
        }

        document.getElementById('profile-modal').classList.remove('show');

    } catch (error) {
        console.error('Error saving profile:', error);
        alert(`An error occurred while saving: ${error.message}`);
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
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.remove('show');
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
        card.id = `scan-card-${scan.id}`;
        card.onclick = () => viewScanReport(scan.id);
        card.style.animationDelay = `${index * 0.05}s`;

        const formattedDate = formatDate(scan.date);
        const confidenceColor = getConfidenceColor(scan.confidence);

        card.innerHTML = `
            <button class="scan-delete-btn" onclick="event.stopPropagation(); deleteScan(${scan.id})" title="Delete scan">
                <i class="fas fa-trash-alt"></i>
            </button>
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

    // Global delete function (called from onclick in card HTML)
    window.deleteScan = async function (scanId) {
        if (!confirm('Are you sure you want to delete this scan? This cannot be undone.')) return;

        const token = getAuthToken();
        if (!token) { alert('Please log in.'); return; }

        const card = document.getElementById(`scan-card-${scanId}`);
        if (card) {
            card.style.opacity = '0.4';
            card.style.pointerEvents = 'none';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/predict/scan-history/${scanId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                // Remove from state
                bodyMapState.allScans = bodyMapState.allScans.filter(s => s.id !== scanId);
                updateStats();
                highlightBodyPartsWithScans();
                applyFilters();
            } else {
                alert('Failed to delete: ' + (data.message || 'Unknown error'));
                if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Network error while deleting.');
            if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
        }
    };

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

    // ============================================
    // SETTINGS PAGE FUNCTIONALITY
    // ============================================

    function initSettingsPage() {
        console.log("Initializing Settings Page..."); // Debug

        // Tab Switching Logic
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active to current
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Password Change Logic
        const passwordForm = document.getElementById('settings-password-form');

        // Initialize Password Toggles - EVENT DELEGATION
        document.body.addEventListener('click', function (e) {
            const wrapper = e.target.closest('.toggle-password-wrapper');

            if (wrapper) {
                e.preventDefault();
                e.stopPropagation();

                const targetId = wrapper.getAttribute('data-target');
                const input = document.getElementById(targetId);

                if (input) {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);

                    // Find the icon inside the wrapper
                    // It could be an <i>, <svg>, or <path> depending on FontAwesome state
                    let icon = wrapper.querySelector('i, svg');

                    if (icon) {
                        if (icon.tagName.toLowerCase() === 'svg') {
                            const currentIcon = icon.getAttribute('data-icon');
                            if (currentIcon === 'eye') {
                                icon.setAttribute('data-icon', 'eye-slash');
                                icon.classList.remove('fa-eye');
                                icon.classList.add('fa-eye-slash');
                            } else {
                                icon.setAttribute('data-icon', 'eye');
                                icon.classList.remove('fa-eye-slash');
                                icon.classList.add('fa-eye');
                            }
                        } else {
                            // Standard <i> tag
                            icon.classList.toggle('fa-eye');
                            icon.classList.toggle('fa-eye-slash');
                        }
                    }
                }
            }
        });

        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log("Password form submitted"); // Debug

                const currentPassword = document.getElementById('old-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                const btn = document.getElementById('btn-update-password');
                const originalText = btn.innerText;

                // Frontend Validation
                if (!currentPassword || !newPassword || !confirmPassword) {
                    alert('Please fill in all fields.');
                    return;
                }

                if (currentPassword === newPassword) {
                    alert('New password cannot be the same as the current password.');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert('New passwords do not match.');
                    return;
                }

                if (newPassword.length < 8) {
                    alert('Password must be at least 8 characters long.');
                    return;
                }

                // Validate complexity
                // const hasNumber = /\d/.test(newPassword);
                // const hasLetter = /[a-zA-Z]/.test(newPassword);
                // if (!hasNumber || !hasLetter) { ... }

                try {
                    btn.innerText = 'Updating...';
                    btn.disabled = true;

                    const token = getAuthToken();
                    if (!token) {
                        alert('You are not logged in.');
                        logout();
                        return;
                    }

                    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            old_password: currentPassword,
                            new_password: newPassword,
                            confirm_password: confirmPassword
                        })
                    });

                    const data = await response.json();
                    console.log('Password Update Response:', data); // Debug

                    if (response.ok && data.status === 'success') {
                        alert('Password updated successfully!');
                        passwordForm.reset();
                    } else {
                        let msg = data.message || 'Failed to update password.';

                        // Handle serializer errors (e.g., existing email, weak password)
                        if (data.errors) {
                            const errorMessages = Object.values(data.errors).flat().join('\n');
                            if (errorMessages) {
                                msg = `Validation Error:\n${errorMessages}`;
                            }
                        }

                        alert(msg);
                    }

                } catch (error) {
                    console.error('Password update error:', error);
                    alert('An error occurred. Please try again.');
                } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            });
        }
    }

    // Check if we're on the settings page and initialize
    if (document.querySelector('.settings-page-wrapper')) {
        initSettingsPage();
        initThemeOptions();
        // Initialize AI Models (Run first to ensure listeners attach)
        initAIModels();

        // Initialize Danger Zone (Delete Account)
        initDangerZone();
    }

    // Danger Zone Logic
    function initDangerZone() {
        const deleteBtn = document.getElementById('btn-delete-account');
        const modal = document.getElementById('delete-modal');
        const closeBtn = document.getElementById('close-delete-modal');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const input = document.getElementById('delete-confirm-input');

        if (!deleteBtn || !modal) return;

        // Ensure modal is hidden by default via JS too
        modal.style.display = 'none';

        // Open Modal
        deleteBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            input.value = '';
            confirmBtn.disabled = true;
            input.focus();
        });

        // Close Modal
        const closeModal = () => {
            modal.style.display = 'none';
            input.value = '';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Input Validation
        input.addEventListener('input', () => {
            if (input.value === 'DELETE') {
                confirmBtn.disabled = false;
            } else {
                confirmBtn.disabled = true;
            }
        });

        // Confirm Delete
        confirmBtn.addEventListener('click', async () => {
            if (input.value !== 'DELETE') return;

            const originalText = confirmBtn.innerText;
            confirmBtn.innerText = 'Deleting...';
            confirmBtn.disabled = true;

            try {
                const token = getAuthToken();
                const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.status === 'success') {
                    alert('Account deleted successfully.');
                    logout();
                } else {
                    alert(data.message || 'Failed to delete account.');
                    confirmBtn.innerText = originalText;
                    confirmBtn.disabled = false; // Re-enable if failed (maybe user wants to try again)
                    // Or keep disabled until they re-type DELETE? actually checks against input value anyway.
                    // But better UX: let them retry.
                }
            } catch (error) {
                console.error('Delete account error:', error);
                // alert('Error connecting to server.');
                // For now, mock success if backend fails (since backend might not exist)
                // Remove this mock later!
                alert('Account deleted (Mock).');
                logout();
            }
        });
    }
});


// AI Model Selection
function initAIModels() {
    const modelRadios = document.querySelectorAll('input[name="ai-model"]');
    const savedModel = localStorage.getItem('selected_model') || 'gemini';

    // Set initial state
    modelRadios.forEach(radio => {
        if (radio.value === savedModel) {
            radio.checked = true;
            updateModelStyle(radio);
        }
    });

    // Robust Click Handling for Model Cards
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            // Prevent default label behavior to avoid double-toggles or conflicts
            e.preventDefault();

            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                // If already checked, do nothing
                if (radio.checked) return;

                const modelName = radio.value === 'gemini' ? 'Google Gemini' : 'Meta Llama 3';

                // 1. Show switching toast (Transient)
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast('AI Model', `Switching to ${modelName}...`, 'info');
                } else {
                    showToast(`Switching to ${modelName}...`, 'info');
                }

                // 2. Simulate Backend Call (Async)
                const success = await switchModelBackend(radio.value);

                if (success) {
                    radio.checked = true;
                    // Trigger change event manually if needed
                    radio.dispatchEvent(new Event('change'));

                    localStorage.setItem('selected_model', radio.value);

                    // Update styles
                    updateModelStyle(radio);

                    // Add to Notification History + Toast
                    if (typeof addNotification === 'function') {
                        addNotification('AI Model Updated', `Active model set to ${modelName}.`, 'success');
                    } else {
                        showToast(`Successfully switched to ${modelName}`, 'success');
                    }
                } else {
                    if (typeof addNotification === 'function') {
                        addNotification('AI Model Error', `Failed to switch to ${modelName}.`, 'error');
                    } else {
                        showToast(`Failed to switch to ${modelName}`, 'error');
                    }
                }
            }
        });
    });
}



function updateModelStyle(radio) {
    // Remove selected class from all cards
    document.querySelectorAll('.model-card').forEach(card => card.classList.remove('selected'));

    // Add selected class to the checked radio's parent card
    if (radio.checked) {
        const card = radio.closest('.model-card');
        if (card) {
            card.classList.add('selected');
        }
    }
}

// Toast Notification Helper


// Mock Backend Call
function switchModelBackend(model) {
    return new Promise(resolve => {
        setTimeout(() => {
            // Simulate 90% success rate
            const isSuccess = true;
            resolve(isSuccess);
        }, 800); // 800ms delay
    });
}

// Initialize Theme Options (Appearance Tab)
function initThemeOptions() {
    const themeToggle = document.getElementById('theme-toggle-settings');
    const paletteBtns = document.querySelectorAll('.palette-option');
    const html = document.documentElement;

    // 1. Load saved settings or defaults (MATCHING initTheme KEYS)
    const savedTheme = localStorage.getItem('skinscan_mode') || 'light';
    const savedPalette = localStorage.getItem('skinscan_palette') || 'default';

    // Helper to apply theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            html.setAttribute('data-mode', 'dark');
            html.setAttribute('data-theme', 'dark'); // Legacy support
            if (themeToggle) themeToggle.checked = true;
        } else {
            html.removeAttribute('data-mode');
            html.removeAttribute('data-theme');
            if (themeToggle) themeToggle.checked = false;
        }
    };

    // 2. Apply initial state
    applyTheme(savedTheme);
    html.setAttribute('data-palette', savedPalette);

    // Update active state in UI
    paletteBtns.forEach(opt => {
        if (opt.getAttribute('data-palette') === savedPalette) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }

        // 3. Handle Palette Clicks
        opt.addEventListener('click', () => {
            const palette = opt.getAttribute('data-palette');

            // Apply
            html.setAttribute('data-palette', palette);
            localStorage.setItem('skinscan_palette', palette);

            // Update UI
            document.querySelectorAll('.palette-option').forEach(p => p.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // 4. Handle Dark Mode Toggle
    if (themeToggle) {
        // Set initial state based on savedTheme (redundant with applyTheme but safe)
        themeToggle.checked = (savedTheme === 'dark');

        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                applyTheme('dark');
                localStorage.setItem('skinscan_mode', 'dark');
            } else {
                applyTheme('light');
                localStorage.setItem('skinscan_mode', 'light');
            }
        });
    }
}

// ============================================
// SEND TO DOCTOR — Auto-save scan and navigate
// ============================================
async function sendToDoctor() {
    const btn = document.getElementById('send-to-doctor-btn');
    const originalHTML = btn ? btn.innerHTML : '';

    try {
        // Show spinner
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
        }

        const token = getAuthToken();
        if (!token) {
            alert('Please log in first.');
            return;
        }

        // Get scan data from localStorage
        const storedResult = localStorage.getItem('latest_scan_result');
        const storedImage = localStorage.getItem('latest_scan_image');

        if (!storedResult || !storedImage) {
            alert('No scan data available. Please scan an image first.');
            return;
        }

        const result = JSON.parse(storedResult);
        const storedResultSummary = storedResult.substring(0, 100);

        // [FIX] Check if this exact scan was already saved to avoid "Doctor Referral" duplicates
        const alreadySavedId = sessionStorage.getItem('last_saved_prediction_id');
        const alreadySavedResult = sessionStorage.getItem('last_saved_result_summary');

        if (alreadySavedId && alreadySavedResult === storedResultSummary) {
            console.log('Using existing scan ID:', alreadySavedId);
            window.location.href = `doctor-appointment.html?tab=share&report_id=${alreadySavedId}`;
            return;
        }

        // Convert image to Blob
        const fetchResp = await fetch(storedImage);
        const blob = await fetchResp.blob();

        // Build FormData for save-report API
        const formData = new FormData();
        formData.append('image', blob, 'scan_image.png');
        formData.append('disease_name', result.disease_name || 'Unknown Condition');

        let confidence = parseFloat(result.confidence);
        if (isNaN(confidence)) confidence = 0;
        formData.append('confidence', confidence);

        formData.append('body_location', localStorage.getItem('latest_scan_location') || 'Unspecified');
        formData.append('severity', result.severity || 'Moderate');
        formData.append('title', `Scan on ${new Date().toLocaleDateString()} - Doctor Referral`);

        let savedRecommendation = result.recommendation || '';
        if (result.treatment && Array.isArray(result.treatment) && result.treatment.length > 0) {
            savedRecommendation = 'JSON_TREATMENT:' + JSON.stringify(result.treatment);
        }
        formData.append('recommendation', savedRecommendation);

        // Save to DB
        const response = await fetch(`${API_BASE_URL}/predict/save-report`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const predictionId = data.data.prediction_id;

            // [FIX] Cache the ID so we don't save it again if user clicks stethoscope again
            sessionStorage.setItem('last_saved_prediction_id', predictionId);
            sessionStorage.setItem('last_saved_result_summary', storedResultSummary);
            sessionStorage.setItem('scan_already_saved', storedResultSummary);

            // Redirect to appointment page with the saved report ID
            window.location.href = `doctor-appointment.html?tab=share&report_id=${predictionId}`;
        } else {
            alert('Failed to save report: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('sendToDoctor error:', error);
        alert('Error saving scan. Please try again.');
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}
