/* こんだてキッチン — オフライン用 Service Worker
   方針：アプリ本体やレシピデータ（HTML/JS/JSON）は「ネット優先」で取得し、
        取得できたら最新をキャッシュ更新。オフライン時のみキャッシュを使う。
        → レシピを追加・修正したら、次にオンラインで開いた時に即反映される。
        画像（アイコン）は変化しないので「キャッシュ優先」。 */
const CACHE = "kondate-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./recipes.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  // 個別にキャッシュ（アイコン等が無くても install を失敗させない）
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isImage = /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);

  if (isImage) {
    // 画像：キャッシュ優先
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // それ以外（HTML/JS/JSON）：ネット優先、ダメならキャッシュ
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
