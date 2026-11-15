/* =========================================================
   FLY — the mountains stay on screen; scrolling flies the
   "camera" from peak to peak, and each page rises up after it.
   ========================================================= */
(() => {
  const pano = document.querySelector('[data-fly-pano]');
  const canvases = Array.from(pano.querySelectorAll('.pano-canvas'));
  const gaps = Array.from(document.querySelectorAll('[data-fly-target]'));
  const introContent = document.querySelector('.fly-intro .landing-content');

  // Phones show the upright drawing, laptops/tablets the wide one
  let canvas, peaks, summits, vw, vh, cw, ch, zoom;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas = canvases.find((c) => getComputedStyle(c).display !== 'none') || canvases[0];
    const portrait = canvas.classList.contains('pano-canvas--portrait');
    cw = vw;
    ch = portrait ? vw * 560 / 600 : vw * 420 / 1600;
    zoom = portrait ? 1.7 : 2.1;
    peaks = Array.from(canvas.querySelectorAll('.peak'));
    // each peak's summit, read from its flag position (--x from the left, --y from the bottom)
    summits = peaks.map((peak) => [
      parseFloat(peak.style.getPropertyValue('--x')) / 100,
      1 - parseFloat(peak.style.getPropertyValue('--y')) / 100,
    ]);
    pano.style.setProperty('--cw', `${cw}px`);
    pano.style.setProperty('--ch', `${ch}px`);
    document.documentElement.style.setProperty('--ch', `${ch}px`);
  }

  // Keep the zoomed canvas covering the screen edges and bottom
  function clampState(s, tx, ty) {
    tx = Math.min(0, Math.max(tx, vw - s * cw));
    ty = Math.max(ty, ch * (1 - s));
    return { s, tx, ty };
  }

  function overview() {
    return { s: 1, tx: 0, ty: 0 };
  }

  function peakState(i) {
    const s = zoom;
    const px = summits[i][0] * cw;
    const py = summits[i][1] * ch;
    const tx = vw / 2 - s * px;
    const ty = vh * 0.42 - (vh - ch) - s * py;
    return clampState(s, tx, ty);
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  function render() {
    const y = window.scrollY;
    let prev = overview();
    let prevIndex = -1;
    let state = prev;
    let active = -1;

    for (const gap of gaps) {
      const target = gap.dataset.flyTarget === 'overview' ? -1 : Number(gap.dataset.flyTarget);
      const to = target === -1 ? overview() : peakState(target);
      const p = clamp01((y - (gap.offsetTop - vh)) / gap.offsetHeight);
      if (p <= 0) break;
      const e = easeInOut(p);
      state = { s: lerp(prev.s, to.s, e), tx: lerp(prev.tx, to.tx, e), ty: lerp(prev.ty, to.ty, e) };
      active = p > 0.5 ? target : prevIndex;
      prev = to;
      prevIndex = target;
    }

    pano.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.s})`;
    pano.style.setProperty('--inv', (1 / state.s).toFixed(4));
    peaks.forEach((peak, i) => peak.classList.toggle('is-active', i === active));

    const fade = clamp01(y / (vh * 0.45));
    introContent.style.opacity = String(1 - fade);
    introContent.style.transform = `translateY(${-fade * 60}px)`;
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }, { passive: true });

  const relayout = () => { measure(); render(); };
  window.addEventListener('resize', relayout);
  window.addEventListener('gd:unlocked', relayout);

  // Tapping a peak (or "Back to the start") flies there
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    scrollToY(id === 'home' ? 0 : target.offsetTop);
    history.replaceState(null, '', `#${id}`);
  });

  measure();
  render();
  const start = document.getElementById(location.hash.slice(1));
  if (start && start.classList.contains('sheet')) window.scrollTo(0, start.offsetTop);
})();
