let initialized = false;

function isMobileNav() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function ensureMoreBackdrop() {
    if (document.getElementById('jb-more-backdrop')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="jb-more-backdrop" class="hidden fixed inset-0 z-[199]" aria-hidden="true"></div>
    `);
}

function resetMoreDropdownPosition() {
    const dropdown = document.querySelector('.jb-more-group .jb-more-dropdown');
    if (!dropdown) return;

    dropdown.style.position = '';
    dropdown.style.top = '';
    dropdown.style.left = '';
    dropdown.style.right = '';
    dropdown.style.bottom = '';
    dropdown.style.transform = '';
    dropdown.style.width = '';
    dropdown.style.maxWidth = '';
}

function positionMoreDropdown(group) {
    const dropdown = group.querySelector('.jb-more-dropdown');
    const weddingGroup = document.querySelector('.jb-wedding-group');
    const categoryBar = group.closest('.jb-category-scroll') || group.closest('#category-placeholder');

    if (!dropdown) return;

    const categoryRect = (categoryBar || group).getBoundingClientRect();
    const startRect = weddingGroup ? weddingGroup.getBoundingClientRect() : group.getBoundingClientRect();

    dropdown.style.position = 'fixed';
    dropdown.style.top = `${categoryRect.bottom}px`;
    dropdown.style.left = `${Math.max(12, startRect.left)}px`;
    dropdown.style.right = '0.75rem';
    dropdown.style.bottom = 'auto';
    dropdown.style.transform = 'none';
    dropdown.style.width = 'auto';
    dropdown.style.minWidth = '12rem';
    dropdown.style.maxWidth = 'none';
}

function closeMoreMenu() {
    document.querySelectorAll('.jb-more-group.jb-more-open').forEach((el) => {
        el.classList.remove('jb-more-open');
    });
    document.getElementById('jb-more-backdrop')?.classList.add('hidden');
    resetMoreDropdownPosition();
}

function openMoreMenu(group) {
    closeMobileMenu();
    group.classList.add('jb-more-open');
    positionMoreDropdown(group);
    document.getElementById('jb-more-backdrop')?.classList.remove('hidden');
}

function collapseMobileSubmenus() {
    document.querySelectorAll('.jb-mobile-menu-group.jb-mobile-submenu-open').forEach((group) => {
        group.classList.remove('jb-mobile-submenu-open');
    });
}

function toggleMobileSubmenu(expandBtn) {
    const group = expandBtn.closest('.jb-mobile-menu-group');
    if (!group) return;

    const willOpen = !group.classList.contains('jb-mobile-submenu-open');

    document.querySelectorAll('.jb-mobile-menu-group.jb-mobile-submenu-open').forEach((openGroup) => {
        if (openGroup !== group) openGroup.classList.remove('jb-mobile-submenu-open');
    });

    group.classList.toggle('jb-mobile-submenu-open', willOpen);
}

function closeMobileMenu() {
    const menu = document.getElementById('jb-mobile-menu');
    const backdrop = document.getElementById('jb-mobile-menu-backdrop');
    const toggle = document.getElementById('jb-mobile-menu-toggle');

    collapseMobileSubmenus();
    menu?.classList.remove('jb-mobile-menu-open');
    backdrop?.classList.add('hidden');
    toggle?.classList.remove('jb-hamburger-open');
    toggle?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-hidden', 'true');
    backdrop?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function openMobileMenu() {
    closeMoreMenu();

    const menu = document.getElementById('jb-mobile-menu');
    const backdrop = document.getElementById('jb-mobile-menu-backdrop');
    const toggle = document.getElementById('jb-mobile-menu-toggle');

    menu?.classList.add('jb-mobile-menu-open');
    backdrop?.classList.remove('hidden');
    toggle?.classList.add('jb-hamburger-open');
    toggle?.setAttribute('aria-expanded', 'true');
    menu?.setAttribute('aria-hidden', 'false');
    backdrop?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function handleMobileGoldPrice(event) {
    event.preventDefault();
    closeMobileMenu();

    if (typeof window.openGoldPriceModal === 'function') {
        window.openGoldPriceModal();
        return;
    }

    window.location.href = 'index.html#gold-price';
}

export function initCategoryNav() {
    if (initialized) return;
    initialized = true;

    ensureMoreBackdrop();

    document.addEventListener('click', (event) => {
        const mobileToggle = event.target.closest('#jb-mobile-menu-toggle');
        const mobileClose = event.target.closest('#jb-mobile-menu-close');
        const mobileBackdrop = event.target.id === 'jb-mobile-menu-backdrop';
        const mobileExpand = event.target.closest('.jb-mobile-menu-expand');
        const mobileGoldPrice = event.target.closest('[data-mobile-gold-price]');
        const mobileSubLink = event.target.closest('.jb-mobile-submenu-link');
        const mobileLink = event.target.closest('.jb-mobile-menu-link:not([data-mobile-gold-price])');
        const moreToggle = event.target.closest('.jb-more-toggle');

        if (mobileToggle) {
            event.preventDefault();
            const menu = document.getElementById('jb-mobile-menu');
            if (menu?.classList.contains('jb-mobile-menu-open')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
            return;
        }

        if (mobileClose || mobileBackdrop) {
            closeMobileMenu();
            return;
        }

        if (mobileExpand) {
            event.preventDefault();
            event.stopPropagation();
            toggleMobileSubmenu(mobileExpand);
            return;
        }

        if (mobileGoldPrice) {
            handleMobileGoldPrice(event);
            return;
        }

        if (mobileSubLink) {
            closeMobileMenu();
            return;
        }

        if (mobileLink) {
            closeMobileMenu();
            return;
        }

        if (moreToggle) {
            if (!isMobileNav()) return;

            event.preventDefault();
            event.stopPropagation();

            const group = moreToggle.closest('.jb-more-group');
            if (!group) return;

            const wasOpen = group.classList.contains('jb-more-open');
            closeMoreMenu();

            if (!wasOpen) {
                openMoreMenu(group);
            }
            return;
        }

        if (event.target.id === 'jb-more-backdrop' || !event.target.closest('.jb-more-group')) {
            closeMoreMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (!isMobileNav()) {
            closeMobileMenu();
            closeMoreMenu();
            return;
        }

        const openGroup = document.querySelector('.jb-more-group.jb-more-open');
        if (openGroup) positionMoreDropdown(openGroup);
    });

    window.addEventListener('scroll', () => {
        const openGroup = document.querySelector('.jb-more-group.jb-more-open');
        if (!openGroup || !isMobileNav()) return;
        positionMoreDropdown(openGroup);
    }, { passive: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryNav);
} else {
    initCategoryNav();
}