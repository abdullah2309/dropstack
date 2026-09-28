/* DropStack API — shared data fetching from remote endpoints */

(function () {
    'use strict';

    const endpoints = {
        drops: 'https://dropstack.site.je/api/drops.php',
        news: 'https://dropstack.site.je/api/news.php',
        ads: 'https://dropstack.site.je/api/ads.php'
    };

    const cache = {};

    async function fetchJSON(url) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(
                `API request failed: ${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();

        if (!json || json.success !== true) {
            throw new Error(
                json?.message || 'Invalid API response'
            );
        }

        return json;
    }

    async function getDrops(limit) {
        const key = 'drops_' + (limit || 'all');

        if (cache[key]) {
            return cache[key];
        }

        const url = limit
            ? `${endpoints.drops}?limit=${encodeURIComponent(limit)}`
            : endpoints.drops;

        const json = await fetchJSON(url);

        cache[key] = Array.isArray(json.data)
            ? json.data
            : [];

        return cache[key];
    }

    async function getNews() {
        if (cache.news) {
            return cache.news;
        }

        const json = await fetchJSON(endpoints.news);

        cache.news = Array.isArray(json.data)
            ? json.data
            : [];

        return cache.news;
    }

    async function getAds() {
        if (cache.ads) {
            return cache.ads;
        }

        const json = await fetchJSON(endpoints.ads);

        cache.ads = Array.isArray(json.data)
            ? json.data
            : [];

        return cache.ads;
    }

    function clearCache() {
        Object.keys(cache).forEach((key) => {
            delete cache[key];
        });
    }

    window.DropStackAPI = {
        getDrops,
        getNews,
        getAds,
        clearCache,
        endpoints
    };

})();
