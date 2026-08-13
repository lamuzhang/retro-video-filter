/* sw.js — RetroGrade 离线缓存:全站资源本地优先,更新时自动换版本 */
'use strict';

const VERSION = 'retrograde-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/params.js',
  './js/shader.js',
  './js/renderer.js',
  './js/exporter.js',
  './js/main.js',
  './js/vendor/mediabunny.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 缓存优先,兜底走网络并顺手入缓存(站点外的请求不拦截) */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
    )
  );
});
