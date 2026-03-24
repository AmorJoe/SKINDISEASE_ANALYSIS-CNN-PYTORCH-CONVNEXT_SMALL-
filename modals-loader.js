/**
 * modals-loader.js
 * Shared Profile and Change Password modals for the SkinScan AI user portal.
 * Source of truth: index.html modals.
 *
 * Usage: Add these two lines at the bottom of the <body> in every user-portal HTML page:
 *   <div id="modals-placeholder"></div>
 *   <script src="modals-loader.js"></script>   (before script.js)
 */

(function () {
    const modalsHTML = `
    <!-- Profile Modal -->
    <div class="modal" id="profile-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-user-circle"></i> My Profile</h2>
                <span class="modal-close" id="close-profile-modal">&times;</span>
            </div>
            <div class="modal-body">
                <form id="profile-form">
                    <!-- Avatar Section -->
                    <div class="profile-avatar-section">
                        <div class="avatar-upload-container">
                            <img src="https://ui-avatars.com/api/?name=User&background=0288d1&color=fff"
                                alt="User Avatar" class="profile-avatar-large" id="profile-avatar-large">
                            <label for="avatar-input" class="upload-overlay">
                                <i class="fas fa-camera"></i>
                            </label>
                            <input type="file" id="avatar-input" hidden accept="image/*">
                        </div>
                        <div class="profile-info">
                            <h3 id="display-name">Loading...</h3>
                            <p id="display-email">loading...</p>
                        </div>
                    </div>

                    <!-- Personal Details -->
                    <h3 class="section-header"><i class="fas fa-user"></i> Personal Details</h3>
                    <div class="form-grid">
                        <div class="input-group">
                            <label>First Name <span style="color: red;">*</span></label>
                            <input type="text" id="first-name" placeholder="First Name">
                        </div>
                        <div class="input-group">
                            <label>Last Name <span style="color: red;">*</span></label>
                            <input type="text" id="last-name" placeholder="Last Name">
                        </div>
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" id="email" readonly>
                        </div>
                        <div class="input-group">
                            <label>Phone Number <span style="color: red;">*</span></label>
                            <input type="tel" id="phone" placeholder="+1 234 567 8900">
                        </div>
                        <div class="input-group">
                            <label>Date of Birth <span style="color: red;">*</span></label>
                            <input type="date" id="dob">
                        </div>
                        <div class="input-group">
                            <label>Gender <span style="color: red;">*</span></label>
                            <select id="gender">
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                    </div>

                    <!-- Location -->
                    <h3 class="section-header"><i class="fas fa-map-marker-alt"></i> Location</h3>
                    <div class="form-grid">
                        <div class="input-group">
                            <label>Country</label>
                            <input type="text" id="country" placeholder="Country">
                        </div>
                        <div class="input-group full-width">
                            <label>Address</label>
                            <textarea id="address" rows="3" placeholder="Enter your full address"></textarea>
                        </div>
                    </div>

                    <!-- Medical Profile -->
                    <h3 class="section-header"><i class="fas fa-notes-medical"></i> Medical Profile</h3>
                    <div class="form-grid">
                        <div class="input-group">
                            <label>Skin Type</label>
                            <select id="skin-type">
                                <option value="">Select Skin Type</option>
                                <option value="Normal">Normal</option>
                                <option value="Oily">Oily</option>
                                <option value="Dry">Dry</option>
                                <option value="Combination">Combination</option>
                                <option value="Sensitive">Sensitive</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Skin Tone</label>
                            <select id="skin-tone">
                                <option value="">Select Skin Tone</option>
                                <option value="Type I">Type I (Pale White)</option>
                                <option value="Type II">Type II (White)</option>
                                <option value="Type III">Type III (Cream White)</option>
                                <option value="Type IV">Type IV (Moderate Brown)</option>
                                <option value="Type V">Type V (Dark Brown)</option>
                                <option value="Type VI">Type VI (Deep Black)</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn-submit" id="btn-save-profile">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal" id="password-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-key"></i> Change Password</h2>
                <span class="modal-close" id="close-password-modal">&times;</span>
            </div>
            <div class="modal-body">
                <form id="password-form">
                    <div class="input-group">
                        <label>Current Password</label>
                        <div class="input-wrapper">
                            <input type="password" id="old-password" placeholder="••••••••" required>
                            <i class="fas fa-eye toggle-password" data-target="old-password"></i>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>New Password</label>
                        <div class="input-wrapper">
                            <input type="password" id="new-password" placeholder="••••••••" required minlength="8">
                            <i class="fas fa-eye toggle-password" data-target="new-password"></i>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Confirm Password</label>
                        <div class="input-wrapper">
                            <input type="password" id="confirm-password" placeholder="••••••••" required minlength="8">
                            <i class="fas fa-eye toggle-password" data-target="confirm-password"></i>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn-submit" id="btn-update-password">Update Password</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // Inject into the placeholder
    const placeholder = document.getElementById('modals-placeholder');
    if (placeholder) {
        placeholder.innerHTML = modalsHTML;
    }
})();
