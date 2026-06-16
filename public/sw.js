/**
 * healwith Service Worker — v3 (2026-06-16 리브랜딩 캐시 버전업)
 *
 * 사고: v1 은 ① 캐시 이름 고정('healo-v1')이라 영영 안 비워지고
 * ② 첫 화면 HTML('/')을 설치 시점 그대로 보관 → 네트워크가 잠깐 불안하면
 * 몇 주 전 HTML 을 서빙 → 그 HTML 이 참조하는 청크는 배포로 이미 삭제됨
 * → 화면은 그려지는데 스크립트 전멸 = "버튼이 죄다 안 눌림".
 *
 * 원칙 (v2):
 * - 페이지 HTML 은 절대 캐시하지 않는다 (오프라인 안내문으로만 폴백)
 * - 해시 붙은 정적 파일(/_next/static)만 cache-first (내용 불변이라 안전)
 * - 캐시 이름 버전업 → 활성화 시 옛 캐시 전부 삭제 (기존 먹통 폰 자동 회복)
 */

// 리브랜딩(HEALO→healwith) 시 버전업: 기존 방문자 캐시 자동 무효화 → 새 UI 즉시 반영
const CACHE_NAME = 'healwith-v3';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 옛 캐시(healo-v1 포함) 전부 제거 — 먹통 상태였던 기기가 재방문 시 자동 복구됨
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // 페이지 이동(HTML): 항상 네트워크. 실패 시에만 오프라인 안내문.
  // (HTML 을 캐시했다 꺼내주면 stale 청크 참조로 사이트 전체가 먹통이 됨 — v1 사고)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 해시 붙은 빌드 산출물: cache-first (파일명에 해시가 있어 내용이 절대 안 변함)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 그 외(이미지·폰트 등): stale-while-revalidate 가벼운 버전 — 캐시 있으면 쓰고 백그라운드 갱신
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
