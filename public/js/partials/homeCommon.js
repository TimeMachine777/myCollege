// Get all "navbar-burger" elements
const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

// Check if there are any navbar burgers
if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(el => {
        el.addEventListener('click', () => {

            // Get the target from the "data-target" attribute
            const target = el.dataset.target;
            const $target = document.getElementById(target);

            // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
            el.classList.toggle('is-active');
            $target.classList.toggle('is-active');

        });
    });
}

// Notification delete button js code---------------------
(document.querySelectorAll('.notification .delete') || []).forEach(($delete) => {
    const $notification = $delete.parentNode;

    $delete.addEventListener('click', () => {
        $notification.parentNode.removeChild($notification);
    });
});


// Theme toggle button code ------------------------------------------------
const toggleButton = document.getElementById('toggle');
const themeToggleLabel = document.getElementById('theme-toggle-button');
const documentRoot = document.documentElement; //html element

if (toggleButton) {
    function setTheme(theme) {
        documentRoot.classList.remove('light-theme', 'dark-theme');
        documentRoot.classList.add(`${theme}-theme`);
        if (theme === 'dark') {
            toggleButton.checked = true;
        } else {
            toggleButton.checked = false;
        }
        document.documentElement.setAttribute('data-theme', theme);
    }

    function initializeTheme() {
        // Check local storage
        let theme = localStorage.getItem('theme');
        if (!theme) {
            // If no theme in local storage, check the browser's preferred color scheme
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
        }
        setTheme(theme);
    }

    toggleButton.addEventListener('change', () => {
        const theme = toggleButton.checked ? 'dark' : 'light';
        setTheme(theme);
        localStorage.setItem('theme', theme);
    });

    initializeTheme();
}