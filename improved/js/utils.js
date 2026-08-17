/* ==========================================================================
   GiftCustom — Utility Module
   Shared helpers, currency config, and central state.
   ========================================================================== */

/* ---- Query Helpers ------------------------------------------------------ */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---- Screen Reader Announcements ---------------------------------------- */
export function announce(msg) {
  const live = $('#live-announcer');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}

/* ---- HTML Escaping (cached template) ------------------------------------ */
const _escapeEl = document.createElement('div');
export function escapeHTML(str) {
  _escapeEl.textContent = str;
  return _escapeEl.innerHTML;
}

/* ---- String Utilities --------------------------------------------------- */
export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/* ---- Timing Utilities --------------------------------------------------- */
export function debounce(fn, ms = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

/* ---- Math Utilities ----------------------------------------------------- */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/* ---- Currency Configuration --------------------------------------------- */
export const CURRENCY_MAP = {
  INR: { symbol: '₹',   rate: 1,     locale: 'en-IN', decimals: 0 },
  USD: { symbol: '$',   rate: 0.012, locale: 'en-US', decimals: 2 },
  GBP: { symbol: '£',   rate: 0.0093, locale: 'en-GB', decimals: 2 },
  NPR: { symbol: 'Rs.', rate: 1.6,   locale: 'en-NP', decimals: 0 },
  JPY: { symbol: '¥',   rate: 1.82,  locale: 'ja-JP', decimals: 0 },
  KRW: { symbol: '₩',   rate: 15.8,  locale: 'ko-KR', decimals: 0 },
};

export function getCurrencyConfig(currencyCode) {
  return CURRENCY_MAP[currencyCode] || CURRENCY_MAP.INR;
}

export function formatPrice(amount, currencyCode = state.currency) {
  const cfg = getCurrencyConfig(currencyCode);
  const converted = amount * cfg.rate;
  const rounded = cfg.decimals > 0 ? converted.toFixed(cfg.decimals) : Math.round(converted);
  const formatted = Number(rounded).toLocaleString(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });
  return cfg.symbol + formatted;
}

/* ---- Central Application State ------------------------------------------ */
export const state = {
  recipientName: '',
  relationship: '',
  deliveryAddress: '',
  occasion: '',
  notes: '',
  budget: 3000,
  giftTypes: [],
  themes: [],
  selectedTheme: null,
  currency: 'INR',
  currencySymbol: '₹',
  currencyRate: 1,
};

/* ---- State Reset -------------------------------------------------------- */
export function resetState() {
  Object.assign(state, {
    recipientName: '',
    relationship: '',
    deliveryAddress: '',
    occasion: '',
    notes: '',
    budget: 3000,
    giftTypes: [],
    themes: [],
    selectedTheme: null,
  });
}

/* ---- Seeded Index (deterministic pseudo-random) ------------------------- */
export function seededIndex(seedStr, mod) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}
