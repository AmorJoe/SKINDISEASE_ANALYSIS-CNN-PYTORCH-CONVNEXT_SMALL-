const API_BASE_URL = 'http://localhost:8000/api';
function getAuthToken() { return sessionStorage.getItem('jwt_token'); }
function isAuthenticated() { return !!getAuthToken(); }

document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
    initNotificationUI();
    startNotificationPolling();
});

function initDashboard() {
    updateDate();
    setupTabSwitching();
    setupMobileSidebar();

    // Load Initial Data (Mock)
    loadStats();
    loadUrgentRequests();
    loadAppointments('requests'); // Default view
    loadReports();
    loadBilling();
    loadPatients();

    // Initial Chart
    initChart();
}

function updateDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = now.toLocaleDateString('en-US', options);
    }
}

// --- TAB SWITCHING ---
function setupTabSwitching() {
    const navItems = document.querySelectorAll('.sidebar-nav li[data-tab]');

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update Sidebar
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    const activeNav = document.querySelector(`.sidebar-nav li[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update Content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) activeContent.classList.add('active');

    // Update Page Title
    const titleMap = {
        'dashboard': 'Dashboard',
        'appointments': 'Appointments',
        'patients': 'Patient Records',
        'reports': 'Medical Reports',
        'billing': 'Billing & Invoices'
    };
    document.getElementById('page-title').innerText = titleMap[tabId] || 'Dashboard';
}

function setupMobileSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
}

// --- MOCK DATA LOADING ---

function loadStats() {
    // These would typically come from an API
    document.getElementById('dash-today-count').innerText = "8";
    document.getElementById('dash-request-count').innerText = "5";
    document.getElementById('dash-patient-count').innerText = "142";
    document.getElementById('dash-revenue').innerText = "$450";
}

function loadUrgentRequests() {
    const list = document.getElementById('dash-urgent-list');
    const urgentData = [
        { name: "Sarah Connor", time: "10:00 AM", issue: "Severe Rash", avatar: "SC" },
        { name: "John Doe", time: "11:30 AM", issue: "Dark Spot Check", avatar: "JD" }
    ];

    let html = '';
    urgentData.forEach(item => {
        html += `
        <div class="list-item-row">
            <div class="patient-mini">
                <div class="patient-nav-avatar" style="display:flex;align-items:center;justify-content:center;font-size:0.8rem;background:#fee;">${item.avatar}</div>
                <div class="patient-details">
                    <h4>${item.name}</h4>
                    <p>${item.issue}</p>
                </div>
            </div>
            <div class="time-tag">
                <span class="status-tag urgent">${item.time}</span>
            </div>
            <button class="btn-text" onclick="switchTab('appointments')">Review</button>
        </div>`;
    });

    if (list) list.innerHTML = html;
}

// Appointment Data Store
const appointmentsDB = {
    'requests': [
        { id: 101, name: "Alice Springs", date: "Feb 15, 2026", time: "09:00 AM", type: "First Visit", status: "Pending" },
        { id: 102, name: "Bob Martin", date: "Feb 15, 2026", time: "10:30 AM", type: "Follow-up", status: "Pending" },
        { id: 103, name: "Charlie Day", date: "Feb 16, 2026", time: "02:00 PM", type: "Routine Check", status: "Pending" },
        { id: 104, name: "Diana Prince", date: "Feb 16, 2026", time: "04:15 PM", type: "Skin Scan Review", status: "Pending" },
        { id: 105, name: "Evan Wright", date: "Feb 17, 2026", time: "11:00 AM", type: "Consultation", status: "Pending" }
    ],
    'today': [
        { id: 201, name: "Frank Castle", date: "Today", time: "08:30 AM", type: "Urgent", status: "Concluded" },
        { id: 202, name: "Gwen Stacy", date: "Today", time: "09:15 AM", type: "Routine", status: "Confirmed" },
        { id: 203, name: "Harry Potter", date: "Today", time: "11:00 AM", type: "Follow-up", status: "Confirmed" },
        { id: 204, name: "Ian Holm", date: "Today", time: "01:30 PM", type: "New Patient", status: "Confirmed" },
        { id: 205, name: "Jack Black", date: "Today", time: "03:00 PM", type: "General", status: "Confirmed" }
    ],
    'upcoming': [
        { id: 301, name: "Kelly Clarkson", date: "Feb 20, 2026", time: "10:00 AM", type: "Routine", status: "Confirmed" },
        { id: 302, name: "Liam Neeson", date: "Feb 21, 2026", time: "11:00 AM", type: "Follow-up", status: "Confirmed" },
        { id: 303, name: "Mike Tyson", date: "Feb 22, 2026", time: "09:30 AM", type: "First Visit", status: "Confirmed" }
    ]
};

function filterAppointments(type) {
    // Update active sub-tab
    document.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.sub-tab').classList.add('active');

    loadAppointments(type);
}

function loadAppointments(type) {
    const tbody = document.getElementById('appointments-tbody');
    const data = appointmentsDB[type] || [];

    let html = '';

    if (data.length === 0) {
        html = '<tr><td colspan="5" style="text-align:center;color:#888;">No appointments found.</td></tr>';
    } else {
        data.forEach(appt => {
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
                    </div>
                `;
            }

            let statusClass = 'pending';
            if (appt.status === 'Confirmed') statusClass = 'confirmed';
            if (appt.status === 'Concluded') statusClass = 'confirmed'; // Re-use green for concluded for now

            html += `
                <tr>
                    <td>
                        <div class="patient-mini">
                            <div class="patient-nav-avatar" style="display:flex;align-items:center;justify-content:center;font-size:0.8rem;">${appt.name.charAt(0)}</div>
                            <span style="font-weight:500;">${appt.name}</span>
                        </div>
                    </td>
                    <td>${appt.date} <br> <span style="font-size:0.8rem;color:#777;">${appt.time}</span></td>
                    <td>${appt.type}</td>
                    <td><span class="status-tag ${statusClass}">${appt.status}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        });
    }

    if (tbody) tbody.innerHTML = html;
}

function approveAppt(id) {
    // For demo purposes, just remove from list and alert
    alert(`Appointment #${id} Approved!`);
    // In real app, we'd move it to 'Upcoming' in DB
    const btn = event.target.closest('button');
    if (btn) btn.closest('tr').style.opacity = '0.5';
}

function rejectAppt(id) {
    if (confirm('Are you sure you want to reject this request?')) {
        const btn = event.target.closest('button');
        if (btn) btn.closest('tr').remove();
    }
}

// --- REPORTS ---
function loadReports() {
    const tbody = document.getElementById('reports-tbody');
    const reports = [
        { id: "R-2023001", name: "Alice Springs", date: "Feb 10, 2026", diagnosis: "Melanoma (Low Risk)", confidence: 85 },
        { id: "R-2023002", name: "Bob Martin", date: "Feb 12, 2026", diagnosis: "Benign Keratosis", confidence: 92 },
        { id: "R-2023003", name: "Frank Castle", date: "Feb 14, 2026", diagnosis: "Basal Cell Carcinoma", confidence: 78 },
        { id: "R-2023004", name: "Jack Black", date: "Feb 14, 2026", diagnosis: "Eczema", confidence: 95 },
    ];

    let html = '';
    reports.forEach(r => {
        html += `
            <tr>
                <td style="font-family:monospace;color:#555;">${r.id}</td>
                <td>${r.name}</td>
                <td>${r.date}</td>
                <td style="font-weight:500;color:var(--primary-color)">${r.diagnosis}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="width:50px;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
                            <div style="width:${r.confidence}%;height:100%;background:${r.confidence > 80 ? '#10b981' : '#f59e0b'}"></div>
                        </div>
                        <span style="font-size:0.8rem;">${r.confidence}%</span>
                    </div>
                </td>
                <td>
                   <button class="icon-btn btn-view" title="Download PDF"><i class="fas fa-file-download"></i></button>
                </td>
            </tr>
        `;
    });

    if (tbody) tbody.innerHTML = html;
}

// --- BILLING / INVOICES ---
function loadBilling() {
    const tbody = document.getElementById('billing-tbody');
    const invoices = [
        { id: "INV-9001", name: "Alice Springs", date: "Feb 15, 2026", amount: 150, status: "Paid" },
        { id: "INV-9002", name: "Bob Martin", date: "Feb 14, 2026", amount: 120, status: "Pending" },
        { id: "INV-9003", name: "Frank Castle", date: "Feb 10, 2026", amount: 200, status: "Overdue" }
    ];

    let html = '';
    invoices.forEach(inv => {
        let statusColor = '#777';
        if (inv.status === 'Paid') statusColor = '#10b981';
        if (inv.status === 'Pending') statusColor = '#f59e0b';
        if (inv.status === 'Overdue') statusColor = '#ef4444';

        html += `
             <tr>
                <td style="font-family:monospace;">${inv.id}</td>
                <td>${inv.name}</td>
                <td>${inv.date}</td>
                <td style="font-weight:600;">$${inv.amount}</td>
                <td><span style="color:${statusColor};font-weight:500;">${inv.status}</span></td>
                <td>
                   <button class="icon-btn btn-view" title="Resend"><i class="fas fa-paper-plane"></i></button>
                </td>
            </tr>
        `;
    });
    if (tbody) tbody.innerHTML = html;
}

// --- PATIENTS POPULATE ---
function loadPatients() {
    const tbody = document.getElementById('patients-tbody');
    // Just reusing names for demo
    const people = [
        { name: "Alice Springs", age: 34, gender: "F", last: "Feb 15", cond: "User" },
        { name: "Bob Martin", age: 45, gender: "M", last: "Feb 12", cond: "User" },
        { name: "Charlie Day", age: 29, gender: "M", last: "Jan 30", cond: "User" }
    ];

    let html = '';
    people.forEach(p => {
        html += `
            <tr>
                <td>${p.name}</td>
                <td>${p.age} / ${p.gender}</td>
                <td>${p.last}</td>
                <td>${p.cond}</td>
                <td><button class="btn-text">Email</button></td>
                <td><button class="icon-btn btn-view"><i class="fas fa-user-edit"></i></button></td>
            </tr>
          `;
    });
    if (tbody) tbody.innerHTML = html;
}

// --- MODALS ---
function openInvoiceModal() {
    document.getElementById('invoice-modal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

document.getElementById('create-invoice-form').addEventListener('submit', function (e) {
    e.preventDefault();
    alert("Invoice Sent Successfully!");
    closeModal('invoice-modal');
});

// --- CHARTS ---
function initChart() {
    const ctx = document.getElementById('appointmentsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Appointments',
                data: [4, 6, 8, 5, 9, 3, 2],
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2, 136, 209, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { display: false }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem('skinscan_dr_notifications') || '[]');
    } catch { return []; }
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

    // Create dropdown if it doesn't exist
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

window.markAllNotifsRead = async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/notifications`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        fetchNotifications();
    } catch (e) { console.error(e); }
};
