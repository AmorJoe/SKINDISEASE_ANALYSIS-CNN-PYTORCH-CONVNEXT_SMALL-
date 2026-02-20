const API_BASE_URL = 'http://localhost:8000/api';

// UI State Management
function showLoading() {
    document.getElementById('loading-skeleton').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('report-content').style.display = 'none';
}

function showError(message = 'We encountered an error loading your report. Please try again.') {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('report-content').style.display = 'none';
    document.getElementById('error-message').textContent = message;
}

function showEmpty() {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('report-content').style.display = 'none';
}

function showContent() {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('report-content').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async function () {
    // Show loading state initially
    showLoading();

    try {
        // 1. Load User Profile (Real Data) - ALWAYS show this
        await loadUserProfile();

        // 2. Load Diagnostic Data (will handle empty state internally)
        const hasData = loadDiagnosticData();

        // 3. Initialize textarea auto-resize
        initTextareaAutoResize();

        // Always show content - user profile will be visible
        // If no scan data, diagnostic sections will show placeholder text
        showContent();

    } catch (error) {
        console.error('Error loading report:', error);
        showError(error.message || 'Failed to load report data.');
    }
});

// Helper: Get Token
function getAuthToken() {
    return sessionStorage.getItem('jwt_token');
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
            alert('No scan data available.');
            return;
        }

        const result = JSON.parse(storedResult);

        // Convert image to Blob
        const fetchResp = await fetch(storedImage);
        const blob = await fetchResp.blob();

        const formData = new FormData();
        formData.append('image', blob, 'scan_image.png');
        formData.append('disease_name', result.disease_name || 'Unknown Condition');

        let confidence = parseFloat(result.confidence);
        if (isNaN(confidence)) confidence = 0;
        formData.append('confidence', confidence);

        formData.append('body_location', localStorage.getItem('latest_scan_location') || 'Unspecified');
        formData.append('severity', result.severity || 'Moderate');
        formData.append('title', `Scan on ${new Date().toLocaleDateString()} - Doctor Referral`);
        formData.append('recommendation', result.recommendation || '');

        const response = await fetch(`${API_BASE_URL}/predict/save-report`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const predictionId = data.data.prediction_id;

            // Mark as saved to avoid "Save" button triggering again if user comes back
            sessionStorage.setItem('scan_already_saved', storedResult.substring(0, 100));

            // Navigate to Doctor Appointment with ID
            window.location.href = `doctor-appointment.html?tab=share&report_id=${predictionId}`;
        } else {
            console.error('Save failed:', data);
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

// Helper: Calculate Age (Robust)
function calculateAge(dobString) {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

async function loadUserProfile() {
    let userData = null;

    // A. Try Session Storage (Logged in context)
    const sessionData = sessionStorage.getItem('user_data');
    if (sessionData) userData = JSON.parse(sessionData);

    // B. Try Local Storage (Persisted profile)
    const localData = localStorage.getItem('skinscan_user_profile');
    if (localData) {
        const parsedLocal = JSON.parse(localData);
        // Merge: Local might have more details like Skin Type
        userData = { ...userData, ...parsedLocal };
    }

    // C. Try API if authenticated
    const token = getAuthToken();
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const apiData = await response.json();
                if (apiData.status === 'success') {
                    userData = { ...userData, ...apiData.data };
                }
            }
        } catch (e) {
            console.error("API Profile fetch failed, using local data");
        }
    }

    // Apply User Data to DOM
    if (userData) {
        // Name & Email
        const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Guest User';
        document.getElementById('userName').textContent = fullName;

        const emailEl = document.getElementById('userEmail');
        if (emailEl) emailEl.textContent = userData.email || '';

        // Avatar
        if (userData.avatar) {
            const avatarSrc = userData.avatar.startsWith('http') || userData.avatar.startsWith('data:')
                ? userData.avatar
                : `${API_BASE_URL.replace('/api', '')}${userData.avatar}`;
            document.getElementById('userAvatar').src = avatarSrc;
        } else {
            document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128`;
        }

        // Vitals
        console.log('User Data:', userData);
        console.log('DOB from backend:', userData.date_of_birth);
        console.log('Age from backend:', userData.age);

        const calculatedAge = calculateAge(userData.date_of_birth);
        console.log('Calculated age (frontend):', calculatedAge);

        const age = userData.age !== undefined && userData.age !== null
            ? userData.age
            : (calculatedAge !== null ? calculatedAge : '--');

        console.log('Final age displayed:', age);
        document.getElementById('userAge').textContent = age;
        document.getElementById('userGender').textContent = userData.gender || '--';
        document.getElementById('skinType').textContent = userData.skin_type || '--';
        document.getElementById('skinTone').textContent = userData.skin_tone || '--';
    }
}

function loadDiagnosticData() {
    // 1. Try to get Real Data from LocalStorage
    const storedResult = localStorage.getItem('latest_scan_result');
    const storedImage = localStorage.getItem('latest_scan_image');

    console.log('Loading diagnostic data...');
    console.log('Stored result exists:', !!storedResult);
    console.log('Stored image exists:', !!storedImage);

    let reportData = null;

    if (storedResult) {
        try {
            const result = JSON.parse(storedResult);
            console.log('Parsed result:', result);
            reportData = {
                scanDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                diagnosis: {
                    condition: result.disease_name,
                    severity: result.severity || "Moderate",
                    confidence: result.confidence || 0,
                    abcd: result.abcd || { a: "Low", b: "Regular", c: "Uniform", d: "<6mm" }
                },
                treatmentSteps: result.treatment || parseTreatment(result.recommendation),
                lifestyleTip: result.lifestyle_tip || 'Consult a healthcare professional for personalized advice.',
                aiModelUsed: result.ai_model_used || 'gemini',
                image: storedImage
            };
        } catch (e) {
            console.error("Error parsing stored result", e);
        }
    }

    // 2. If no data, populate with placeholder values
    if (!reportData) {
        console.log('No scan data found - showing placeholder values');

        // Set placeholder values for diagnostic sections
        document.getElementById('scanDate').textContent = 'No scan performed';
        document.getElementById('conditionName').textContent = 'No diagnosis available';
        document.getElementById('conditionName').style.opacity = '0.5';

        // Hide scan image or show placeholder
        const scanImage = document.getElementById('scanImage');
        if (scanImage) {
            scanImage.style.display = 'none';
        }

        // Set confidence to 0
        document.getElementById('confidenceText').textContent = '0%';
        document.getElementById('confidenceBar').style.width = '0%';

        // Severity badge
        const severityBadge = document.getElementById('severityBadge');
        if (severityBadge) {
            severityBadge.textContent = 'N/A';
            severityBadge.className = 'severity-badge badge-low';
        }

        // Treatment steps - show message
        const stepsContainer = document.getElementById('treatmentSteps');
        if (stepsContainer) {
            stepsContainer.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 20px;">No treatment plan available. Please perform a scan first.</p>';
        }

        return false; // No data found
    }

    // --- POPULATE UI WITH REAL DATA ---

    // Image
    const scanImage = document.getElementById('scanImage');
    if (scanImage && reportData.image) {
        scanImage.src = reportData.image;
        scanImage.style.display = 'block';
    }

    // Date & Condition
    document.getElementById('scanDate').textContent = reportData.scanDate;
    document.getElementById('conditionName').textContent = reportData.diagnosis.condition;
    document.getElementById('conditionName').style.opacity = '1';

    // Severity Badge
    const severityBadge = document.getElementById('severityBadge');
    if (severityBadge) {
        const severity = reportData.diagnosis.severity || "Moderate";
        severityBadge.textContent = severity;
        severityBadge.className = `severity-badge badge-${severity.toLowerCase() === 'high' ? 'high' : severity.toLowerCase() === 'low' ? 'low' : 'mid'}`;
    }

    // Confidence
    document.getElementById('confidenceText').textContent = reportData.diagnosis.confidence + "%";
    document.getElementById('confidenceBar').style.width = reportData.diagnosis.confidence + "%";

    // Treatment Steps (no checkboxes)
    const stepsContainer = document.getElementById('treatmentSteps');
    if (stepsContainer) {
        renderTreatmentSteps(reportData.treatmentSteps);
    }

    // Lifestyle Tip
    const tipText = document.getElementById('tipText');
    if (tipText && reportData.lifestyleTip) {
        tipText.textContent = reportData.lifestyleTip;
    }

    // Highlight active model button
    if (reportData.aiModelUsed) {
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.model === reportData.aiModelUsed);
        });
    }

    // [Auto-save check removed from here, handled in DOMContentLoaded]

    return true; // Data found and populated
}

// Helper to parse treatment text into steps
function parseTreatment(text) {
    if (!text) return [];
    if (Array.isArray(text)) return text; // Already structured array from AI

    // Split by newlines or periods if it's a block of text
    const sentences = text.split(/\.|\n/).filter(s => s.trim().length > 5);
    return sentences.map((s, i) => ({
        step: i + 1,
        title: `Step ${i + 1}`,
        description: s.trim()
    })).slice(0, 4); // Limit to 4 steps
}

// Render treatment steps (no checkboxes)
function renderTreatmentSteps(steps) {
    const container = document.getElementById('treatmentSteps');
    if (!container) return;
    container.innerHTML = '';

    if (!steps || steps.length === 0) {
        container.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 20px;">No treatment plan available.</p>';
        return;
    }

    steps.forEach(item => {
        const stepHTML = `
            <div class="step-item">
                <div class="step-number">${item.step}</div>
                <div class="step-content">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                </div>
            </div>
        `;
        container.innerHTML += stepHTML;
    });
}

// ============================================
// MODEL SWITCHER
// ============================================
let currentModelUsed = 'gemini';

async function switchModel(model) {
    if (model === currentModelUsed) return;

    // Get disease data from stored result
    const storedResult = localStorage.getItem('latest_scan_result');
    if (!storedResult) {
        console.warn('No scan result available for model switching');
        return;
    }

    let result;
    try {
        result = JSON.parse(storedResult);
    } catch (e) {
        console.error('Error parsing scan result:', e);
        return;
    }

    // Update button states
    document.querySelectorAll('.model-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === model);
    });

    // Show loading in treatment area
    const container = document.getElementById('treatmentSteps');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; opacity: 0.7;">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                <p>Generating treatment plan with ${model === 'llama' ? 'Meta LLaMA' : 'Google Gemini'}...</p>
            </div>
        `;
    }

    const tipText = document.getElementById('tipText');
    if (tipText) tipText.textContent = 'Updating...';

    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/predict/generate-treatment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                disease_name: result.disease_name,
                confidence: result.confidence,
                model: model
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            const treatment = data.data;
            renderTreatmentSteps(treatment.steps || []);

            if (tipText && treatment.tip) {
                tipText.textContent = treatment.tip;
            }

            // Update severity badge if provided
            if (treatment.severity) {
                const severityBadge = document.getElementById('severityBadge');
                if (severityBadge) {
                    severityBadge.textContent = treatment.severity;
                    const level = treatment.severity.toLowerCase();
                    severityBadge.className = `severity-badge badge-${level === 'high' || level === 'critical' ? 'high' : level === 'low' ? 'low' : 'mid'}`;
                }
            }

            currentModelUsed = treatment.model_used || model;
        } else {
            renderTreatmentSteps([]);
            if (tipText) tipText.textContent = 'Failed to generate. Try another model.';
        }
    } catch (error) {
        console.error('Model switch error:', error);
        renderTreatmentSteps([]);
        if (tipText) tipText.textContent = 'Network error. Please try again.';
    }
}

// Helper: Convert Base64 to Blob
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// [Removed outdated saveReportToHistory function]

function downloadPDF() {
    // Check if doctor's notes are empty and hide if so
    const doctorNotesCard = document.querySelector('.doctor-note-card');
    const doctorNotesTextarea = document.getElementById('doctorNotes');
    const notesAreEmpty = !doctorNotesTextarea || !doctorNotesTextarea.value.trim();

    if (notesAreEmpty && doctorNotesCard) {
        doctorNotesCard.classList.add('hide-for-print');
    }

    // Trigger browser print dialog for PDF saving
    window.print();

    // Restore visibility after print dialog
    setTimeout(() => {
        if (notesAreEmpty && doctorNotesCard) {
            doctorNotesCard.classList.remove('hide-for-print');
        }
    }, 100);
}

// PNG Export functionality
async function downloadPNG() {
    const reportElement = document.getElementById('report-content');
    const doctorNotesCard = document.querySelector('.doctor-note-card');
    const doctorNotesTextarea = document.getElementById('doctorNotes');

    // Check if doctor's notes are empty
    const notesAreEmpty = !doctorNotesTextarea || !doctorNotesTextarea.value.trim();

    // Temporarily hide doctor's notes card if empty
    if (notesAreEmpty && doctorNotesCard) {
        doctorNotesCard.style.display = 'none';
    }

    const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    // Convert to PNG and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'SkinScan_Report.png';
        link.click();
        URL.revokeObjectURL(url);
    });

    // Restore doctor's notes card visibility
    if (notesAreEmpty && doctorNotesCard) {
        doctorNotesCard.style.display = '';
    }
}

// Auto-resize textarea to fit content
function initTextareaAutoResize() {
    const textarea = document.querySelector('.doctor-notes-input');
    if (!textarea) return;

    function autoResize() {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height to scrollHeight to fit all content
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Auto-resize on input
    textarea.addEventListener('input', autoResize);

    // Initial resize in case there's pre-filled content
    autoResize();

    // Add auto-save functionality
    initDoctorNotesAutoSave();
}

// ============================================
// DOCTOR'S NOTES AUTO-SAVE
// ============================================
let notesDebounceTimer = null;
let currentPredictionId = null;

function initDoctorNotesAutoSave() {
    const textarea = document.getElementById('doctorNotes');
    const timestampEl = document.getElementById('notes-timestamp');

    if (!textarea) return;

    // Get prediction ID from localStorage
    const storedResult = localStorage.getItem('latest_scan_result');
    if (storedResult) {
        try {
            const result = JSON.parse(storedResult);
            currentPredictionId = result.id;
        } catch (e) {
            console.error('Error parsing prediction result:', e);
        }
    }

    // Debounced auto-save (2 seconds after user stops typing)
    textarea.addEventListener('input', () => {
        if (timestampEl) {
            timestampEl.textContent = 'Saving...';
            timestampEl.style.color = '#666';
        }

        clearTimeout(notesDebounceTimer);
        notesDebounceTimer = setTimeout(() => {
            saveDoctorNotes(textarea.value, timestampEl);
        }, 2000);
    });
}

async function saveDoctorNotes(notes, timestampEl) {
    if (!currentPredictionId) {
        console.warn('No prediction ID available for saving notes');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/prediction/update-notes/${currentPredictionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ notes })
        });

        const data = await response.json();

        if (response.ok) {
            if (timestampEl) {
                const savedTime = new Date(data.notes_updated_at);
                timestampEl.textContent = `Last saved: ${savedTime.toLocaleTimeString()}`;
                timestampEl.style.color = '#10b981';
            }
        } else {
            if (timestampEl) {
                timestampEl.textContent = 'Failed to save';
                timestampEl.style.color = '#ef4444';
            }
        }
    } catch (error) {
        console.error('Error saving doctor notes:', error);
        if (timestampEl) {
            timestampEl.textContent = 'Failed to save';
            timestampEl.style.color = '#ef4444';
        }
    }
}

// (Checkbox persistence removed - treatment steps no longer have checkboxes)

// ============================================
// PRINT PREVIEW
// ============================================
function printPreview() {
    window.print();
}

// ============================================
// KEYBOARD NAVIGATION FOR SUBMENU
// ============================================
document.addEventListener('keydown', (e) => {
    const analysisMenu = document.getElementById('nav-analysis');
    const analysisSubmenu = document.getElementById('analysis-submenu');

    if (!analysisMenu || !analysisSubmenu) return;

    // If Analysis menu is focused
    if (document.activeElement === analysisMenu) {
        // Enter or Space to toggle
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            analysisMenu.click();
        }
        // Escape to close
        if (e.key === 'Escape') {
            analysisMenu.classList.remove('active');
            analysisSubmenu.classList.remove('expanded');
        }
    }
});

// ============================================
// DARK MODE TOGGLE
// ============================================
function toggleDarkMode() {
    const body = document.body;
    const darkModeBtn = document.getElementById('btnDarkMode');
    const icon = darkModeBtn.querySelector('i');

    body.classList.toggle('dark-mode');

    // Update icon
    if (body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', async () => {
    const darkMode = localStorage.getItem('darkMode');
    const darkModeBtn = document.getElementById('btnDarkMode');

    if (darkMode === 'enabled' && darkModeBtn) {
        document.body.classList.add('dark-mode');
        const icon = darkModeBtn.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // ============================================
    // AUTO-SAVE LOGIC (Modified: No Dropdown in Report)
    // ============================================
    const needsAutosave = localStorage.getItem('needs_autosave');
    const preSelectedLocation = localStorage.getItem('latest_scan_location');

    if (needsAutosave === 'true') {
        localStorage.removeItem('needs_autosave');

        // Check if this scan was already saved (prevents duplicates on page refresh)
        const scanResult = localStorage.getItem('latest_scan_result');
        const savedHash = sessionStorage.getItem('scan_already_saved');
        const currentHash = scanResult ? scanResult.substring(0, 100) : '';

        if (savedHash === currentHash) {
            console.log('Scan already saved this session, skipping duplicate auto-save.');
        } else {
            // Use pre-selected location OR default to Unspecified
            const initialLocation = preSelectedLocation || 'Unspecified';

            console.log(`Triggering auto-save with location: ${initialLocation}`);

            // Save immediately with the determined location
            await saveScanToBackend(false, initialLocation);

            // Mark as saved for this session
            sessionStorage.setItem('scan_already_saved', currentHash);

            // Update save button to show it's already saved
            const btnSave = document.getElementById('btnSaveHistory');
            if (btnSave) {
                btnSave.innerHTML = '<i class="fas fa-check"></i>';
                btnSave.title = 'Already saved';
                btnSave.disabled = true;
                btnSave.style.opacity = '0.5';
            }
        }

        // Clear the temp location so it doesn't persist forever
        if (preSelectedLocation) {
            localStorage.removeItem('latest_scan_location');
        }
    }
});

// ============================================
// SAVE SCAN TO BACKEND
// ============================================
let isSaving = false; // Prevent duplicate saves

async function saveReportToHistory() {
    // Check if already saved this session
    const scanResult = localStorage.getItem('latest_scan_result');
    const savedHash = sessionStorage.getItem('scan_already_saved');
    const currentHash = scanResult ? scanResult.substring(0, 100) : '';

    if (savedHash === currentHash) {
        alert('This scan has already been saved to your history!');
        return;
    }

    await saveScanToBackend(true);

    // Mark as saved
    sessionStorage.setItem('scan_already_saved', currentHash);
}

async function saveScanToBackend(isManual = false, forceLocation = null) {
    // Guard: prevent duplicate saves
    if (isSaving) {
        console.warn('Save already in progress, skipping duplicate call.');
        return;
    }
    isSaving = true;
    const token = getAuthToken();
    if (!token) {
        if (isManual) alert('Please log in to save your scan history.');
        return;
    }

    // 1. Get Data
    const storedResult = localStorage.getItem('latest_scan_result');
    const storedImage = localStorage.getItem('latest_scan_image'); // Base64 string

    // 4. Send Data to Backend
    // ============================================

    // Handle forceLocation parameter or default to 'Unspecified' (since dropdown is removed)
    let bodyLocation = forceLocation || 'Unspecified';

    // We can also check localStorage as a fallback if not forced
    if (!forceLocation) {
        const storedLoc = localStorage.getItem('latest_scan_location');
        if (storedLoc) {
            bodyLocation = storedLoc;
        }
    }

    if (!storedResult || !storedImage) {
        console.error('No scan result to save');
        return;
    }

    let result;
    try {
        result = JSON.parse(storedResult);
    } catch (e) {
        console.error('Error parsing stored scan result:', e);
        alert('Error processing scan data.');
        return;
    }

    if (!result) {
        alert("No scan data found!");
        return;
    }

    const btnSave = document.getElementById('btnSaveHistory');
    const originalContent = btnSave.innerHTML;

    try {
        if (isManual) {
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnSave.disabled = true;
        }

        // 2. Prepare Payload
        const fetchResponse = await fetch(storedImage);
        const blob = await fetchResponse.blob();

        const formData = new FormData();
        formData.append('image', blob, 'scan_image.png');
        formData.append('disease_name', result.disease_name || 'Unknown Condition');

        // Ensure confidence is a number
        let confidenceValue = parseFloat(result.confidence);
        if (isNaN(confidenceValue)) {
            console.warn('Confidence value is NaN or undefined, defaulting to 0');
            confidenceValue = 0;
        }
        formData.append('confidence', confidenceValue);

        formData.append('body_location', bodyLocation);
        formData.append('severity', result.severity || 'Moderate');

        // Generate a default title
        const finalTitle = `Scan on ${new Date().toLocaleDateString()} - ${bodyLocation}`;
        formData.append('title', finalTitle);
        formData.append('recommendation', result.recommendation || '');

        // Call the dedicated save function
        await performSave(token, formData, btnSave, originalContent, isManual);

    } catch (error) {
        console.error('Error in saveScanToBackend:', error);
        if (isManual) {
            alert('Failed to process scan data. Please try again.');
            btnSave.innerHTML = originalContent;
            btnSave.disabled = false;
        }
    } finally {
        isSaving = false;
    }
}

async function performSave(token, formData, btnSave, originalContent, isManual) {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/save-report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Save response status:', response.status);

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            if (isManual) {
                if (confirm('Scan saved successfully! View in Body Map?')) {
                    // Add timestamp to force refresh
                    window.location.href = `body-map.html?refresh=${Date.now()}`;
                } else {
                    btnSave.innerHTML = originalContent;
                    btnSave.disabled = false;
                }
            }
        } else {
            console.error('Save failed:', data);
            if (isManual) {
                alert('Error saving: ' + (data.message || 'Unknown error'));
                btnSave.innerHTML = originalContent;
                btnSave.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error in performSave:', error);
        if (isManual) {
            alert('Network error while saving.');
            btnSave.innerHTML = originalContent;
            btnSave.disabled = false;
        }
    }
}
