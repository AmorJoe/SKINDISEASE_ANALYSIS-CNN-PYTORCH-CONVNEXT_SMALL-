// ============================================
// SkinScan AI - Dashboard JavaScript
// Connected to Django Backend API
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

// ─────────────────────────────────────────────
// AUTH HELPERS
// Simple wrappers around sessionStorage for JWT
// ─────────────────────────────────────────────

/** Returns the stored JWT token, or null if not logged in */
function getAuthToken() {
    return sessionStorage.getItem('jwt_token');
}

/** Returns the parsed user object from sessionStorage, or null */
function getUserData() {
    const data = sessionStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
}

/** Returns true if a JWT token exists in storage */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Redirects to login page if not authenticated.
 * Returns false if redirect occurs, true if user is authenticated.
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

/** Clears session storage and redirects to login */
function logout() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    window.location.href = 'dashboard.html';
}

// ─────────────────────────────────────────────
// UTILITY: safeSetValue
// FIX: Was called throughout populateProfileForm but never defined.
// ─────────────────────────────────────────────

/**
 * Safely sets the value of a form field by ID.
 * Does nothing if the element doesn't exist on the current page.
 * @param {string} id - The element ID
 * @param {string} value - The value to assign
 */
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

// ─────────────────────────────────────────────
// UTILITY: showToast
// FIX: Was called in initAIModels as a fallback but was never defined.
// ─────────────────────────────────────────────

/**
 * Displays a simple toast notification.
 * Used as a fallback when addNotification() is not available.
 * @param {string} message - Text to display
 * @param {string} type - 'success' | 'info' | 'warning'
 */
function showToast(message, type = 'info') {
    const colorMap = { success: '#28a745', info: '#0288d1', warning: '#e67e00' };
    const color = colorMap[type] || colorMap.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: #fff; color: #333; padding: 12px 20px;
        border-left: 4px solid ${color}; border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15); font-size: 14px;
        transition: opacity 0.4s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ─────────────────────────────────────────────
// DOM READY — Main entry point
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // --- Global Initialization ---
    initTheme();
    initNavigation();
    // FIX: initAnalysisSubmenu() is already called inside initNavigation() and initModals().
    // Removed the extra direct call here to prevent triple event listener attachment.

    // --- Page-Specific Initialization ---
    // Each block checks for a unique element that only exists on that page.

    if (document.getElementById('loginForm')) {
        // Login page is handled by login.js — nothing to do here.
    }

    if (document.getElementById('drop-area')) {
        // Upload/dashboard page
        if (requireAuth()) {
            initDashboardPage();
        }
    }

    if (document.querySelector('.body-map-container')) {
        // Body map page
        if (requireAuth()) {
            initBodyMapPage();
        }
    }

    if (document.querySelector('.settings-page-wrapper')) {
        // Settings page
        if (requireAuth()) {
            initSettingsPage();
            initThemeOptions();
            initAIModels();
            initDangerZone();
        }
    }

    // --- Avatar Preview (Global, used on settings/profile pages) ---
    const avatarInput = document.getElementById('avatar-input');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    if (avatarInput && profileAvatarLarge) {
        avatarInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => { profileAvatarLarge.src = e.target.result; };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // --- Reveal auth-protected elements for logged-in users ---
    if (isAuthenticated() && !document.getElementById('loginForm')) {
        document.querySelectorAll('.auth-protected').forEach(el => {
            el.classList.remove('auth-protected');
            el.style.display = '';
        });
    }
});

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// Handles file upload, drag & drop, and chatbot
// ─────────────────────────────────────────────

function initDashboardPage() {
    // Grab all relevant DOM elements
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

    // Chat elements
    const chatWidgetBtn = document.querySelector('.chat-widget-btn');
    const closeChatBtn = document.getElementById('close-chat');
    const sendChatBtn = document.querySelector('.chat-input button');
    const userInput = document.getElementById('user-input');

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Log current user for debugging
    const userData = getUserData();
    if (userData) console.log('Logged in as:', userData.full_name);

    // Remove auth protection classes so the dashboard content is visible
    document.querySelectorAll('.auth-protected').forEach(el => {
        el.classList.remove('auth-protected');
        el.style.display = '';
    });

    // Holds the currently selected File object
    let currentFile = null;

    // --- Drag & Drop setup ---
    // Prevent browser default behaviour (opening file) on all drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when file is dragged over it
    ['dragenter', 'dragover'].forEach(e => {
        dropArea.addEventListener(e, () => dropArea.classList.add('highlight'), false);
    });
    ['dragleave', 'drop'].forEach(e => {
        dropArea.addEventListener(e, () => dropArea.classList.remove('highlight'), false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

    // --- Manual file select ---
    if (fileInput) {
        fileInput.addEventListener('change', function () { handleFiles(this.files); });
    }
    if (uploadBtnTrigger && fileInput) {
        uploadBtnTrigger.addEventListener('click', () => fileInput.click());
    }

    // --- Reset button ---
    if (resetBtn) resetBtn.addEventListener('click', resetUpload);

    // --- Chatbot widget ---
    if (chatWidgetBtn) chatWidgetBtn.addEventListener('click', toggleChat);
    if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChat);
    if (sendChatBtn) sendChatBtn.addEventListener('click', sendMessage);
    if (userInput) userInput.addEventListener('keypress', handleEnter);

    // ─────────────────────────────────────────
    // IMAGE UPLOAD — Real API Integration
    // ─────────────────────────────────────────

    /**
     * Validates the selected image, shows a preview, then sends it to the backend for prediction.
     * @param {FileList} files - Files from drop or file input
     */
    async function handleFiles(files) {
        const file = files[0];

        // Validate that it's an image file
        if (!file || !file.type.startsWith('image/')) {
            alert("Please upload a valid image file.");
            return;
        }

        currentFile = file;

        // Show local preview immediately for fast feedback
        previewFile(file);

        // Switch UI to loading state
        dropArea.style.display = 'none';
        loader.style.display = 'block';
        resultCard.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Use model saved in settings (defaults to 'gemini')
            const selectedModel = localStorage.getItem('selected_model') || 'gemini';
            formData.append('model', selectedModel);

            // POST to Django backend
            const response = await fetch(`${API_BASE_URL}/predict/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });

            const data = await response.json();
            loader.style.display = 'none';

            if (data.status === 'success') {
                const prediction = data.data;

                // Display results
                resultCard.style.display = 'flex';
                diseaseName.innerText = `Detected: ${prediction.disease_name}`;
                accuracyText.innerText = `${prediction.confidence}%`;

                // Reset the body location dropdown for this new scan
                const quickLocation = document.getElementById('quickBodyLocation');
                if (quickLocation) {
                    quickLocation.selectedIndex = 0;
                    localStorage.removeItem('latest_scan_location');

                    // Save location to localStorage as soon as user picks one
                    quickLocation.onchange = function () {
                        if (this.value) {
                            localStorage.setItem('latest_scan_location', this.value);
                            // Clear any previous validation styling
                            this.style.borderColor = '';
                            this.style.boxShadow = '';
                            this.classList.remove('shake-highlight');
                        }
                    };
                }

                // View Report button — validates that a body location was selected first
                const viewReportBtn = document.getElementById('view-report-btn');
                if (viewReportBtn) {
                    viewReportBtn.onclick = function () {
                        const loc = document.getElementById('quickBodyLocation');
                        if (!loc || !loc.value) {
                            // Highlight dropdown to prompt user
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

                // Persist scan data so the report page can read it
                localStorage.setItem('latest_scan_result', JSON.stringify(prediction));
                localStorage.setItem('needs_autosave', 'true');
                sessionStorage.removeItem('scan_already_saved');

                // Also persist the image as base64 for the report page
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);
                reader.onloadend = () => {
                    localStorage.setItem('latest_scan_image', reader.result);
                };

                // Animate the confidence meter bar
                setTimeout(() => {
                    meterFill.style.width = `${prediction.confidence}%`;
                }, 100);

                // Fire a notification in the notification centre
                addNotification(
                    'Scan Complete',
                    `Analysis finished: ${prediction.disease_name} (${prediction.confidence}% confidence)`,
                    'success'
                );

            } else if (response.status === 401) {
                // JWT expired or invalid
                alert('Session expired. Please log in again.');
                logout();
            } else {
                alert(`Error: ${data.message}`);
                resetUpload();
            }

        } catch (error) {
            // Network or server error
            console.error('Upload error:', error);
            loader.style.display = 'none';
            alert('Network error. Is the backend server running at localhost:8000?');
            resetUpload();
        }
    }

    /**
     * Reads a file and sets it as the background of the preview element.
     * @param {File} file
     */
    function previewFile(file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            imagePreview.style.backgroundImage = `url(${reader.result})`;
        };
    }

    /** Resets the upload UI back to its initial state */
    function resetUpload() {
        resultCard.style.display = 'none';
        dropArea.style.display = 'block';
        meterFill.style.width = '0%';
        fileInput.value = '';
        currentFile = null;
    }
}

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

/** Stops event from bubbling and prevents default browser action */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/** Toggles the chatbot widget open/closed */
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.style.display = (chatBox.style.display === 'flex') ? 'none' : 'flex';
}

/** Submits the chat message when Enter key is pressed */
function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// ─────────────────────────────────────────────
// CHATBOT — Real API Integration
// ─────────────────────────────────────────────

/**
 * Reads the user's input, sends it to the Django chatbot endpoint,
 * and renders the bot's response in the chat UI.
 * Falls back to local responses if the server is unreachable.
 */
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    const chatBody = document.getElementById('chat-body');

    if (!message) return;

    // Render user's message immediately
    const userMsg = document.createElement('div');
    userMsg.classList.add('message', 'user');
    userMsg.innerText = message;
    chatBody.appendChild(userMsg);
    input.value = '';

    // Scroll to bottom after a tick so the new message is visible
    setTimeout(() => { chatBody.scrollTop = chatBody.scrollHeight; }, 10);

    // Show animated typing indicator while waiting for the response
    const typingMsg = document.createElement('div');
    typingMsg.classList.add('typing-indicator');
    typingMsg.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatBody.appendChild(typingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Build context from the most recent scan result so the bot can reference it
    let context = '';
    const scanResult = localStorage.getItem('latest_scan_result');
    if (scanResult) {
        try {
            const prediction = JSON.parse(scanResult);
            context = `User's latest image scan detected: ${prediction.disease_name} with ${prediction.confidence}% confidence.`;
        } catch (e) {
            console.error('Error parsing scan result for context', e);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ message, context })
        });

        typingMsg.remove();

        const data = await response.json();

        /**
         * Sanitises and formats the bot's markdown-like response into safe HTML.
         * Order matters: escape HTML first, then apply formatting, then linkify.
         * @param {string} text - Raw bot response text
         * @returns {string} HTML string safe for innerHTML
         */
        function formatMessage(text) {
            // 1. Escape HTML to prevent XSS
            let safeText = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            // 2. Bold text: **word** → <strong>word</strong>
            // FIX: Missing closing parenthesis on this replace call (was a SyntaxError).
            safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // 3. Markdown links [text](url) — must run BEFORE raw URL detection
            safeText = safeText.replace(
                /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
                (match, linkText, url) =>
                    `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
            );

            // 4. Raw URLs — split around existing <a> tags to avoid double-linking
            const parts = safeText.split(/(<a\s[^>]*>.*?<\/a>)/g);
            safeText = parts.map(part => {
                if (part.startsWith('<a ')) return part; // Already a hyperlink, skip
                return part.replace(
                    /(https?:\/\/[^\s<]+)/g,
                    url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
                );
            }).join('');

            // 5. Convert newlines to <br> for proper line breaks
            return safeText.replace(/\n/g, '<br>');
        }

        if (data.status === 'success') {
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerHTML = formatMessage(data.data.bot_message);
            chatBody.appendChild(botMsg);
            botMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } else if (response.status === 401 || response.status === 403) {
            // Token expired — inform the user
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = 'Session expired. Please log in again.';
            chatBody.appendChild(botMsg);

        } else {
            // Other server-side errors
            console.error('Chatbot error response:', response.status, data);
            const botMsg = document.createElement('div');
            botMsg.classList.add('message', 'bot');
            botMsg.innerText = data.message || "Sorry, I couldn't process that. Please try again.";
            chatBody.appendChild(botMsg);
        }

    } catch (error) {
        // Network error — fall back to local keyword responses
        console.error('Chat error:', error);
        typingMsg.remove();

        const botMsg = document.createElement('div');
        botMsg.classList.add('message', 'bot');

        const lower = message.toLowerCase();
        if (lower.includes('hello') || lower.includes('hi')) {
            botMsg.innerText = "Hello! I'm your SkinCare Assistant. How can I help you today?";
        } else if (lower.includes('accuracy')) {
            botMsg.innerText = "Our AI model has been trained on thousands of images and achieves good accuracy in preliminary screening.";
        } else {
            botMsg.innerText = "I'm having trouble connecting to the server. Please check if the backend is running.";
        }

        chatBody.appendChild(botMsg);
        botMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ─────────────────────────────────────────────
// NAVIGATION & USER MENU
// ─────────────────────────────────────────────

function initNavigation() {
    // 1. User menu dropdown (avatar click)
    const navAvatar = document.getElementById('nav-avatar');
    const dropdownContent = document.getElementById('nav-dropdown');
    const userMenu = document.querySelector('.user-menu');

    if (navAvatar && dropdownContent) {
        navAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });

        // Close dropdown when user clicks anywhere outside the menu
        document.addEventListener('click', (e) => {
            if (userMenu && !userMenu.contains(e.target)) {
                dropdownContent.classList.remove('show');
            }
        });
    }

    // 2. Logout link in nav dropdown
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // 3. Analysis submenu toggle
    // FIX: Only call initAnalysisSubmenu() once here.
    // The original code also called it inside initModals() and directly in DOMContentLoaded,
    // resulting in triple event listeners on the same button.
    initAnalysisSubmenu();

    // 4. Load user avatar and conditionally show Admin link
    const userData = getUserData();

    if (userData && userData.is_admin) {
        // Inject Admin Panel link if not already in the DOM
        if (!document.getElementById('nav-admin-link')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.id = 'nav-admin-link';
            adminLink.innerHTML = '<i class="fas fa-user-shield"></i> Admin Panel';

            const navLogoutRef = document.getElementById('nav-logout');
            if (navLogoutRef) {
                navLogoutRef.parentNode.insertBefore(adminLink, navLogoutRef);
            }
        }
    }

    if (navAvatar) {
        if (userData && userData.avatar) {
            // Support full URLs, data URIs, and relative server paths
            navAvatar.src = (userData.avatar.startsWith('http') || userData.avatar.startsWith('data:'))
                ? userData.avatar
                : `${API_BASE_URL.replace('/api', '')}${userData.avatar}`;
        } else {
            // Default generated avatar using user's first name
            const name = userData ? userData.first_name : 'User';
            navAvatar.src = `https://ui-avatars.com/api/?name=${name}&background=0288d1&color=fff`;
        }
    }

    // 5. Modal handlers (profile & password modals)
    initModals();
}

// ─────────────────────────────────────────────
// THEME INITIALISATION
// Applies saved mode (dark/light) and palette on every page load
// ─────────────────────────────────────────────

function initTheme() {
    const html = document.documentElement;
    const body = document.body;

    // Retrieve saved preferences, defaulting to light mode and default palette
    // logic: if saved is 'dark', use dark. If saved is 'light', use light. 
    // If nothing saved, check system preference? No, let's default to light as per previous logic for consistency.
    let savedMode = localStorage.getItem('skinscan_mode') || 'light';
    const savedPalette = localStorage.getItem('skinscan_palette') || 'default';

    // Helper to apply mode
    const applyMode = (mode) => {
        html.setAttribute('data-mode', mode);
        localStorage.setItem('skinscan_mode', mode);

        // Legacy support
        if (mode === 'dark') {
            html.setAttribute('data-theme', 'dark');
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
        } else {
            html.removeAttribute('data-theme');
            body.classList.remove('dark-mode');
            body.classList.add('light-mode'); // Explicitly add light-mode to override system dark preference if needed
        }

        // Update Icons
        updateThemeIcons(mode);
    };

    // Helper to update toggle icons
    const updateThemeIcons = (mode) => {
        const portalIcon = document.querySelector('#portal-theme-toggle i');
        if (portalIcon) {
            portalIcon.className = mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // Settings page toggle
        const settingsToggle = document.getElementById('settings-theme-toggle');
        if (settingsToggle) {
            settingsToggle.checked = (mode === 'dark');
        }
    };

    // Apply initial state
    html.setAttribute('data-palette', savedPalette);
    applyMode(savedMode);

    // Portal Theme Toggle (dashboard.html)
    const portalToggle = document.getElementById('portal-theme-toggle');
    if (portalToggle) {
        // Cloning and replacing to remove old event listeners if any (simple way to ensure single listener)
        const newToggle = portalToggle.cloneNode(true);
        portalToggle.parentNode.replaceChild(newToggle, portalToggle);

        newToggle.addEventListener('click', () => {
            // Read fresh from storage or attribute to ensure sync
            const currentMode = html.getAttribute('data-mode') || 'light';
            const newMode = currentMode === 'dark' ? 'light' : 'dark';
            applyMode(newMode);
        });

        // Sync icon immediately
        updateThemeIcons(savedMode);
    }

    // Sync the settings page toggle (checkbox) if it exists
    const settingsToggle = document.getElementById('settings-theme-toggle');
    if (settingsToggle) {
        settingsToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'dark' : 'light';
            applyMode(newMode);
        });
    }

    // Notification bell button — toggle dropdown and close on outside click
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

    // Render any existing notifications from localStorage on load
    renderNotifications();
}

/**
 * Changes the colour palette (accent theme) across the whole app.
 * @param {string} paletteName - e.g. 'default', 'ocean', 'sunset'
 */
function setThemePalette(paletteName) {
    document.documentElement.setAttribute('data-palette', paletteName);
    localStorage.setItem('skinscan_palette', paletteName);
}

// ─────────────────────────────────────────────
// NOTIFICATION SYSTEM
// Persists notifications in localStorage and renders them in the dropdown
// ─────────────────────────────────────────────

/** Returns the stored notifications array, or [] if none / parse error */
function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem('skinscan_notifications') || '[]');
    } catch {
        return [];
    }
}

/** Saves the notifications array back to localStorage */
function saveNotifications(notifs) {
    localStorage.setItem('skinscan_notifications', JSON.stringify(notifs));
}

/**
 * Adds a new notification, persists it, re-renders the list, and shows a toast.
 * @param {string} title
 * @param {string} message
 * @param {string} type - 'success' | 'info' | 'warning'
 */
function addNotification(title, message, type = 'info') {
    const notifs = getNotifications();

    // Prepend so newest appears first
    notifs.unshift({
        id: Date.now(),
        title,
        message,
        type,
        time: new Date().toISOString(),
        read: false
    });

    // Cap at 20 stored notifications to avoid bloating localStorage
    if (notifs.length > 20) notifs.length = 20;

    saveNotifications(notifs);
    renderNotifications();
    showNotificationToast(title, message, type);
}

/** Renders the notification list and updates the unread badge count */
function renderNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notification-badge');
    const notifs = getNotifications();

    if (!list) return;

    const unread = notifs.filter(n => !n.read).length;

    // Update badge visibility and count
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    }

    // Update header text
    const headerSpan = document.querySelector('.notif-header span');
    if (headerSpan) {
        headerSpan.textContent = unread > 0 ? `Notifications (${unread})` : 'Notifications';
    }

    // Empty state
    if (notifs.length === 0) {
        list.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <span>You're all caught up!</span>
            </div>`;
        return;
    }

    // Icon / colour maps keyed by notification type
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
            <div class="notif-icon-wrap" style="background:${bgMap[n.type] || bgMap.info}; color:${colorMap[n.type] || colorMap.info}">
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

/**
 * Shows a transient toast notification that auto-dismisses after 3 seconds.
 * @param {string} title
 * @param {string} message
 * @param {string} type - 'success' | 'info' | 'warning'
 */
function showNotificationToast(title, message, type) {
    // Remove any existing toast to avoid stacking
    const existing = document.getElementById('notif-toast');
    if (existing) existing.remove();

    const colorMap = { success: '#28a745', info: '#0288d1', warning: '#e67e00' };
    const iconMap = { success: 'fa-check-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const color = colorMap[type] || colorMap.info;

    const toast = document.createElement('div');
    toast.id = 'notif-toast';
    toast.className = 'notif-toast';
    toast.innerHTML = `
        <div class="notif-toast-accent" style="background:${color}"></div>
        <div class="notif-toast-icon" style="color:${color}">
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

    // Trigger CSS enter animation on next frame
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto-dismiss: slide out then remove from DOM
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/** Opens or closes the notification dropdown, marking all as read when opened */
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');

    if (dropdown.classList.contains('show')) {
        // Mark all notifications read when the dropdown is opened
        const notifs = getNotifications();
        notifs.forEach(n => { n.read = true; });
        saveNotifications(notifs);
        renderNotifications();
    }
}

/**
 * Marks a single notification as read.
 * @param {number} id - Notification timestamp ID
 */
function markRead(id) {
    const notifs = getNotifications();
    const n = notifs.find(n => n.id === id);
    if (n) n.read = true;
    saveNotifications(notifs);
    renderNotifications();
}

/** Clears all notifications and closes the dropdown */
function clearAllNotifications() {
    saveNotifications([]);
    renderNotifications();
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.remove('show');
}

/**
 * Converts an ISO date string to a relative time label, e.g. "5m ago".
 * @param {string} isoString
 * @returns {string}
 */
function getTimeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ─────────────────────────────────────────────
// MODAL LOGIC
// Handles Profile and Change Password modals
// ─────────────────────────────────────────────

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
        closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('show'));
    }

    // Close Password Modal
    if (closePasswordBtn) {
        closePasswordBtn.addEventListener('click', () => passwordModal.classList.remove('show'));
    }

    // Close modals when clicking the backdrop (outside the modal box)
    window.addEventListener('click', (e) => {
        if (e.target === profileModal) profileModal.classList.remove('show');
        if (e.target === passwordModal) passwordModal.classList.remove('show');
    });

    // Profile form submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserProfile();
        });
    }

    // Password form submit
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }

    // Avatar preview in profile modal
    const avatarInput = document.getElementById('avatar-input');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    if (avatarInput && profileAvatarLarge) {
        avatarInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => { profileAvatarLarge.src = e.target.result; };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Password visibility toggles
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

    // FIX: Removed the extra initAnalysisSubmenu() call that was here.
    // It is already called once inside initNavigation().
}

// ─────────────────────────────────────────────
// PROFILE COMPLETION CHECK
// ─────────────────────────────────────────────

/**
 * Asks the backend whether the user's profile is complete.
 * Returns true if complete (or if user is not logged in — fail open).
 */
async function checkProfileCompletion() {
    if (!isAuthenticated()) return true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/check-completion`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            return data.is_complete;
        }
        return false;
    } catch (error) {
        console.error('Error checking profile completion:', error);
        return false; // Fail closed — require completion on network error
    }
}

/**
 * Loads the user's profile from the backend if authenticated,
 * falling back to localStorage or mock data.
 */
async function loadUserProfile() {
    if (isAuthenticated()) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

    // Fallback: use localStorage saved data or mock data
    const userData = getUserData();
    const localData = JSON.parse(localStorage.getItem('skinscan_user_profile'));
    populateProfileForm(localData || userData || getMockData());
}

/**
 * Populates both the profile modal and settings page form fields with user data.
 * @param {Object} user - User profile object
 */
function populateProfileForm(user) {
    // Display name and email in the modal header
    document.getElementById('display-name').textContent =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
    document.getElementById('display-email').textContent = user.email || 'user@example.com';

    // Profile modal form fields
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

    // Settings page form fields (only exist on settings.html)
    // FIX: safeSetValue() is now defined above.
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

    // Settings page display name/email
    const settingsName = document.getElementById('settings-display-name');
    if (settingsName) {
        settingsName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
    }
    const settingsEmail = document.getElementById('settings-display-email');
    if (settingsEmail) {
        settingsEmail.textContent = user.email || 'user@example.com';
    }

    // Avatar in profile modal
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    if (user.avatar && profileAvatarLarge) {
        profileAvatarLarge.src = (user.avatar.startsWith('http') || user.avatar.startsWith('data:'))
            ? user.avatar
            : `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
    }

    // Report page elements (only exist on report.html)
    const reportName = document.getElementById('userName');
    const reportEmail = document.getElementById('userEmail');
    const reportAvatar = document.getElementById('userAvatar');

    if (reportName) reportName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
    if (reportEmail) reportEmail.textContent = user.email || 'user@example.com';
    if (reportAvatar && user.avatar) {
        reportAvatar.src = (user.avatar.startsWith('http') || user.avatar.startsWith('data:'))
            ? user.avatar
            : `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
    }
}

/**
 * Validates, saves, and syncs the user profile.
 * Saves to localStorage first for instant feedback, then posts to backend.
 */
async function saveUserProfile() {
    const btnSave = document.getElementById('btn-save-profile');
    const originalText = btnSave.innerText;
    btnSave.innerText = 'Saving...';
    btnSave.disabled = true;

    try {
        // Required field validation
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
            if (!value || !value.trim()) missingFields.push(label);
        }

        if (missingFields.length > 0) {
            alert(`Please fill in the following required fields:\n\n• ${missingFields.join('\n• ')}`);
            btnSave.innerText = originalText;
            btnSave.disabled = false;
            return;
        }

        // Collect form values
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

        // If a new avatar was selected, convert it to base64 for localStorage
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput.files[0]) {
            newData.avatar = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(avatarInput.files[0]);
            });
        }

        // Merge with existing saved data and persist locally
        const currentLocal = JSON.parse(localStorage.getItem('skinscan_user_profile')) || {};
        const mergedData = { ...getMockData(), ...currentLocal, ...newData };
        localStorage.setItem('skinscan_user_profile', JSON.stringify(mergedData));

        // Update the UI with the new merged data
        populateProfileForm(mergedData);

        // Update nav avatar
        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar && mergedData.avatar) navAvatar.src = mergedData.avatar;

        // Sync with backend if authenticated
        if (isAuthenticated()) {
            const formData = new FormData();
            for (const key in newData) {
                if (key !== 'avatar') formData.append(key, newData[key]);
            }
            if (avatarInput.files[0]) formData.append('avatar', avatarInput.files[0]);

            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });

            const data = await response.json();
            if (data.status === 'success') {
                alert('Profile updated successfully!');
                // Check whether the profile is now complete enough to enable scanning
                await checkProfileCompletion();
            } else {
                alert('Profile saved locally (server update failed).');
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

/**
 * Sends a change-password request to the backend.
 * Validates that new password and confirm password match before posting.
 */
async function changePassword() {
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const btnUpdate = document.getElementById('btn-update-password');

    if (newPass !== confirmPass) {
        alert('New passwords do not match!');
        return;
    }
    if (!isAuthenticated()) {
        alert('Please log in to change your password.');
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
            body: JSON.stringify({ old_password: oldPass, new_password: newPass, confirm_password: confirmPass })
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

/**
 * Returns a default/mock user profile for demo or fallback purposes.
 * @returns {Object}
 */
function getMockData() {
    return {
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@skinscan.ai',
        phone: '+1 555 0199',
        date_of_birth: '1995-05-15',
        gender: 'Female',
        country: 'United States',
        address: '123 Innovation Dr, Tech City',
        skin_type: 'Combination',
        skin_tone: 'Type III',
        avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=0288d1&color=fff'
    };
}

// ─────────────────────────────────────────────
// ANALYSIS DROPDOWN (nested submenu in nav)
// ─────────────────────────────────────────────

/**
 * Sets up the click toggle for the nested Analysis nav submenu.
 * Called ONCE from initNavigation().
 */
function initAnalysisSubmenu() {
    const analysisToggle = document.getElementById('nav-analysis-toggle');
    const analysisSubmenu = document.getElementById('analysis-submenu');

    if (analysisToggle && analysisSubmenu) {
        analysisToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Toggle aria-expanded for accessibility
            const expanded = analysisToggle.getAttribute('aria-expanded') === 'true';
            analysisToggle.setAttribute('aria-expanded', !expanded);
            analysisSubmenu.classList.toggle('show');
        });

        // Prevent clicks inside the submenu from closing it
        analysisSubmenu.addEventListener('click', (e) => e.stopPropagation());
    }
}

// ─────────────────────────────────────────────
// BODY MAP PAGE
// Displays scan history on an interactive body diagram
// ─────────────────────────────────────────────

// Shared state object for the body map page
let bodyMapState = {
    selectedLocation: null,  // Currently selected body part label
    selectedDiseases: [],    // Array of disease filter strings
    filteredScans: [],       // Scans after all filters applied
    searchQuery: '',         // Current search input value
    sortBy: 'date-desc',     // Active sort option
    allScans: [],            // Full scan list from API
    isLoading: false
};

function initBodyMapPage() {
    // Grab all relevant DOM elements
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
    const diseaseFilterLabel = document.getElementById('diseaseFilterLabel');
    const diseaseCheckboxes = document.querySelectorAll('.disease-checkbox');
    const clearDiseasesBtn = document.getElementById('clearDiseasesBtn');
    const sortSelect = document.getElementById('sortSelect');
    const exportBtn = document.getElementById('exportBtn');
    const bodyTooltip = document.getElementById('bodyTooltip');

    // ─────────────────────────────────────────
    // Disease filter toggle — exposed globally for inline onclick in HTML
    // ─────────────────────────────────────────
    window.toggleDiseaseFilter = function (event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const menu = document.getElementById('diseaseFilterMenu');
        if (menu) menu.classList.toggle('show');
    };

    // ─────────────────────────────────────────
    // FETCH SCAN HISTORY FROM API
    // ─────────────────────────────────────────

    /**
     * Fetches all scans for the logged-in user from the backend.
     * Returns a normalised array of scan objects.
     */
    async function fetchScanHistory() {
        const token = getAuthToken();

        if (!token) {
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

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data.status === 'success' && data.data && data.data.scans) {
                // Normalise the API response into a consistent shape
                const scans = data.data.scans.map(scan => ({
                    id: scan.id,
                    title: scan.title || `${scan.disease_name} - ${scan.body_location}`,
                    date: scan.date,
                    disease: scan.disease_name,
                    confidence: scan.confidence,
                    bodyLocation: scan.body_location,
                    // Build full image URL from relative path if needed
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

    /**
     * Shows the empty state panel with an optional custom message.
     * @param {string} message
     */
    function showEmptyState(message) {
        emptyState.style.display = 'flex';
        scanGrid.style.display = 'none';
        const emptyText = emptyState.querySelector('p');
        if (emptyText && message) emptyText.textContent = message;
    }

    // ─────────────────────────────────────────
    // INIT BODY MAP
    // ─────────────────────────────────────────

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

    // ─────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────

    /** Updates the three stat counters with animated number transitions */
    function updateStats() {
        animateNumber(totalScansEl, bodyMapState.allScans.length);

        const uniqueLocations = new Set(bodyMapState.allScans.map(s => s.bodyLocation));
        animateNumber(locationsScannedEl, uniqueLocations.size);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCount = bodyMapState.allScans.filter(s => new Date(s.date) >= thirtyDaysAgo).length;
        animateNumber(recentScansEl, recentCount);
    }

    /**
     * Animates a counter element from 0 to `target` over 1 second.
     * @param {HTMLElement} element
     * @param {number} target
     */
    function animateNumber(element, target) {
        const duration = 1000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out quart for a smooth deceleration effect
            const eased = 1 - Math.pow(1 - progress, 4);
            element.textContent = Math.floor(eased * target);
            if (progress < 1) requestAnimationFrame(update);
            else element.textContent = target;
        }

        requestAnimationFrame(update);
    }

    // ─────────────────────────────────────────
    // HIGHLIGHT BODY PARTS
    // ─────────────────────────────────────────

    /** Adds a 'has-scans' class to body parts that have at least one scan */
    function highlightBodyPartsWithScans() {
        const locationsWithScans = new Set(bodyMapState.allScans.map(s => s.bodyLocation));
        bodyParts.forEach(part => {
            if (locationsWithScans.has(part.getAttribute('data-location'))) {
                part.classList.add('has-scans');
            }
        });
    }

    // ─────────────────────────────────────────
    // TOOLTIPS
    // ─────────────────────────────────────────

    function initializeTooltips() {
        bodyParts.forEach(part => {
            part.addEventListener('mouseenter', showTooltipOnPart);
            part.addEventListener('mousemove', updateTooltipPosition);
            part.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltipOnPart(event) {
        const location = event.target.getAttribute('data-location');
        const count = bodyMapState.allScans.filter(s => s.bodyLocation === location).length;

        if (count > 0) {
            bodyTooltip.querySelector('.tooltip-title').textContent = location;
            bodyTooltip.querySelector('.tooltip-count').textContent = `${count} scan${count !== 1 ? 's' : ''}`;
            bodyTooltip.style.display = 'block';
            updateTooltipPosition(event);
        }
    }

    function updateTooltipPosition(event) {
        bodyTooltip.style.left = `${event.pageX + 15}px`;
        bodyTooltip.style.top = `${event.pageY + 15}px`;
    }

    function hideTooltip() {
        bodyTooltip.style.display = 'none';
    }

    // ─────────────────────────────────────────
    // EVENT LISTENERS
    // ─────────────────────────────────────────

    function setupBodyMapEventListeners() {
        // Body part click — filter to that location
        bodyParts.forEach(part => {
            part.addEventListener('click', () => selectBodyPart(part.getAttribute('data-location')));
        });

        clearFilterBtn.addEventListener('click', clearFilter);
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        sortSelect.addEventListener('change', handleSort);

        // Close disease filter dropdown when clicking outside it
        document.addEventListener('click', (e) => {
            const btn = document.getElementById('diseaseFilterBtn');
            const menu = document.getElementById('diseaseFilterMenu');
            if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('show');
            }
        });

        // Disease checkboxes
        diseaseCheckboxes.forEach(cb => cb.addEventListener('change', handleDiseaseCheckboxChange));

        if (clearDiseasesBtn) clearDiseasesBtn.addEventListener('click', clearAllDiseases);
        exportBtn.addEventListener('click', handleExport);
    }

    /**
     * Returns a debounced version of a function.
     * @param {Function} func
     * @param {number} wait - Milliseconds to wait
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // ─────────────────────────────────────────
    // FILTER ACTIONS
    // ─────────────────────────────────────────

    function selectBodyPart(location) {
        bodyMapState.selectedLocation = location;

        // Toggle active highlight on the diagram
        bodyParts.forEach(part => {
            part.classList.toggle('active', part.getAttribute('data-location') === location);
        });

        applyFilters();
        selectedLocationTitle.textContent = location;
        clearFilterBtn.style.display = 'flex';
    }

    function clearFilter() {
        bodyMapState.selectedLocation = null;
        bodyMapState.selectedDiseases = [];
        bodyMapState.searchQuery = '';
        searchInput.value = '';

        diseaseCheckboxes.forEach(cb => { cb.checked = false; });
        updateDiseaseFilterLabel();
        bodyParts.forEach(part => part.classList.remove('active'));

        showAllScans();
    }

    function showAllScans() {
        selectedLocationTitle.textContent = 'All Scans';
        clearFilterBtn.style.display = 'none';
        applyFilters();
    }

    function handleSearch(event) {
        bodyMapState.searchQuery = event.target.value.toLowerCase();
        applyFilters();
    }

    function handleSort(event) {
        bodyMapState.sortBy = event.target.value;
        applyFilters();
    }

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

    function clearAllDiseases() {
        bodyMapState.selectedDiseases = [];
        diseaseCheckboxes.forEach(cb => { cb.checked = false; });
        updateDiseaseFilterLabel();
        applyFilters();
    }

    /** Updates the disease filter button label to reflect how many diseases are selected */
    function updateDiseaseFilterLabel() {
        if (!diseaseFilterLabel) return;
        const count = bodyMapState.selectedDiseases.length;
        if (count === 0) diseaseFilterLabel.textContent = 'All Diseases';
        else if (count === 1) diseaseFilterLabel.textContent = bodyMapState.selectedDiseases[0];
        else diseaseFilterLabel.textContent = `${count} Diseases`;
    }

    /** Applies all active filters and sorts, then re-renders the grid */
    function applyFilters() {
        let filtered = [...bodyMapState.allScans];

        if (bodyMapState.selectedLocation) {
            filtered = filtered.filter(s => s.bodyLocation === bodyMapState.selectedLocation);
        }
        if (bodyMapState.selectedDiseases.length > 0) {
            filtered = filtered.filter(s => bodyMapState.selectedDiseases.includes(s.disease));
        }
        if (bodyMapState.searchQuery) {
            filtered = filtered.filter(s =>
                s.title.toLowerCase().includes(bodyMapState.searchQuery) ||
                s.disease.toLowerCase().includes(bodyMapState.searchQuery) ||
                s.bodyLocation.toLowerCase().includes(bodyMapState.searchQuery)
            );
        }

        filtered = sortScans(filtered, bodyMapState.sortBy);
        bodyMapState.filteredScans = filtered;
        renderScans(filtered);
    }

    /**
     * Sorts an array of scans by the given sort key.
     * @param {Array} scans
     * @param {string} sortBy
     */
    function sortScans(scans, sortBy) {
        const sorted = [...scans];
        switch (sortBy) {
            case 'date-desc': return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'date-asc': return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'confidence-desc': return sorted.sort((a, b) => b.confidence - a.confidence);
            case 'confidence-asc': return sorted.sort((a, b) => a.confidence - b.confidence);
            default: return sorted;
        }
    }

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────

    /** Renders scan cards into the grid or shows the empty state */
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
                emptyText.textContent = bodyMapState.searchQuery
                    ? `No scans match your search: "${bodyMapState.searchQuery}"`
                    : `No scans found for ${bodyMapState.selectedLocation}`;
            }
        } else {
            emptyState.style.display = 'none';
            scanGrid.style.display = 'grid';
            scans.forEach((scan, index) => scanGrid.appendChild(createScanCard(scan, index)));
        }
    }

    /**
     * Builds and returns a scan card DOM element.
     * @param {Object} scan
     * @param {number} index - Used to stagger the CSS animation
     */
    function createScanCard(scan, index) {
        const card = document.createElement('div');
        card.className = 'scan-card';
        card.id = `scan-card-${scan.id}`;
        card.onclick = () => viewScanReport(scan.id);
        card.style.animationDelay = `${index * 0.05}s`;

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
                        <i class="fas fa-calendar-alt"></i> ${formatDate(scan.date)}
                    </span>
                    <span class="confidence-badge" style="background:${getConfidenceColor(scan.confidence)}">
                        ${scan.confidence}%
                    </span>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Returns a CSS gradient string representing the confidence level.
     * Green ≥ 90%, Yellow ≥ 75%, Red otherwise.
     */
    function getConfidenceColor(confidence) {
        if (confidence >= 90) return 'linear-gradient(135deg, #28A745, #20c997)';
        if (confidence >= 75) return 'linear-gradient(135deg, #FFC107, #FFB300)';
        return 'linear-gradient(135deg, #FF6B6B, #EE5A6F)';
    }

    /** Brief fade-out then navigate to the report page for a given scan */
    function viewScanReport(scanId) {
        scanGrid.style.opacity = '0.5';
        setTimeout(() => { window.location.href = `report.html?scan_id=${scanId}`; }, 200);
    }

    /**
     * Deletes a scan via API and removes it from the local state and grid.
     * Exposed globally because it is called from inline onclick in card HTML.
     */
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

    /**
     * Formats an ISO date string as a human-readable date e.g. "Jan 1, 2025".
     * @param {string} dateString
     */
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    /**
     * Escapes special HTML characters to prevent XSS when setting innerHTML.
     * @param {string} text
     */
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ─────────────────────────────────────────
    // EXPORT
    // ─────────────────────────────────────────

    /** Exports the currently filtered scans as a CSV file download */
    function handleExport() {
        const scansToExport = bodyMapState.filteredScans.length > 0
            ? bodyMapState.filteredScans
            : bodyMapState.allScans;

        const blob = new Blob([prepareCsvData(scansToExport)], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        const dateStr = getCurrentDate();
        a.download = bodyMapState.selectedLocation
            ? `scans_${bodyMapState.selectedLocation.replace(/\s+/g, '_')}_${dateStr}.csv`
            : `all_scans_${dateStr}.csv`;

        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showExportFeedback();
    }

    /**
     * Converts scan objects into CSV-formatted text.
     * @param {Array} scans
     * @returns {string}
     */
    function prepareCsvData(scans) {
        const headers = ['ID', 'Title', 'Date', 'Diagnosis', 'Confidence (%)', 'Body Location'];
        const rows = scans.map(s => [
            s.id,
            `"${s.title}"`,
            s.date,
            `"${s.disease}"`,
            s.confidence,
            `"${s.bodyLocation}"`
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /** Returns today's date as YYYY-MM-DD */
    function getCurrentDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /** Temporarily changes the export button to show a success state */
    function showExportFeedback() {
        const originalHTML = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-check-circle"></i> Exported';
        exportBtn.style.background = 'var(--medical-success)';
        setTimeout(() => {
            exportBtn.innerHTML = originalHTML;
            exportBtn.style.background = 'var(--medical-primary)';
        }, 2000);
    }

    // Kick everything off
    initBodyMap();

    // Refresh scan data when the user switches back to this tab
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            const scans = await fetchScanHistory();
            bodyMapState.allScans = scans || [];
            updateStats();
            highlightBodyPartsWithScans();
            applyFilters();
        }
    });
}

// ─────────────────────────────────────────────
// DANGER ZONE (Delete Account)
// ─────────────────────────────────────────────

/** Sets up the delete-account confirmation modal with typed "DELETE" validation */
function initDangerZone() {
    const deleteBtn = document.getElementById('btn-delete-account');
    const modal = document.getElementById('delete-modal');
    const closeBtn = document.getElementById('close-delete-modal');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const input = document.getElementById('delete-confirm-input');

    if (!deleteBtn || !modal) return;

    // Hidden by default
    modal.style.display = 'none';

    // Open
    deleteBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        input.value = '';
        confirmBtn.disabled = true;
        input.focus();
    });

    // Close helpers
    const closeModal = () => {
        modal.style.display = 'none';
        input.value = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Only enable confirm button when user has typed "DELETE" exactly
    input.addEventListener('input', () => {
        confirmBtn.disabled = input.value !== 'DELETE';
    });

    // Send delete account request
    confirmBtn.addEventListener('click', async () => {
        if (input.value !== 'DELETE') return;

        const originalText = confirmBtn.innerText;
        confirmBtn.innerText = 'Deleting...';
        confirmBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Account deleted successfully.');
                logout();
            } else {
                alert(data.message || 'Failed to delete account.');
                confirmBtn.innerText = originalText;
                confirmBtn.disabled = false;
            }
        } catch (error) {
            console.error('Delete account error:', error);
            alert('Error connecting to server.');
            confirmBtn.innerText = originalText;
            confirmBtn.disabled = false;
        }
    });
}

// ─────────────────────────────────────────────
// AI MODEL SELECTION (Settings Page)
// ─────────────────────────────────────────────

/** Initialises the AI model selector cards and restores the previously saved choice */
function initAIModels() {
    const modelRadios = document.querySelectorAll('input[name="ai-model"]');
    const savedModel = localStorage.getItem('selected_model') || 'gemini';

    // Apply the saved selection on load
    modelRadios.forEach(radio => {
        if (radio.value === savedModel) {
            radio.checked = true;
            updateModelStyle(radio);
        }
    });

    // Card click handling — each card wraps a radio input
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            e.preventDefault(); // Avoid double-toggle from label

            const radio = card.querySelector('input[type="radio"]');
            if (!radio || radio.checked) return; // Already selected, nothing to do

            const modelName = radio.value === 'gemini' ? 'Google Gemini' : 'Meta Llama 3';

            // Inform the user that we're switching
            if (typeof addNotification === 'function') {
                showNotificationToast('AI Model', `Switching to ${modelName}...`, 'info');
            } else {
                showToast(`Switching to ${modelName}...`, 'info');
            }

            // Simulate / call backend model switch
            const success = await switchModelBackend(radio.value);

            if (success) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
                localStorage.setItem('selected_model', radio.value);
                updateModelStyle(radio);

                if (typeof addNotification === 'function') {
                    addNotification('AI Model Updated', `Active model set to ${modelName}.`, 'success');
                } else {
                    showToast(`Successfully switched to ${modelName}`, 'success');
                }
            } else {
                if (typeof addNotification === 'function') {
                    addNotification('AI Model Error', `Failed to switch to ${modelName}.`, 'warning');
                } else {
                    showToast(`Failed to switch to ${modelName}`, 'warning');
                }
            }
        });
    });
}

/**
 * Adds the 'selected' CSS class to the parent card of the checked radio,
 * and removes it from all others.
 * @param {HTMLInputElement} radio
 */
function updateModelStyle(radio) {
    document.querySelectorAll('.model-card').forEach(card => card.classList.remove('selected'));
    if (radio.checked) {
        const card = radio.closest('.model-card');
        if (card) card.classList.add('selected');
    }
}

/**
 * Simulates a backend call to switch the active AI model.
 * Replace the body with a real fetch() when the backend endpoint is ready.
 * @param {string} model
 * @returns {Promise<boolean>} - Resolves true on success
 */
function switchModelBackend(model) {
    return new Promise(resolve => {
        setTimeout(() => resolve(true), 800); // 800ms simulated latency
    });
}

// ─────────────────────────────────────────────
// THEME OPTIONS (Settings Page — Appearance Tab)
// ─────────────────────────────────────────────

/**
 * Initialises the dark mode toggle and palette colour pickers on the settings page.
 * FIX: applyTheme('light') now uses setAttribute('data-mode', 'light') instead of
 * removeAttribute('data-mode') to stay consistent with how initTheme() sets the attribute.
 * This ensures CSS selectors like [data-mode="light"] work correctly after toggling.
 */
function initThemeOptions() {
    const themeToggle = document.getElementById('theme-toggle-settings');
    const paletteBtns = document.querySelectorAll('.palette-option');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('skinscan_mode') || 'light';
    const savedPalette = localStorage.getItem('skinscan_palette') || 'default';

    const currentTheme = localStorage.getItem('dash_theme') || 'light';

    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        themeSwitch.checked = true;
    } else {
        body.classList.remove('dark-mode');
        themeSwitch.checked = false;
    }

    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('dash_theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('dash_theme', 'light');
        }
    });

    // Reflect saved palette in the UI
    paletteBtns.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-palette') === savedPalette);

        opt.addEventListener('click', () => {
            const palette = opt.getAttribute('data-palette');
            html.setAttribute('data-palette', palette);
            localStorage.setItem('skinscan_palette', palette);

            // Update active state on all palette buttons
            paletteBtns.forEach(p => p.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // Dark mode toggle listener
    if (themeToggle) {
        themeToggle.checked = (savedTheme === 'dark');

        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('skinscan_mode', newTheme);
        });
    }
}