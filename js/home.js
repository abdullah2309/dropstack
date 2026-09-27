/* DropStack homepage behavior — fetches data from API */
(function () {
    'use strict';

    /* ================= Helpers ================= */
    const $ = (id) => document.getElementById(id);
    const esc = DropStackUI.esc;
    const store = {
        get(k, f) { try { return localStorage.getItem(k) ?? f; } catch (e) { return f; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ================= State ================= */
    const PAGE = 8;
    const state = { tab: 'latest', category: 'all', query: '', limit: PAGE };

    /* ================= Data (from API) ================= */
    let PRODUCTS = [];
    let NEWS = [];

    /* ================= Rendering: alternatives ================= */
    const listEl = $('list'), resultCount = $('resultCount');
    const showMoreBtn = $('showMoreBtn'), showMoreLabel = $('showMoreLabel');

    function productCard(p, i, animate) {
        const delay = animate ? Math.min(i * 35, 280) : 0;
        const link = DropStackUI.safeUrl(p.link);

        return `
            <article id="project-${esc(p.id)}" data-project-id="${esc(p.id)}" class="card-item flex gap-4 p-4 sm:p-5" style="animation-delay:${delay}ms">
                <div class="tile shrink-0" style="background:var(--accent);color:#06130b">
                    <i class="fa-solid fa-cube text-[20px]"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <h3 class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold leading-tight text-primary">
                                <span class="truncate">${esc(p.name)}</span>
                            </h3>
                        </div>
                        ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline !h-8 shrink-0"><i class="fa-solid fa-arrow-up-right-from-square text-[13px]"></i> Visit</a>` : ''}
                    </div>
                    <p class="mt-2.5 text-sm leading-relaxed text-secondary line-clamp-2">${esc(p.description)}</p>
                    <div class="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span class="font-mono text-[11px] text-secondary">${esc(String(p.created_at || '').slice(0, 10))}</span>
                    </div>
                </div>
            </article>`;
    }

    const emptyState = `
        <div class="rounded-xl border border-border bg-card px-6 py-16 text-center">
            <div class="mx-auto grid h-11 w-11 place-items-center rounded-full border border-border text-secondary">
                <i class="fa-solid fa-face-frown text-[20px]"></i>
            </div>
            <p class="mt-4 text-sm font-medium text-primary">No alternatives found</p>
            <p class="mt-1 text-sm text-secondary">Try different keywords or clear the active filters.</p>
            <button data-clear class="mt-5 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-primary transition-colors hover-surface">
                <i class="fa-solid fa-rotate-left text-[13px]"></i> Clear filters
            </button>
        </div>`;

    const ctaCard = `
        <article class="rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:border-accent">
            <p class="text-sm text-secondary">Know a great open source alternative that is not listed here?</p>
            <a href="projects.html" class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-primary transition-colors hover-surface">
                Browse all projects <i class="fa-solid fa-arrow-right i-arrow-up-right text-[12px]"></i>
            </a>
        </article>`;

    function currentList() {
        const q = state.query.trim().toLowerCase();
        const list = PRODUCTS.filter(p => {
            if (q) {
                const hay = [p.name, p.description].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
        const sorters = {
            latest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            popular: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            trending: (a, b) => new Date(b.created_at) - new Date(a.created_at)
        };
        return list.sort(sorters[state.tab]);
    }

    function render(opts) {
        const animate = !opts || opts.animate !== false;
        const list = currentList();
        const shown = list.slice(0, state.limit);
        const parts = [];

        shown.forEach((p, i) => {
            parts.push(productCard(p, i, animate));
        });
        if (shown.length === 0) parts.push(emptyState);
        parts.push(ctaCard);

        if (!animate) {
            listEl.classList.add('no-anim');
            requestAnimationFrame(() => requestAnimationFrame(() => listEl.classList.remove('no-anim')));
        }
        listEl.innerHTML = parts.join('');

        const remaining = list.length - shown.length;
        showMoreBtn.classList.toggle('hidden', remaining <= 0);
        showMoreLabel.textContent = 'Show ' + remaining + ' more';

        const q = state.query.trim();
        let label;
        if (!q && state.category === 'all' && list.length === PRODUCTS.length) {
            label = PRODUCTS.length + ' alternatives';
        } else {
            label = list.length + (list.length === 1 ? ' result' : ' results') + (q ? ' for "' + q + '"' : '');
        }
        resultCount.textContent = label;
    }

    /* ================= Rendering: news sidebar ================= */
    function renderNews() {
        $('newsList').innerHTML = NEWS.map(n => `
            <a href="${esc(DropStackUI.safeUrl(n.link))}" target="_blank" rel="noopener noreferrer" class="news-item group flex items-start gap-3 border-b border-border py-3 first:pt-2.5 last:border-b-0 last:pb-0">
                <span class="news-tile" style="background:var(--accent);color:#06130b">
                    <i class="fa-solid fa-newspaper text-[15px]"></i>
                </span>
                <span class="min-w-0 flex-1">
                    <span class="line-clamp-2 block text-[13px] font-medium leading-snug text-primary transition-colors group-hover:text-accent">${esc(n.name)}</span>
                    <span class="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-secondary">
                        <span class="shrink-0">${esc(String(n.created_at || '').slice(0, 10))}</span>
                    </span>
                </span>
                <i class="fa-solid fa-arrow-right i-arrow-up-right mt-0.5 shrink-0 text-[12px] text-secondary opacity-0 transition-opacity group-hover:opacity-100"></i>
            </a>`).join('');
    }

    // Newsletter form
    $('newsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        $('newsForm').classList.add('hidden');
        $('newsFormMsg').classList.remove('hidden');
    });

    /* ================= Category pills scroller (arrow buttons) ================= */
    const pillScroller = $('pillScroller'), pillPrev = $('pillPrev'), pillNext = $('pillNext');

    function syncPillArrows() {
        const max = pillScroller.scrollWidth - pillScroller.clientWidth;
        const hasOverflow = max > 8;
        pillPrev.classList.toggle('pill-arrow-off', !hasOverflow || pillScroller.scrollLeft <= 8);
        pillNext.classList.toggle('pill-arrow-off', !hasOverflow || pillScroller.scrollLeft >= max - 8);
    }

    pillPrev.addEventListener('click', () => pillScroller.scrollBy({ left: -260, behavior: 'smooth' }));
    pillNext.addEventListener('click', () => pillScroller.scrollBy({ left: 260, behavior: 'smooth' }));
    pillScroller.addEventListener('scroll', debounce(syncPillArrows, 60), { passive: true });
    window.addEventListener('resize', debounce(syncPillArrows, 150));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncPillArrows);
    syncPillArrows();

    /* ================= Filters & interactions ================= */
    const searchInput = $('searchInput'), clearBtn = $('clearBtn'), kbdHint = $('kbdHint');

    function syncPills() {
        document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('active', b.dataset.cat === state.category));
    }
    function syncTabs() {
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
    }
    function syncSearchUI() {
        clearBtn.classList.toggle('hidden', !searchInput.value);
        kbdHint.classList.toggle('hint-off', !!searchInput.value);
    }
    function resetFilters() {
        state.query = ''; state.category = 'all'; state.tab = 'latest'; state.limit = PAGE;
        searchInput.value = '';
        syncPills(); syncTabs(); syncSearchUI();
        render();
    }
    function setSearch(q) {
        state.query = q; searchInput.value = q; state.limit = PAGE;
        syncSearchUI();
        render({ animate: false });
    }

    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
        state.tab = b.dataset.tab; state.limit = PAGE;
        syncTabs(); render();
    }));

    document.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
        state.category = b.dataset.cat; state.limit = PAGE;
        syncPills(); render();
        b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }));

    searchInput.addEventListener('input', debounce(() => setSearch(searchInput.value), 180));

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') $('alternatives').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    clearBtn.addEventListener('click', () => { setSearch(''); searchInput.focus(); });

    showMoreBtn.addEventListener('click', () => { state.limit += PAGE; render({ animate: false }); });

    // Card interactions via delegation
    listEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-clear]')) resetFilters();
    });

    /* ================= Global search modal (Ctrl+K) ================= */
    const searchOverlay = $('searchOverlay');
    const commandSearch = $('commandSearch');
    const commandSearchResults = $('commandSearchResults');
    const commandSearchCount = $('commandSearchCount');
    let commandMatches = [];
    let commandIndex = 0;

    function syncCommandSelection() {
        [...commandSearchResults.querySelectorAll('[data-command-id]')].forEach((item, index) => {
            item.classList.toggle('is-active', index === commandIndex);
            item.setAttribute('aria-selected', String(index === commandIndex));
        });
    }

    function renderCommandSearch() {
        const query = commandSearch.value.trim().toLowerCase();
        commandMatches = (query
            ? PRODUCTS.filter((item) => [
                item.name, item.description
            ].join(' ').toLowerCase().includes(query))
            : PRODUCTS.slice(0, 6)
        ).slice(0, 8);
        commandIndex = 0;
        commandSearchCount.textContent = commandMatches.length + (commandMatches.length === 1 ? ' result' : ' results');

        commandSearchResults.innerHTML = commandMatches.length ? commandMatches.map((item, index) => `
            <button id="command-result-${esc(item.id)}" class="search-result" role="option" aria-selected="${index === 0}" data-command-id="${esc(item.id)}">
                <span class="search-result-tile" style="background:var(--accent);color:#06130b">
                    <i class="fa-solid fa-cube text-[15px]"></i>
                </span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-semibold text-primary">${esc(item.name)}</span>
                    <span class="mt-0.5 block truncate text-[11.5px] text-secondary">${esc(item.description)}</span>
                </span>
            </button>`).join('') : `
            <div class="search-empty">
                <div><i class="fa-solid fa-magnifying-glass mb-3 text-[20px]"></i><p class="text-sm font-medium text-primary">No projects found</p><p class="mt-1 text-xs">Try a different search term.</p></div>
            </div>`;
    }

    function openCommandSearch() {
        searchOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCommandSearch();
        setTimeout(() => commandSearch.focus(), 30);
    }

    function closeCommandSearch() {
        searchOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function openCommandResult(id) {
        const product = PRODUCTS.find((item) => String(item.id) === String(id));
        if (!product) return;
        state.category = 'all';
        state.query = '';
        state.tab = 'latest';
        state.limit = Math.max(PAGE, PRODUCTS.length);
        searchInput.value = '';
        syncPills(); syncTabs(); syncSearchUI();
        render({ animate: false });
        closeCommandSearch();
        requestAnimationFrame(() => {
            const card = document.getElementById('project-' + id);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    commandSearch.addEventListener('input', renderCommandSearch);
    commandSearch.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            commandIndex = Math.min(commandIndex + 1, commandMatches.length - 1);
            syncCommandSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            commandIndex = Math.max(commandIndex - 1, 0);
            syncCommandSelection();
        } else if (e.key === 'Enter' && commandMatches[commandIndex]) {
            e.preventDefault();
            openCommandResult(commandMatches[commandIndex].id);
        }
    });
    commandSearchResults.addEventListener('click', (e) => {
        const result = e.target.closest('[data-command-id]');
        if (result) openCommandResult(result.dataset.commandId);
    });
    $('commandSearchClose').addEventListener('click', closeCommandSearch);
    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeCommandSearch();
    });

    // Header search button opens the global modal.
    function focusSearch() {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => searchInput.focus({ preventScroll: true }), 350);
    }
    $('headerSearch').addEventListener('click', openCommandSearch);

    /* ================= Keyboard shortcuts ================= */
    const isTyping = () => {
        const t = document.activeElement;
        return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchOverlay.classList.contains('open')) closeCommandSearch();
            else openCommandSearch();
            return;
        }
        if (e.key === 'Escape') {
            if (searchOverlay.classList.contains('open')) closeCommandSearch();
            else { DropStackUI.closeMenu(); closeMobileMenu(); }
        }
        if (e.key === '/' && !isTyping() && !searchOverlay.classList.contains('open')) {
            e.preventDefault();
            focusSearch();
        }
    });

    /* ================= Mobile menu ================= */
    const mobileMenu = $('mobileMenu'), menuBtn = $('menuBtn'), miMenu = $('miMenu'), miClose = $('miClose');
    function closeMobileMenu() {
        mobileMenu.classList.add('hidden');
        miMenu.classList.remove('hidden');
        miClose.classList.add('hidden');
    }
    menuBtn.addEventListener('click', () => {
        const open = !mobileMenu.classList.toggle('hidden');
        miMenu.classList.toggle('hidden', open);
        miClose.classList.toggle('hidden', !open);
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));

    /* ================= Floating ad ================= */
    $('floatAdClose').addEventListener('click', () => { $('floatAd').style.display = 'none'; });

    /* ================= Hero stats count-up ================= */
    function compact(n) {
        const trim = (s) => s.replace(/\.0$/, '');
        if (n >= 1e6) return trim((n / 1e6).toFixed(1)) + 'M';
        if (n >= 1e3) return trim((n / 1e3).toFixed(1)) + 'K';
        return String(n);
    }
    function animateStats() {
        document.querySelectorAll('.stat-num').forEach(el => {
            const target = +el.dataset.target, suffix = el.dataset.suffix || '+';
            if (reduceMotion) { el.textContent = compact(target) + suffix; return; }
            const t0 = performance.now(), dur = 1100;
            (function tick(now) {
                const p = Math.min((now - t0) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = compact(Math.round(target * eased)) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            })(t0);
        });
    }

    /* ================= Boot ================= */
    // Fetch data from API
    Promise.all([
        DropStackAPI.getDrops(),
        DropStackAPI.getNews()
    ]).then(([drops, news]) => {
        PRODUCTS = (drops || []).filter(item => item.status === 'active');
        NEWS = (news || []).filter(item => item.status === 'active');
        render();
        renderNews();
        animateStats();
    }).catch(() => {
        listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load data. Please try again later.</p></div>';
        $('newsList').innerHTML = '';
        animateStats();
    });
})();
