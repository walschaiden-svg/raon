/* RAON DESIGNSTUDIO — shared front-end behavior */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Header scroll state ---------- */
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('is-open');
      document.body.style.overflow = mobileNav.classList.contains('is-open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      document.body.style.overflow = '';
    }));
  }

  /* ---------- Active nav link ---------- */
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-desktop a, .mobile-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  /* ---------- Scroll reveal ---------- */
  let revealIO = null;
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not([data-reveal-bound])');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    }
    els.forEach(el => { el.dataset.revealBound = '1'; revealIO.observe(el); });
  }
  initReveal();
  window.RAON = Object.assign(window.RAON || {}, { initReveal });

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Portfolio filter ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        galleryItems.forEach(item => {
          const match = cat === 'all' || item.dataset.category === cat;
          item.classList.toggle('hide', !match);
        });
      });
    });
  }

  /* ---------- Lightbox ---------- */
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbCaption = lightbox.querySelector('.lb-caption');
    const closeBtn = lightbox.querySelector('.lb-close');

    document.querySelectorAll('[data-lightbox]').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const img = trigger.querySelector('img');
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbCaption.textContent = trigger.dataset.caption || img.alt || '';
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    });
    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    closeBtn && closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---------- Contact form validation ---------- */
  const form = document.querySelector('#quote-form');
  if (form) {
    const validators = {
      name: (v) => v.trim().length >= 2,
      phone: (v) => /^[0-9-+() ]{9,14}$/.test(v.trim()),
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      projectType: (v) => v !== '',
      message: (v) => v.trim().length >= 10,
      agree: (v, el) => el.checked,
    };

    const showError = (field, show) => {
      const wrap = field.closest('.field') || field.closest('.checkbox-field');
      if (wrap) wrap.classList.toggle('error', show);
    };

    form.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => {
        const rule = validators[el.name];
        if (!rule) return;
        const valid = el.type === 'checkbox' ? rule(el.value, el) : rule(el.value);
        if (valid) showError(el, false);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid = true;

      form.querySelectorAll('[name]').forEach(el => {
        const rule = validators[el.name];
        if (!rule) return;
        const valid = el.type === 'checkbox' ? rule(el.value, el) : rule(el.value);
        showError(el, !valid);
        if (!valid) isValid = false;
      });

      if (!isValid) {
        const firstError = form.querySelector('.error');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      form.dispatchEvent(new CustomEvent('raon:quote-valid', { detail: data }));
    });
  }
});
