import { fetchPageContent } from './content.js';
import { renderFooter } from './footer.js';

function renderInfo(c) {
  document.getElementById('ciAddress').innerHTML = `${c.address}<br><span id="ciAddressNote">${c.address_note}</span>`;
  const phone = document.getElementById('ciPhone');
  phone.textContent = c.phone;
  phone.href = `tel:${c.phone.replace(/-/g, '')}`;
  const email = document.getElementById('ciEmail');
  email.textContent = c.email;
  email.href = `mailto:${c.email}`;
  document.getElementById('ciHours').innerHTML = `${c.hours}<br>${c.hours_note}`;
  document.getElementById('ciBizNo').textContent = c.business_number;
  document.getElementById('ciCeo').textContent = c.ceo_name;
  document.getElementById('ciMapNote').textContent = c.map_note;
}

async function init() {
  const contact = await fetchPageContent('contact');
  renderInfo(contact);
  renderFooter(contact);
  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
