document.addEventListener('DOMContentLoaded', () => {
    // Requires Auth
    if (!isAuthenticated()) {
        window.location.href = 'index.html#login';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedReportId = urlParams.get('report_id');

    if (!sharedReportId) {
        showError("No report ID provided in the URL.");
        return;
    }

    // Set today's date for signature
    document.getElementById('currentDateFooter').innerText = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    // Populate user profile info (approximated for doctor)
    initDoctorInfo();

    // Initialize Doctor Notes formatting (Auto-bullet points)
    initDoctorNotesFormat();

    // Fetch the report
    fetchSharedReport(sharedReportId);
});

async function initDoctorInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            document.getElementById('doctorNameFooter').innerText = `Dr. ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Dr. ' + user.email;
        } catch (e) { }
    }
}

function initDoctorNotesFormat() {
    const textarea = document.getElementById('doctorNotesInput');
    if (!textarea) return;

    const bullet = '• ';

    // When clicking into an empty textarea, start with a bullet
    textarea.addEventListener('focus', function () {
        if (this.value.trim() === '') {
            this.value = bullet;
        }
    });

    textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();

            const cursorPosition = this.selectionStart;
            const textBefore = this.value.substring(0, cursorPosition);
            const textAfter = this.value.substring(cursorPosition);
            const lines = textBefore.split('\n');
            const currentLine = lines[lines.length - 1];

            // If pressing Enter on an empty bulleted line, clear the bullet and exit list mode
            if (currentLine.trim() === '•') {
                this.value = textBefore.substring(0, textBefore.length - currentLine.length) + '\n' + textAfter;
                this.selectionStart = this.selectionEnd = cursorPosition - currentLine.length + 1;
                return;
            }

            // Normal Enter: Add new line with a bullet
            const insertText = '\n' + bullet;
            this.value = textBefore + insertText + textAfter;
            this.selectionStart = this.selectionEnd = cursorPosition + insertText.length;
        }
    });
}

function showError(message) {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('report-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
    if (message) {
        document.getElementById('error-message').innerText = message;
    }
}

async function fetchSharedReport(sharedReportId) {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/reports/shared/${sharedReportId}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            populateReport(result.data);
            document.getElementById('loading-skeleton').style.display = 'none';
            document.getElementById('report-content').style.display = 'block';
        } else {
            showError(result.message || "Failed to load report data.");
        }
    } catch (error) {
        console.error("Error fetching shared report:", error);
        showError("Network error while fetching the report.");
    }
}

function populateReport(data) {
    // Header
    document.getElementById('patientName').innerText = data.patient.name;
    document.getElementById('patientEmail').innerText = data.patient.email;
    document.getElementById('reportRefId').innerText = `R-${String(data.report_id).padStart(4, '0')}`;

    // Vitals
    document.getElementById('patientDOB').innerText = data.patient.dob === 'N/A' ? 'Not Provided' : data.patient.dob;
    document.getElementById('patientGender').innerText = data.patient.gender === 'N/A' ? 'Unspecified' : data.patient.gender;
    document.getElementById('patientSkinType').innerText = data.patient.skin_type === 'N/A' ? 'Unspecified' : data.patient.skin_type;
    document.getElementById('patientSkinTone').innerText = data.patient.skin_tone === 'N/A' ? 'Unspecified' : data.patient.skin_tone;

    const sharedDate = data.shared_at ? new Date(data.shared_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    }) : '--';
    document.getElementById('scanDate').innerText = sharedDate;

    // Image
    if (data.image_url) {
        let imgUrl = data.image_url;
        if (!imgUrl.startsWith('http')) {
            imgUrl = `${API_BASE_URL.replace('/api', '')}/media/${imgUrl}`;
        }
        document.getElementById('scanImage').src = imgUrl;
    }

    // Body Location & Diagnosis
    const bodyLocEl = document.getElementById('bodyLocation');
    if (bodyLocEl) {
        bodyLocEl.innerText = data.body_location || 'Skin';
    }
    document.getElementById('conditionName').innerText = data.disease;

    // Severity
    const severityBadge = document.getElementById('severityBadge');
    if (severityBadge && data.severity) {
        severityBadge.innerText = data.severity;
        const sevLower = data.severity.toLowerCase();
        if (sevLower === 'high' || sevLower === 'severe') {
            severityBadge.className = 'severity-badge status-danger';
        } else if (sevLower === 'low' || sevLower === 'mild') {
            severityBadge.className = 'severity-badge status-good';
        } else {
            severityBadge.className = 'severity-badge status-warning';
        }
    }

    // ABCD
    if (data.abcd) {
        const abcdItems = document.querySelectorAll('.abcd-item');
        if (abcdItems.length >= 4) {
            abcdItems[0].querySelector('.abcd-status').innerText = data.abcd.a;
            abcdItems[1].querySelector('.abcd-status').innerText = data.abcd.b;
            abcdItems[2].querySelector('.abcd-status').innerText = data.abcd.c;
            abcdItems[3].querySelector('.abcd-status').innerText = data.abcd.d;

            // Basic status color styling based on dummy logic for abcd
            abcdItems.forEach((item, index) => {
                const statusSpan = item.querySelector('.abcd-status');
                const val = statusSpan.innerText.toLowerCase();
                if (val.includes('irregular') || val.includes('high')) {
                    statusSpan.className = 'abcd-status status-warning';
                } else if (val.includes('severe')) {
                    statusSpan.className = 'abcd-status status-danger';
                } else {
                    statusSpan.className = 'abcd-status status-good';
                }
            });
        }
    }

    // Confidence
    const confidence = Math.round(data.confidence || 0);
    document.getElementById('confidenceText').innerText = `${confidence}%`;
    document.getElementById('confidenceBar').style.width = `${confidence}%`;

    if (confidence > 80) {
        document.getElementById('confidenceBar').style.background = '#10b981';
        document.getElementById('confidenceText').style.color = '#10b981';
    } else if (confidence > 50) {
        document.getElementById('confidenceBar').style.background = '#f59e0b';
        document.getElementById('confidenceText').style.color = '#f59e0b';
    } else {
        document.getElementById('confidenceBar').style.background = '#ef4444';
        document.getElementById('confidenceText').style.color = '#ef4444';
    }

    // Recommendations
    if (data.recommendation) {
        let parsedSteps = [];

        if (data.recommendation.startsWith('JSON_TREATMENT:')) {
            try {
                parsedSteps = JSON.parse(data.recommendation.substring('JSON_TREATMENT:'.length));
                // Only show structured steps, hide the block of raw text
                document.getElementById('aiRecommendations').style.display = 'none';
            } catch (e) {
                console.error('Error parsing JSON treatment:', e);
                document.getElementById('aiRecommendations').innerHTML = data.recommendation.replace(/\n/g, '<br>');
                parsedSteps = parseTreatment(data.recommendation);
            }
        } else {
            // Legacy/fallback behavior
            document.getElementById('aiRecommendations').innerHTML = data.recommendation.replace(/\n/g, '<br>');
            parsedSteps = parseTreatment(data.recommendation);
        }

        const stepsContainer = document.getElementById('treatmentSteps');
        if (stepsContainer && parsedSteps.length > 0) {
            renderTreatmentSteps(parsedSteps);
        }
    }

    // Pre-fill existing doctor notes if any
    if (data.doctor_notes) {
        document.getElementById('doctorNotesInput').value = data.doctor_notes;
    }

    // Disable submit if already reviewed
    if (data.status === 'REVIEWED') {
        const btnSend = document.getElementById('btnSendPatient');
        btnSend.innerHTML = '<i class="fas fa-check"></i> Already Sent to Patient';
        btnSend.style.backgroundColor = '#9ca3af';
        // Keep it clickable to re-send, or disable it. We'll leave it clickable as an "Update"
    }
}

// Helper to parse treatment text into steps
function parseTreatment(text) {
    if (!text) return [];
    if (Array.isArray(text)) return text; // Already structured array from AI

    // Split by newlines or periods if it's a block of text
    const sentences = text.split(/\.|\n/).filter(s => s.trim().length > 5);
    return sentences.map((s, i) => ({
        step: i + 1,
        title: `Observation ${i + 1}`,
        description: s.trim()
    })).slice(0, 4); // Limit to 4 steps
}

// Render treatment steps
function renderTreatmentSteps(steps) {
    const container = document.getElementById('treatmentSteps');
    if (!container) return;
    container.innerHTML = '';

    if (!steps || steps.length === 0) {
        container.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 20px;">No structured observations available.</p>';
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

async function sendToPatient() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedReportId = urlParams.get('report_id');
    const doctorNotes = document.getElementById('doctorNotesInput').value.trim();

    if (!doctorNotes) {
        showToast("Please enter clinical notes before sending.", "error");
        return;
    }

    const btnSend = document.getElementById('btnSendPatient');
    const originalBtnHTML = btnSend.innerHTML;
    btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    btnSend.disabled = true;

    try {
        // 1. Prepare HTML Element for printing
        const element = document.getElementById('report-content');

        // Scroll to top to avoid html2canvas blank page offset bug
        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0);

        // Enable PDF Export Mode (High-quality A4 layout CSS)
        document.body.classList.add('pdf-export-mode');
        element.classList.add('pdf-export-mode');

        // Temporarily hide action buttons for PDF
        const actionButtons = document.getElementById('action-buttons-container');
        if (actionButtons) actionButtons.style.display = 'none';

        // 2. Convert textarea content into beautifully styled HTML
        const notesArea = document.getElementById('doctorNotesInput');
        const noteCardContainer = notesArea ? notesArea.closest('.doctor-note-card') : null;

        // Parse bullet points from textarea
        const lines = doctorNotes.split('\n').filter(line => line.trim() !== '' && line.trim() !== '•');
        const listItems = lines.map(line => {
            const cleanLine = line.replace(/^[\s]*[•\-\*]\s*/, '').trim();
            return cleanLine ? `<li style="position: relative; padding: 8px 0 8px 24px; font-size: 0.95rem; color: #334155; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <span style="position: absolute; left: 0; top: 15px; width: 6px; height: 6px; background-color: #2b7da3; border-radius: 50%;"></span>
                                    ${cleanLine}
                                </li>` : '';
        }).filter(Boolean).join('');

        // Create the professional HTML replacement
        const renderedNotesHTML = `
            <div class="pdf-doctor-notes" id="pdf-notes-rendered" style="font-family: 'Poppins', sans-serif; padding: 20px 0; max-width: 100%; box-sizing: border-box;">
                <h3 style="font-size: 1.1rem; color: #1a1a1a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;"><i class="fas fa-stethoscope" style="color: #2b7da3; margin-right: 8px;"></i> Doctor's Clinical Notes</h3>
                <ul class="pdf-notes-list" style="list-style: none; padding-left: 0; margin: 0;">
                    ${listItems}
                </ul>
            </div>
        `;

        let textareaWrapper;
        let originalWrapperDisplay;
        let cardH2;
        let renderedDiv;

        if (notesArea && noteCardContainer) {
            textareaWrapper = notesArea.parentElement;
            originalWrapperDisplay = textareaWrapper.style.display;
            textareaWrapper.style.display = 'none';

            cardH2 = noteCardContainer.querySelector('h2');
            if (cardH2) cardH2.style.display = 'none';

            renderedDiv = document.createElement('div');
            renderedDiv.id = 'pdf-notes-temp';
            renderedDiv.innerHTML = renderedNotesHTML;
            noteCardContainer.appendChild(renderedDiv);
        }

        // Wait a tiny bit for the browser to render the new CSS layout before taking the snapshot
        await new Promise(resolve => setTimeout(resolve, 150));

        // Measure the element's FULL rendered dimensions AFTER pdf-export-mode is applied
        const totalWidthPx = Math.max(element.scrollWidth, element.offsetWidth, 800);
        const totalHeightPx = Math.max(element.clientHeight, element.offsetHeight, element.scrollHeight);

        // Convert px to pt for jsPDF (1px = 0.75pt)
        const pxToPt = 0.75;
        const pdfWidth = totalWidthPx * pxToPt;
        const pdfHeight = (totalHeightPx * pxToPt) + 40;

        // 3. Generate PDF Blob using html2pdf.js with onclone to fix body centering
        const opt = {
            margin: [0, 0, 0, 0],
            filename: `Medical_Report_R${sharedReportId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: false,
                // onclone: Override body flex centering in the CLONED document
                // This is the KEY fix — the live body has `display: flex; justify-content: center`
                // which offsets the container. html2canvas captures from (0,0), missing the left side.
                onclone: function (clonedDoc) {
                    const clonedBody = clonedDoc.body;
                    clonedBody.style.display = 'block';
                    clonedBody.style.justifyContent = 'unset';
                    clonedBody.style.alignItems = 'unset';
                    clonedBody.style.padding = '0';
                    clonedBody.style.margin = '0';
                    clonedBody.style.background = 'white';
                    clonedBody.style.width = totalWidthPx + 'px';

                    // Also force the report-content and report-container in the clone
                    const clonedElement = clonedDoc.getElementById('report-content');
                    if (clonedElement) {
                        clonedElement.style.margin = '0';
                        clonedElement.style.padding = '0';
                        clonedElement.style.width = totalWidthPx + 'px';
                        clonedElement.style.maxWidth = 'none';
                    }
                    const clonedContainer = clonedDoc.querySelector('.report-container');
                    if (clonedContainer) {
                        clonedContainer.style.margin = '0';
                        clonedContainer.style.width = totalWidthPx + 'px';
                        clonedContainer.style.maxWidth = 'none';
                        clonedContainer.style.boxShadow = 'none';
                    }
                }
            },
            jsPDF: { unit: 'pt', format: [pdfWidth, pdfHeight], orientation: 'portrait' },
            pagebreak: { mode: 'css' }
        };

        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

        // 4. Restore UI
        document.body.classList.remove('pdf-export-mode');
        element.classList.remove('pdf-export-mode');
        window.scrollTo(0, originalScrollY);

        if (renderedDiv) renderedDiv.remove();
        if (textareaWrapper) textareaWrapper.style.display = originalWrapperDisplay;
        if (cardH2) cardH2.style.display = '';
        if (actionButtons) actionButtons.style.display = 'flex';

        btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        // 5. Prepare FormData
        const formData = new FormData();
        formData.append('notes', doctorNotes);
        formData.append('file', pdfBlob, `Medical_Report_R${sharedReportId}.pdf`);

        // 6. Send to Backend
        const response = await fetch(`${API_BASE_URL}/predict/reports/resend/${sharedReportId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            showToast("Report successfully sent to patient!", "success");
            btnSend.innerHTML = '<i class="fas fa-check"></i> Sent to Patient';
            btnSend.style.backgroundColor = '#10b981';

            setTimeout(() => {
                window.close();
                if (!window.closed) {
                    window.location.href = 'doctor-dashboard.html';
                }
            }, 2000);
        } else {
            throw new Error(result.message || "Failed to resend report");
        }

    } catch (error) {
        console.error("Error sending report:", error);
        showToast(error.message || "An error occurred while sending.", "error");
        btnSend.innerHTML = originalBtnHTML;
        btnSend.disabled = false;

        // Ensure UI restores on error
        document.getElementById('action-buttons-container').style.display = 'flex';
        const tempEl = document.getElementById('pdf-notes-temp');
        if (tempEl) tempEl.remove();
        const notesArea = document.getElementById('doctorNotesInput');
        if (notesArea && notesArea.parentElement) {
            notesArea.parentElement.style.display = '';
        }
        const cardH2 = document.querySelector('.doctor-note-card h2');
        if (cardH2) cardH2.style.display = '';
    }
}

// Simple Toast function since we don't have the full script.js Toast container attached here in the same way
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '500';
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
