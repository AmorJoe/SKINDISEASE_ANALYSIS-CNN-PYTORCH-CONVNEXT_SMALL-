/**
 * nav-loader.js
 * Shared navigation bar component for the SkinScan AI user portal.
 * Source of truth: index.html navigation bar.
 *
 * Usage: Add these two lines in every user-portal HTML page:
 *   <div id="nav-placeholder"></div>
 *   <script src="nav-loader.js"></script>   (before script.js)
 */

(function () {
    // Determine current page for active-state highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Helper: returns 'active' if the link matches the current page
    function isActive(page) {
        return currentPage === page ? 'active' : '';
    }

    // Build the nav HTML (canonical source: index.html)
    const navHTML = `
    <nav class="auth-protected">
        <div class="logo">
            <a href="index.html" style="text-decoration: none; color: inherit;">
                <i class="fas fa-dna"></i> SkinScan AI
            </a>
        </div>
        <ul>
            <li><a href="index.html#home" class="${isActive('index.html')}" title="Home"><i class="fas fa-home"></i></a></li>
            <li><a href="index.html#upload" title="Analyze"><i class="fas fa-stethoscope"></i></a></li>

            <!-- Theme Toggle -->
            <!-- Notification Bell -->
            <li style="position: relative;">
                <button id="notification-btn" title="Notifications">
                    <i class="fas fa-bell"></i>
                    <span id="notification-badge" class="notif-count-badge"></span>
                </button>
                <!-- Notification Dropdown -->
                <div class="notification-dropdown" id="notification-dropdown">
                    <div class="notif-header">
                        <span>Notifications</span>
                        <button class="notif-clear-btn" onclick="clearAllNotifications()">Clear All</button>
                    </div>
                    <div class="notif-list" id="notif-list">
                        <div class="notif-empty">No notifications</div>
                    </div>
                </div>
            </li>
            <!-- Avatar Dropdown -->
            <li class="user-menu">
                <img src="https://ui-avatars.com/api/?name=User&background=0288d1&color=fff" alt="Profile"
                    class="avatar" id="nav-avatar">
                <div class="dropdown-content" id="nav-dropdown">
                    <!-- Profile and Change Password were likely modals before -->
                    <a href="#" id="nav-profile-link"><i class="fas fa-user-circle"></i> Profile</a>
                    <!-- === ANALYSIS DROPDOWN START === -->
                    <a href="#" id="nav-analysis-toggle" class="has-submenu ${isActive('report.html') || isActive('body-map.html') || isActive('disease-info.html') || isActive('doctor-appointment.html') ? 'active' : ''}">
                        <i class="fas fa-chart-line"></i> Analysis
                        <i class="fas fa-chevron-down submenu-arrow"></i>
                    </a>
                    <div class="submenu" id="analysis-submenu">
                        <a href="report.html" class="submenu-item ${isActive('report.html')}"><i class="fas fa-file-medical-alt"></i> Scan
                            Report</a>
                        <a href="body-map.html" class="submenu-item ${isActive('body-map.html')}"><i class="fas fa-user-injured"></i> Body Map</a>
                        <a href="disease-info.html" class="submenu-item ${isActive('disease-info.html')}"><i class="fas fa-book-medical"></i> Disease
                            Info</a>
                        <a href="doctor-appointment.html" class="submenu-item ${isActive('doctor-appointment.html')}"><i class="fas fa-user-md"></i> Doctor
                            Appointment</a>
                    </div>
                    <!-- === ANALYSIS DROPDOWN END === -->
                    <a href="settings.html" id="nav-settings-link" class="${isActive('settings.html')}"><i class="fas fa-cog"></i> Settings</a>
                    <a href="#" id="nav-logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </li>
        </ul>
    </nav>`;

    // Inject into the placeholder
    const placeholder = document.getElementById('nav-placeholder');
    if (placeholder) {
        placeholder.innerHTML = navHTML;
    }
})();
