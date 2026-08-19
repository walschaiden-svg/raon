import { fetchPortfolio, fetchPortfolioItem, fetchPortfolioFilters, fetchCategories, fetchPortfolioIds, fetchPageContent, getDefault } from './content.js';
import { initFooter } from './footer.js';
import { parseYoutubeId, youtubeEmbedUrl, youtubeThumbnailCandidates, loadThumbnailInto, isShortsUrl } from './youtube.js';
import { getTemplate, MAX_DETAIL_IMAGES } from './detail-layouts.js';

const state = { category: 'all', region: 'all', scale: 'all', page: 1 };
const itemCache = new Map();
let categoryLabelMap = {};
let fieldLabels = getDefault('portfolio').field_labels;
let navIds = []; // ids of every item matching the current filters, in display order (spans all pages)
let currentDetailId = null;

function renderGrid(items) {
  const grid = document.getElementById('galleryGrid');
  if (!items.length) {
    grid.innerHTML = `<p class="text-muted" style="text-align:center; padding:60px 0;">해당 조건의 프로젝트가 없습니다.</p>`;
    return;
  }
  grid.innerHTML = items.map((p, i) => `
    <div class="gallery-item" data-id="${p.id}" style="--i:${i}">
      <img src="${p.cover_image_url}" alt="${p.title}">
      <div class="g-curtain"></div>
      <span class="g-view">자세히 보기</span>
      <div class="g-overlay"><span class="g-cat">${categoryLabelMap[p.category] || ''}</span><span class="g-title">${p.title}</span></div>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => openDetailFrom(el));
  });

  // mask-curtain reveal: staggered per tile, triggered right away since the
  // grid is generally already in view when this renders (initial load or
  // after a filter/pagination change)
  requestAnimationFrame(() => {
    grid.querySelectorAll('.gallery-item').forEach(el => el.classList.add('in'));
  });
}

const PAGE_BLOCK = 10; // page numbers shown at once

function renderPagination({ page, totalPages }) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const buttons = [];
  buttons.push(`<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>이전</button>`);

  // Numbers run in blocks of 10 (1..10, then 11..20, ...) so the bar always
  // reads as a plain 1,2,3...10 run rather than a condensed set with ellipses.
  const blockStart = Math.floor((page - 1) / PAGE_BLOCK) * PAGE_BLOCK + 1;
  const blockEnd = Math.min(blockStart + PAGE_BLOCK - 1, totalPages);

  if (blockStart > 1) buttons.push(`<span class="page-ellipsis">…</span>`);
  for (let p = blockStart; p <= blockEnd; p++) {
    buttons.push(`<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`);
  }
  if (blockEnd < totalPages) buttons.push(`<span class="page-ellipsis">…</span>`);

  buttons.push(`<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>다음</button>`);
  el.innerHTML = buttons.join('');

  el.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (p < 1 || p > totalPages || p === state.page) return;
      state.page = p;
      load();
      document.getElementById('filterBar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

async function load() {
  const [result] = await Promise.all([
    fetchPortfolio(state),
    fetchPortfolioIds(state).then(ids => { navIds = ids; }),
  ]);
  result.items.forEach(item => itemCache.set(String(item.id), item));
  document.getElementById('resultCount').textContent = `총 ${result.total}개의 프로젝트`;
  renderGrid(result.items);
  renderPagination(result);
}

function renderCategoryTabs(categories) {
  const bar = document.getElementById('filterBar');
  const buttons = [`<button class="filter-btn ${state.category === 'all' ? 'active' : ''}" data-filter="all">전체</button>`]
    .concat(categories.map(c => `<button class="filter-btn ${state.category === c.key ? 'active' : ''}" data-filter="${c.key}">${c.label}</button>`));
  bar.innerHTML = buttons.join('');

  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.filter;
      state.page = 1;
      load();
    });
  });
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  const placeholder = select.options[0];
  select.innerHTML = '';
  select.appendChild(placeholder);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

async function initFilters() {
  const [categories, filters, portfolioContent] = await Promise.all([
    fetchCategories(), fetchPortfolioFilters(), fetchPageContent('portfolio'),
  ]);
  categoryLabelMap = Object.fromEntries(categories.map(c => [c.key, c.label]));
  fieldLabels = portfolioContent.field_labels || fieldLabels;

  document.getElementById('regionFilterLabel').textContent = fieldLabels.region;
  document.getElementById('scaleFilterLabel').textContent = fieldLabels.scale;

  renderCategoryTabs(categories);
  populateSelect('regionFilter', filters.regions);
  populateSelect('scaleFilter', filters.scales);

  document.getElementById('regionFilter').addEventListener('change', (e) => {
    state.region = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById('scaleFilter').addEventListener('change', (e) => {
    state.scale = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById('filterReset').addEventListener('click', () => {
    state.category = 'all'; state.region = 'all'; state.scale = 'all'; state.page = 1;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('scaleFilter').value = 'all';
    load();
  });
}

function buildDetailImages(item) {
  return (item.images && item.images.length ? item.images : [item.cover_image_url]).filter(Boolean);
}

/* 캔버스에 놓이는 것들 = 영상(있으면) + 사진들.
   예전에는 영상이 콜라주 위에 별도 블록으로 얹혀서, aspect-ratio 16/9 + flex-shrink:0
   때문에 고정 높이 캔버스를 거의 다 차지했고 그 아래 사진 그리드가 찌그러졌습니다.
   영상을 콜라주의 한 칸으로 편입하면 높이를 다투는 구간 자체가 없어집니다. */
function buildDetailTiles(item) {
  const tiles = [];
  const ytId = parseYoutubeId(item.youtube_url);
  if (ytId) tiles.push({ type: 'video', id: ytId, short: isShortsUrl(item.youtube_url) });
  buildDetailImages(item).forEach(src => tiles.push({ type: 'image', src }));
  // 템플릿은 최대 9칸까지만 정의되어 있습니다(detail-layouts.js).
  return tiles.slice(0, MAX_DETAIL_IMAGES);
}

function renderInfoCard(item) {
  return `
    <span class="pf-type">${categoryLabelMap[item.category] || ''}</span>
    <h3>${item.title}</h3>
    <div class="pf-spec-list">
      ${item.client ? `<div class="pf-spec-row"><span>${fieldLabels.client}</span><span>${item.client}</span></div>` : ''}
      ${item.region ? `<div class="pf-spec-row"><span>${fieldLabels.region}</span><span>${item.region}</span></div>` : ''}
      ${item.scale ? `<div class="pf-spec-row"><span>${fieldLabels.scale}</span><span>${item.scale}</span></div>` : ''}
      ${item.duration ? `<div class="pf-spec-row"><span>${fieldLabels.duration}</span><span>${item.duration}</span></div>` : ''}
      ${item.year ? `<div class="pf-spec-row"><span>${fieldLabels.year}</span><span>${item.year}</span></div>` : ''}
    </div>
    <div class="pf-desc-label">프로젝트 소개</div>
    <div class="pf-desc">${item.description || '상세 설명이 등록되지 않았습니다.'}</div>
  `;
}

/* BSP 트리(assets/js/detail-layouts.js)를 그대로 중첩 flexbox로 그립니다.
   split 노드는 방향(가로/세로)과 비율(flex-grow)만 자식에게 넘기고, leaf 노드가
   실제 사진을 렌더링합니다 — 좌표 계산 없이 항상 빈틈없이 채워집니다. 프로젝트
   설명은 이 캔버스가 아니라 별도 정보 패널(renderInfoCard)에 고정 배치됩니다. */
function renderCanvasNode(node, tiles, title, flex = 1, extraStyle = '') {
  if (node.leaf === 'empty') {
    return `<div class="pf-canvas-empty" style="flex:${flex}; ${extraStyle}"></div>`;
  }
  if (typeof node.leaf === 'number') {
    const tile = tiles[node.leaf];
    if (!tile) return `<div class="pf-canvas-empty" style="flex:${flex}; ${extraStyle}"></div>`;
    const isVideo = tile.type === 'video';
    const aspectAttr = isVideo ? ` data-aspect="${tile.short ? VIDEO_ASPECT.short : VIDEO_ASPECT.long}"` : '';
    return `<div class="pf-canvas-cell${isVideo ? ' is-video' : ''}" data-index="${node.leaf}"${aspectAttr} style="flex:${flex}; ${extraStyle}">
      ${isVideo ? renderVideoTile(tile, title) : `<img src="${tile.src}" alt="${title}" loading="lazy">`}
    </div>`;
  }
  const dir = node.split === 'x' ? 'row' : 'column';
  const children = node.children
    .map((child, i) => renderCanvasNode(child, tiles, title, node.ratio[i]))
    .join('');
  return `<div class="pf-canvas-split" data-dir="${node.split}" style="flex:${flex}; flex-direction:${dir}; ${extraStyle}">${children}</div>`;
}

/* 영상 칸은 iframe이 아니라 유튜브 썸네일입니다 — 이미지는 칸 모양을 스스로
   바꾸지 못하므로 쇼츠(9:16)든 롱폼(16:9)든 그리드가 깨질 수 없습니다.
   비율이 칸과 안 맞아 생기는 여백은 같은 썸네일을 블러로 깔아 메웁니다:
   검은 레터박스도, 잘려나가는 화면도 없이 어떤 비율이든 수용됩니다. */
function renderVideoTile(tile, title) {
  return `
    <img class="pf-tile-blur" alt="" aria-hidden="true">
    <img class="pf-tile-sharp" alt="${title} 영상">
    <span class="pf-tile-play" aria-hidden="true">▶</span>
  `;
}

const VIDEO_ASPECT = { short: 9 / 16, long: 16 / 9 };

/* 칸과 영상의 가로세로 성향이 비슷하면 cover로 꽉 채웁니다 — 이때 잘려나가는
   양은 얼마 안 되고, 화면이 칸을 가득 메우는 편이 훨씬 낫습니다. 세로 영상이
   가로로 넓은 칸에 걸리는 것처럼 성향이 크게 어긋날 때만 contain + 블러 배경으로
   돌아갑니다(그때는 cover로 채우면 화면 대부분이 잘려나가기 때문입니다). */
function fitVideoTiles() {
  document.querySelectorAll('#pfModalCanvas .pf-canvas-cell.is-video').forEach(cell => {
    const native = Number(cell.dataset.aspect);
    const rect = cell.getBoundingClientRect();
    if (!native || !rect.width || !rect.height) return;
    const ratio = (rect.width / rect.height) / native;
    cell.classList.toggle('fill', ratio > 0.62 && ratio < 1.6);
  });
}

/* 스크롤 없이 항상 한 화면(캔버스 높이) 안에 맞추고, 사진이 작게 보이는 건
   클릭 시 라이트박스 확대로 보완합니다. */
function renderDetailCanvas(tiles, variant, title) {
  const template = getTemplate(tiles.length, variant);
  return renderCanvasNode(template, tiles, title);
}

/* ---------------------------------------------------------------------------
   상세 프로젝트 SEO 메타데이터

   어드민에서 입력한 태그를 검색엔진에만 노출합니다. 방문자 화면에는 아무것도
   그리지 않습니다 -- 문서 <head> 의 <meta name="keywords"> 와 JSON-LD
   구조화 데이터로만 나갑니다. 둘 다 태생적으로 화면에 렌더링되지 않는
   자리라, 사람에게는 숨기고 크롤러에게만 보여주는 것이 아니라 "사람이 읽는
   자리에는 원래 없는 정보"로 취급됩니다.

   화면 밖으로 밀어낸 텍스트 블록(text-indent, display:none 등)에 키워드를
   채우는 방식은 쓰지 않았습니다. 그건 검색엔진이 클로킹/키워드 스터핑으로
   판정해 색인에서 불이익을 주는 기법입니다.
--------------------------------------------------------------------------- */
const SEO_JSONLD_ID = 'pf-detail-jsonld';

function metaKeywordsEl() {
  let el = document.querySelector('meta[name="keywords"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'keywords');
    document.head.appendChild(el);
  }
  return el;
}

function applyDetailSeo(item) {
  const tags = (item.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  metaKeywordsEl().setAttribute('content', tags.join(', '));

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: item.title,
    url: window.location.href,
    creator: { '@type': 'Organization', name: 'RAON DESIGNSTUDIO' },
  };
  if (item.description) jsonld.description = item.description;
  if (item.cover_image_url) jsonld.image = item.cover_image_url;
  if (item.year) jsonld.dateCreated = item.year;
  if (tags.length) jsonld.keywords = tags;

  let script = document.getElementById(SEO_JSONLD_ID);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = SEO_JSONLD_ID;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonld);
}

function clearDetailSeo() {
  const meta = document.querySelector('meta[name="keywords"]');
  if (meta) meta.remove();
  const script = document.getElementById(SEO_JSONLD_ID);
  if (script) script.remove();
}

const VT_DETAIL_IMG = 'pf-detail-img';

function openDetailFrom(tileEl) {
  const id = tileEl.dataset.id;
  if (!document.startViewTransition) { openDetail(id); return; }

  const thumbImg = tileEl.querySelector('img');
  thumbImg.style.viewTransitionName = VT_DETAIL_IMG;
  document.startViewTransition(async () => {
    await openDetail(id);
    // The grid thumbnail and the new modal image briefly both exist in the
    // live DOM once openDetail() finishes. Both carrying the same
    // view-transition-name at that point violates the API's uniqueness
    // rule and silently cancels the whole transition — clear the old one
    // now so only the modal image holds the name when the "new" state is
    // captured (right as this callback's promise resolves).
    thumbImg.style.viewTransitionName = '';
  });
}

async function openDetail(id) {
  let item = itemCache.get(String(id));
  if (!item) item = await fetchPortfolioItem(id);
  if (!item) return;

  const tiles = buildDetailTiles(item);

  document.getElementById('pfModalCanvas').innerHTML =
    tiles.length ? renderDetailCanvas(tiles, item.detail_layout || 0, item.title) : '';
  document.getElementById('pfModalInfo').innerHTML = renderInfoCard(item);

  // 갤러리 썸네일 → 상세 이미지로 이어지는 view-transition 모프는 첫 칸이 사진일
  // 때만 건다 (첫 칸이 영상이면 이어질 그림이 없다).
  if (tiles[0]?.type === 'image') {
    const firstImg = document.querySelector('#pfModalCanvas .pf-canvas-cell img');
    if (firstImg) firstImg.style.viewTransitionName = VT_DETAIL_IMG;
  }

  document.querySelectorAll('#pfModalCanvas .pf-canvas-cell').forEach(cell => {
    cell.addEventListener('click', () => openLightbox(tiles, Number(cell.dataset.index)));
  });

  document.querySelectorAll('#pfModalCanvas .pf-canvas-cell.is-video').forEach(cell => {
    const tile = tiles[Number(cell.dataset.index)];
    loadThumbnailInto(
      [cell.querySelector('.pf-tile-blur'), cell.querySelector('.pf-tile-sharp')],
      youtubeThumbnailCandidates(tile.id, { short: tile.short }),
    );
  });
  // 칸 크기는 flex 레이아웃이 끝나야 확정됩니다.
  requestAnimationFrame(fitVideoTiles);

  const modal = document.getElementById('pfModal');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  currentDetailId = String(id);
  updateNavArrows();
  applyDetailSeo(item);

  const url = new URL(window.location);
  url.searchParams.set('item', id);
  window.history.replaceState({}, '', url);
}

function updateNavArrows() {
  const idx = navIds.indexOf(currentDetailId);
  document.getElementById('pfPrevBtn').disabled = idx <= 0;
  document.getElementById('pfNextBtn').disabled = idx === -1 || idx >= navIds.length - 1;
}

function navigateDetail(delta) {
  const idx = navIds.indexOf(currentDetailId);
  if (idx === -1) return;
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= navIds.length) return;
  openDetail(navIds[nextIdx]);
}

function closeDetail() {
  document.getElementById('pfModal').classList.remove('is-open');
  document.getElementById('pfModalCanvas').innerHTML = '';
  document.body.style.overflow = '';
  clearDetailSeo();
  const url = new URL(window.location);
  url.searchParams.delete('item');
  window.history.replaceState({}, '', url);
}

/* 라이트박스는 열릴 때 해당 프로젝트의 사진 목록 전체를 넘겨받아, 확대한
   상태에서도 좌우 화살표로 바로 다음 사진으로 넘어갈 수 있게 합니다. */
let lightboxTiles = [];
let lightboxIndex = 0;

function openLightbox(tiles, index) {
  lightboxTiles = tiles;
  lightboxIndex = index;
  showLightboxTile();
  document.getElementById('pfLightbox').classList.add('is-open');
}

/* 사진이면 <img>를, 영상이면 유튜브 플레이어를 띄웁니다. 재생 틀의 비율은
   쇼츠 9:16 / 일반 16:9 로 나눠 잡아 세로 영상이 레터박스되지 않게 합니다
   (process 페이지의 .vb-player-frame 과 같은 방식). */
function showLightboxTile() {
  const tile = lightboxTiles[lightboxIndex];
  const img = document.getElementById('pfLightboxImg');
  const videoBox = document.getElementById('pfLightboxVideo');
  if (!tile) return;

  if (tile.type === 'video') {
    img.style.display = 'none';
    img.removeAttribute('src');
    videoBox.className = `pf-lightbox-video${tile.short ? ' is-short' : ''}`;
    videoBox.style.display = '';
    videoBox.innerHTML = `<iframe src="${youtubeEmbedUrl(tile.id)}" title="프로젝트 영상" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  } else {
    stopLightboxVideo();
    img.style.display = '';
    img.src = tile.src;
  }
  updateLightboxArrows();
}

/* iframe을 비워야 실제로 재생이 멈춥니다 — 숨기기만 하면 소리가 계속 납니다. */
function stopLightboxVideo() {
  const videoBox = document.getElementById('pfLightboxVideo');
  videoBox.style.display = 'none';
  videoBox.innerHTML = '';
}

function updateLightboxArrows() {
  document.getElementById('pfLightboxPrev').disabled = lightboxIndex <= 0;
  document.getElementById('pfLightboxNext').disabled = lightboxIndex >= lightboxTiles.length - 1;
}

function navigateLightbox(delta) {
  const next = lightboxIndex + delta;
  if (next < 0 || next >= lightboxTiles.length) return;
  lightboxIndex = next;
  showLightboxTile();
}

function closeLightbox() {
  document.getElementById('pfLightbox').classList.remove('is-open');
  const img = document.getElementById('pfLightboxImg');
  img.removeAttribute('src');
  img.style.display = '';
  stopLightboxVideo();
  lightboxTiles = [];
  lightboxIndex = 0;
}

function initModal() {
  let fitTimer;
  window.addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitVideoTiles, 150);
  });

  document.getElementById('pfModalClose').addEventListener('click', closeDetail);
  document.getElementById('pfModal').addEventListener('click', (e) => {
    if (e.target.id === 'pfModal') closeDetail();
  });
  document.getElementById('pfPrevBtn').addEventListener('click', () => navigateDetail(-1));
  document.getElementById('pfNextBtn').addEventListener('click', () => navigateDetail(1));
  document.getElementById('pfLightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('pfLightboxPrev').addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('pfLightboxNext').addEventListener('click', () => navigateLightbox(1));
  document.getElementById('pfLightbox').addEventListener('click', (e) => {
    if (e.target.id === 'pfLightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    const lightboxOpen = document.getElementById('pfLightbox').classList.contains('is-open');
    const modalOpen = document.getElementById('pfModal').classList.contains('is-open');

    if (e.key === 'Escape') {
      if (lightboxOpen) closeLightbox();
      else if (modalOpen) closeDetail();
      return;
    }
    if (lightboxOpen) {
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
      return;
    }
    if (!modalOpen) return;
    if (e.key === 'ArrowLeft') navigateDetail(-1);
    if (e.key === 'ArrowRight') navigateDetail(1);
  });
}

async function init() {
  initFooter();
  initModal();
  await initFilters();
  await load();

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('item');
  if (itemId) openDetail(itemId);
}

init();
