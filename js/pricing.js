/* DropStack pricing page — fetches ads from API and renders them */
(function () {
    'use strict';

    const esc = DropStackUI.esc;

    async function renderAds() {
        const container = document.getElementById('adsContent');
        if (!container) return;

        try {
            const ads = await DropStackAPI.getAds();
            const activeAds = ads.filter(a => a.status === 'active');

            if (!activeAds.length) {
                container.innerHTML = '<div class="empty-state sm:col-span-2 lg:col-span-3"><i class="fa-solid fa-ad"></i><p>No ads available.</p></div>';
                return;
            }

            container.innerHTML = activeAds.map(ad => `
                <article class="card-item page-card">
                    <div class="tile" style="background:var(--accent);color:#06130b">
                        <i class="fa-solid fa-bullhorn text-[20px]"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h3 class="text-[15px] font-semibold text-primary">${esc(ad.name)}</h3>
                            <span class="ad-pill">Ad</span>
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-secondary">${esc(ad.description)}</p>
                        <a href="${esc(ad.link)}" target="_blank" rel="noopener noreferrer" class="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-primary">
                            Learn more <i class="fa-solid fa-arrow-right text-[11px]"></i>
                        </a>
                    </div>
                </article>
            `).join('');
        } catch (err) {
            container.innerHTML = '<div class="empty-state sm:col-span-2 lg:col-span-3"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load ads. Please try again later.</p></div>';
        }
    }

    renderAds();
})();
