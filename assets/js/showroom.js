import { fetchShowroomPosts, fetchLikedPostIds, toggleShowroomLike, fetchPageContent, getDefault } from './content.js';
import { parseYoutubeId, youtubeEmbedUrl, youtubeThumbnailCandidates, loadThumbnailInto, isShortsUrl } from './youtube.js';

/* ---------------------------------------------------------------------------
   SHOWROOM — SNS 피드

   설명 문구 없이 작업물만 훑는 화면입니다. 프로필 헤더 + 정사각 그리드로 보다가,
   하나를 누르면 세로 피드 뷰어가 그 게시물부터 열립니다.

   좋아요는 로그인 없이 누를 수 있어야 해서, 브라우저마다 한 번 만들어 저장하는
   visitor_id 로 구분합니다. 실제 기록/집계는 Supabase RPC(showroom_toggle_like)가
   맡습니다 — 익명 사용자에게 좋아요 테이블 권한을 직접 주면 남의 좋아요까지
   지울 수 있기 때문입니다. 자세한 배경은 supabase/migration_007.sql 참고.
--------------------------------------------------------------------------- */

const VISITOR_KEY = 'raon_visitor_id';
const KIND_LABEL = { photo: 'Still', reel: 'Reel', motion: 'Loop' };
const KIND_BADGE = { photo: '', reel: '▶', motion: '◉' };

/* 탭별 빈 화면 문구. "없다"는 사실만 알리는 대신, 각 탭이 무엇을 담는 자리인지
   한 줄로 알려줍니다 — 처음 온 사람에게는 그게 곧 안내가 됩니다. */
const EMPTY_COPY = {
  none:   { title: 'Nothing here yet', note: 'New work is added as it leaves the studio.' },
  all:    { title: 'Nothing here yet', note: 'New work is added as it leaves the studio.' },
  photo:  { title: 'No stills yet', note: 'Finished models, photographed in the studio.' },
  reel:   { title: 'No reels yet', note: 'Short films from the workbench.' },
  motion: { title: 'No loops yet', note: 'Small moments, on repeat.' },
};

let posts = [];          // 전체 게시물
let visible = [];        // 현재 탭에 해당하는 게시물
let liked = new Set();   // 이 방문자가 좋아요한 id
let activeTab = 'all';

/* 브라우저마다 한 번만 만들어 재사용합니다. 저장소를 비우면 좋아요 "표시"는
   풀리지만 집계 수치는 서버에 남습니다. */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2));
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // 사생활 보호 모드 등에서 localStorage가 막히면 세션 한정 id로 동작합니다.
    return null;
  }
}

let memoryVisitor = null;
function requireVisitor() {
  if (!memoryVisitor) {
    memoryVisitor = visitorId() || (crypto.randomUUID?.() || String(Date.now()));
  }
  return memoryVisitor;
}

function toast(message) {
  const el = document.getElementById('srToast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

/* 게시물이 무엇으로 그려지는지 한 곳에서 정리합니다.
   - youtube_url 이 있으면 유튜브(릴스). 그리드에는 썸네일, 뷰어에서는 플레이어.
   - 그 외에는 업로드한 파일. 확장자로 영상/이미지를 구분합니다. */
function mediaOf(post) {
  const ytId = parseYoutubeId(post.youtube_url);
  if (ytId) {
    return { kind: 'youtube', ytId, short: isShortsUrl(post.youtube_url), poster: post.poster_url || '' };
  }
  const url = post.media_url || '';
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  return { kind: isVideo ? 'video' : 'image', url, poster: post.poster_url || '' };
}

/* ---------------------------------------------------------------------------
   그리드
--------------------------------------------------------------------------- */

function renderGrid() {
  const grid = document.getElementById('srGrid');
  const empty = document.getElementById('srEmpty');

  visible = activeTab === 'all' ? posts : posts.filter(p => (p.media_type || 'photo') === activeTab);

  updateStats();
  updateTabCounts();

  if (!visible.length) {
    grid.innerHTML = '';
    const copy = posts.length ? (EMPTY_COPY[activeTab] || EMPTY_COPY.all) : EMPTY_COPY.none;
    document.getElementById('srEmptyTitle').textContent = copy.title;
    document.getElementById('srEmptyNote').textContent = copy.note;
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = visible.map((post, i) => {
    const media = mediaOf(post);
    const badge = KIND_BADGE[post.media_type] || '';
    // 움짤은 그리드에서도 소리 없이 계속 돌아갑니다 — 그게 움짤의 재미라서.
    const inner = media.kind === 'video' && post.media_type === 'motion'
      ? `<video src="${escapeAttr(media.url)}" autoplay loop muted playsinline preload="metadata"></video>`
      : `<img data-yt="${media.kind === 'youtube' ? escapeAttr(media.ytId) : ''}" data-short="${media.short ? '1' : ''}" src="${escapeAttr(media.kind === 'youtube' ? (media.poster || '') : (media.poster || media.url))}" alt="raon design 작업 ${i + 1}" loading="lazy">`;

    return `
      <button class="sr-cell" data-index="${i}" type="button" aria-label="게시물 ${i + 1} 열기">
        ${inner}
        ${badge ? `<span class="sr-badge">${badge}</span>` : ''}
        <span class="sr-cell-hover">♥ <span data-count="${escapeAttr(post.id)}">${post.like_count || 0}</span></span>
      </button>`;
  }).join('');

  // 유튜브 썸네일은 원본 비율에 가까운 파일을 골라 넣습니다(youtube.js).
  grid.querySelectorAll('img[data-yt]').forEach(img => {
    const id = img.dataset.yt;
    if (!id || img.getAttribute('src')) return;
    loadThumbnailInto(img, youtubeThumbnailCandidates(id, { short: img.dataset.short === '1' }));
  });

  grid.querySelectorAll('.sr-cell').forEach(cell => {
    cell.addEventListener('click', () => openViewer(Number(cell.dataset.index)));
  });
}

/* 탭 이름 옆 개수 — 어느 탭이 비었는지 눌러보기 전에 알 수 있습니다. */
function updateTabCounts() {
  document.querySelectorAll('.sr-tab').forEach(tab => {
    const type = tab.dataset.type;
    const n = type === 'all' ? posts.length : posts.filter(p => (p.media_type || 'photo') === type).length;
    const label = tab.dataset.label || tab.dataset.defaultLabel || tab.textContent.trim();
    if (!tab.dataset.defaultLabel) tab.dataset.defaultLabel = label;
    tab.innerHTML = `${label}<span class="sr-tab-n">${n}</span>`;
  });
}

function updateStats() {
  document.getElementById('srCountPosts').textContent = posts.length;
  document.getElementById('srCountLikes').textContent =
    posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
}

/* ---------------------------------------------------------------------------
   피드 뷰어
--------------------------------------------------------------------------- */

function postCardHtml(post, i) {
  const media = mediaOf(post);
  const kind = post.media_type || 'photo';

  let mediaHtml;
  if (media.kind === 'youtube') {
    mediaHtml = `<iframe src="${escapeAttr(youtubeEmbedUrl(media.ytId, { autoplay: false }))}" title="raon design 릴스" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%; aspect-ratio:${media.short ? '9/16' : '16/9'}; border:0;"></iframe>`;
  } else if (media.kind === 'video') {
    // 릴스는 소리를 켤 수 있게 컨트롤을 주고, 움짤은 무음 루프로 계속 돕니다.
    mediaHtml = kind === 'motion'
      ? `<video src="${escapeAttr(media.url)}" autoplay loop muted playsinline></video>`
      : `<video src="${escapeAttr(media.url)}" controls playsinline preload="metadata" ${media.poster ? `poster="${escapeAttr(media.poster)}"` : ''}></video>`;
  } else {
    mediaHtml = `<img src="${escapeAttr(media.url)}" alt="raon design 작업" loading="lazy">`;
  }

  const isLiked = liked.has(post.id);
  return `
    <article class="sr-post is-${kind}" data-id="${escapeAttr(post.id)}" data-index="${i}">
      <div class="sr-post-head">
        <span class="sr-post-avatar" aria-hidden="true">R</span>
        <span class="sr-post-author">${escapeAttr(profileHandle)}</span>
        <span class="sr-post-kind">${KIND_LABEL[kind] || ''}</span>
      </div>
      <div class="sr-post-media" data-media>
        ${mediaHtml}
        <span class="sr-burst" data-burst aria-hidden="true">♥</span>
      </div>
      <div class="sr-actions">
        <button class="sr-act sr-act-like${isLiked ? ' is-liked' : ''}" data-like type="button" aria-pressed="${isLiked}" aria-label="좋아요">${isLiked ? '♥' : '♡'}</button>
        <button class="sr-act sr-act-share" data-share type="button" aria-label="공유">↗</button>
      </div>
      <div class="sr-likes"><strong data-count="${escapeAttr(post.id)}">${post.like_count || 0}</strong> likes</div>
    </article>`;
}

/* 한 번에 한 게시물만 띄우고 좌우 화살표로 옮겨 다닙니다(포트폴리오 상세와 동일).
   화면을 갈아끼울 때마다 stage 를 통째로 다시 그리므로, 앞 게시물의 영상 재생도
   자연스럽게 멈춥니다. */
let viewerIndex = 0;

function openViewer(startIndex) {
  viewerIndex = startIndex;
  renderViewer();

  const viewer = document.getElementById('srViewer');
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderViewer() {
  const stage = document.getElementById('srViewerStage');
  const post = visible[viewerIndex];
  if (!post) return;

  stage.innerHTML = postCardHtml(post, viewerIndex);
  stage.scrollTop = 0;
  bindPostCards(stage);

  document.getElementById('srPrevBtn').disabled = viewerIndex <= 0;
  document.getElementById('srNextBtn').disabled = viewerIndex >= visible.length - 1;
}

function navigateViewer(delta) {
  const next = viewerIndex + delta;
  if (next < 0 || next >= visible.length) return;
  viewerIndex = next;
  renderViewer();
}

function viewerIsOpen() {
  return document.getElementById('srViewer').classList.contains('is-open');
}

function closeViewer() {
  const viewer = document.getElementById('srViewer');
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  // 재생을 확실히 멈추려면 DOM을 비워야 합니다 — 숨기기만 하면 소리가 계속 납니다.
  document.getElementById('srViewerStage').innerHTML = '';
  document.body.style.overflow = '';
}

function bindPostCards(root) {
  root.querySelectorAll('.sr-post').forEach(card => {
    const id = card.dataset.id;
    const post = posts.find(p => p.id === id);
    if (!post) return;

    card.querySelector('[data-like]').addEventListener('click', () => sendLike(post, { force: false }));
    card.querySelector('[data-share]').addEventListener('click', () => sharePost(post));

    const mediaEl = card.querySelector('[data-media]');

    // 더블클릭/더블탭 → 좋아요. 인스타처럼 "취소"는 되지 않고 켜지기만 합니다.
    mediaEl.addEventListener('dblclick', () => sendLike(post, { force: true }));

    let lastTap = 0;
    mediaEl.addEventListener('touchend', (e) => {
      // 영상 컨트롤(재생/음소거 등)을 누른 건 더블탭으로 세지 않습니다.
      if (e.target.tagName === 'VIDEO' && e.target.controls) return;
      const now = Date.now();
      if (now - lastTap < 320) {
        e.preventDefault();
        sendLike(post, { force: true });
        lastTap = 0;
      } else {
        lastTap = now;
      }
    });
  });
}

/* force = true 이면(더블탭) 이미 좋아요한 게시물은 그대로 두고 하트만 띄웁니다. */
async function sendLike(post, { force }) {
  const alreadyLiked = liked.has(post.id);
  if (force) {
    burst(post.id);
    if (alreadyLiked) return;
  }

  // 서버 응답을 기다리지 않고 먼저 반영해, 누르는 느낌이 끊기지 않게 합니다.
  const optimistic = !alreadyLiked;
  applyLikeState(post, optimistic, (post.like_count || 0) + (optimistic ? 1 : -1));

  try {
    const { liked: nowLiked, count } = await toggleShowroomLike(post.id, requireVisitor());
    applyLikeState(post, nowLiked, count);
  } catch (err) {
    console.error('[showroom] like failed:', err);
    applyLikeState(post, alreadyLiked, post.like_count || 0);  // 되돌리기
    toast('좋아요를 저장하지 못했습니다.');
  }
}

function applyLikeState(post, isLiked, count) {
  post.like_count = Math.max(0, count);
  if (isLiked) liked.add(post.id); else liked.delete(post.id);

  document.querySelectorAll(`[data-count="${CSS.escape(post.id)}"]`).forEach(el => {
    el.textContent = post.like_count;
  });
  const card = document.querySelector(`.sr-post[data-id="${CSS.escape(post.id)}"]`);
  if (card) {
    const btn = card.querySelector('[data-like]');
    btn.classList.toggle('is-liked', isLiked);
    btn.textContent = isLiked ? '♥' : '♡';
    btn.setAttribute('aria-pressed', String(isLiked));
  }
  updateStats();
}

function burst(postId) {
  const card = document.querySelector(`.sr-post[data-id="${CSS.escape(postId)}"]`);
  const el = card?.querySelector('[data-burst]');
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;   // 리플로우를 강제해야 같은 애니메이션이 다시 돕니다
  el.classList.add('pop');
}

async function sharePost(post) {
  const url = new URL(window.location.href);
  url.searchParams.set('post', post.id);
  const link = url.toString();

  // 모바일에서는 OS 공유 시트가 뜨고, 안 되면 링크를 복사합니다.
  if (navigator.share) {
    try {
      await navigator.share({ title: 'RAON DESIGNSTUDIO', url: link });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;   // 사용자가 공유창을 닫은 것
    }
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('링크가 복사되었습니다.');
  } catch {
    toast(link);
  }
}

/* ---------------------------------------------------------------------------
   INIT
--------------------------------------------------------------------------- */

/* 탭 컨테이너 하나에만 리스너를 답니다. 버튼마다 거는 방식은 버튼 안에 나중에
   추가되는 개수 뱃지 같은 자식 요소나 재렌더에 영향을 받을 수 있어서, 클릭이
   어디에 떨어지든 closest()로 되짚는 위임 방식이 확실합니다. */
function initTabs() {
  const tabs = document.getElementById('srTabs');
  if (!tabs) return;

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.sr-tab');
    if (!tab || !tabs.contains(tab)) return;

    tabs.querySelectorAll('.sr-tab').forEach(t => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    activeTab = tab.dataset.type;
    renderGrid();
  });
}

/* 프로필(사진·이름·소개글·탭 이름)은 어드민 "SNS 관리"에서 편집합니다. */
function applyProfile(c) {
  const avatar = document.querySelector('.sr-avatar');
  if (c.avatar_url) {
    avatar.innerHTML = `<img src="${escapeAttr(c.avatar_url)}" alt="">`;
    avatar.classList.add('has-image');
  }
  document.querySelector('.sr-handle').textContent = c.handle || 'raon design';
  document.querySelector('.sr-verified').style.display = c.verified ? '' : 'none';

  const bio = document.querySelector('.sr-bio');
  bio.textContent = '';
  String(c.bio || '').split('\n').forEach((line, i) => {
    if (i) bio.appendChild(document.createElement('br'));
    bio.appendChild(document.createTextNode(line));
  });

  document.querySelectorAll('.sr-tab').forEach(tab => {
    const label = c[`tab_${tab.dataset.type}`];
    if (label) tab.dataset.label = label;
  });
  profileHandle = c.handle || 'raon design';
}

let profileHandle = 'raon design';

async function init() {
  // 탭/닫기 같은 조작은 데이터를 불러오기 전에 먼저 살려둡니다 — 뒤쪽에서
  // 무슨 일이 생겨도 화면이 굳지 않도록.
  initTabs();
  document.getElementById('srViewerClose').addEventListener('click', closeViewer);
  document.getElementById('srPrevBtn').addEventListener('click', () => navigateViewer(-1));
  document.getElementById('srNextBtn').addEventListener('click', () => navigateViewer(1));

  // 카드 바깥의 빈 공간을 누르면 닫힙니다 — 카드나 화살표를 누른 건 target 이
  // 그쪽이므로 걸리지 않습니다.
  document.getElementById('srViewer').addEventListener('click', (e) => {
    if (e.target.id === 'srViewer' || e.target.id === 'srViewerStage') closeViewer();
  });

  document.addEventListener('keydown', (e) => {
    if (!viewerIsOpen()) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') navigateViewer(-1);
    if (e.key === 'ArrowRight') navigateViewer(1);
  });

  try {
    applyProfile({ ...getDefault('showroom'), ...(await fetchPageContent('showroom')) });
  } catch (err) {
    console.error('[showroom] profile load failed:', err);
  }

  posts = await fetchShowroomPosts();
  renderGrid();

  // 좋아요 표시는 게시물이 그려진 뒤에 채웁니다 — 목록이 먼저 떠야 체감이 빠릅니다.
  liked = await fetchLikedPostIds(requireVisitor());
  if (liked.size) renderGrid();

  // 공유 링크(?post=)로 들어오면 그 게시물부터 뷰어를 엽니다.
  const wanted = new URLSearchParams(window.location.search).get('post');
  if (wanted) {
    const idx = visible.findIndex(p => p.id === wanted);
    if (idx >= 0) openViewer(idx);
  }
}

init().catch(err => {
  // 조용히 죽으면 "눌러도 아무 반응이 없는" 화면이 되므로 콘솔에 남깁니다.
  console.error('[showroom] init failed:', err);
});
