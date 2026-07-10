import { fetchPageContent, fetchPortfolio, fetchCategories } from './content.js';
import { initFooter } from './footer.js';

let categoryLabelMap = {};

function renderHero(c) {
  document.getElementById('heroEyebrow').textContent = c.eyebrow;
  document.getElementById('heroTitle').innerHTML = `${c.title_line1}<br><em>${c.title_line2}</em>`;
  document.getElementById('heroSubtitle').textContent = c.subtitle;
  document.getElementById('heroCtaPrimary').textContent = c.cta_primary;
  document.getElementById('heroCtaSecondary').textContent = c.cta_secondary;

  const video = document.getElementById('heroVideo');
  if (c.hero_poster_url) video.setAttribute('poster', c.hero_poster_url);
  if (c.hero_video_url) {
    const source = video.querySelector('source');
    if (source.getAttribute('src') !== c.hero_video_url) {
      source.setAttribute('src', c.hero_video_url);
      video.load();
    }
  }
}

function renderStrengths(list) {
  const grid = document.getElementById('strengthsGrid');
  grid.innerHTML = list.map((s, i) => `
    <div class="strength-card reveal is-visible">
      <span class="num">${s.num}</span>
      <h3>${s.title}</h3>
      <p>${s.desc}</p>
    </div>
  `).join('');
}

function renderFeaturedWork(items) {
  const grid = document.getElementById('featuredWorkGrid');
  if (!items.length) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">등록된 프로젝트가 없습니다.</p>`;
    return;
  }
  grid.innerHTML = items.slice(0, 4).map((p, i) => `
    <a href="portfolio.html?item=${p.id}" class="work-card reveal is-visible">
      <img src="${p.cover_image_url}" alt="${p.title}">
      <div class="overlay"><div><span class="tag">${categoryLabelMap[p.category] || ''}</span><h3>${p.title}</h3></div></div>
    </a>
  `).join('');
}

async function init() {
  const [home, , portfolio, categories] = await Promise.all([
    fetchPageContent('home'),
    initFooter(),
    fetchPortfolio({ category: 'all', page: 1 }),
    fetchCategories(),
  ]);
  categoryLabelMap = Object.fromEntries(categories.map(c => [c.key, c.label]));

  renderHero(home);
  renderStrengths(home.strengths || []);
  renderFeaturedWork(portfolio.items);

  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
