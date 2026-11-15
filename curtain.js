/* =========================================================
   CURTAIN — scrolling parts the mountains: the back range
   rises, the peaks slide apart, the lake sinks, and a welcome
   appears in the gap before the content scrolls in.
   ========================================================= */
(() => {
  const curtain = document.querySelector('[data-curtain]');
  const media = curtain.querySelector('.landing-media');
  const content = curtain.querySelector('[data-curtain-content]');
  const reveal = curtain.querySelector('[data-curtain-reveal]');
  const back = curtain.querySelector('.pano-back');
  const front = curtain.querySelector('.pano-front');
  const peaks = Array.from(curtain.querySelectorAll('.peak'));
  const sheets = Array.from(document.querySelectorAll('.sheet'));
  const miniRange = document.querySelector('[data-mini-range]');
  // how far each peak slides sideways (%) as the curtain opens; the middle one sinks
  const SPREAD = [-62, -40, 0, 40, 62];

  function render() {
    const vh = window.innerHeight;
    const range = curtain.offsetHeight - vh;
    const p = clamp01(window.scrollY / range);
    const e = easeInOut(clamp01(p * 1.15));

    media.style.transform = `scale(${1 + 0.12 * e})`;
    content.style.opacity = String(1 - clamp01(p * 2.4));
    content.style.transform = `translateY(${-p * 140}px)`;
    back.style.transform = `translateY(${-e * 22}%)`;
    front.style.transform = `translateY(${e * 90}%)`;
    peaks.forEach((peak, i) => {
      const dy = i === 2 ? e * 70 : e * 12;
      peak.style.transform = `translate(${SPREAD[i] * e}%, ${dy}%)`;
    });

    const r = clamp01((p - 0.35) / 0.3);
    reveal.style.opacity = String(r);
    reveal.style.transform = `translate(-50%, calc(-50% + ${(1 - r) * 30}px)) scale(${0.96 + r * 0.04})`;

    miniRange.classList.toggle('is-visible', p > 0.85);
    updateMiniRange(miniRange, sheets);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', render);
  window.addEventListener('gd:unlocked', render);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    scrollToY(id === 'home' ? 0 : target.getBoundingClientRect().top + window.scrollY);
    history.replaceState(null, '', `#${id}`);
  });

  render();
  const start = document.getElementById(location.hash.slice(1));
  if (start && start.classList.contains('sheet')) window.scrollTo(0, start.offsetTop);
})();
