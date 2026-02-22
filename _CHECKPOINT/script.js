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
