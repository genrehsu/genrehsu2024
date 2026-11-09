// Smooth scroll to section when menu clicked
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// SweetAlert popup for Login Admin
function showLoginPopup() {
    Swal.fire({
        title: 'Login Admin',
        html: '<input type="text" id="username" class="swal2-input" placeholder="Username"><input type="password" id="password" class="swal2-input" placeholder="Password">',
        confirmButtonText: 'Login',
        focusConfirm: false,
        preConfirm: () => {
            const username = Swal.getPopup().querySelector('#username').value;
            const password = Swal.getPopup().querySelector('#password').value;
            if (!username || !password) {
                Swal.showValidationMessage('Isi username dan password!');
            }
            return { username, password };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire(`Selamat datang, ${result.value.username}!`);
        }
    });
}


// Hapus event login popup karena tombol sekarang berupa <a> ke halaman login

// Mobile menu toggle (hanya satu blok, tanpa duplikasi)
document.addEventListener('DOMContentLoaded', function () {
    const desktopLinks = document.querySelector('header nav .md\\:space-x-8');
    const mobileLinks = document.querySelector('#mobile-menu .px-2');
    if (desktopLinks && !desktopLinks.querySelector('a[href="admin.html"]')) {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.textContent = 'Admin';
        adminLink.className = 'text-gray-500 hover:border-gray-300 hover:text-gray-700 px-3 py-2 text-sm font-medium';
        desktopLinks.append(adminLink);
    }
    if (mobileLinks && !mobileLinks.querySelector('a[href="admin.html"]')) {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.textContent = 'Admin';
        adminLink.className = 'block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50';
        mobileLinks.append(adminLink);
    }

    var mobileMenuBtn = document.getElementById('mobile-menu-button');
    var mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            let isMenuOpen = false;
            const menuLinks = mobileMenu.querySelectorAll('a');
            // Tambah class mobile-menu-link ke semua link
            menuLinks.forEach(link => link.classList.add('mobile-menu-link'));
            function openMenu() {
                mobileMenu.classList.remove('hidden', 'menu-exit', 'menu-exit-active');
                mobileMenu.classList.add('menu-enter');
                void mobileMenu.offsetWidth;
                mobileMenu.classList.add('menu-enter-active');
                // Animasi turun satu-satu
                menuLinks.forEach((link, i) => {
                    link.classList.remove('animated');
                    setTimeout(() => {
                        link.classList.add('animated');
                    }, 80 * i + 80);
                });
                isMenuOpen = true;
            }
            function closeMenu() {
                mobileMenu.classList.remove('menu-enter', 'menu-enter-active');
                mobileMenu.classList.add('menu-exit');
                void mobileMenu.offsetWidth;
                mobileMenu.classList.add('menu-exit-active');
                // Reset animasi link
                menuLinks.forEach(link => link.classList.remove('animated'));
                isMenuOpen = false;
            }
            mobileMenuBtn.addEventListener('click', function () {
                if (!isMenuOpen) {
                    openMenu();
                } else {
                    closeMenu();
                }
            });
            mobileMenu.addEventListener('transitionend', function (e) {
                if (!isMenuOpen && mobileMenu.classList.contains('menu-exit-active')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenu.classList.remove('menu-exit', 'menu-exit-active');
                }
                if (isMenuOpen) {
                    mobileMenu.classList.remove('menu-enter', 'menu-enter-active');
                }
            });
            menuLinks.forEach(function (link) {
                link.addEventListener('click', function () {
                    closeMenu();
                });
            });
        }
});

// Gallery hover animation (optional, if not handled by CSS)
document.querySelectorAll('.card-hover').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.classList.add('shadow-2xl');
    });
    card.addEventListener('mouseleave', () => {
        card.classList.remove('shadow-2xl');
    });
});
