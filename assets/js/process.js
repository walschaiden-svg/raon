import { fetchPageContent } from './content.js';
import { initFooter } from './footer.js';
import { parseYoutubeId, youtubeThumbnail, youtubeEmbedUrl } from './youtube.js';

function renderSteps(steps) {
  document.getElementById('processSteps').innerHTML = (steps || []).map(s => `
    <div class="process-step">
      <div class="p-text reveal is-visible">
        <span class="p-step-num">${s.num}</span>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <div class="p-tags">${(s.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
      </div>
      <div class="p-media reveal is-visible"><img src="${s.image_url}" alt="${s.title}"></div>
    </div>
  `).join('');
}

function renderVideoBoard(videos) {
  const btn = document.getElementById('openVideoBoardBtn');
  const items = (videos || [])
    .map(v => ({ title: v.title, id: parseYoutubeId(v.youtube_url), isShort: /\/shorts\//.test(v.youtube_url || '') }))
    .filter(v => v.id);

  if (!items.length) { btn.style.display = 'none'; return; }

  document.getElementById('videoBoardGrid').innerHTML = items.map((v, i) => `
    <div class="vb-card" data-index="${i}">
      <div class="vb-thumb-wrap ${v.isShort ? 'is-short' : ''}">
        <img src="${youtubeThumbnail(v.id)}" alt="${v.title}" loading="lazy">
        <span class="vb-play">▶</span>
      </div>
      <div class="vb-title">${v.title}</div>
    </div>
  `).join('');

  document.querySelectorAll('.vb-card').forEach(card => {
    card.addEventListener('click', () => {
      openPlayer(items[Number(card.dataset.index)]);
    });
  });
}

function openPlayer(video) {
  const frame = document.getElementById('vbPlayerFrame');
  frame.className = `vb-player-frame ${video.isShort ? 'is-short' : ''}`;
  frame.innerHTML = `<iframe src="${youtubeEmbedUrl(video.id)}" title="${video.title}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  document.getElementById('vbPlayerLightbox').classList.add('is-open');
}

function closePlayer() {
  document.getElementById('vbPlayerLightbox').classList.remove('is-open');
  document.getElementById('vbPlayerFrame').innerHTML = '';
}

function initVideoBoard() {
  const modal = document.getElementById('videoBoardModal');
  document.getElementById('openVideoBoardBtn').addEventListener('click', () => {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
  const close = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  document.getElementById('videoBoardClose').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('vbPlayerClose').addEventListener('click', closePlayer);
  document.getElementById('vbPlayerLightbox').addEventListener('click', (e) => {
    if (e.target.id === 'vbPlayerLightbox') closePlayer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('vbPlayerLightbox').classList.contains('is-open')) closePlayer();
    else if (modal.classList.contains('is-open')) close();
  });
}

async function init() {
  const [process] = await Promise.all([
    fetchPageContent('process'),
    initFooter(),
  ]);
  renderSteps(process.steps);
  renderVideoBoard(process.showcase_videos);
  initVideoBoard();
  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
