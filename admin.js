// ============================================
// SkinScan AI - Admin Dashboard JavaScript
// ============================================

const API_BASE_URL = 'http://localhost:8000/api';

// Admin authentication check
function checkAdminAuth() {
    const token = sessionStorage.getItem('jwt_token');
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');

    if (!token || !userData.is_admin) {
        window.location.href = 'admin-login.html';
        return null;
    }
    return token;
}

const authToken = checkAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) return;

    // Initialize UI
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    document.getElementById('admin-avatar-img').src = `https://ui-avatars.com/api/?name=${userData.first_name}+${userData.last_name}&background=0288d1&color=fff`;

    // Theme initialization
    initTheme();
    initSidebarToggle();

    // Core Functions
    initTabs();
    loadDashboardStats(); // New Dashboard
    loadUsers();
    loadModels();
    loadReports();
    initModelActions();

    // Logout
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('jwt_token');
        sessionStorage.removeItem('user_data');
        window.location.href = 'dashboard.html';
    });
});

function initTheme() {
    const themeSwitch = document.getElementById('theme-switch');
    const body = document.body;
    const html = document.documentElement;

    // Check saved - Default to LIGHT (Unified Key)
    const currentMode = localStorage.getItem('skinscan_mode') || 'light';

    // Helper to apply mode
    const applyMode = (mode) => {
        localStorage.setItem('skinscan_mode', mode);
        html.setAttribute('data-mode', mode);

        if (mode === 'dark') {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            if (themeSwitch) themeSwitch.checked = true;
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            if (themeSwitch) themeSwitch.checked = false;
        }
    };

    // Apply Initial
    applyMode(currentMode);

    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            if (themeSwitch.checked) {
                applyMode('dark');
            } else {
                applyMode('light');
            }
        });
    }
}

// Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll('.sidebar-nav li[data-tab]');
    const contents = document.querySelectorAll('.tab-content');
    const title = document.getElementById('tab-title');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Remove active from all tabs in all sections
            document.querySelectorAll('.sidebar-nav li').forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // Update Title
            title.textContent = tab.querySelector('span').textContent;
        });
    });
}

// Dashboard Logic
async function loadDashboardStats() {
    // We can reuse lists to get counts for now
    try {
        const [usersRes, reportsRes, modelsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/users/`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE_URL}/admin/reports/`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE_URL}/admin/models/`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const usersData = await usersRes.json();
        const reportsData = await reportsRes.json();
        const modelsData = await modelsRes.json();

        if (usersData.status === 'success') {
            document.getElementById('dash-total-users').textContent = usersData.data.length.toLocaleString();
        }
        if (reportsData.status === 'success') {
            document.getElementById('dash-total-reports').textContent = reportsData.data.length.toLocaleString();
            initScansChart(reportsData.data); // New AI Scans Line Chart
        }
        if (modelsData.status === 'success') {
            document.getElementById('dash-active-model').textContent = modelsData.data.global_default.replace('.pth', '');
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Chart.js Initialization

let scansChartInstance = null;
function initScansChart(reports) {
    const canvas = document.getElementById('scansChart');
    if (!canvas) return;

    const filters = document.getElementById('scan-filters');
    const filterBtns = filters.querySelectorAll('.filter-pill');

    const updateChart = (range) => {
        const data = processReportsByRange(reports, range);

        if (scansChartInstance) {
            scansChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(2, 136, 209, 0.2)');
        gradient.addColorStop(1, 'rgba(2, 136, 209, 0)');

        scansChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'AI Scans',
                    data: data.counts,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#0288d1',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0288d1',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 116, 139, 0.05)', drawBorder: false },
                        ticks: { color: '#64748b', stepSize: 1 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    };

    // Filter event listeners
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart(btn.dataset.range);
        });
    });

    // Initial render
    updateChart('daily');
}

function processReportsByRange(reports, range) {
    const now = new Date();
    let labels = [];
    let counts = [];

    if (range === 'daily') {
        // Last 14 days
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const count = reports.filter(r => {
                const rDate = new Date(r.created_at);
                return rDate.toDateString() === d.toDateString();
            }).length;
            counts.push(count);
        }
    } else if (range === 'weekly') {
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
            const end = new Date();
            end.setDate(now.getDate() - (i * 7));
            const start = new Date();
            start.setDate(end.getDate() - 6);

            labels.push(`${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

            const count = reports.filter(r => {
                const rDate = new Date(r.created_at);
                return rDate >= start && rDate <= end;
            }).length;
            counts.push(count);
        }
    } else if (range === 'monthly') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(now.getMonth() - i);
            labels.push(d.toLocaleDateString('en-US', { month: 'short' }));

            const count = reports.filter(r => {
                const rDate = new Date(r.created_at);
                return rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
            }).length;
            counts.push(count);
        }
    }

    return { labels, counts };
}

// User Management
let allUsers = [];

function renderUsers(usersToRender) {
    const list = document.getElementById('users-list');
    list.innerHTML = usersToRender.map((user, index) => `
        <tr>
            <td>
                <div class="user-info-cell">
                    <div class="avatar-small">${index + 1}</div>
                    <div>
                        <strong>${user.email}</strong>
                        <span class="sub-text" style="color:var(--text-dim);font-size:0.8rem">${user.first_name || ''} ${user.last_name || ''}</span>
                    </div>
                </div>
            </td>
            <td><span class="status-badge ${user.account_status.toLowerCase()}-badge">${user.account_status}</span></td>
            <td>${user.assigned_model || '<span class="text-muted">Global Default</span>'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn" onclick="openEditUser(${user.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (data.status === 'success') {
            allUsers = data.data;
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Search functionality
document.getElementById('user-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user =>
        user.email.toLowerCase().includes(searchTerm) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchTerm))
    );
    renderUsers(filtered);
});

// Model Moderation
async function loadModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/models/`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (data.status === 'success') {
            const models = data.data.available_models;
            const globalDefault = data.data.global_default;

            const container = document.getElementById('global-models');
            container.innerHTML = models.map(model => `
                <div class="model-option glass-morphism">
                    <input type="radio" name="global-model" value="${model.name}" id="m-${model.name}" ${model.name === globalDefault ? 'checked' : ''}>
                    <label for="m-${model.name}">
                        <div class="model-card-info">
                            <strong>${model.name.replace('.pth', '')}</strong>
                            <span class="sub-text">${model.size} | ${model.last_modified}</span>
                        </div>
                    </label>
                    <button class="model-delete-btn" onclick="deleteModel('${model.name}')" title="Delete Model">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `).join('');

            // Populate user edit select
            const userSelect = document.getElementById('user-model-assign');
            userSelect.innerHTML = `
                <option value="">Default (Global)</option>
                ${models.map(m => `<option value="${m.name}">${m.name.replace('.pth', '')}</option>`).join('')}
            `;

            // Draw out Active Model Info
            const activeModel = models.find(m => m.name === globalDefault) || models[0];
            if (activeModel) {
                document.getElementById('active-model-details').innerHTML = `
                    <div class="model-detail-row">
                        <span>Model for Production:</span> <strong>${activeModel.name}</strong>
                    </div>
                    <div class="model-detail-row">
                        <span>Uploaded On:</span> <strong>${activeModel.last_modified}</strong>
                    </div>
                    <div class="model-detail-row">
                        <span>Architecture Specs:</span> <strong>${activeModel.architecture || 'ConvNeXt Small'}</strong>
                    </div>
                    <div class="model-detail-row">
                        <span>Production Status:</span> <span class="status-badge active-badge">Production Ready</span>
                    </div>
                `;

                // Draw out Model Classes
                const classesContainer = document.getElementById('model-classes-section');
                const classesList = document.getElementById('model-classes-list');

                if (data.data.disease_classes && data.data.disease_classes.length > 0) {
                    if (classesContainer && classesList) {
                        classesContainer.style.display = 'block';
                        classesList.innerHTML = data.data.disease_classes.map(cls => `
                            <span class="class-tag">${cls}</span>
                        `).join('');
                    }
                } else if (classesContainer) {
                    classesContainer.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading models:', error);
        document.getElementById('active-model-details').innerHTML = `<p class="error-text">Failed to load model information. Please check if the server is running.</p>`;
    }
}

function deleteModel(modelName) {
    if (!confirm(`Are you sure you want to delete "${modelName}"? This action cannot be undone.`)) {
        return;
    }

    fetch(`${API_BASE_URL}/admin/models/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model_name: modelName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Model deleted successfully');
                loadModels();
            } else {
                alert(data.error || 'Failed to delete model');
            }
        })
        .catch(error => {
            console.error('Error deleting model:', error);
            alert('An error occurred while deleting the model');
        });
}

function initModelActions() {
    const uploadForm = document.getElementById('upload-model-form');
    const fileInput = document.getElementById('model-file-input');
    const fileNameDisplay = document.getElementById('model-file-name');
    const saveGlobalBtn = document.getElementById('save-global-model');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileNameDisplay.textContent = file.name;
                fileNameDisplay.style.color = 'var(--accent-blue)';
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = fileInput.files[0];
            if (!file) {
                alert('Please select a .pth file');
                return;
            }

            const btn = document.getElementById('btn-upload-model');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('model_file', file);

            try {
                const response = await fetch(`${API_BASE_URL}/admin/models/upload/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: formData
                });

                const data = await response.json();
                if (data.status === 'success') {
                    alert('Model uploaded successfully');
                    fileInput.value = '';
                    fileNameDisplay.textContent = 'Click to select .pth file';
                    fileNameDisplay.style.color = '';
                    loadModels();
                } else {
                    alert(data.error || 'Upload failed');
                }
            } catch (error) {
                alert('Network error during upload');
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        });
    }

    if (saveGlobalBtn) {
        saveGlobalBtn.addEventListener('click', async () => {
            const selected = document.querySelector('input[name="global-model"]:checked');
            if (!selected) return;

            saveGlobalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            saveGlobalBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/admin/models/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model_name: selected.value })
                });

                const data = await response.json();
                if (data.status === 'success') {
                    alert('Global default model updated');
                    loadModels();
                    loadDashboardStats();
                } else {
                    alert(data.error || 'Failed to update global model');
                }
            } catch (error) {
                alert('Network error');
            } finally {
                saveGlobalBtn.innerHTML = 'Update Global Model';
                saveGlobalBtn.disabled = false;
            }
        });
    }
}

// Reports/Data Management
async function loadReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/reports/`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (data.status === 'success') {
            const container = document.getElementById('reports-grouped-container');

            if (!data.data || data.data.length === 0) {
                container.innerHTML = '<div class="empty-state">No diagnostic reports found.</div>';
                return;
            }

            // Group by user email
            const grouped = data.data.reduce((acc, report) => {
                const user = report.user || 'Unknown User';
                if (!acc[user]) acc[user] = [];
                acc[user].push(report);
                return acc;
            }, {});

            container.innerHTML = Object.keys(grouped).map((email, index) => {
                const reports = grouped[email];
                const displayNum = index + 1;

                return `
                    <div class="report-group glass-morphism">
                        <div class="group-header" onclick="this.parentElement.classList.toggle('active')">
                            <div class="user-info">
                                <div class="user-avatar">${displayNum}</div>
                                <span class="user-email">${email}</span>
                            </div>
                            <div class="report-meta">
                                <span class="report-count">${reports.length} Reports</span>
                                <i class="fas fa-chevron-down chevron-icon"></i>
                            </div>
                        </div>
                        <div class="group-content">
                            <table class="nested-reports-table">
                                <thead>
                                    <tr>
                                        <th>Disease</th>
                                        <th>Confidence</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reports.map(r => `
                                        <tr>
                                            <td><span class="disease-tag">${r.disease}</span></td>
                                            <td>${r.confidence}%</td>
                                            <td>${new Date(r.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button class="action-btn delete" onclick="event.stopPropagation(); deleteReport(${r.id})" title="Delete Report">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('reports-grouped-container').innerHTML = '<div class="empty-state error">Failed to load reports. Please try again later.</div>';
    }
}

// Actions
window.deleteReport = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/reports/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            loadReports();
            loadDashboardStats();
            alert('Report deleted successfully');
        }
    } catch (error) {
        alert('Error deleting report');
    }
};

window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This is irreversible.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            loadUsers();
            loadDashboardStats();
            alert('User deleted successfully');
        }
    } catch (error) {
        alert('Error deleting user');
    }
};

// Modal Logic
const modal = document.getElementById('user-edit-modal');
const closeBtn = document.querySelector('.close-modal');
let currentEditingUserId = null;

window.openEditUser = async (id) => {
    currentEditingUserId = id;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            const user = data.data;
            document.getElementById('modal-user-name').textContent = `Edit User: ${user.email}`;
            document.getElementById('user-model-assign').value = user.assigned_model || '';
            document.getElementById('user-status-assign').value = user.account_status;
            document.getElementById('user-admin-toggle').checked = user.is_admin;
            modal.style.display = 'flex';
        }
    } catch (error) {
        alert('Error fetching user details');
    }
};

closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        assigned_model: document.getElementById('user-model-assign').value || null,
        account_status: document.getElementById('user-status-assign').value,
        is_admin: document.getElementById('user-admin-toggle').checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${currentEditingUserId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            modal.style.display = 'none';
            loadUsers();
            alert('User updated successfully');
        }
    } catch (error) {
        alert('Error updating user');
    }
});

function initSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    if (!toggleBtn) return;

    // Check saved state
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar_collapsed', collapsed);
    });
}

