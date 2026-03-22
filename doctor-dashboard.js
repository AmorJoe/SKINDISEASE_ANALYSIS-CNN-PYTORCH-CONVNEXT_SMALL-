// ============================================
// SkinScan AI — Doctor Dashboard (Live API)
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';
function getAuthToken() { return sessionStorage.getItem('jwt_token'); }
function isAuthenticated() { return !!getAuthToken(); }
function getUserData() {
    try { return JSON.parse(sessionStorage.getItem('user_data') || '{}'); } catch { return {}; }
}

// Store appointments fetched from API
let allAppointments = [];
let appointmentChart = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    // Auth guard — redirect if not logged in or not a doctor
    const user = getUserData();
    if (!isAuthenticated() || (!user.is_doctor && !user.is_admin)) {
        window.location.href = 'doctor-login.html';
        return;
    }

    initDashboard();
    initNotificationUI();
    startNotificationPolling();
    setupLogout();
});

async function initDashboard() {
    updateDate();
    setupTabSwitching();
    setupMobileSidebar();
    loadSidebarProfile();

    // Load all data from APIs in parallel
    await Promise.all([
        loadStats(),
        loadAppointmentsFromAPI(),
        loadReports(),
        loadPatients()
    ]);

    // Default tab view
    loadAppointments('requests');
    loadUrgentRequests();
    loadBilling(); // Placeholder
}

// ============================================
// DATE & UI
// ============================================
function updateDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = now.toLocaleDateString('en-US', options);
    }
}

async function loadSidebarProfile() {
    const nameEl = document.getElementById('sidebar-name');
    const specEl = document.getElementById('sidebar-specialty');
    const avatarEl = document.getElementById('sidebar-avatar');

    // Fetch real doctor profile from API (has correct name + specialization)
    try {
        const response = await fetch(`${API_BASE_URL}/predict/doctor-status`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success' && result.data.is_doctor) {
            const d = result.data;
            const drName = d.name || 'Doctor';
            if (nameEl) nameEl.textContent = drName;
            if (specEl) specEl.textContent = d.specialization || 'General';
            if (avatarEl) {
                avatarEl.src = d.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(drName)}&background=0288d1&color=fff`;
            }
            // Also update the page header greeting
            const titleEl = document.getElementById('page-title');
            if (titleEl && titleEl.textContent === 'Dashboard') {
                titleEl.textContent = `Welcome, ${drName}`;
            }
            return;
        }
    } catch (e) {
        console.warn('Could not fetch doctor profile, using cached data:', e);
    }

    // Fallback to sessionStorage data
    const user = getUserData();
    const drName = `Dr. ${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (nameEl) nameEl.textContent = drName || 'Doctor';
    if (specEl) specEl.textContent = user.specialty || 'General';
    if (avatarEl) {
        avatarEl.src = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(drName || 'Doctor')}&background=0288d1&color=fff`;
    }
}

// ============================================
// TAB SWITCHING
// ============================================
function setupTabSwitching() {
    const navItems = document.querySelectorAll('.sidebar-nav li[data-tab]');
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            switchTab(this.getAttribute('data-tab'));
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    const activeNav = document.querySelector(`.sidebar-nav li[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) activeContent.classList.add('active');

    const titleMap = {
        'dashboard': 'Dashboard',
        'appointments': 'Appointments',
        'patients': 'Patient Records',
        'reports': 'Medical Reports',
        'billing': 'Billing & Invoices'
    };
    document.getElementById('page-title').innerText = titleMap[tabId] || 'Dashboard';

    // Force chart resize when tab becomes visible (display: block)
    // otherwise Chart.js renders a 0x0 canvas for hidden tabs
    if (tabId === 'billing' && typeof billingChartInstance !== 'undefined' && billingChartInstance) {
        setTimeout(() => {
            billingChartInstance.resize();
            billingChartInstance.update();
        }, 50);
    }
}

function setupMobileSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            toggleBtn.innerHTML = sidebar.classList.contains('collapsed')
                ? '<i class="fas fa-chevron-right"></i>'
                : '<i class="fas fa-bars"></i>';
        });
    }
}

// ============================================
// STATS — LIVE API
// ============================================
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/doctor/stats`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success') {
            const d = result.data;
            document.getElementById('dash-today-count').innerText = d.today_appointments;
            document.getElementById('dash-request-count').innerText = d.pending_requests;
            document.getElementById('dash-patient-count').innerText = d.total_patients;
            document.getElementById('dash-revenue').innerText = d.revenue > 0 ? `₹${d.revenue}` : '₹0';

            // Update requests badge
            const badge = document.getElementById('requests-badge');
            if (badge) badge.innerText = d.pending_requests;

            // Init chart with real data
            initChart(d.chart_labels, d.chart_data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// APPOINTMENTS — LIVE API
// ============================================
async function loadAppointmentsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/appointments/my?role=doctor`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();
        if (result.status === 'success') {
            allAppointments = result.data;
        }
    } catch (error) {
        console.error('Error fetching appointments:', error);
        allAppointments = [];
    }
}

function filterAppointments(type) {
    document.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.closest('.sub-tab').classList.add('active');
    }
    loadAppointments(type);
}

function loadAppointments(type) {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let filtered = [];
    if (type === 'requests') {
        filtered = allAppointments.filter(a => a.status === 'PENDING');
    } else if (type === 'today') {
        filtered = allAppointments.filter(a => a.date === today && a.status !== 'REJECTED' && a.status !== 'CANCELLED');
    } else if (type === 'upcoming') {
        filtered = allAppointments.filter(a => a.date >= today && a.status === 'CONFIRMED');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">No appointments found.</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(appt => {
        let actions = '';
        if (type === 'requests') {
            actions = `
                <div class="action-btn-group">
                    <button class="icon-btn btn-approve" title="Approve" onclick="approveAppt(${appt.id})"><i class="fas fa-check"></i></button>
                    <button class="icon-btn btn-reject" title="Reject" onclick="rejectAppt(${appt.id})"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else {
            actions = `
                <div class="action-btn-group">
                    <button class="icon-btn btn-view" title="View Details"><i class="fas fa-eye"></i></button>
                    ${appt.status === 'CONFIRMED' && appt.video_link ? `<a href="${appt.video_link}" target="_blank" class="icon-btn btn-approve" title="Join Call"><i class="fas fa-video"></i></a>` : ''}
                </div>
            `;
        }

        let statusClass = 'pending';
        if (appt.status === 'CONFIRMED') statusClass = 'confirmed';
        if (appt.status === 'COMPLETED') statusClass = 'confirmed';

        const initials = (appt.patient_name || 'U').charAt(0).toUpperCase();

        html += `
            <tr data-appt-id="${appt.id}">
                <td>
                    <div class="patient-mini">
                        <div class="patient-nav-avatar" style="display:flex;align-items:center;justify-content:center;font-size:0.8rem;">${initials}</div>
                        <span style="font-weight:500;">${appt.patient_name || 'Unknown'}</span>
                    </div>
                </td>
                <td>${appt.date} <br> <span style="font-size:0.8rem;color:#777;">${appt.time_slot}</span></td>
                <td>${appt.status}</td>
                <td><span class="status-tag ${statusClass}">${appt.status}</span></td>
                <td>${actions}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ============================================
// APPROVE / REJECT — LIVE API
// ============================================
async function approveAppt(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/appointments/manage/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ action: 'confirm' })
        });
        const result = await response.json();

        if (result.status === 'success') {
            // Update local data & refresh
            const appt = allAppointments.find(a => a.id === id);
            if (appt) appt.status = 'CONFIRMED';
            loadAppointments('requests');
            loadStats(); // Refresh counts
            showToast('Appointment approved!', 'success');
        } else {
            showToast(result.message || 'Failed to approve', 'error');
        }
    } catch (error) {
        console.error('Approve error:', error);
        showToast('Network error', 'error');
    }
}

async function rejectAppt(id) {
    const reason = prompt('Please enter a reason for rejecting this request:');
    if (reason === null) return; // User cancelled the prompt

    try {
        const response = await fetch(`${API_BASE_URL}/predict/appointments/manage/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ action: 'reject', reason: reason })
        });
        const result = await response.json();

        if (result.status === 'success') {
            allAppointments = allAppointments.filter(a => a.id !== id);
            loadAppointments('requests');
            loadStats();
            showToast('Appointment rejected', 'success');
        } else {
            showToast(result.message || 'Failed to reject', 'error');
        }
    } catch (error) {
        console.error('Reject error:', error);
        showToast('Network error', 'error');
    }
}

// ============================================
// URGENT REQUESTS (Dashboard Overview)
// ============================================
function loadUrgentRequests() {
    const list = document.getElementById('dash-urgent-list');
    if (!list) return;

    const pending = allAppointments.filter(a => a.status === 'PENDING').slice(0, 4);

    if (pending.length === 0) {
        list.innerHTML = '<div class="empty-state-mini" style="text-align:center;padding:20px;color:#999;">No pending requests</div>';
        return;
    }

    let html = '';
    pending.forEach(item => {
        const initials = (item.patient_name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        html += `
        <div class="list-item-row">
            <div class="patient-mini">
                <div class="patient-nav-avatar" style="display:flex;align-items:center;justify-content:center;font-size:0.8rem;background:#fee;">${initials}</div>
                <div class="patient-details">
                    <h4>${item.patient_name || 'Unknown'}</h4>
                    <p>${item.time_slot}</p>
                </div>
            </div>
            <div class="time-tag">
                <span class="status-tag urgent">${item.date}</span>
            </div>
            <button class="btn-text" onclick="switchTab('appointments')">Review</button>
        </div>`;
    });

    list.innerHTML = html;
}

// ============================================
// REPORTS — LIVE API
// ============================================
async function loadReports() {
    const container = document.getElementById('reports-accordion-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/predict/reports/shared`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            // Group reports by patient name
            const grouped = {};
            result.data.forEach(r => {
                const name = r.patient_name || 'Unknown Patient';
                if (!grouped[name]) grouped[name] = [];
                grouped[name].push(r);
            });

            // Sort patient names alphabetically
            const sortedNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

            let html = '';
            sortedNames.forEach((patientName, idx) => {
                const reports = grouped[patientName];
                const initials = patientName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const isOpen = '';

                // Separate into SENT and REVIEWED
                const sentReports = reports.filter(r => !r.status || r.status === 'SENT');
                const reviewedReports = reports.filter(r => r.status === 'REVIEWED');

                // Build table rows helper
                function buildRows(reportList) {
                    return reportList.map((r, rIdx) => {
                        const confidence = Math.round(r.confidence || 0);
                        const sharedDate = r.shared_at ? new Date(r.shared_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                        return `
                            <tr>
                                <td style="font-family:monospace;color:#555;">R-${String(r.report_id || rIdx + 1).padStart(4, '0')}</td>
                                <td>${sharedDate}</td>
                                <td style="font-weight:500;color:var(--primary-color)">${r.disease || 'N/A'}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <div style="width:50px;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
                                            <div style="width:${confidence}%;height:100%;background:${confidence > 80 ? '#10b981' : '#f59e0b'}"></div>
                                        </div>
                                        <span style="font-size:0.8rem;">${confidence}%</span>
                                    </div>
                                </td>
                                <td>
                                    <button class="inv-action-btn" onclick="window.open('doctor-printable-report.html?report_id=${r.id}', '_blank')" style="width:auto;padding:4px 12px;border-radius:6px;border:1px solid var(--primary-color);color:var(--primary-color);font-size:0.8rem;cursor:pointer;background:transparent;">
                                        <i class="fas fa-external-link-alt" style="margin-right:4px;"></i>Open
                                    </button>
                                </td>
                            </tr>`;
                    }).join('');
                }

                function buildTable(rows) {
                    return `<table class="styled-table patient-reports-table">
                        <thead><tr>
                            <th>Report ID</th><th>Date</th><th>Diagnosis</th><th>Confidence</th><th>Action</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>`;
                }

                // Count summary for header
                const countParts = [];
                if (sentReports.length > 0) countParts.push(`${sentReports.length} new`);
                if (reviewedReports.length > 0) countParts.push(`${reviewedReports.length} reviewed`);
                const countText = countParts.join(' · ');

                // Build body sections
                let bodyHtml = '';
                if (sentReports.length > 0) {
                    bodyHtml += `
                        <div class="report-section-header report-section-sent">
                            <i class="fas fa-inbox"></i> New Reports
                            <span class="report-section-count">${sentReports.length}</span>
                        </div>
                        ${buildTable(buildRows(sentReports))}`;
                }
                if (reviewedReports.length > 0) {
                    bodyHtml += `
                        <div class="report-section-header report-section-reviewed">
                            <i class="fas fa-check-double"></i> Reviewed
                            <span class="report-section-count">${reviewedReports.length}</span>
                        </div>
                        ${buildTable(buildRows(reviewedReports))}`;
                }

                html += `
                    <div class="patient-report-group ${isOpen}" data-patient="${patientName.toLowerCase()}">
                        <div class="patient-group-header" onclick="toggleReportGroup(this)">
                            <div class="patient-group-info">
                                <div class="patient-group-avatar">${initials}</div>
                                <div>
                                    <span class="patient-group-name">${patientName}</span>
                                    <span class="patient-group-count">${countText}</span>
                                </div>
                            </div>
                            <i class="fas fa-chevron-down patient-group-arrow"></i>
                        </div>
                        <div class="patient-group-body">
                            ${bodyHtml}
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } else {
            container.innerHTML = '<div style="text-align:center;color:#888;padding:30px;">No shared reports yet.</div>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = '<div style="text-align:center;color:#ef4444;padding:30px;">Error loading reports.</div>';
    }

    // Wire up search filter
    const searchInput = document.getElementById('report-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.patient-report-group').forEach(group => {
                const name = group.getAttribute('data-patient');
                group.style.display = name.includes(query) ? '' : 'none';
            });
        });
    }
}

/** Toggle a patient report group open/closed */
function toggleReportGroup(header) {
    const group = header.closest('.patient-report-group');
    group.classList.toggle('open');
}

// ============================================
// PATIENTS — LIVE API
// ============================================
let allPatientsData = [];

async function loadPatients() {
    const tbody = document.getElementById('patients-tbody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/predict/doctor/patients`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            allPatientsData = result.data;
            let html = '';
            result.data.forEach(p => {
                html += `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.gender || 'N/A'}</td>
                        <td>${p.last_visit}</td>
                        <td>${p.condition}</td>
                        <td><a href="mailto:${p.email}" class="btn-text" style="color:#2b7da3;text-decoration:none;">${p.email}</a></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">No patients yet.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;">Error loading patients.</td></tr>';
    }

    // Wire up patient search filter
    const patientSearch = document.getElementById('patient-search');
    if (patientSearch && !patientSearch._listenerAttached) {
        patientSearch._listenerAttached = true;
        patientSearch.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            const rows = document.querySelectorAll('#patients-tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
}

// ============================================
// BILLING — FULL IMPLEMENTATION
// ============================================
let billingChartInstance = null;

async function loadBilling() {
    await loadBillingStats();
    await loadInvoices();
}

async function loadBillingStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/billing/stats/`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        console.log('[BILLING STATS] Response:', JSON.stringify(data));
        if (data.status === 'success') {
            const s = data.data;
            console.log('[BILLING STATS] paid:', s.paid_amount, 'pending:', s.pending_amount, 'overdue:', s.overdue_amount);
            document.getElementById('billing-paid').textContent = `₹${s.paid_amount.toFixed(2)}`;
            document.getElementById('billing-pending').textContent = `₹${s.pending_amount.toFixed(2)}`;
            document.getElementById('billing-overdue').textContent = `₹${s.overdue_amount.toFixed(2)}`;
            initBillingChart(s.chart.labels, s.chart.values);
        }
    } catch (err) {
        console.error('Failed to load billing stats:', err);
    }
}

function initBillingChart(labels, values) {
    const ctx = document.getElementById('billingRevenueChart');
    if (!ctx) return;
    if (billingChartInstance) billingChartInstance.destroy();

    billingChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: values,
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2,136,209,0.08)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0288d1',
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => `₹${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    min: 0,
                    suggestedMax: 1000,
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 12 },
                        callback: v => `₹${v}`
                    }
                }
            }
        }
    });
}

async function loadInvoices() {
    const tbody = document.getElementById('billing-tbody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/billing/invoices/`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:40px;color:#999;">
                            <div style="margin-bottom:12px;"><i class="fas fa-file-invoice-dollar" style="font-size:2rem;color:#d1d5db;"></i></div>
                            <p style="font-weight:600;color:#6b7280;">No invoices yet</p>
                            <p style="font-size:0.85rem;">Click "New Invoice" to create your first one.</p>
                        </td>
                    </tr>`;
                return;
            }
            tbody.innerHTML = data.data.map(inv => {
                const statusClass = inv.status === 'PAID' ? 'badge-paid' : inv.status === 'OVERDUE' ? 'badge-overdue' : 'badge-pending';
                const statusLabel = inv.status === 'PAID' ? 'Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Pending';
                return `
                <tr>
                    <td><strong>#${inv.invoice_number}</strong></td>
                    <td>${inv.patient_name}</td>
                    <td>${inv.service}</td>
                    <td><strong>₹${inv.amount.toFixed(2)}</strong></td>
                    <td>${inv.due_date}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td class="invoice-actions">
                        ${inv.status !== 'PAID' ? `<button class="inv-action-btn inv-btn-paid" title="Mark as Paid" onclick="updateInvoiceStatus(${inv.id},'PAID')"><i class="fas fa-check"></i></button>` : ''}
                        ${inv.status === 'PENDING' ? `<button class="inv-action-btn inv-btn-overdue" title="Mark as Overdue" onclick="updateInvoiceStatus(${inv.id},'OVERDUE')"><i class="fas fa-clock"></i></button>` : ''}
                        <button class="inv-action-btn inv-btn-delete" title="Delete Invoice" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (err) {
        console.error('Failed to load invoices:', err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Failed to load invoices</td></tr>';
    }
}

function openInvoiceModal() {
    document.getElementById('invoice-modal').style.display = 'flex';
    
    if (!window.invoiceAutocompleteSetup) {
        setupPatientAutocomplete();
        window.invoiceAutocompleteSetup = true;
    }
    // Default due date to 30 days from now
    const future = new Date();
    future.setDate(future.getDate() + 30);
    document.getElementById('invoice-due-date').value = future.toISOString().split('T')[0];
}
function closeInvoiceModal() {
    document.getElementById('invoice-modal').style.display = 'none';
}

function setupPatientAutocomplete() {
    const input = document.getElementById('invoice-patient-name');
    const dropdown = document.getElementById('patient-suggestions');
    const emailInput = document.getElementById('invoice-patient-email');

    if (!input || !dropdown) return;

    input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        dropdown.innerHTML = '';
        
        if (query.length < 1) {
            dropdown.style.display = 'none';
            if (this.value === '') emailInput.value = '';
            return;
        }

        const matches = allPatientsData.filter(p => p.name.toLowerCase().includes(query));

        if (matches.length > 0) {
            matches.forEach(patient => {
                const item = document.createElement('div');
                item.className = 'patient-suggestion-item';
                item.innerHTML = `<i class="fas fa-user" style="color:#94a3b8;margin-right:8px;"></i> <strong>${patient.name}</strong> <span style="font-size:0.8rem;color:#64748b;margin-left:6px;">(${patient.email})</span>`;
                item.addEventListener('click', () => {
                    input.value = patient.name;
                    emailInput.value = patient.email;
                    dropdown.style.display = 'none';
                });
                dropdown.appendChild(item);
            });
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

async function createInvoice() {
    const patientName = document.getElementById('invoice-patient-name').value.trim();
    const patientEmail = document.getElementById('invoice-patient-email').value.trim();
    const service = document.getElementById('invoice-service').value;
    const amount = document.getElementById('invoice-amount').value;
    const dueDate = document.getElementById('invoice-due-date').value;
    const notes = document.getElementById('invoice-notes').value.trim();

    if (!patientName || !amount || !dueDate) {
        showToast('Please fill in Patient Name, Amount and Due Date', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/billing/invoices/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patient_name: patientName, patient_email: patientEmail, service, amount, due_date: dueDate, notes })
        });
        const data = await response.json();
        if (data.status === 'success') {
            showToast('Invoice created successfully!', 'success');
            closeInvoiceModal();
            // Clear fields
            document.getElementById('invoice-patient-name').value = '';
            document.getElementById('invoice-patient-email').value = '';
            document.getElementById('invoice-amount').value = '';
            document.getElementById('invoice-notes').value = '';
            // Refresh data
            loadBilling();
        } else {
            showToast(data.message || 'Failed to create invoice', 'error');
        }
    } catch (err) {
        console.error('Invoice Creation Error:', err);
        showToast('Network error creating invoice. See console.', 'error');
    }
}

async function updateInvoiceStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/billing/invoices/${id}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();
        if (data.status === 'success') {
            showToast(`Invoice marked as ${newStatus}`, 'success');
            loadBilling();
        }
    } catch (err) {
        showToast('Failed to update invoice', 'error');
    }
}

async function deleteInvoice(id) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/billing/invoices/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            showToast('Invoice deleted', 'success');
            loadBilling();
        }
    } catch (err) {
        showToast('Failed to delete invoice', 'error');
    }
}

// Close modal on overlay click
window.addEventListener('click', function(event) {
    if (event.target.id === 'invoice-modal') {
        closeInvoiceModal();
    }
});

// ============================================
// CHART — DYNAMIC DATA
// ============================================
function initChart(labels, data) {
    const ctx = document.getElementById('appointmentsChart');
    if (!ctx) return;

    // Fallback if no data provided
    const chartLabels = labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const chartData = data || [0, 0, 0, 0, 0, 0, 0];

    // Destroy previous chart if exists
    if (appointmentChart) {
        appointmentChart.destroy();
    }

    appointmentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Appointments',
                data: chartData,
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2, 136, 209, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ============================================
// LOGOUT
// ============================================
function setupLogout() {
    const logoutBtn = document.getElementById('doctor-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('jwt_token');
            sessionStorage.removeItem('user_data');

            // User-specific localStorage (profile, scans, notifications)
            localStorage.removeItem('skinscan_user_profile');
            localStorage.removeItem('skinscan_dr_notifications');
            localStorage.removeItem('latest_scan_result');
            localStorage.removeItem('latest_scan_image');
            localStorage.removeItem('latest_scan_location');
            localStorage.removeItem('skinscan_notifications');
            localStorage.removeItem('needs_autosave');
            localStorage.removeItem('selected_model');

            window.location.href = 'dashboard.html';
        });
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.dr-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'dr-toast';
    const colors = {
        'success': '#10b981',
        'error': '#ef4444',
        'info': '#0288d1'
    };
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        padding: 14px 24px; border-radius: 12px;
        background: ${colors[type] || colors.info}; color: white;
        font-weight: 500; font-size: 0.9rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function getNotifications() {
    try { return JSON.parse(localStorage.getItem('skinscan_dr_notifications') || '[]'); }
    catch { return []; }
}

function saveNotifications(notifs) {
    localStorage.setItem('skinscan_dr_notifications', JSON.stringify(notifs));
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
    setInterval(fetchNotifications, 30000);
}

function renderNotifications() {
    const list = document.getElementById('dr-notif-list');
    const badge = document.querySelector('.notif-btn .badge');
    const notifs = getNotifications();

    if (!list) return;

    const unread = notifs.filter(n => !n.read).length;

    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (notifs.length === 0) {
        list.innerHTML = '<div class="notif-empty">No notifications</div>';
        return;
    }

    list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="markNotifRead(${n.id})">
            <div class="notif-content">
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <small>${new Date(n.created_at).toLocaleTimeString()}</small>
            </div>
        </div>
    `).join('');
}

window.markNotifRead = async (id) => {
    try {
        await fetch(`${API_BASE_URL}/auth/notifications/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        fetchNotifications();
    } catch (e) { console.error(e); }
};

function initNotificationUI() {
    const btn = document.querySelector('.notif-btn');
    if (!btn) return;

    let dropdown = document.getElementById('dr-notif-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'dr-notif-dropdown';
        dropdown.className = 'notif-dropdown';
        dropdown.innerHTML = `
            <div class="notif-header">
                <h3>Notifications</h3>
                <button onclick="markAllNotifsRead()">Mark all as read</button>
            </div>
            <div id="dr-notif-list"></div>
        `;
        btn.parentNode.appendChild(dropdown);
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
}

// ============================================
// DOCTOR PROFILE MODAL
// ============================================
const profileModal = document.getElementById('doctor-profile-modal');
const sidebarProfileBtn = document.getElementById('sidebar-profile-btn');

if (sidebarProfileBtn) {
    sidebarProfileBtn.addEventListener('click', openDrProfileModal);
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        closeDrProfileModal();
    }
});

async function openDrProfileModal() {
    if (!profileModal) return;

    // Reset Edit Mode
    const content = document.querySelector('.dr-profile-modal-content');
    if (content) content.classList.remove('editing');

    // Show loading state potentially
    document.getElementById('dr-modal-name').textContent = 'Loading...';
    profileModal.style.display = 'flex';

    try {
        const response = await fetch(`${API_BASE_URL}/predict/doctor-status`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const result = await response.json();

        if (result.status === 'success' && result.data.is_doctor) {
            const d = result.data;

            // Header
            document.getElementById('dr-modal-name').textContent = d.name;
            const badge = document.getElementById('dr-modal-badge');
            if (d.is_verified) {
                badge.className = 'dr-profile-badge';
                badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
            } else {
                badge.className = 'dr-profile-badge unverified';
                badge.innerHTML = '<i class="fas fa-clock"></i> Pending';
            }

            let avatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=0288d1&color=fff&size=128`;
            if (d.avatar_url) avatarSrc = d.avatar_url;
            document.getElementById('dr-modal-avatar').src = avatarSrc;
            
            // Sidebar avatar sync
            const mainAvatar = document.getElementById('sidebar-avatar');
            if (mainAvatar) mainAvatar.src = avatarSrc;

            // Reset temp avatar state
            window.tempAvatarBase64 = null;

            // Personal - View
            document.getElementById('dr-modal-email').textContent = d.email;
            document.getElementById('dr-modal-phone').textContent = d.phone || 'Not set';
            document.getElementById('dr-modal-gender').textContent = d.gender || 'Not set';
            document.getElementById('dr-modal-joined').textContent = d.applied_on;

            // Personal - Edit
            document.getElementById('edit-phone').value = d.phone || '';
            document.getElementById('edit-gender').value = d.gender || '';

            // Bio
            document.getElementById('dr-modal-bio').textContent = d.bio || 'No biography added yet.';
            document.getElementById('edit-bio').value = d.bio || '';

            // Professional - View
            document.getElementById('dr-modal-spec').textContent = d.specialization;
            document.getElementById('dr-modal-mrn').textContent = d.mrn;
            document.getElementById('dr-modal-exp').textContent = d.years_of_experience ? `${d.years_of_experience} Years` : 'Not set';
            document.getElementById('dr-modal-hospital').textContent = d.hospital_affiliation || 'Not set';
            document.getElementById('dr-modal-fee').textContent = d.consultation_fee ? `$${d.consultation_fee}` : 'Not set';
            document.getElementById('dr-modal-verified-on').textContent = d.verified_on || 'Pending';

            // Professional - Edit
            document.getElementById('edit-specialization').value = d.specialization || '';
            document.getElementById('edit-exp').value = d.years_of_experience || '';
            document.getElementById('edit-hospital').value = d.hospital_affiliation || '';
            document.getElementById('edit-fee').value = d.consultation_fee || '';

            // Availability
            const daysContainer = document.getElementById('dr-modal-days');
            if (d.available_days && d.available_days.length > 0) {
                daysContainer.innerHTML = d.available_days.map(day => `<span class="day-chip">${day}</span>`).join('');
                // Populate Checkboxes
                d.available_days.forEach(day => {
                    const cb = document.querySelector(`.availability-selector input[value="${day}"]`);
                    if (cb) cb.checked = true;
                });
            } else {
                daysContainer.innerHTML = '<span class="day-chip inactive">No availability set</span>';
                // Reset Checkboxes
                document.querySelectorAll('.availability-selector input').forEach(cb => cb.checked = false);
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile details', 'error');
    }
}

window.toggleEditMode = function () {
    const content = document.querySelector('.dr-profile-modal-content');
    if (content) {
        content.classList.toggle('editing');
    }
}

window.saveDrProfile = async function () {
    const btn = document.querySelector('.dr-profile-modal-content .btn-save');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const data = {
        phone: document.getElementById('edit-phone').value,
        gender: document.getElementById('edit-gender').value,
        bio: document.getElementById('edit-bio').value,
        specialization: document.getElementById('edit-specialization').value,
        years_of_experience: document.getElementById('edit-exp').value,
        hospital_affiliation: document.getElementById('edit-hospital').value,
        consultation_fee: document.getElementById('edit-fee').value,
        available_days: Array.from(document.querySelectorAll('.availability-selector input:checked')).map(cb => cb.value),
        avatarBase64: window.tempAvatarBase64 || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/predict/doctor-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showToast('Profile updated successfully!', 'success');
            toggleEditMode();
            openDrProfileModal(); // Reload data
        } else {
            showToast(result.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Network error while saving', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.closeDrProfileModal = function () {
    if (profileModal) {
        profileModal.style.display = 'none';
        // Reset mode on close
        const content = document.querySelector('.dr-profile-modal-content');
        if (content) content.classList.remove('editing');
    }
}

window.handleAvatarSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('dr-modal-avatar').src = e.target.result;
            window.tempAvatarBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

