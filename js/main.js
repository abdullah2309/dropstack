/* DropStack shared UI and directory-page behavior */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const store = {
        get(key, fallback) {
            try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) {}
        }
    };
    const esc = (value) => String(value ?? '').replace(/&/g, '&amp;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const safeUrl = (value) => {
        try {
            const url = new URL(String(value || ''));
            return url.href;
        } catch (e) {
            return '';
        }
    };

    /* Shared appearance menu */
    const themeWrap = $('themeWrap');
    const themeBtn = $('themeBtn');
    const metaTheme = $('metaTheme');
    const tiSun = $('tiSun');
    const tiMoon = $('tiMoon');
    const tiMonitor = $('tiMonitor');
    let themeMode = store.get('oa-theme', 'dark');
    let animTimer;

    if (!['light', 'dark', 'system'].includes(themeMode)) themeMode = 'dark';

    const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    function syncThemeButton() {
        if (tiSun) tiSun.classList.toggle('hidden', themeMode !== 'light');
        if (tiMoon) tiMoon.classList.toggle('hidden', themeMode !== 'dark');
        if (tiMonitor) tiMonitor.classList.toggle('hidden', themeMode !== 'system');
    }

    function applyTheme(animate) {
        const dark = themeMode === 'dark' || (themeMode === 'system' && prefersDark());
        const root = document.documentElement;
        if (animate !== false) {
            root.classList.add('theme-anim');
            clearTimeout(animTimer);
            animTimer = setTimeout(() => root.classList.remove('theme-anim'), 400);
        }
        root.classList.toggle('dark', dark);
        if (metaTheme) metaTheme.setAttribute('content', dark ? '#0a1310' : '#ffffff');
        syncThemeButton();
        document.querySelectorAll('[data-set-theme]').forEach((button) => {
            button.setAttribute('aria-selected', String(button.dataset.setTheme === themeMode));
        });
    }

    function closeMenu() {
        if (!themeWrap || !themeBtn) return;
        themeWrap.classList.remove('menu-open');
        themeBtn.setAttribute('aria-expanded', 'false');
    }

    if (themeWrap && themeBtn) {
        themeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const open = themeWrap.classList.toggle('menu-open');
            themeBtn.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('click', (event) => {
            if (!themeWrap.contains(event.target)) closeMenu();
        });
    }

    document.querySelectorAll('[data-set-theme]').forEach((button) => {
        button.addEventListener('click', () => {
            themeMode = button.dataset.setTheme;
            store.set('oa-theme', themeMode);
            applyTheme();
            closeMenu();
        });
    });

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemTheme = () => {
        if (themeMode === 'system') applyTheme();
    };
    if (mql.addEventListener) mql.addEventListener('change', onSystemTheme);
    else if (mql.addListener) mql.addListener(onSystemTheme);
    applyTheme(false);

    window.DropStackUI = { applyTheme, closeMenu, esc, safeUrl };

    /* Shared mobile menu for the directory pages */
    const mobileMenu = document.querySelector('[data-shared-mobile-menu]');
    const mobileMenuButton = $('menuBtn');
    const miMenu = $('miMenu');
    const miClose = $('miClose');
    if (mobileMenu && mobileMenuButton) {
        const closeMobileMenu = () => {
            mobileMenu.classList.add('hidden');
            if (miMenu) miMenu.classList.remove('hidden');
            if (miClose) miClose.classList.add('hidden');
        };
        mobileMenuButton.addEventListener('click', () => {
            const open = !mobileMenu.classList.toggle('hidden');
            if (miMenu) miMenu.classList.toggle('hidden', open);
            if (miClose) miClose.classList.toggle('hidden', !open);
        });
        mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileMenu));
    }

    /* Current year */
    document.querySelectorAll('[data-current-year]').forEach((node) => {
        node.textContent = String(new Date().getFullYear());
    });

    /* Projects page — fetches drops from API */
    const projectsList = $('projectsList');
    if (projectsList) {
        const projectSearch = $('projectSearch');
        const projectCount = $('projectCount');
        let allProjects = [];

        const renderProjects = () => {
            const query = (projectSearch ? projectSearch.value : '').trim().toLowerCase();
            const items = allProjects.filter((item) => !query || [
                item.name, item.description
            ].join(' ').toLowerCase().includes(query));

            projectsList.innerHTML = items.length ? items.map((item, index) => {
                const link = safeUrl(item.link);
                return `
                    <article class="card-item page-card" style="animation-delay:${Math.min(index * 30, 240)}ms">
                        <div class="tile" style="background:var(--accent);color:#06130b">
                            <i class="fa-solid fa-cube text-[20px]"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 class="text-[16px] font-semibold text-primary">${esc(item.name)}</h2>
                                </div>
                                ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline !h-8"><i class="fa-solid fa-arrow-up-right-from-square text-[13px]"></i> Visit</a>` : ''}
                            </div>
                            <p class="mt-3 text-sm leading-relaxed text-secondary">${esc(item.description)}</p>
                            <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-secondary">
                                <span class="font-mono">${esc(String(item.created_at || '').slice(0, 10))}</span>
                            </div>
                        </div>
                    </article>`;
            }).join('') : '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>No projects found.</p></div>';

            if (projectCount) projectCount.textContent = items.length + (items.length === 1 ? ' project' : ' projects');
        };

        if (projectSearch) projectSearch.addEventListener('input', renderProjects);

        // Fetch from API
        DropStackAPI.getDrops().then(data => {
            allProjects = (data || []).filter(item => item.status === 'active');
            renderProjects();
        }).catch(() => {
            projectsList.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load projects. Please try again later.</p></div>';
            if (projectCount) projectCount.textContent = 'Error';
        });
    }

    /* News page — fetches news from API */
    const newsPageList = $('newsPageList');
    if (newsPageList) {
        const newsCount = $('newsPageCount');

        DropStackAPI.getNews().then(data => {
            const news = (data || []).filter(item => item.status === 'active');
            newsPageList.innerHTML = news.length ? news.map((item, index) => `
                <article class="card-item page-card" style="animation-delay:${Math.min(index * 35, 240)}ms">
                    <div class="news-tile" style="background:var(--accent);color:#06130b">
                        <i class="fa-solid fa-newspaper text-[17px]"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-[15px] font-semibold leading-snug text-primary">${esc(item.name)}</h2>
                        <p class="mt-2 text-sm leading-relaxed text-secondary">${esc(item.description)}</p>
                        <div class="mt-3 flex items-center gap-2 text-[11px] text-secondary">
                            <span class="font-mono">${esc(String(item.created_at || '').slice(0, 10))}</span>
                            ${item.link ? `<a href="${esc(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-medium text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-primary">Read more <i class="fa-solid fa-arrow-right text-[10px]"></i></a>` : ''}
                        </div>
                    </div>
                </article>`).join('') : '<div class="empty-state"><i class="fa-solid fa-newspaper"></i><p>No news published yet.</p></div>';
            if (newsCount) newsCount.textContent = news.length + (news.length === 1 ? ' story' : ' stories');
        }).catch(() => {
            newsPageList.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load news. Please try again later.</p></div>';
            if (newsCount) newsCount.textContent = 'Error';
        });
    }
})();
