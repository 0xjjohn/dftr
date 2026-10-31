/* دفتر - خدمة التشغيل بدون إنترنت. غيّر رقم النسخة عند تحديث الملفات لكي يحصل الهاتف على التحديث. */
const VERSION = "dafter-v79";
const FONTS = "dafter-fonts";
const FILES = ["./", "index.html", "privacy.html", "manifest.webmanifest", "icons/icon-192.png?v=3", "icons/icon-512.png?v=3", "icons/maskable-512.png?v=3", "icons/apple-touch-icon.png?v=3"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const host = new URL(req.url).hostname;
  /* خط Roboto: نخزّنه عند أول تحميل ليعمل بدون إنترنت */
  if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (new URL(req.url).origin !== location.origin) return;
  /* الصفحة: جرّب الشبكة أولًا (لتصل التحديثات)، وإن لم يوجد اتصال فاستخدم النسخة المخزنة */
  if (req.mode === "navigate") {
    /* النسخة المخزنة فورًا (فتح سريع بدون تأخير)، ونحدّثها من الشبكة في الخلفية لتظهر في الفتحة التالية */
    const net = fetch(req).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); } return r; });
    e.waitUntil(net.catch(() => null));
    e.respondWith(caches.match("index.html").then((hit) => hit || net));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
