import { fetchShowroomImages } from './content.js';

/* ---------------------------------------------------------------------------
   SHOWROOM — 마우스를 따라 포트폴리오 이미지가 생성됐다가 서서히 사라지는
   이미지 트레일. granyon.com 히어로 인터랙션에서 착안.
   전용 스코프(.sr-*)라 다른 페이지·스크립트와 충돌하지 않는다.
--------------------------------------------------------------------------- */

const SPAWN_DISTANCE = 90;   // 이 거리(px) 이상 움직여야 다음 이미지 생성
const MAX_LIVE = 18;         // 동시에 살아있는 조각 최대 수(성능 보호)

const stage = document.getElementById('srStage');
const hint = document.getElementById('srHint');

let images = [];             // { id, title, src }
let imgIndex = 0;
let last = { x: 0, y: 0 };
let hasMoved = false;
const live = [];             // 현재 DOM에 붙어있는 조각들

function preload(list) {
  list.forEach(({ src }) => { const im = new Image(); im.src = src; });
}

function nextImage() {
  const item = images[imgIndex % images.length];
  imgIndex++;
  return item;
}

function spawn(x, y) {
  if (!images.length) return;
  const data = nextImage();

  const el = document.createElement('figure');
  el.className = 'sr-trail-item';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  // 살짝의 무작위 회전으로 겹칠 때 생동감 (keyframe이 var를 읽는다)
  el.style.setProperty('--sr-rot', (Math.random() * 8 - 4).toFixed(2) + 'deg');

  const img = document.createElement('img');
  img.src = data.src;
  img.alt = data.title || '';
  img.loading = 'eager';
  img.decoding = 'async';
  el.appendChild(img);

  if (data.title) {
    const cap = document.createElement('figcaption');
    cap.className = 'sr-cap';
    cap.textContent = data.title;
    el.appendChild(cap);
  }

  stage.appendChild(el);
  live.push(el);

  el.addEventListener('animationend', () => {
    el.remove();
    const i = live.indexOf(el);
    if (i > -1) live.splice(i, 1);
  });

  // 오래된 조각이 너무 쌓이면 정리
  while (live.length > MAX_LIVE) {
    const old = live.shift();
    old && old.remove();
  }
}

function onMove(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

  if (!hasMoved) {
    last = { x, y };
    hasMoved = true;
    if (hint) hint.classList.add('is-hidden');
    spawn(x, y);
    return;
  }
  const dist = Math.hypot(x - last.x, y - last.y);
  if (dist >= SPAWN_DISTANCE) {
    last = { x, y };
    spawn(x, y);
  }
}

/* 터치/마우스 없는 환경 — 무작위 위치에 자동으로 흩뿌리는 폴백 */
function startAutoplay() {
  stage.classList.add('is-touch');
  const tick = () => {
    const rect = stage.getBoundingClientRect();
    const pad = 80;
    const x = pad + Math.random() * Math.max(1, rect.width - pad * 2);
    const y = pad + Math.random() * Math.max(1, rect.height - pad * 2);
    spawn(x, y);
  };
  tick();
  setInterval(tick, 700);
}

async function init() {
  images = await fetchShowroomImages(60);
  if (!images.length) {
    if (hint) hint.textContent = '표시할 포트폴리오 이미지가 없습니다';
    return;
  }
  preload(images);

  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) {
    startAutoplay();
    return;
  }

  stage.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
