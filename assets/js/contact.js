import { fetchPageContent, submitInquiry } from './content.js';
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

function initPrivacyModal(privacyText) {
  const link = document.getElementById('privacyDetailLink');
  const modal = document.getElementById('privacyModal');
  if (!link || !modal) return;

  document.getElementById('privacyModalBody').textContent = privacyText || '';

  const open = (e) => { e.preventDefault(); modal.classList.add('is-open'); };
  const close = () => modal.classList.remove('is-open');

  link.addEventListener('click', open);
  document.getElementById('privacyModalClose').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) close(); });
}

function notifyTelegram(data) {
  fetch('/.netlify/functions/notify-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch((err) => console.error('[contact] telegram notify failed:', err));
}

function initQuoteForm() {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const successBox = document.querySelector('.form-success');
  const errorBox = document.querySelector('.form-error');
  const submitBtn = form.querySelector('.form-submit');

  form.addEventListener('raon:quote-valid', async (e) => {
    const data = e.detail;
    submitBtn.disabled = true;
    submitBtn.textContent = '접수 중...';
    successBox && successBox.classList.remove('is-visible');
    errorBox && errorBox.classList.remove('is-visible');

    try {
      await submitInquiry({
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        project_type: data.projectType,
        budget: data.budget || '',
        message: data.message.trim(),
        agree: true,
      });

      notifyTelegram(data);

      form.reset();
      if (successBox) {
        successBox.classList.add('is-visible');
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => successBox.classList.remove('is-visible'), 6000);
      }
    } catch (err) {
      console.error('[contact] inquiry submit failed:', err);
      if (errorBox) {
        errorBox.classList.add('is-visible');
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '문의 접수하기';
    }
  });
}

async function init() {
  const contact = await fetchPageContent('contact');
  renderInfo(contact);
  renderFooter(contact);
  initPrivacyModal(contact.privacy_policy);
  initQuoteForm();
  if (window.RAON && window.RAON.initReveal) window.RAON.initReveal();
}

init();
