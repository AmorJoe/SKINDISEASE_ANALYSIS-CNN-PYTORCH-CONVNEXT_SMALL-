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
        loadAppointments()
    ]);
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
        const response = await fetch(`${API_BASE_URL_DA}/prediction/doctors`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        const optionsHTML = (data.status === 'success' && data.data.length > 0)
            ? data.data.map(doc => `<option value="${doc.id}">Dr. ${doc.first_name} ${doc.last_name} (${doc.specialty || 'General'})</option>`).join('')
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
        const response = await fetch(`${API_BASE_URL_DA}/prediction/history`, {
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
        const response = await fetch(`${API_BASE_URL_DA}/prediction/appointments/my`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        if (data.status === 'success' && data.data.length > 0) {
            container.innerHTML = data.data.map(appt => `
                <div class="appointment-card">
                    <div class="appt-icon">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div class="appt-details">
                        <h4>${appt.doctor_name} <span style="font-size: 0.8rem; font-weight: normal; color: #666;">(${appt.doctor_specialty})</span></h4>
                        <p><i class="far fa-calendar-alt"></i> ${appt.date} &nbsp;|&nbsp; <i class="far fa-clock"></i> ${appt.time_slot}</p>
                        <p>Status: <strong style="color: ${getStatusColor(appt.status)}">${appt.status}</strong></p>
                    </div>
                    <div class="appt-actions">
                         ${appt.status === 'CONFIRMED' ? `<a href="${appt.video_link}" target="_blank" class="appt-btn btn-success" style="text-decoration:none;">Join Call</a>` : ''}
                        <button class="appt-btn btn-danger" onclick="alert('Cancel feature coming soon')">Cancel</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No upcoming appointments.</p>';
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = '<p style="color: red; text-align: center;">Error loading appointments.</p>';
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
        const response = await fetch(`${API_BASE_URL_DA}/prediction/appointments/book`, {
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
        const response = await fetch(`${API_BASE_URL_DA}/prediction/reports/share`, {
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
