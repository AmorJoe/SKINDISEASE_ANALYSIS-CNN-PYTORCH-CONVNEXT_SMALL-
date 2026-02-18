document.addEventListener('DOMContentLoaded', () => {
    // Add simple entrance animations
    const cards = document.querySelectorAll('.module-card');

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 150)); // Staggered delay
    });

    // --- Theme Logic ---
    function initDashboardTheme() {
        const html = document.documentElement;

        // 1. Check LocalStorage
        const savedMode = localStorage.getItem('skinscan_mode');

        if (savedMode) {
            html.setAttribute('data-mode', savedMode);
            if (savedMode === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        } else {
            // 2. Check System Preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.setAttribute('data-mode', 'dark');
                document.body.classList.add('dark-mode');
            }
        }
    }

    initDashboardTheme();

    // Toggle Button Logic
    const toggleBtn = document.getElementById('portal-theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const html = document.documentElement;
            const currentMode = html.getAttribute('data-mode') || 'light';
            const newMode = currentMode === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-mode', newMode);
            localStorage.setItem('skinscan_mode', newMode);

            if (newMode === 'dark') {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
            }
        });
    }
});
