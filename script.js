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
      window.dispatchEvent(new Event('scroll'));
    } else {
      error.hidden = false;
      input.select();
      gateForm.classList.remove('is-wrong');
      void gateForm.offsetWidth;
      gateForm.classList.add('is-wrong');
    }
  });
}

/* =========================================================
   Gwyneth & Daniel — interactions
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const CONTACT_EMAIL = 'schoellenberger@me.com';

/* ---------- Navigation: solid on scroll, mobile menu ---------- */
const nav = document.querySelector('[data-nav]');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = Array.from(document.querySelectorAll('.nav-links a'));

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) {
    setMenu(false);
    navToggle.focus();
  }
});
// Close the full-screen menu if the window grows to laptop size
window.matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});

/* ---------- Scroll effects (nav, progress bar, hero parallax, timeline) ---------- */
const progressBar = document.querySelector('.scroll-progress span');
const hero = document.querySelector('.hero');
const heroMedia = document.querySelector('.hero-media');
const timeline = document.querySelector('[data-timeline]');
const timelineItems = timeline ? Array.from(timeline.querySelectorAll('.timeline-item')) : [];
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;

  nav.classList.toggle('is-scrolled', y > hero.offsetHeight - 80);
  progressBar.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);

  if (!reduceMotion && y < hero.offsetHeight) {
    heroMedia.style.setProperty('--py', `${y * 0.25}px`);
  }

  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const marker = window.innerHeight * 0.6; // line fills up to 60% down the screen
    const progress = Math.min(Math.max((marker - rect.top) / rect.height, 0), 1);
    timeline.style.setProperty('--progress', progress.toFixed(4));
    timelineItems.forEach((item) => {
      const dot = item.querySelector('.timeline-dot').getBoundingClientRect();
      item.classList.toggle('is-passed', dot.top < marker);
    });
  }
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* Hero image drifts slightly with the mouse (laptops only) */
if (finePointer && !reduceMotion) {
  hero.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * -24;
    heroMedia.style.setProperty('--px', `${x}px`);
  });
  hero.addEventListener('pointerleave', () => heroMedia.style.setProperty('--px', '0px'));
}

/* ---------- Highlight the current section in the menu ---------- */
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((section) => sectionObserver.observe(section));

/* ---------- Reveal elements as they scroll into view ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------- Countdown ---------- */
const countdown = document.querySelector('[data-countdown]');
const weddingDate = countdown && countdown.dataset.date ? new Date(countdown.dataset.date) : null;

if (weddingDate && !Number.isNaN(weddingDate.getTime())) {
  countdown.classList.add('is-live');
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

/* ---------- Copy email ---------- */
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

/* ---------- Mountain panorama ---------- */
const panorama = document.querySelector('[data-panorama]');
const footerPanorama = document.querySelector('[data-panorama-copy]');

// Reuse the hero mountains in the footer so guests can jump anywhere from the bottom
if (panorama && footerPanorama) {
  footerPanorama.innerHTML = panorama.innerHTML;
}

// Ridges drift with the mouse for a sense of depth (laptops only)
if (panorama && finePointer && !reduceMotion) {
  hero.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * -40;
    panorama.style.setProperty('--mx', `${x}px`);
  });
  hero.addEventListener('pointerleave', () => panorama.style.setProperty('--mx', '0px'));
}
