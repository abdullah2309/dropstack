/* DropStack API — shared data fetching from remote endpoints */
(function () {
    'use strict';

    const API_BASE = 'https://dropstack.atwebpages.com/api';

    const endpoints = {
        drops: API_BASE + '/drops.php',
        news: API_BASE + '/news.php',
        ads: API_BASE + '/ads.php'
    };

    const cache = {};

    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    }

    async function getDrops(limit) {
        const key = 'drops_' + (limit || 'all');
        if (cache[key]) return cache[key];
        const url = limit ? endpoints.drops + '?limit=' + limit : endpoints.drops;
        const json = await fetchJSON(url);
        cache[key] = (json && json.data) || [];
        return cache[key];
    }

    async function getNews() {
        if (cache.news) return cache.news;
        const json = await fetchJSON(endpoints.news);
        cache.news = (json && json.data) || [];
        return cache.news;
    }

    async function getAds() {
        if (cache.ads) return cache.ads;
        const json = await fetchJSON(endpoints.ads);
        cache.ads = (json && json.data) || [];
        return cache.ads;
    }

    function clearCache() {
        Object.keys(cache).forEach(k => delete cache[k]);
    }

    window.DropStackAPI = { getDrops, getNews, getAds, clearCache, endpoints };
})();
