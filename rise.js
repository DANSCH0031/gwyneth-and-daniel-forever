/* =========================================================
   RISE — scrolling pulls each page up over the one before it.
   Each card sticks once its bottom reaches the screen bottom,
   so you can read it fully before the next one covers it.
   ========================================================= */
(() => {
  const cards = Array.from(document.querySelectorAll('.rise-card'));
  const sheets = cards.slice(1);
  const miniRange = document.querySelector('[data-mini-range]');
  let tops = [];

  function layout() {
    const vh = window.innerHeight;
    let y = 0;
    tops = cards.map((card, i) => {
      card.style.zIndex = String(i + 1);
      card.style.setProperty('--stick', `${Math.min(0, vh - card.offsetHeight)}px`);
      const top = y;
      y += card.offsetHeight;
      return top;
    });
    render();
  }

  function render() {
    const vh = window.innerHeight;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      const cover = next ? clamp01((vh - next.getBoundingClientRect().top) / vh) : 0;
      card.style.setProperty('--cover', cover.toFixed(3));
    });
    miniRange.classList.toggle('is-visible', window.scrollY > vh * 0.6);
    updateMiniRange(miniRange, sheets);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', layout);
  window.addEventListener('gd:unlocked', layout);
  // content height changes (FAQ answers, RSVP extras) change where cards stick
  new ResizeObserver(layout).observe(document.querySelector('.rise-stack'));

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const index = cards.findIndex((card) => card.id === id);
    if (index === -1) return;
    event.preventDefault();
    scrollToY(tops[index]);
    history.replaceState(null, '', `#${id}`);
  });

  layout();
  const startIndex = cards.findIndex((card) => card.id === location.hash.slice(1));
  if (startIndex > 0) window.scrollTo(0, tops[startIndex]);
})();
