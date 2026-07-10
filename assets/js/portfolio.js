import { fetchPortfolio, fetchPortfolioItem, fetchPortfolioFilters, fetchCategories, fetchPortfolioIds, fetchPageContent, getDefault } from './content.js';
import { initFooter } from './footer.js';
import { parseYoutubeId, youtubeEmbedUrl } from './youtube.js';
import { getTemplate } from './detail-layouts.js';

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

function renderPagination({ page, totalPages }) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const buttons = [];
  buttons.push(`<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>이전</button>`);

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  let prev = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (!pages.has(p)) continue;
    if (prev && p - prev > 1) buttons.push(`<span class="page-ellipsis">…</span>`);
    buttons.push(`<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`);
    prev = p;
  }

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
function renderCanvasNode(node, images, title, flex = 1, extraStyle = '') {
  if (node.leaf === 'empty') {
    return `<div class="pf-canvas-empty" style="flex:${flex}; ${extraStyle}"></div>`;
  }
  if (typeof node.leaf === 'number') {
    const src = images[node.leaf];
    return `<div class="pf-canvas-cell" data-index="${node.leaf}" style="flex:${flex}; ${extraStyle}">
      <img src="${src}" alt="${title}" loading="lazy">
    </div>`;
  }
  const dir = node.split === 'x' ? 'row' : 'column';
  const children = node.children
    .map((child, i) => renderCanvasNode(child, images, title, node.ratio[i]))
    .join('');
  return `<div class="pf-canvas-split" data-dir="${node.split}" style="flex:${flex}; flex-direction:${dir}; ${extraStyle}">${children}</div>`;
}

/* 스크롤 없이 항상 한 화면(캔버스 높이) 안에 맞추고, 사진이 작게 보이는 건
   클릭 시 라이트박스 확대로 보완합니다. */
function renderDetailCanvas(images, variant, title) {
  const template = getTemplate(images.length, variant);
  return renderCanvasNode(template, images, title);
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

  const images = buildDetailImages(item);
  const ytId = parseYoutubeId(item.youtube_url);

  const videoHtml = ytId
    ? `<div class="pf-detail-video"><iframe src="${youtubeEmbedUrl(ytId)}" title="${item.title}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
    : '';
  const canvasHtml = images.length ? renderDetailCanvas(images, item.detail_layout || 0, item.title) : '';

  document.getElementById('pfModalCanvas').innerHTML = `${videoHtml}${canvasHtml}`;
  document.getElementById('pfModalInfo').innerHTML = renderInfoCard(item);

  // 갤러리 썸네일 → 상세 이미지로 이어지는 view-transition 모프는 영상이 없을 때만
  // (기존에도 영상이 첫 슬라이드면 모프를 적용하지 않았음) 첫 번째 캔버스 사진에 건다.
  if (!ytId && images.length) {
    const firstImg = document.querySelector('#pfModalCanvas .pf-canvas-cell img');
    if (firstImg) firstImg.style.viewTransitionName = VT_DETAIL_IMG;
  }

  document.querySelectorAll('#pfModalCanvas .pf-canvas-cell').forEach(cell => {
    cell.addEventListener('click', () => openLightbox(images[Number(cell.dataset.index)]));
  });

  const modal = document.getElementById('pfModal');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  currentDetailId = String(id);
  updateNavArrows();

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
  const url = new URL(window.location);
  url.searchParams.delete('item');
  window.history.replaceState({}, '', url);
}

function openLightbox(src) {
  const lightbox = document.getElementById('pfLightbox');
  document.getElementById('pfLightboxImg').src = src;
  lightbox.classList.add('is-open');
}

function closeLightbox() {
  document.getElementById('pfLightbox').classList.remove('is-open');
  document.getElementById('pfLightboxImg').src = '';
}

function initModal() {
  document.getElementById('pfModalClose').addEventListener('click', closeDetail);
  document.getElementById('pfModal').addEventListener('click', (e) => {
    if (e.target.id === 'pfModal') closeDetail();
  });
  document.getElementById('pfPrevBtn').addEventListener('click', () => navigateDetail(-1));
  document.getElementById('pfNextBtn').addEventListener('click', () => navigateDetail(1));
  document.getElementById('pfLightboxClose').addEventListener('click', closeLightbox);
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
    if (!modalOpen || lightboxOpen) return;
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
