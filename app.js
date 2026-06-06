/* ============================================================
   Миграция — анимации и интерактив
   ============================================================ */
(function () {
  'use strict';

  /* ---- scroll progress bar ---- */
  const prog = document.querySelector('.scroll-prog');
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (prog) prog.style.width = p + '%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- reveal on scroll (rect-based, no IntersectionObserver) ---- */
  const revealEls = [...document.querySelectorAll('.reveal')];
  const countEls = [...document.querySelectorAll('[data-count]')];
  function doReveal(el) {
    el.classList.add('in');
    // safety: if the CSS transition doesn't settle, commit the end state
    setTimeout(() => {
      if (getComputedStyle(el).opacity !== '1') {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    }, 1000);
  }
  function checkReveals() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach((el) => {
      if (el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0) doReveal(el);
    });
    countEls.forEach((el) => {
      if (el.__counted) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.__counted = true; animateCount(el); }
    });
  }
  document.addEventListener('scroll', checkReveals, { passive: true });
  window.addEventListener('resize', checkReveals);
  window.addEventListener('load', checkReveals);
  // defer first pass one frame so transitions actually fire in capable browsers
  requestAnimationFrame(checkReveals);
  // safety sweeps in case of late layout
  [120, 400, 900].forEach((t) => setTimeout(checkReveals, t));

  /* ---- number counters ---- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dur = 1300;
    const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const dec = el.dataset.dec ? parseInt(el.dataset.dec) : 0;
    function tick(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = (dec ? target.toFixed(dec) : target) + suffix;
    }
    requestAnimationFrame(tick);
  }

  /* ---- diagram tabs ---- */
  document.querySelectorAll('[data-diagram]').forEach((group) => {
    const btns = group.querySelectorAll('.diagram-tabs button');
    const panes = group.querySelectorAll('.diagram-pane');
    btns.forEach((b, i) => {
      b.addEventListener('click', () => {
        btns.forEach((x) => x.classList.remove('active'));
        panes.forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        if (panes[i]) panes[i].classList.add('active');
      });
    });
  });

  /* ---- animated flow dots along SVG paths ---- */
  function setupFlows(scope) {
    (scope || document).querySelectorAll('path.flow-line[data-flow]').forEach((path) => {
      if (path.__flowed) return;
      path.__flowed = true;
      const svg = path.ownerSVGElement;
      const ns = 'http://www.w3.org/2000/svg';
      const count = parseInt(path.dataset.dots || '2');
      const speed = parseFloat(path.dataset.speed || '4200');
      const kind = path.dataset.kind || 'flow-dot';
      const len = path.getTotalLength();
      const dots = [];
      for (let i = 0; i < count; i++) {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('r', path.dataset.r || '3.4');
        c.setAttribute('class', kind);
        svg.appendChild(c);
        dots.push({ el: c, offset: i / count });
      }
      let last = performance.now();
      function frame(now) {
        const dt = now - last; last = now;
        dots.forEach((d) => {
          d.offset = (d.offset + dt / speed) % 1;
          const pt = path.getPointAtLength(d.offset * len);
          d.el.setAttribute('cx', pt.x);
          d.el.setAttribute('cy', pt.y);
          // fade near ends
          const fade = Math.sin(d.offset * Math.PI);
          d.el.setAttribute('opacity', (0.25 + 0.75 * fade).toFixed(2));
        });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  // setup flows once SVGs are laid out
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(() => setupFlows(document));
    // re-run when a hidden diagram tab becomes visible
    document.querySelectorAll('.diagram-tabs button').forEach((b) =>
      b.addEventListener('click', () => setTimeout(() => setupFlows(document), 60))
    );
  }

  /* ---- active nav highlight (scroll-based) ---- */
  const navLinks = [...document.querySelectorAll('.topnav a')];
  const secs = navLinks.map((a) => document.querySelector(a.getAttribute('href')));
  function syncNav() {
    const mid = window.innerHeight * 0.4;
    let active = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= mid) active = i; });
    navLinks.forEach((a, i) => a.style.color = i === active ? 'var(--accent)' : '');
  }
  document.addEventListener('scroll', syncNav, { passive: true });
  syncNav();
})();
