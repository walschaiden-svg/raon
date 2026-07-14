// RAON DESIGNSTUDIO — Entrance intro sequencer
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;

  const SESSION_KEY = 'raon-intro-seen';
  if (sessionStorage.getItem(SESSION_KEY)) {
    intro.setAttribute('hidden', '');
    return;
  }

  document.body.classList.add('intro-active');

  const letterGroups = Array.from(document.querySelectorAll('#introPlan [data-letter]'));
  let timers = [];
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));

  // Draw a stroke like a pen at constant speed (linear, not eased) — fast.
  const drawStroke = (el, duration, delay = 0) => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `stroke-dashoffset ${duration}ms linear ${delay}ms`;
        el.style.strokeDashoffset = '0';
      });
    });
  };
  const fadeIn = (el, prop, delay = 0) => after(delay, () => { el.style[prop] = '1'; });

  // Build one flat, ordered list of "pen strokes" per letter — every stroke
  // (guide, outline, leg, hole, circle, arrow) is drawn strictly one after
  // another, like a hand actually constructing the letter step by step.
  const buildSteps = (group) => {
    const steps = [];

    const legInks = Array.from(group.querySelectorAll('.rc-leg-ink'));
    const legPapers = Array.from(group.querySelectorAll('.rc-leg-paper'));
    const legHatches = Array.from(group.querySelectorAll('.rc-leg-hatch'));
    const legIndex = new Map(legInks.map((el, i) => [el, i]));

    const body = Array.from(group.querySelectorAll('.rc-shape, .rc-leg-ink'));
    body.forEach((el) => {
      if (legIndex.has(el)) {
        const i = legIndex.get(el);
        steps.push({ el, kind: 'leg', paper: legPapers[i], hatch: legHatches[i] });
      } else {
        steps.push({ el, kind: 'shape' });
      }
    });

    group.querySelectorAll('.rc-hole').forEach((el) => steps.push({ el, kind: 'hole' }));

    const circles = Array.from(group.querySelectorAll('.rc-circle'));
    const circleTexts = Array.from(group.querySelectorAll('.rc-circle-text'));
    circles.forEach((el, i) => steps.push({ el, kind: 'circle', text: circleTexts[i] }));

    group.querySelectorAll('.rc-arrow').forEach((el, i) => {
      const texts = group.querySelectorAll('.rc-arrow-text');
      steps.push({ el, kind: 'arrow', text: texts[i] });
    });

    return steps;
  };

  const DURATIONS = { guide: 100, shape: 130, leg: 170, hole: 110, circle: 85, arrow: 110 };
  const GAP = 25;

  const runStep = (step, t) => {
    const dur = DURATIONS[step.kind];
    switch (step.kind) {
      case 'guide':
        drawStroke(step.el, dur, t);
        break;
      case 'shape':
      case 'hole':
        drawStroke(step.el, dur, t);
        fadeIn(step.el, 'fillOpacity', t + dur - 30);
        break;
      case 'leg':
        drawStroke(step.el, dur, t);
        drawStroke(step.paper, dur, t);
        drawStroke(step.hatch, dur, t);
        break;
      case 'circle':
        drawStroke(step.el, dur, t);
        fadeIn(step.el, 'fillOpacity', t + dur - 20);
        if (step.text) fadeIn(step.text, 'opacity', t + dur + 10);
        break;
      case 'arrow':
        drawStroke(step.el, dur, t);
        if (step.text) fadeIn(step.text, 'opacity', t + dur + 10);
        break;
    }
    return dur + GAP;
  };

  // All construction guide lines (for every letter) are laid out on the
  // sheet up front, like a draftsman ruling reference lines before drawing
  // the actual object — not staggered in with each letter's own turn.
  letterGroups.forEach((group) => group.classList.add('rc-active'));
  const allGuides = document.querySelectorAll('#introPlan .rc-guide path');
  allGuides.forEach((p, i) => drawStroke(p, 110, 200 + i * 15));

  const LETTER_GAP = 100;
  let cursor = 200 + allGuides.length * 15 + 110 + 120;
  letterGroups.forEach((group) => {
    buildSteps(group).forEach((step) => { cursor += runStep(step, cursor); });
    cursor += LETTER_GAP;
  });
  const LETTER_DONE = cursor;

  const finishIntro = () => {
    timers.forEach(clearTimeout);
    intro.classList.add('is-leaving');
    document.body.classList.remove('intro-active');
    sessionStorage.setItem(SESSION_KEY, '1');
    after(750, () => intro.setAttribute('hidden', ''));
  };
  document.getElementById('introEnter')?.addEventListener('click', finishIntro);
  document.getElementById('introSkip')?.addEventListener('click', finishIntro);

  // Dimension lines/grid bubbles read as part of the base sheet, so they're
  // already in place before the letters are drawn on top of them.
  after(150, () => intro.classList.add('is-annot'));
  after(LETTER_DONE + 750, () => intro.classList.add('is-building'));
})();
