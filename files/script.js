(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Central state                                                       */
  /* ------------------------------------------------------------------ */
  const state = {
    recipientName: '',
    relationship: '',
    deliveryAddress: '',
    occasion: '',
    notes: '',
    budget: 3000,
    giftTypes: [],
    themes: [],
    selectedTheme: null,
  };

  const SCREEN_ORDER = ['home', 'recipient', 'occasion', 'budget', 'theme', 'checkout', 'confirm'];
  const PROGRESS_MAP = { recipient: 'recipient', occasion: 'occasion', budget: 'budget', theme: 'theme', checkout: 'checkout', confirm: 'checkout' };

  let currentScreen = 'home';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function announce(msg) {
    const live = $('#live-announcer');
    live.textContent = '';
    // force re-announce even if text repeats
    requestAnimationFrame(() => { live.textContent = msg; });
  }

  function showScreen(name, opts = {}) {
    $$('.screen').forEach(s => s.classList.remove('is-active'));
    const target = $(`#screen-${name}`);
    target.classList.add('is-active');
    currentScreen = name;

    // move focus to heading for screen-reader / keyboard users
    const heading = target.querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: false });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    updateProgress(name);
    if (opts.announceText) announce(opts.announceText);
  }

  function updateProgress(screenName) {
    const stepKey = PROGRESS_MAP[screenName];
    $$('#progressList li').forEach(li => {
      li.classList.remove('is-current', 'is-done');
      if (!stepKey) return;
      const order = ['recipient', 'occasion', 'budget', 'theme', 'checkout'];
      const liIdx = order.indexOf(li.dataset.step);
      const curIdx = order.indexOf(stepKey);
      if (liIdx === curIdx) li.classList.add('is-current');
      else if (liIdx < curIdx) li.classList.add('is-done');
    });
  }

  function setFieldError(id, message) {
    const errEl = $(`#err-${id}`);
    const fieldEl = $(`#${id}`);
    if (errEl) errEl.textContent = message || '';
    const wrap = fieldEl ? fieldEl.closest('.field') : null;
    if (wrap) wrap.classList.toggle('has-error', Boolean(message));
  }

  function formatINR(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  /* ------------------------------------------------------------------ */
  /* Occasion theme (visual mood) — the "vision" feature                 */
  /* ------------------------------------------------------------------ */
  const OCCASION_META = {
    birthday:    { mood: 'Lively & bright',  badge: 'Confetti-bright' },
    anniversary: { mood: 'Romantic & soft',  badge: 'Rose & blush' },
    festival:    { mood: 'Golden & festive', badge: 'Marigold glow' },
    sorry:       { mood: 'Calm & gentle',    badge: 'Soft apology' },
    congrats:    { mood: 'Fresh & proud',    badge: 'Bright success' },
    other:       { mood: 'Considered',       badge: 'Quietly elegant' },
  };

  function applyOccasionTheme(occasion) {
    document.body.dataset.occasion = occasion || 'default';
  }

  /* ------------------------------------------------------------------ */
  /* HOME                                                                  */
  /* ------------------------------------------------------------------ */
  $('#btnStart').addEventListener('click', () => {
    showScreen('recipient', { announceText: 'Recipient details. Step 1 of 4.' });
  });

  /* ------------------------------------------------------------------ */
  /* RECIPIENT                                                             */
  /* ------------------------------------------------------------------ */
  const formRecipient = $('#formRecipient');
  formRecipient.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#recipientName').value.trim();
    const relationship = $('#relationship').value;
    const address = $('#deliveryAddress').value.trim();

    let valid = true;
    if (!name) { setFieldError('recipientName', 'Please enter a name.'); valid = false; }
    else setFieldError('recipientName', '');

    if (!relationship) { setFieldError('relationship', 'Please choose a relationship.'); valid = false; }
    else setFieldError('relationship', '');

    if (!address) { setFieldError('deliveryAddress', 'Please enter a delivery address.'); valid = false; }
    else setFieldError('deliveryAddress', '');

    if (!valid) {
      announce('Please fix the highlighted fields.');
      const firstError = formRecipient.querySelector('.has-error input, .has-error select, .has-error textarea');
      if (firstError) firstError.focus();
      return;
    }

    state.recipientName = name;
    state.relationship = relationship;
    state.deliveryAddress = address;

    showScreen('occasion', { announceText: 'Occasion. Step 2 of 4.' });
  });

  /* ------------------------------------------------------------------ */
  /* OCCASION                                                              */
  /* ------------------------------------------------------------------ */
  const occasionGrid = $('#occasionGrid');
  occasionGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.occasion-card');
    if (!card) return;
    $$('.occasion-card', occasionGrid).forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    state.occasion = card.dataset.occasion;
    setFieldError('occasion', '');
    applyOccasionTheme(state.occasion);
    const meta = OCCASION_META[state.occasion];
    announce(`${card.querySelector('.occasion-label').textContent} selected. Theme set to ${meta.mood}.`);
  });

  // keyboard support beyond native button (arrow-key roaming, optional nicety)
  occasionGrid.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const cards = $$('.occasion-card', occasionGrid);
    const idx = cards.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % cards.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + cards.length) % cards.length;
    cards[next].focus();
  });

  $('#btnOccasionNext').addEventListener('click', () => {
    if (!state.occasion) {
      setFieldError('occasion', 'Please choose an occasion.');
      announce('Please choose an occasion.');
      return;
    }
    state.notes = $('#notes').value.trim();
    showScreen('budget', { announceText: 'Budget and gift type. Step 3 of 4.' });
  });

  /* ------------------------------------------------------------------ */
  /* BUDGET & GIFT TYPE                                                    */
  /* ------------------------------------------------------------------ */
  const budgetRange = $('#budgetRange');
  const budgetValue = $('#budgetValue');
  function syncBudgetDisplay() {
    budgetValue.textContent = formatINR(budgetRange.value);
  }
  budgetRange.addEventListener('input', syncBudgetDisplay);
  syncBudgetDisplay();

  const giftTypeGrid = $('#giftTypeGrid');
  giftTypeGrid.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-card');
    if (!chip) return;
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', String(!pressed));
    setFieldError('giftType', '');
  });

  $('#btnGenerate').addEventListener('click', () => {
    const selected = $$('.chip-card[aria-pressed="true"]', giftTypeGrid).map(c => c.dataset.gifttype);
    if (selected.length === 0) {
      setFieldError('giftType', 'Please choose at least one gift type.');
      announce('Please choose at least one gift type.');
      return;
    }
    state.budget = Number(budgetRange.value);
    state.giftTypes = selected;

    showScreen('theme', { announceText: 'Generating theme ideas. Step 4 of 4.' });
    runThemeGeneration();
  });

  /* ------------------------------------------------------------------ */
  /* AI THEME (deterministic, simulated)                                  */
  /* ------------------------------------------------------------------ */
  const PALETTES = {
    birthday: ['sherbet orange', 'sunshine yellow', 'candy pink'],
    anniversary: ['blush rose', 'champagne gold', 'soft burgundy'],
    festival: ['marigold gold', 'deep maroon', 'warm copper'],
    sorry: ['dusty lavender', 'powder blue', 'sage grey'],
    congrats: ['emerald green', 'mint', 'brushed gold'],
    other: ['warm plum', 'cream', 'soft taupe'],
  };
  const TONES = {
    birthday: 'Playful & celebratory',
    anniversary: 'Romantic & intimate',
    festival: 'Festive & abundant',
    sorry: 'Gentle & sincere',
    congrats: 'Bright & proud',
    other: 'Considered & warm',
  };
  const ITEM_BANK = {
    Food: ['artisanal chocolate box', 'gourmet snack trail', 'a small celebration cake', 'curated tea or coffee set'],
    Flowers: ['a hand-tied seasonal bouquet', 'a potted orchid', 'a single statement bloom arrangement', 'dried flower keepsake bunch'],
    Electronics: ['a compact Bluetooth speaker', 'a smart photo frame', 'wireless earbuds', 'a sleek desk lamp'],
    'Custom Hamper': ['a themed keepsake hamper', 'a personalised welcome box', 'a curated self-care hamper', 'a memory-jar gift set'],
  };
  const MESSAGE_IDEAS = {
    birthday: 'A bright card that reads: "Another year, even more you."',
    anniversary: 'A handwritten note: "Still choosing you, every year."',
    festival: 'A festive tag: "Wishing you light, warmth, and good company."',
    sorry: 'A soft note: "I\'m sorry — let\'s make it right, together."',
    congrats: 'A bold card: "You earned every bit of this."',
    other: 'A simple note: "Thinking of you, today and always."',
  };

  function seededIndex(seedStr, mod) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return hash % mod;
  }

  function generateThemes() {
    const occasion = state.occasion || 'other';
    const palette = PALETTES[occasion] || PALETTES.other;
    const tone = TONES[occasion] || TONES.other;
    const giftTypes = state.giftTypes.length ? state.giftTypes : ['Custom Hamper'];
    const budgetBand = state.budget < 1500 ? 'thoughtful & compact' : state.budget < 6000 ? 'generously composed' : 'premium & elaborate';
    const name = state.recipientName || 'them';
    const relationship = state.relationship || 'someone special';

    const themeNamePool = {
      birthday: ['Sunlit Celebration', 'Confetti Hour', 'Golden Birthday Hour'],
      anniversary: ['Quiet Romance', 'Two, Always', 'Blush & Candlelight'],
      festival: ['Festival of Light', 'Marigold Evening', 'Glow & Gather'],
      sorry: ['Soft Apology', 'Gentle Reset', 'A Calm Reconciliation'],
      congrats: ['Well Earned', 'Toast to You', 'Bright Milestone'],
      other: ['Quiet Gesture', 'Thoughtful Pause', 'Made for You'],
    };
    const names = themeNamePool[occasion] || themeNamePool.other;

    const themes = [];
    const count = 3 + (giftTypes.length > 2 ? 1 : 0); // up to 4 if many gift types chosen
    for (let i = 0; i < Math.min(count, names.length + 1); i++) {
      const seed = `${occasion}-${name}-${relationship}-${state.budget}-${giftTypes.join(',')}-${i}`;
      const themeName = names[i % names.length] + (i >= names.length ? ' — Encore' : '');
      const color1 = palette[seededIndex(seed + 'c1', palette.length)];
      const color2 = palette[(seededIndex(seed + 'c2', palette.length) + 1) % palette.length];
      const gType = giftTypes[i % giftTypes.length];
      const items = ITEM_BANK[gType] || ITEM_BANK['Custom Hamper'];
      const item1 = items[seededIndex(seed + 'i1', items.length)];
      const item2 = items[(seededIndex(seed + 'i2', items.length) + 1) % items.length];

      themes.push({
        name: themeName,
        concept: `A ${budgetBand} idea built around ${color1} and ${color2}, designed for a ${relationship.toLowerCase()} on this occasion.`,
        items: `${item1}, ${item2}`,
        tone,
        message: MESSAGE_IDEAS[occasion] || MESSAGE_IDEAS.other,
        palette: `${color1} + ${color2}`,
      });
    }
    return themes;
  }

  function runThemeGeneration() {
    const loader = $('#themeLoader');
    const grid = $('#themeGrid');
    const actions = $('#themeActions');

    loader.style.display = 'flex';
    grid.hidden = true;
    actions.hidden = true;
    grid.innerHTML = '';

    $('#themeSubName').textContent = state.recipientName || 'your recipient';

    setTimeout(() => {
      const themes = generateThemes();
      state.themes = themes;
      state.selectedTheme = themes[0];

      grid.innerHTML = themes.map(t => `
        <article class="theme-card">
          <div class="theme-card-head">
            <h3 class="theme-name">${escapeHTML(t.name)}</h3>
            <span class="theme-tone">${escapeHTML(t.tone)}</span>
          </div>
          <p class="theme-concept">${escapeHTML(t.concept)}</p>
          <div class="theme-row"><strong>Palette</strong><span>${escapeHTML(t.palette)}</span></div>
          <div class="theme-row"><strong>Suggested</strong><span>${escapeHTML(t.items)}</span></div>
          <div class="theme-card-foot">${escapeHTML(t.message)}</div>
        </article>
      `).join('');

      loader.style.display = 'none';
      grid.hidden = false;
      actions.hidden = false;
      announce(`${themes.length} theme ideas generated.`);
    }, 1100);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  $('#btnToCheckout').addEventListener('click', () => {
    buildCheckoutSummary();
    showScreen('checkout', { announceText: 'Review your gift before confirming.' });
  });

  /* ------------------------------------------------------------------ */
  /* CHECKOUT                                                              */
  /* ------------------------------------------------------------------ */
  function buildCheckoutSummary() {
    const list = $('#summaryList');
    const themeName = state.selectedTheme ? state.selectedTheme.name : '—';
    const rows = [
      ['Recipient', `${state.recipientName} · ${state.relationship}`],
      ['Occasion', capitalize(state.occasion)],
      ['Budget', formatINR(state.budget)],
      ['Gift types', state.giftTypes.join(', ')],
      ['Theme', themeName],
      ['Delivery address', state.deliveryAddress],
    ];
    list.innerHTML = rows.map(([label, value]) => `
      <div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>
    `).join('');
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  $('#btnConfirm').addEventListener('click', () => {
    $('#confirmDetail').textContent =
      `A ${state.selectedTheme ? state.selectedTheme.name.toLowerCase() : 'curated'} gift is being arranged for ${state.recipientName}, delivered to the address you provided.`;
    showScreen('confirm', { announceText: 'Gift confirmed and on its way.' });
  });

  $('#btnStartOver').addEventListener('click', () => {
    // reset state but keep things simple — full reload of in-memory state
    Object.assign(state, {
      recipientName: '', relationship: '', deliveryAddress: '',
      occasion: '', notes: '', budget: 3000, giftTypes: [], themes: [], selectedTheme: null,
    });
    formRecipient.reset();
    $$('.occasion-card', occasionGrid).forEach(c => c.classList.remove('is-selected'));
    $('#notes').value = '';
    budgetRange.value = 3000;
    syncBudgetDisplay();
    $$('.chip-card', giftTypeGrid).forEach(c => c.setAttribute('aria-pressed', 'false'));
    applyOccasionTheme('default');
    showScreen('home', { announceText: 'Back to the start.' });
  });

  /* ------------------------------------------------------------------ */
  /* Back navigation (shared)                                             */
  /* ------------------------------------------------------------------ */
  $$('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      showScreen(target, { announceText: `Back to ${target}.` });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Init                                                                  */
  /* ------------------------------------------------------------------ */
  applyOccasionTheme('default');
  showScreen('home');
})();
