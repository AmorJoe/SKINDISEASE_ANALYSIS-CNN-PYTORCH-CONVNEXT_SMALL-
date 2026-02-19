// ============================================
// Doctor Appointment Page Logic
// ============================================

const API_BASE_URL_DA = 'http://localhost:8000/api';

// Re-use auth helper from script.js (assuming script.js is loaded or logic duplicated)
function getAuthToken() {
    return sessionStorage.getItem('jwt_token');
}

document.addEventListener('DOMContentLoaded', () => {
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
    }

    initDoctorAppointmentPage();
    initTabs();
    startAppointmentPolling(); // Start auto-refresh

    // Event Listeners
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBooking);
    }

    const shareBtn = document.getElementById('btn-share-report');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShareReport);
    }

    const reportSelect = document.getElementById('report-select');
    if (reportSelect) {
        reportSelect.addEventListener('change', updateReportPreview);
    }
});

let appointmentPollingInterval;

async function initDoctorAppointmentPage() {
    await Promise.all([
        loadDoctors(),
        loadReports(),
        loadAppointments(),
        loadDoctorStatus()
    ]);
}

// Load Doctor Verification Status
async function loadDoctorStatus() {
    const container = document.getElementById('doctor-status-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/doctor-status`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status !== 'success') {
            container.innerHTML = '<p style="text-align:center; color:#ef4444;">Failed to load status.</p>';
            return;
        }

        const data = result.data;

        if (!data.is_doctor) {
            // Regular user — not a doctor
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #f3f4f6; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <i class="fas fa-user" style="font-size: 2rem; color: #9ca3af;"></i>
                    </div>
                    <h3 style="color: var(--text-dark); margin-bottom: 8px; font-size: 1.2rem;">Not a Doctor Account</h3>
                    <p style="color: #6b7280; max-width: 400px; margin: 0 auto;">Your account is registered as a patient. If you're a healthcare professional, please register through the Doctor Portal.</p>
                </div>
            `;
            return;
        }

        // Doctor account — show status
        let statusIcon, statusColor, statusBg, statusLabel, statusMessage;

        if (data.is_verified) {
            statusIcon = 'fa-check-circle';
            statusColor = '#059669';
            statusBg = 'rgba(16, 185, 129, 0.08)';
            statusLabel = 'Approved';
            statusMessage = 'Your doctor account has been verified by the admin. You can now receive appointments and shared reports.';
        } else {
            statusIcon = 'fa-hourglass-half';
            statusColor = '#d97706';
            statusBg = 'rgba(245, 158, 11, 0.08)';
            statusLabel = 'Pending Approval';
            statusMessage = 'Your doctor verification request is under review. The admin will approve or reject your application shortly.';
        }

        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <!-- Status Icon -->
                <div style="width: 90px; height: 90px; border-radius: 50%; background: ${statusBg}; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; border: 2px solid ${statusColor}20;">
                    <i class="fas ${statusIcon}" style="font-size: 2.5rem; color: ${statusColor};"></i>
                </div>

                <!-- Status Label -->
                <div style="margin-bottom: 20px;">
                    <span style="display: inline-block; padding: 6px 20px; border-radius: 9999px; background: ${statusBg}; color: ${statusColor}; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid ${statusColor}30;">
                        ${statusLabel}
                    </span>
                </div>

                <!-- Message -->
                <p style="color: #6b7280; max-width: 450px; margin: 0 auto 30px; line-height: 1.6; font-size: 0.95rem;">
                    ${statusMessage}
                </p>

                <!-- Details Card -->
                <div style="background: #f9fafb; border-radius: 16px; padding: 24px; max-width: 420px; margin: 0 auto; text-align: left; border: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">Name</span>
                        <span style="color: var(--text-dark); font-weight: 600; font-size: 0.95rem;">${data.name || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">Email</span>
                        <span style="color: var(--text-dark); font-weight: 600; font-size: 0.95rem;">${data.email || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">MRN</span>
                        <span style="color: var(--text-dark); font-weight: 600; font-size: 0.95rem;">${data.mrn || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">Specialization</span>
                        <span style="color: var(--text-dark); font-weight: 600; font-size: 0.95rem;">${data.specialization || 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">Applied On</span>
                        <span style="color: var(--text-dark); font-weight: 600; font-size: 0.95rem;">${data.applied_on || 'N/A'}</span>
                    </div>
                    ${data.verified_on ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #f0f0f0;">
                        <span style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">Verified On</span>
                        <span style="color: #059669; font-weight: 600; font-size: 0.95rem;">${data.verified_on}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading doctor status:', error);
        container.innerHTML = '<p style="text-align:center; color:#ef4444; padding: 30px;">Error loading status. Please try again.</p>';
    }
}

function startAppointmentPolling() {
    // Poll every 30 seconds
    appointmentPollingInterval = setInterval(() => {
        // Only reload if the tab is active
        const upcomingTab = document.getElementById('tab-upcoming');
        if (upcomingTab && upcomingTab.classList.contains('active')) {
            console.log('Auto-refreshing appointments...');
            loadAppointments();
        }
    }, 30000);
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Update buttons
            tabBtns.forEach(b => {
                b.classList.remove('active');
                // styles handled by CSS .tab-btn.active now
                b.style.color = '';
                b.style.borderBottom = '';
            });
            btn.classList.add('active');

            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active'); // Use class for display toggle
                content.style.display = 'none'; // Fallback
                if (content.id === `tab-${tabId}`) {
                    content.classList.add('active');
                    content.style.display = 'block';

                    // Trigger data refresh when tab opens
                    if (tabId === 'upcoming') {
                        loadAppointments();
                    }
                    if (tabId === 'status') {
                        loadDoctorStatus();
                    }
                    if (tabId === 'documents') {
                        loadDocuments();
                    }
                }
            });
        });
    });
}

// 1. Load Doctors
async function loadDoctors() {
    const bookingSelect = document.getElementById('doctor-select');
    const shareSelect = document.getElementById('doctor-select-share');

    if (!bookingSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/doctors`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        const optionsHTML = (data.status === 'success' && data.data.length > 0)
            ? data.data.map(doc => `<option value="${doc.id}">Dr. ${doc.first_name} ${doc.last_name} (${doc.specialization || 'Dermatology'})</option>`).join('')
            : '<option value="" disabled>No doctors available</option>';

        const defaultOption = '<option value="" disabled selected>Select Doctor</option>';

        bookingSelect.innerHTML = defaultOption + optionsHTML;
        if (shareSelect) {
            shareSelect.innerHTML = defaultOption + optionsHTML;
        }

    } catch (error) {
        console.error('Error loading doctors:', error);
        bookingSelect.innerHTML = '<option value="" disabled>Error loading doctors</option>';
        if (shareSelect) shareSelect.innerHTML = '<option value="" disabled>Error loading doctors</option>';
    }
}

// 2. Load Reports
let loadedReports = [];
async function loadReports() {
    const select = document.getElementById('report-select');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/history`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        select.innerHTML = '<option value="" disabled selected>Select Report to Share</option>';

        if (data.status === 'success' && data.data.history.length > 0) {
            loadedReports = data.data.history;
            loadedReports.forEach(report => {
                const option = document.createElement('option');
                option.value = report.id;

                // Format: Disease Name - DD/MM/YYYY
                const dateObj = new Date(report.created_at);
                const dateStr = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY

                option.textContent = `${report.disease_name} - ${dateStr} (${report.confidence_score}%)`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="" disabled>No reports found in history</option>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        select.innerHTML = '<option value="" disabled>Error loading reports</option>';
    }
}

function updateReportPreview() {
    const select = document.getElementById('report-select');
    const preview = document.getElementById('report-preview');
    const reportId = parseInt(select.value);

    const report = loadedReports.find(r => r.id === reportId);

    if (report) {
        document.getElementById('preview-disease').textContent = report.disease_name;
        document.getElementById('preview-confidence').textContent = report.confidence_score;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

// 3. Load Appointments
async function loadAppointments() {
    const container = document.getElementById('upcoming-appointments-container');
    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/appointments/my`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        if (data.status === 'success' && data.data.length > 0) {
            container.innerHTML = data.data.map(appt => {
                const statusConfig = {
                    'PENDING': { color: '#d97706', bg: 'rgba(245, 158, 11, 0.08)', icon: 'fa-hourglass-half', label: 'Pending' },
                    'CONFIRMED': { color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', icon: 'fa-check-circle', label: 'Confirmed' },
                    'REJECTED': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)', icon: 'fa-times-circle', label: 'Rejected' },
                    'COMPLETED': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', icon: 'fa-flag-checkered', label: 'Completed' },
                    'CANCELLED': { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.08)', icon: 'fa-ban', label: 'Cancelled' }
                };
                const s = statusConfig[appt.status] || statusConfig['PENDING'];
                const initials = (appt.doctor_name || 'Dr').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

                return `
                <div style="background: #fff; border-radius: 16px; border: 1px solid #f0f0f0; margin-bottom: 16px; overflow: hidden; transition: box-shadow 0.3s; position: relative;">
                    <!-- Status accent line -->
                    <div style="height: 4px; background: ${s.color}; opacity: 0.7;"></div>

                    <div style="padding: 24px; display: flex; align-items: flex-start; gap: 20px;">
                        <!-- Doctor Avatar -->
                        <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, ${s.bg}, ${s.color}15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid ${s.color}20;">
                            <span style="font-weight: 700; font-size: 0.9rem; color: ${s.color};">${initials}</span>
                        </div>

                        <!-- Info -->
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                                <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-dark);">${appt.doctor_name || 'Doctor'}</h4>
                                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 14px; border-radius: 9999px; background: ${s.bg}; color: ${s.color}; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid ${s.color}20;">
                                    <i class="fas ${s.icon}" style="font-size: 0.7rem;"></i> ${s.label}
                                </span>
                            </div>
                            <p style="margin: 0 0 4px; color: #6b7280; font-size: 0.85rem;">
                                <i class="fas fa-stethoscope" style="width: 16px; color: #9ca3af;"></i> ${appt.doctor_specialty || 'Dermatology'}
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 0.85rem;">
                                <i class="far fa-calendar-alt" style="width: 16px; color: #9ca3af;"></i> ${appt.date} &nbsp;&bull;&nbsp; <i class="far fa-clock" style="color: #9ca3af;"></i> ${appt.time_slot}
                            </p>

                            <!-- Actions Row -->
                            <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
                                ${appt.status === 'CONFIRMED' && appt.video_link ? `
                                    <a href="${appt.video_link}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 12px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.85rem; transition: all 0.3s; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
                                        <i class="fas fa-video"></i> Join Video Call
                                    </a>
                                ` : ''}
                                ${appt.status === 'PENDING' ? `
                                    <button onclick="alert('Cancel feature coming soon')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px; background: transparent; color: #dc2626; border: 1px solid #fecaca; font-weight: 500; font-size: 0.82rem; cursor: pointer; transition: all 0.2s;">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #f3f4f6; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <i class="fas fa-calendar-times" style="font-size: 1.8rem; color: #d1d5db;"></i>
                    </div>
                    <p style="color: #9ca3af; font-size: 0.95rem; margin-bottom: 20px;">No upcoming appointments scheduled.</p>
                    <button onclick="document.querySelector('[data-tab=\\'book\\']').click()" style="padding: 10px 28px; border-radius: 12px; background: #f3f4f6; color: var(--text-dark); border: none; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: background 0.2s;">
                        Book Now
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 30px;">Error loading appointments.</p>';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'CONFIRMED': return '#28a745';
        case 'PENDING': return '#ffc107';
        case 'REJECTED': return '#dc3545';
        default: return '#666';
    }
}

// 4. Handle Booking
async function handleBooking(e) {
    e.preventDefault();

    const doctorId = document.getElementById('doctor-select').value;
    const date = document.getElementById('appt-date').value;
    const timeSlot = document.getElementById('time-slot').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!doctorId || !date || !timeSlot) {
        alert('Please select a doctor, date, and time.');
        return;
    }

    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Booking...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/appointments/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                doctor_id: doctorId,
                date: date,
                time_slot: timeSlot
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Appointment request sent successfully!');
            loadAppointments(); // Refresh list
            // Reset form
            document.getElementById('booking-form').reset();
        } else {
            alert(`Booking failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('Network error during booking.');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// 5. Handle Share Report
async function handleShareReport() {
    const reportId = document.getElementById('report-select').value;
    const doctorId = document.getElementById('doctor-select-share').value;

    if (!doctorId) {
        alert('Please select a doctor to share the report with.');
        return;
    }

    if (!reportId) {
        alert('Please select a report to share.');
        return;
    }

    const btn = document.getElementById('btn-share-report');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/reports/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                report_id: reportId,
                doctor_id: doctorId
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Report shared successfully!');
        } else {
            alert(`Sharing failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Sharing error:', error);
        alert('Network error during sharing.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 5. Load Doctor Documents
async function loadDocuments() {
    const container = document.getElementById('documents-list-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL_DA}/predict/documents`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(doc => `
                <div style="display: flex; align-items: flex-start; gap: 16px; padding: 16px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: var(--primary-color);">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px; color: var(--text-dark); font-size: 0.95rem;">${doc.name}</h4>
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 0.85rem;">
                            Shared by ${doc.doctor_name} on ${doc.created_at}
                        </p>
                        ${doc.note ? `<p style="margin: 0 0 8px; color: #4b5563; font-size: 0.9rem; background: #f9fafb; padding: 8px; border-radius: 6px;">${doc.note}</p>` : ''}
                        <a href="${doc.file_url}" target="_blank" download class="btn-sm btn-outline" style="text-decoration: none; padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid #d1d5db; color: var(--text-dark); display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: #f3f4f6; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <i class="fas fa-folder-open" style="font-size: 1.5rem; color: #d1d5db;"></i>
                    </div>
                    <p style="color: #9ca3af; font-size: 0.95rem;">No documents shared yet.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading documents:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 30px;">Error loading documents.</p>';
    }
}
