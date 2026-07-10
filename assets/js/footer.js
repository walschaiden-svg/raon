import { fetchPageContent } from './content.js';

export function renderFooter(contact) {
  const phoneEl = document.getElementById('footerPhone');
  const emailEl = document.getElementById('footerEmail');
  if (phoneEl) { phoneEl.textContent = contact.phone; phoneEl.href = `tel:${contact.phone.replace(/-/g, '')}`; }
  if (emailEl) { emailEl.textContent = contact.email; emailEl.href = `mailto:${contact.email}`; }
  const addr = document.getElementById('footerAddress');
  if (addr) addr.textContent = contact.address;
  const bizNo = document.getElementById('footerBizNo');
  if (bizNo) bizNo.textContent = contact.business_number;
  const ceo = document.getElementById('footerCeo');
  if (ceo) ceo.textContent = contact.ceo_name;
}

export async function initFooter() {
  const contact = await fetchPageContent('contact');
  renderFooter(contact);
  return contact;
}
