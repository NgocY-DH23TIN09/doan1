function toggleNav(button) {
    const nav = document.getElementById('navLinks');
    if (!nav) return;

    const isOpen = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.classList.toggle('nav-open', isOpen && window.innerWidth <= 768);
}

function closeNav() {
    const nav = document.getElementById('navLinks');
    const button = document.querySelector('.nav-toggle');
    if (!nav || !button) return;

    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeNav();
    }
});

document.addEventListener('click', (event) => {
    const nav = document.getElementById('navLinks');
    const button = document.querySelector('.nav-toggle');
    if (!nav || !button || window.innerWidth > 768) return;

    const clickedInsideNav = nav.contains(event.target);
    const clickedToggle = button.contains(event.target);
    if (!clickedInsideNav && !clickedToggle) {
        closeNav();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#navLinks a, #navLinks button').forEach((element) => {
        element.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeNav();
            }
        });
    });
});