/* ==========================================================================
   GiftCustom — Main Application Module
   State management, screen navigation, form handling, and app init.
   ========================================================================== */
import {
  $, $$, announce, escapeHTML, capitalize,
  formatPrice, state, resetState, CURRENCY_MAP,
  seededIndex, debounce,
} from './utils.js';
import { applyOccasionTheme, OCCASION_META, onThemeChange } from './theme.js';
import { initParticles, updateParticleColors } from './particles.js';
import { animateScreenIn, animateCounters, initRipples, initCardTilt, initButtonHoverGiftSpeed, animateConfirmation } from './animations.js';
import { triggerSurprise } from './surprise.js';

/* ---- Screen / Progress config ------------------------------------------- */
const PROGRESS_STEPS = ['recipient', 'occasion', 'budget', 'theme', 'checkout'];
const PROGRESS_MAP = {
  recipient: 'recipient', occasion: 'occasion', budget: 'budget',
  theme: 'theme', checkout: 'checkout', confirm: 'checkout',
};

let currentScreen = 'home';

/* ---- Theme Generation Data ----------------------------------------------- */
const PALETTES = {
  birthday:    ['sherbet orange', 'sunshine yellow', 'candy pink'],
  anniversary: ['blush rose', 'champagne gold', 'soft burgundy'],
  festival:    ['marigold gold', 'deep maroon', 'warm copper'],
  sorry:       ['dusty lavender', 'powder blue', 'sage grey'],
  congrats:    ['emerald green', 'mint', 'brushed gold'],
  other:       ['warm plum', 'cream', 'soft taupe'],
};
const TONES = {
  birthday:    'Playful & celebratory',
  anniversary: 'Romantic & intimate',
  festival:    'Festive & abundant',
  sorry:       'Gentle & sincere',
  congrats:    'Bright & proud',
  other:       'Considered & warm',
};
const ITEM_BANK = {
  Food:            ['artisanal chocolate box', 'gourmet snack trail', 'a small celebration cake', 'curated tea or coffee set'],
  Flowers:         ['a hand-tied seasonal bouquet', 'a potted orchid', 'a single statement bloom arrangement', 'dried flower keepsake bunch'],
  Electronics:     ['a compact Bluetooth speaker', 'a smart photo frame', 'wireless earbuds', 'a sleek desk lamp'],
  'Custom Hamper': ['a themed keepsake hamper', 'a personalised welcome box', 'a curated self-care hamper', 'a memory-jar gift set'],
};
const MESSAGE_IDEAS = {
  birthday:    'A bright card that reads: "Another year, even more you."',
  anniversary: 'A handwritten note: "Still choosing you, every year."',
  festival:    'A festive tag: "Wishing you light, warmth, and good company."',
  sorry:       'A soft note: "I\'m sorry — let\'s make it right, together."',
  congrats:    'A bold card: "You earned every bit of this."',
  other:       'A simple note: "Thinking of you, today and always."',
};
const THEME_NAMES = {
  birthday:    ['Sunlit Celebration', 'Confetti Hour', 'Golden Birthday Hour'],
  anniversary: ['Quiet Romance', 'Two, Always', 'Blush & Candlelight'],
  festival:    ['Festival of Light', 'Marigold Evening', 'Glow & Gather'],
  sorry:       ['Soft Apology', 'Gentle Reset', 'A Calm Reconciliation'],
  congrats:    ['Well Earned', 'Toast to You', 'Bright Milestone'],
  other:       ['Quiet Gesture', 'Thoughtful Pause', 'Made for You'],
};

/* ---- Screen Navigation --------------------------------------------------- */
function showScreen(name, opts = {}) {
  $$('.screen').forEach(s => s.classList.remove('is-active'));
  const target = $(`#screen-${name}`);
  if (!target) return;

  target.classList.add('is-active');
  currentScreen = name;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateProgress(name);
  if (opts.announceText) announce(opts.announceText);

  // Trigger GSAP entrance
  requestAnimationFrame(() => animateScreenIn(name));

  if (name === 'home') animateCounters();
  if (name === 'confirm') animateConfirmation();

  // Focus the heading
  const heading = target.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    setTimeout(() => heading.focus({ preventScroll: true }), 100);
  }
}

function updateProgress(screenName) {
  const stepKey = PROGRESS_MAP[screenName];
  $$('#progressList li').forEach(li => {
    li.classList.remove('is-current', 'is-done');
    if (!stepKey) return;
    const liIdx = PROGRESS_STEPS.indexOf(li.dataset.step);
    const curIdx = PROGRESS_STEPS.indexOf(stepKey);
    if (liIdx === curIdx) li.classList.add('is-current');
    else if (liIdx < curIdx) li.classList.add('is-done');
  });
}

/* ---- Field Validation ---------------------------------------------------- */
function setFieldError(id, message) {
  const errEl = $(`#err-${id}`);
  const fieldEl = $(`#${id}`);
  if (errEl) errEl.textContent = message || '';
  const wrap = fieldEl ? fieldEl.closest('.field') : null;
  if (wrap) {
    wrap.classList.toggle('has-error', Boolean(message));
    if (message && fieldEl) fieldEl.setAttribute('aria-invalid', 'true');
    else if (fieldEl) fieldEl.removeAttribute('aria-invalid');
  }
}

/* ---- Currency & Pricing -------------------------------------------------- */
function updatePriceSummary() {
  const els = {
    subtotal: $('#priceSubtotal'),
    total:    $('#priceTotal'),
    note:     $('#priceNote'),
  };
  const themePrice = state.selectedTheme ? state.selectedTheme.totalPrice : state.budget;
  if (els.subtotal) els.subtotal.textContent = formatPrice(themePrice);
  if (els.total)    els.total.textContent    = formatPrice(themePrice);
  if (els.note)     els.note.textContent     = `Prices shown in ${state.currency}`;
}

function syncBudgetDisplay() {
  const el = $('#budgetValue');
  if (el) el.textContent = formatPrice(state.budget);
  updateRangeProgress();
}

function updateRangeProgress() {
  const range = $('#budgetRange');
  if (!range) return;
  const pct = ((+range.value - +range.min) / (+range.max - +range.min)) * 100;
  range.style.setProperty('--range-progress', pct + '%');
}

/* ---- Theme Generation ---------------------------------------------------- */
function generateThemes() {
  const occasion = state.occasion || 'other';
  const palette  = PALETTES[occasion] || PALETTES.other;
  const tone     = TONES[occasion] || TONES.other;
  const types    = state.giftTypes.length ? state.giftTypes : ['Custom Hamper'];
  const name     = state.recipientName || 'them';
  const rel      = state.relationship || 'someone special';
  const budgetBand = state.budget < 1500 ? 'thoughtful & compact' : state.budget < 6000 ? 'generously composed' : 'premium & elaborate';
  const names    = THEME_NAMES[occasion] || THEME_NAMES.other;

  const count = Math.min(3 + (types.length > 2 ? 1 : 0), names.length);
  const themes = [];

  for (let i = 0; i < count; i++) {
    const seed  = `${occasion}-${name}-${rel}-${state.budget}-${types.join(',')}-${i}`;
    const themeName = names[i % names.length];
    const c1    = palette[seededIndex(seed + 'c1', palette.length)];
    const c2    = palette[(seededIndex(seed + 'c2', palette.length) + 1) % palette.length];
    const gType = types[i % types.length];
    const items = ITEM_BANK[gType] || ITEM_BANK['Custom Hamper'];
    const item1 = items[seededIndex(seed + 'i1', items.length)];
    const item2 = items[(seededIndex(seed + 'i2', items.length) + 1) % items.length];

    // Price scaled to budget (95%, 85%, 75% per card)
    const scale = 0.95 - i * 0.10;
    const totalPrice = Math.max(Math.round(state.budget * scale), 50);

    themes.push({
      name: themeName,
      concept: `A ${budgetBand} idea built around ${c1} and ${c2}, designed for a ${rel.toLowerCase()} on this occasion.`,
      items:   `${item1}, ${item2}`,
      tone,
      message: MESSAGE_IDEAS[occasion] || MESSAGE_IDEAS.other,
      palette: `${c1} + ${c2}`,
      totalPrice,
      giftType: gType,
    });
  }
  return themes;
}

function renderThemeCards(themes) {
  const grid = $('#themeGrid');
  if (!grid) return;

  grid.innerHTML = themes.map((t, i) => `
    <article class="theme-card${i === 0 ? ' is-selected-theme' : ''}" data-index="${i}" tabindex="0" role="button" aria-pressed="${i === 0}">
      <div class="theme-card-head">
        <h3 class="theme-name">${escapeHTML(t.name)}</h3>
        <span class="theme-tone">${escapeHTML(t.tone)}</span>
      </div>
      <p class="theme-concept">${escapeHTML(t.concept)}</p>
      <div class="theme-row"><strong>Palette</strong><span>${escapeHTML(t.palette)}</span></div>
      <div class="theme-row"><strong>Includes</strong><span>${escapeHTML(t.items)}</span></div>
      <div class="theme-price-tag">${formatPrice(t.totalPrice)}</div>
      <div class="theme-card-foot">${escapeHTML(t.message)}</div>
    </article>
  `).join('');

  $$('.theme-card', grid).forEach(card => {
    const select = () => {
      $$('.theme-card', grid).forEach(c => {
        c.classList.remove('is-selected-theme');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('is-selected-theme');
      card.setAttribute('aria-pressed', 'true');
      state.selectedTheme = themes[parseInt(card.dataset.index)];
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  });
}

function runThemeGeneration() {
  const loader  = $('#themeLoader');
  const grid    = $('#themeGrid');
  const actions = $('#themeActions');

  loader.removeAttribute('hidden');
  loader.style.display = 'flex';
  grid.setAttribute('hidden', '');
  actions.setAttribute('hidden', '');
  grid.innerHTML = '';

  const nameEl = $('#themeSubName');
  if (nameEl) nameEl.textContent = state.recipientName || 'your recipient';

  setTimeout(() => {
    const themes = generateThemes();
    state.themes = themes;
    state.selectedTheme = themes[0];

    renderThemeCards(themes);

    loader.setAttribute('hidden', '');
    loader.style.display = '';
    grid.removeAttribute('hidden');
    actions.removeAttribute('hidden');

    announce(`${themes.length} theme ideas generated. Select one to continue.`);
    requestAnimationFrame(() => animateScreenIn('theme'));
  }, 1400);
}

/* ---- Checkout Summary ---------------------------------------------------- */
function buildCheckoutSummary() {
  const list = $('#summaryList');
  if (!list) return;

  const themeName  = state.selectedTheme?.name || '—';
  const themeTotal = state.selectedTheme?.totalPrice || state.budget;

  const rows = [
    ['Recipient',        `${state.recipientName} · ${state.relationship}`],
    ['Occasion',         capitalize(state.occasion)],
    ['Budget',           formatPrice(state.budget)],
    ['Gift types',       state.giftTypes.join(', ')],
    ['Theme',            themeName],
    ['Estimated total',  formatPrice(themeTotal)],
    ['Delivery address', state.deliveryAddress],
  ];

  list.innerHTML = rows.map(([label, value]) =>
    `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`
  ).join('');

  const nameEl = $('#checkoutThemeName');
  if (nameEl) nameEl.textContent = state.selectedTheme?.name || 'Selected Theme';

  updatePriceSummary();
}

/* ---- Confirmation Receipt ------------------------------------------------ */
function buildReceipt() {
  const dateEl  = $('#receiptDate');
  const bodyEl  = $('#receiptBody');
  const totalEl = $('#receiptTotal');

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (bodyEl) {
    const rows = [
      ['For',       state.recipientName],
      ['Occasion',  capitalize(state.occasion)],
      ['Theme',     state.selectedTheme?.name || '—'],
      ['Gift Type', state.giftTypes.join(', ')],
    ];
    bodyEl.innerHTML = rows.map(([label, val]) =>
      `<div class="receipt-row">
        <span class="receipt-label">${escapeHTML(label)}</span>
        <span class="receipt-value">${escapeHTML(val)}</span>
      </div>`
    ).join('');
  }

  if (totalEl) {
    const total = state.selectedTheme?.totalPrice || state.budget;
    totalEl.innerHTML = `<span>Total</span><span>${formatPrice(total)}</span>`;
  }
}

/* ---- Start Over ---------------------------------------------------------- */
function startOver() {
  resetState();

  const form = $('#formRecipient');
  if (form) form.reset();

  const notes = $('#notes');
  if (notes) notes.value = '';

  const range = $('#budgetRange');
  if (range) range.value = 3000;

  $$('.occasion-card').forEach(c => c.classList.remove('is-selected'));
  $$('.chip-card').forEach(c => c.setAttribute('aria-pressed', 'false'));
  $$('.preset-chip').forEach(c => c.classList.remove('active'));
  const defaultPreset = $('.preset-chip[data-value="3000"]');
  if (defaultPreset) defaultPreset.classList.add('active');
  $$('.currency-chip').forEach(c => c.classList.remove('active'));
  const inrChip = $('.currency-chip[data-currency="INR"]');
  if (inrChip) inrChip.classList.add('active');

  syncBudgetDisplay();
  applyOccasionTheme('default');
  showScreen('home', { announceText: 'Back to the start.' });
}

/* ---- Event Wiring -------------------------------------------------------- */
function wireEvents() {
  /* -- Home -- */
  $('#btnStart')?.addEventListener('click', () =>
    showScreen('recipient', { announceText: 'Recipient details. Step 1 of 5.' })
  );

  /* -- Recipient form -- */
  $('#formRecipient')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = $('#recipientName')?.value.trim() || '';
    const rel      = $('#relationship')?.value || '';
    const address  = $('#deliveryAddress')?.value.trim() || '';
    let valid = true;

    if (!name)    { setFieldError('recipientName', 'Please enter a name.'); valid = false; }
    else            setFieldError('recipientName', '');
    if (!rel)     { setFieldError('relationship', 'Please choose a relationship.'); valid = false; }
    else            setFieldError('relationship', '');
    if (!address) { setFieldError('deliveryAddress', 'Please enter a delivery address.'); valid = false; }
    else            setFieldError('deliveryAddress', '');

    if (!valid) {
      announce('Please fix the highlighted fields.');
      const first = $('#formRecipient').querySelector('.has-error input, .has-error select, .has-error textarea');
      first?.focus();
      return;
    }

    state.recipientName   = name;
    state.relationship    = rel;
    state.deliveryAddress = address;
    showScreen('occasion', { announceText: 'Occasion. Step 2 of 5.' });
  });

  /* -- Occasion grid -- */
  const occasionGrid = $('#occasionGrid');
  occasionGrid?.addEventListener('click', (e) => {
    const card = e.target.closest('.occasion-card');
    if (!card) return;
    $$('.occasion-card', occasionGrid).forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    state.occasion = card.dataset.occasion;
    setFieldError('occasion', '');
    applyOccasionTheme(state.occasion, e);
    const meta = OCCASION_META[state.occasion];
    announce(`${card.querySelector('.occasion-label')?.textContent} selected. Theme: ${meta?.mood || ''}.`);
  });

  occasionGrid?.addEventListener('keydown', (e) => {
    const arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    if (!arrows.includes(e.key)) return;
    const cards = $$('.occasion-card', occasionGrid);
    const idx = cards.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? (idx + 1) % cards.length
      : (idx - 1 + cards.length) % cards.length;
    cards[next].focus();
  });

  $('#btnOccasionNext')?.addEventListener('click', () => {
    if (!state.occasion) {
      setFieldError('occasion', 'Please choose an occasion.');
      announce('Please choose an occasion.');
      return;
    }
    state.notes = $('#notes')?.value.trim() || '';
    showScreen('budget', { announceText: 'Budget and gift type. Step 3 of 5.' });
  });

  /* -- Currency selector -- */
  $('#currencyOptions')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.currency-chip');
    if (!chip) return;
    $$('.currency-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.currency       = chip.dataset.currency;
    state.currencySymbol = chip.dataset.symbol;
    state.currencyRate   = parseFloat(chip.dataset.rate);
    syncBudgetDisplay();
    const heroCur = $('#heroCurrency');
    if (heroCur) heroCur.textContent = CURRENCY_MAP[state.currency]?.symbol || '₹';
    announce(`Currency changed to ${state.currency}`);
  });

  /* -- Budget range -- */
  const budgetRange = $('#budgetRange');
  budgetRange?.addEventListener('input', () => {
    state.budget = Number(budgetRange.value);
    syncBudgetDisplay();
  });

  /* -- Budget presets -- */
  $$('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = parseInt(chip.dataset.value);
      if (budgetRange) budgetRange.value = val;
      state.budget = val;
      syncBudgetDisplay();
    });
  });

  /* -- Gift type chips -- */
  const giftTypeGrid = $('#giftTypeGrid');
  giftTypeGrid?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-card');
    if (!chip) return;
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', String(!pressed));
    setFieldError('giftType', '');
  });

  /* -- Generate themes -- */
  $('#btnGenerate')?.addEventListener('click', () => {
    const selected = $$('.chip-card[aria-pressed="true"]', giftTypeGrid).map(c => c.dataset.gifttype);
    if (selected.length === 0) {
      setFieldError('giftType', 'Please choose at least one gift type.');
      announce('Please choose at least one gift type.');
      return;
    }
    state.budget    = Number(budgetRange?.value || 3000);
    state.giftTypes = selected;
    showScreen('theme', { announceText: 'Generating theme ideas. Step 4 of 5.' });
    runThemeGeneration();
  });

  /* -- Theme → Checkout -- */
  $('#btnToCheckout')?.addEventListener('click', () => {
    if (!state.selectedTheme) {
      announce('Please select a theme first.');
      return;
    }
    buildCheckoutSummary();
    showScreen('checkout', { announceText: 'Review your gift before confirming.' });
  });

  /* -- Confirm -- */
  $('#btnConfirm')?.addEventListener('click', () => {
    // Set confetti positions
    $$('.confirm-confetti span').forEach((el, i) => {
      const angles = [45, 90, 135, 225, 270, 315];
      const dist  = 60 + Math.random() * 40;
      const angle = (angles[i] ?? Math.random() * 360) * Math.PI / 180;
      el.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      el.style.setProperty('--rot', `${Math.random() * 360}deg`);
    });

    buildReceipt();
    showScreen('confirm', { announceText: 'Gift confirmed and on its way.' });

    // Trigger surprise animation
    const themeName = state.selectedTheme?.name?.toLowerCase() || 'curated';
    triggerSurprise(state.recipientName, themeName);
  });

  /* -- Start over -- */
  $('#btnStartOver')?.addEventListener('click', startOver);

  /* -- Back navigation (delegated) -- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-back]');
    if (!btn) return;
    const target = btn.dataset.back;
    showScreen(target, { announceText: `Back to ${target}.` });
  });

  /* -- Mobile menu toggle -- */
  const menuToggle = $('#menuToggle');
  menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    const progress = $('.progress-trail');
    if (progress) progress.classList.toggle('is-mobile-open', !expanded);
  });

  // Close mobile menu on outside click
  document.addEventListener('click', (e) => {
    const progress = $('.progress-trail');
    if (!progress?.classList.contains('is-mobile-open')) return;
    if (!e.target.closest('.topbar-inner')) {
      progress.classList.remove('is-mobile-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }
  }, { passive: true });
}

/* ---- Three.js + Interactions --------------------------------------------- */
async function initThreeJS() {
  if (!window.THREE) return;
  try {
    const { initThreeScene, updateGiftColors, setGiftSpeed, triggerSparkle } = await import('./threeScene.js');

    const ok = initThreeScene();
    if (!ok) return;

    // Register callbacks
    onThemeChange(updateGiftColors, updateParticleColors);

    // Speed up gift on button hover
    initButtonHoverGiftSpeed(setGiftSpeed);

    // Click sparkle
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.btn')) return;
      triggerSparkle(e.clientX, e.clientY);
    }, { passive: true });

  } catch (err) {
    console.warn('[main] Three.js init failed:', err);
  }
}

/* ---- App Initialisation -------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Particles
  initParticles();
  onThemeChange(null, updateParticleColors);

  // Animations
  initRipples();
  initCardTilt();

  // Start at home
  applyOccasionTheme('default');
  syncBudgetDisplay();
  showScreen('home');

  // Wire all events
  wireEvents();

  // Three.js (deferred to avoid blocking first paint)
  setTimeout(initThreeJS, 200);
});
