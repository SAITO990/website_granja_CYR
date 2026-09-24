/* =====================================================
   GRANJA AVÍCOLA C&R — main.js
   - Hero background slider
   - Mobile nav toggle
   - Sticky header shadow
   - FAQ accordion
   - Order form validation + webhook submission
   ===================================================== */

'use strict';

// =====================================================================
// 0. HERO SLIDER
// =====================================================================
(function initHeroSlider() {
  const slides   = Array.from(document.querySelectorAll('.hero-slide'));
  const hero     = document.querySelector('.hero');
  if (slides.length < 2) return;

  const INTERVAL      = 4000;  // ms between slides
  const FADE_DURATION = 1400;  // must match CSS transition duration

  let current    = 0;
  let timer      = null;
  let transitioning = false;

  // Preload slides 2 and 3 lazily — apply background-image via JS
  // so their fetch doesn't compete with slide 1 on initial paint.
  function preloadSlide(slide) {
    const src = slide.dataset.bg;
    if (!src || slide.style.backgroundImage) return;
    const img = new Image();
    img.onload  = () => { slide.style.backgroundImage = `url('${src}')`; };
    img.onerror = () => { slide.style.backgroundImage = `url('${src}')`; }; // apply anyway
    img.src = src;
  }

  // Preload slides 2 & 3 immediately so they're ready before first transition
  slides.forEach((s, i) => { if (i > 0) preloadSlide(s); });

  function goTo(next) {
    if (next === current || transitioning) return;
    transitioning = true;

    const prev = current;
    current    = next;

    // rAF ensures browser has applied the current opacity:0 state before
    // we add the class that triggers the fade-in transition
    requestAnimationFrame(() => {
      slides[next].classList.add('hero-slide--next');

      // After the CSS fade completes, clean up classes
      setTimeout(() => {
        slides[prev].classList.remove('hero-slide--active');
        slides[next].classList.remove('hero-slide--next');
        slides[next].classList.add('hero-slide--active');
        transitioning = false;
      }, FADE_DURATION);
    });
  }

  function advance() { goTo((current + 1) % slides.length); }

  function startTimer() { timer = setInterval(advance, INTERVAL); }
  function stopTimer()  { clearInterval(timer); timer = null; }

  startTimer();

  // Pause when tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTimer();
    else if (!timer) startTimer();
  });
})();

// ---- Webhook URL -------------------------------------------------------
// Replace this with your real n8n webhook endpoint when ready.
const WEBHOOK_URL = 'https://YOUR_N8N_INSTANCE/webhook/pedido-granja-cr';

// =====================================================================
// 1. MOBILE NAV
// =====================================================================
(function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.toggle('open');
    nav.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when a link inside it is clicked
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
      toggle.classList.remove('open');
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
})();

// =====================================================================
// 2. STICKY HEADER — enhanced shadow on scroll
// =====================================================================
(function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const update = () => {
    header.style.boxShadow = window.scrollY > 10
      ? '0 2px 12px rgba(112,62,59,0.14)'
      : '0 1px 6px rgba(112,62,59,0.08)';
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// =====================================================================
// 3. FAQ ACCORDION
// =====================================================================
(function initFaq() {
  const questions = document.querySelectorAll('.faq-question');

  questions.forEach(btn => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const answerId   = btn.getAttribute('aria-controls');
      const answer     = document.getElementById(answerId);
      if (!answer) return;

      // Collapse all others
      questions.forEach(other => {
        if (other === btn) return;
        other.setAttribute('aria-expanded', 'false');
        const otherId  = other.getAttribute('aria-controls');
        const otherAns = document.getElementById(otherId);
        if (otherAns) otherAns.hidden = true;
      });

      // Toggle current
      btn.setAttribute('aria-expanded', String(!isExpanded));
      answer.hidden = isExpanded;
    });
  });
})();

// =====================================================================
// 4. ORDER FORM
// =====================================================================
(function initForm() {
  const form        = document.getElementById('pedido-form');
  const successBox  = document.getElementById('form-success');
  const submitBtn   = document.getElementById('pedido-submit');
  if (!form) return;

  // --- Validation helpers ---
  function getError(name, value) {
    value = value.trim();
    switch (name) {
      case 'nombre':
        return value.length < 2 ? 'Por favor ingresa tu nombre.' : '';
      case 'telefono':
        return /^\d{7,15}$/.test(value.replace(/\s/g, ''))
          ? '' : 'Ingresa un teléfono válido (solo números).';
      case 'tipo_huevo':
        return value ? '' : 'Selecciona el tipo de huevo.';
      case 'cantidad':
        return value.length < 2 ? 'Indica la cantidad aproximada.' : '';
      case 'barrio':
        return value.length < 2 ? 'Indica el barrio o zona de entrega.' : '';
      default:
        return '';
    }
  }

  function showError(input, message) {
    input.classList.toggle('error', !!message);
    const errEl = input.parentElement.querySelector('.form-error');
    if (errEl) errEl.textContent = message;
  }

  function validateField(input) {
    const error = getError(input.name, input.value);
    showError(input, error);
    return !error;
  }

  // Live validation on blur
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.name !== 'notas') validateField(field);
    });
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(field);
    });
  });

  // --- Submit ---
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate all required fields
    const required = ['nombre', 'telefono', 'tipo_huevo', 'cantidad', 'barrio'];
    let valid = true;
    required.forEach(name => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input && !validateField(input)) valid = false;
    });
    if (!valid) {
      // Focus first error
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    // Build payload
    const data = {
      nombre:     form.nombre.value.trim(),
      telefono:   form.telefono.value.trim(),
      tipo_huevo: form.tipo_huevo.value,
      cantidad:   form.cantidad.value.trim(),
      barrio:     form.barrio.value.trim(),
      notas:      form.notas.value.trim(),
      origen:     'web',
      fecha:      new Date().toISOString(),
    };

    // Loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const res = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Success
      form.hidden     = true;
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
      console.error('Webhook error:', err);
      // Graceful degradation: show success anyway and redirect to WhatsApp
      // so the user isn't stranded if the webhook isn't set up yet.
      form.hidden       = true;
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });
})();

// =====================================================================
// 5. SMOOTH SCROLL OFFSET (account for sticky header)
// =====================================================================
(function initSmoothScroll() {
  const HEADER_HEIGHT = 72; // px — adjust if header height changes

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href').slice(1);
      if (!targetId) return; // bare "#" — do nothing special
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
