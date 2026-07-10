import { fetchPageContent } from './content.js';
import { initFooter } from './footer.js';

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

async function init() {
  const [process] = await Promise.all([
    fetchPageContent('process'),
    initFooter(),
  ]);
  renderSteps(process.steps);
  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
