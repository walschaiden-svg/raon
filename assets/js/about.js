import { fetchPageContent } from './content.js';
import { initFooter } from './footer.js';

function renderIntro(c) {
  document.getElementById('introEyebrow').textContent = c.intro_eyebrow;
  document.getElementById('introTitle').innerHTML = `${c.intro_title_1}<br>${c.intro_title_2}`;
  document.getElementById('introBody').textContent = c.intro_body;
  document.getElementById('introImage').src = c.intro_image_url;

  document.getElementById('statRow').innerHTML = (c.stats || []).map(s => `
    <div class="stat"><div class="value">${s.value}</div><div class="label">${s.label}</div></div>
  `).join('');
}

function renderTimeline(items) {
  document.getElementById('timelineList').innerHTML = (items || []).map((t, i) => `
    <div class="timeline-item reveal is-visible">
      <div class="year">${t.year}</div>
      <div><h3>${t.title}</h3><p>${t.desc}</p></div>
    </div>
  `).join('');
}

function renderEquipment(items) {
  document.getElementById('equipGrid').innerHTML = (items || []).map((e, i) => `
    <div class="equip-card reveal is-visible">
      <span class="eq-num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${e.title}</h3>
      <div class="spec">
        ${(e.specs || []).map(s => `<span>${s.key} <b>${s.value}</b></span>`).join('')}
      </div>
    </div>
  `).join('');
}

async function init() {
  const [about] = await Promise.all([
    fetchPageContent('about'),
    initFooter(),
  ]);

  renderIntro(about);
  renderTimeline(about.timeline);
  renderEquipment(about.equipment);
  const note = document.getElementById('partnersNote');
  if (note && about.partners_note) note.textContent = about.partners_note;

  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
