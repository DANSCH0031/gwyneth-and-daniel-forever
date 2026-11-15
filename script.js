/* =========================================================
   Gwyneth & Daniel — interactions
   Scrolling flies a "camera" across the mountain panorama,
   peak by peak; each section rises up after its peak.
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const CONTACT_EMAIL = 'schoellenberger@me.com';

/* ---------- Password gate ---------- */
// Only a SHA-256 fingerprint of the password is stored here, not the password itself.
const GATE_HASH = '00a15bc830cbc98e7f401edd157cdf131b077807743a64c3accc3ffd4910156d';
const gateForm = document.querySelector('[data-gate-form]');

async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

if (document.documentElement.classList.contains('locked')) {
  const input = gateForm.querySelector('input');
  const error = document.querySelector('[data-gate-error]');
  input.focus();
  gateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if ((await sha256(input.value.trim())) === GATE_HASH) {
      try { localStorage.setItem('gd-unlocked', '1'); } catch (e) { /* stays unlocked until reload */ }
      document.documentElement.classList.remove('locked');
      window.scrollTo(0, 0);
      // re-measure the mountains now that the site is visible
      window.dispatchEvent(new Event('gd:unlocked'));
    } else {
      error.hidden = false;
      input.select();
      gateForm.classList.remove('is-wrong');
      void gateForm.offsetWidth;
      gateForm.classList.add('is-wrong');
    }
  });
}

/* ---------- Helpers ---------- */
const clamp01 = (n) => Math.min(Math.max(n, 0), 1);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function scrollToY(y) {
  window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
}


/* ---------- Reveal content as it scrolls into view ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------- Schedule: the trail fills in as you scroll ---------- */
const timeline = document.querySelector('[data-timeline]');
const timelineItems = timeline ? Array.from(timeline.querySelectorAll('.timeline-item')) : [];

function updateTimeline() {
  if (!timeline) return;
  const rect = timeline.getBoundingClientRect();
  const marker = window.innerHeight * 0.6;
  const progress = clamp01((marker - rect.top) / rect.height);
  timeline.style.setProperty('--progress', progress.toFixed(4));
  timelineItems.forEach((item) => {
    const dot = item.querySelector('.timeline-dot').getBoundingClientRect();
    item.classList.toggle('is-passed', dot.top < marker);
  });
}
window.addEventListener('scroll', () => requestAnimationFrame(updateTimeline), { passive: true });

/* ---------- Countdown ---------- */
const countdown = document.querySelector('[data-countdown]');
const weddingDate = countdown && countdown.dataset.date ? new Date(countdown.dataset.date) : null;

if (weddingDate && !Number.isNaN(weddingDate.getTime())) {
  const units = {
    days: countdown.querySelector('[data-unit="days"]'),
    hours: countdown.querySelector('[data-unit="hours"]'),
    minutes: countdown.querySelector('[data-unit="minutes"]'),
    seconds: countdown.querySelector('[data-unit="seconds"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  const update = () => {
    const diff = Math.max(weddingDate - Date.now(), 0);
    const s = Math.floor(diff / 1000);
    units.days.textContent = Math.floor(s / 86400);
    units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    units.seconds.textContent = pad(s % 60);
  };
  update();
  setInterval(update, 1000);
}

/* ---------- 3D tilt on venue cards (laptops only) ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${x * 8}deg`);
      card.style.setProperty('--rx', `${y * -8}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  });
}

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq-item').forEach((item) => {
  const button = item.querySelector('.faq-q');
  button.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  });
});

/* ---------- Toast message ---------- */
const toast = document.querySelector('[data-toast]');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/* ---------- Copy buttons (booking code) ---------- */
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast(button.dataset.copyLabel || 'Copied ✓');
    } catch {
      showToast(button.dataset.copy);
    }
  });
});

/* ---------- RSVP ---------- */
const form = document.querySelector('[data-rsvp]');
const extra = document.querySelector('[data-rsvp-extra]');
const done = document.querySelector('[data-rsvp-done]');
const doneTitle = document.querySelector('[data-rsvp-done-title]');
const guestsInput = form.querySelector('#rsvp-guests');
const nameInput = form.querySelector('#rsvp-name');
const dietInput = form.querySelector('#rsvp-diet');
const messageInput = form.querySelector('#rsvp-message');

function clampGuests(value) {
  const n = parseInt(value, 10);
  return Math.min(Math.max(Number.isNaN(n) ? 1 : n, 1), 10);
}

form.querySelectorAll('input[name="attending"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    extra.classList.toggle('is-open', radio.value === 'yes' && radio.checked);
    radio.closest('.field').classList.remove('has-error');
  });
});

form.querySelectorAll('[data-step]').forEach((button) => {
  button.addEventListener('click', () => {
    guestsInput.value = clampGuests(guestsInput.value) + Number(button.dataset.step);
    guestsInput.value = clampGuests(guestsInput.value);
  });
});
guestsInput.addEventListener('change', () => {
  guestsInput.value = clampGuests(guestsInput.value);
});

nameInput.addEventListener('input', () => nameInput.closest('.field').classList.remove('has-error'));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const attending = form.querySelector('input[name="attending"]:checked');

  const nameField = nameInput.closest('.field');
  const attendField = form.querySelector('input[name="attending"]').closest('.field');
  nameField.classList.toggle('has-error', !name);
  attendField.classList.toggle('has-error', !attending);
  if (!name) {
    nameInput.focus();
    return;
  }
  if (!attending) {
    attendField.querySelector('input').focus();
    return;
  }

  const yes = attending.value === 'yes';
  const lines = [
    `Name: ${name}`,
    `Attending: ${yes ? 'Yes, joyfully accept' : 'No, regretfully decline'}`,
  ];
  if (yes) {
    lines.push(`Guests: ${clampGuests(guestsInput.value)}`);
    lines.push(`Dietary needs: ${dietInput.value.trim() || 'None'}`);
  }
  if (messageInput.value.trim()) lines.push('', `Message: ${messageInput.value.trim()}`);

  const subject = `RSVP – ${name} – ${yes ? 'Attending' : 'Not attending'}`;
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;

  doneTitle.textContent = yes ? 'Yay, see you there!' : 'Thank you for letting us know';
  form.hidden = true;
  done.hidden = false;
  if (yes) launchConfetti();
});

document.querySelector('[data-rsvp-reset]').addEventListener('click', () => {
  done.hidden = true;
  form.hidden = false;
  nameInput.focus();
});

/* ---------- Confetti ---------- */
const canvas = document.querySelector('[data-confetti]');
const ctx = canvas.getContext('2d');

function launchConfetti() {
  if (reduceMotion) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ['#e09a4f', '#f0b066', '#1b8088', '#7fd1d3', '#ffffff', '#f4c7c3'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: window.innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 6,
    size: Math.random() * 7 + 5,
    rot: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    heart: Math.random() < 0.15,
  }));

  const start = performance.now();
  const frame = (now) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const elapsed = now - start;
    pieces.forEach((p) => {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(1 - elapsed / 3200, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.heart) {
        ctx.font = `${p.size * 2}px serif`;
        ctx.fillText('♥', 0, 0);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    if (elapsed < 3200) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };
  requestAnimationFrame(frame);
}

/* ---------- Contact form (delivered by Web3Forms, no email app needed) ---------- */
// Get a free key at https://web3forms.com (enter the email that should receive messages)
const WEB3FORMS_KEY = '953f0acf-cddf-441f-bbb8-ea6f18e15641';
const contactForm = document.querySelector('[data-contact]');

if (contactForm) {
  const status = contactForm.querySelector('[data-contact-status]');
  const submit = contactForm.querySelector('.contact-submit');
  const fields = {
    name: contactForm.querySelector('#contact-name'),
    email: contactForm.querySelector('#contact-email'),
    message: contactForm.querySelector('#contact-message'),
  };

  Object.values(fields).forEach((input) => {
    input.addEventListener('input', () => input.closest('.field').classList.remove('has-error'));
  });

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.className = 'contact-status';
    status.textContent = '';

    const checks = {
      name: fields.name.value.trim() !== '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim()),
      message: fields.message.value.trim() !== '',
    };
    Object.entries(checks).forEach(([key, ok]) => fields[key].closest('.field').classList.toggle('has-error', !ok));
    const firstBad = Object.keys(checks).find((key) => !checks[key]);
    if (firstBad) {
      fields[firstBad].focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Wedding website message from ${fields.name.value.trim()}`,
          from_name: 'G&D wedding website',
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          message: fields.message.value.trim(),
          botcheck: contactForm.querySelector('[name="botcheck"]').checked,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Send failed');

      contactForm.reset();
      status.classList.add('is-success');
      status.textContent = 'Thank you! Your message is on its way to us ♥';
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = 'Sorry, something went wrong. Please try again in a moment.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send message';
    }
  });
}

/* =========================================================
   Mountain flight
   - Laptop, tablet, phone on its side: the whole range is visible
     under the names, then the camera zooms from peak to peak.
   - Phone held upright: the range is shown large under the names,
     starting at the far-left peak; scrolling pans right peak by peak.
   ========================================================= */
(() => {
  const pano = document.querySelector('[data-fly-pano]');
  const peaks = Array.from(pano.querySelectorAll('.peak'));
  const gaps = Array.from(document.querySelectorAll('[data-fly-target]'));
  const intro = document.querySelector('.fly-intro');
  const introContent = intro.querySelector('.landing-content');
  const RATIO = 420 / 1600; // height / width of the drawing

  // each peak's summit as a fraction of the drawing (from its flag position)
  const summits = peaks.map((peak) => [
    parseFloat(peak.style.getPropertyValue('--x')) / 100,
    1 - parseFloat(peak.style.getPropertyValue('--y')) / 100,
  ]);

  let vw, vh, cw, ch, portrait;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    portrait = vw <= 640 && vh > vw;
    if (portrait) {
      // the mountains take all the room left under the names, date and countdown
      const textHeight = introContent.getBoundingClientRect().height;
      ch = Math.min(Math.max(vh - textHeight - 12, 260), vh * 0.62);
      cw = ch / RATIO;
    } else {
      cw = vw;
      ch = vw * RATIO;
    }
    document.documentElement.style.setProperty('--ch', `${ch}px`);
    pano.style.setProperty('--cw', `${cw}px`);
    pano.style.setProperty('--ch', `${ch}px`);
  }

  // keep the canvas covering the screen edges and bottom
  function clampState(s, tx, ty) {
    return {
      s,
      tx: Math.min(0, Math.max(tx, vw - s * cw)),
      ty: Math.max(ty, ch * (1 - s)),
    };
  }

  function peakState(i) {
    const [fx, fy] = summits[i];
    if (portrait) {
      // pan to the peak and lift it slightly, keeping the lake on the bottom edge
      const s = 1.12;
      return clampState(s, vw / 2 - s * fx * cw, ch * (1 - s));
    }
    const s = vh < 500 ? 1.8 : 2.1;
    return clampState(s, vw / 2 - s * fx * cw, vh * 0.42 - (vh - ch) - s * fy * ch);
  }

  // where the camera starts (and ends): the whole range, or the far-left peak on upright phones
  function homeState() {
    if (portrait) {
      return clampState(1, vw / 2 - summits[0][0] * cw, 0);
    }
    return { s: 1, tx: 0, ty: 0 };
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  function render() {
    const y = window.scrollY;
    let prev = homeState();
    let prevIndex = portrait ? 0 : -1;
    let state = prev;
    let active = prevIndex;

    for (const gap of gaps) {
      const target = gap.dataset.flyTarget === 'overview' ? -1 : Number(gap.dataset.flyTarget);
      const to = target === -1 ? homeState() : peakState(target);
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
    peaks.forEach((peak, i) => peak.classList.toggle('is-active', i === active && y > 4));

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
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  window.addEventListener('gd:unlocked', relayout);
  // web fonts change the height of the names, which changes the room left for the mountains
  if (document.fonts) document.fonts.ready.then(relayout);

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
