/* ==========================================================================
   GiftCustom — Theme System
   Manages occasion-based theme application with smooth transitions.
   ========================================================================== */
import { $ } from './utils.js';

/* ---- Occasion Metadata -------------------------------------------------- */
export const OCCASION_META = {
  birthday:    { mood: 'Lively & bright',  badge: 'Confetti-bright' },
  anniversary: { mood: 'Romantic & soft',  badge: 'Rose & blush' },
  festival:    { mood: 'Golden & festive', badge: 'Marigold glow' },
  sorry:       { mood: 'Calm & gentle',    badge: 'Soft apology' },
  congrats:    { mood: 'Fresh & proud',    badge: 'Bright success' },
  other:       { mood: 'Considered',       badge: 'Quietly elegant' },
};

/* ---- Theme Color Data (for JS-side operations) -------------------------- */
const THEME_COLORS = {
  default:     { accent: '#7A5566', ribbon: '#E3CBD4', accentInk: '#3C2430' },
  birthday:    { accent: '#FF6A4D', ribbon: '#FFC93C', accentInk: '#7A2A12' },
  anniversary: { accent: '#B23A63', ribbon: '#F2C6D2', accentInk: '#5C1B33' },
  festival:    { accent: '#D9790F', ribbon: '#FFD166', accentInk: '#6E3705' },
  sorry:       { accent: '#6E84B0', ribbon: '#CFD9EC', accentInk: '#2B3550' },
  congrats:    { accent: '#239267', ribbon: '#B9E8CE', accentInk: '#0F4A33' },
  other:       { accent: '#6B4E80', ribbon: '#DCCBE6', accentInk: '#34203F' },
};

let currentTheme = 'default';
let threeUpdateCallback = null;
let particleUpdateCallback = null;

/* ---- Register Callbacks from Other Modules ------------------------------ */
export function onThemeChange(threeUpdate, particleUpdate) {
  threeUpdateCallback = threeUpdate;
  particleUpdateCallback = particleUpdate;
}

/* ---- Apply Occasion Theme ----------------------------------------------- */
export function applyOccasionTheme(occasion, clickEvent = null) {
  const body = document.body;
  const theme = occasion || 'default';

  if (theme === currentTheme) return;
  currentTheme = theme;

  /* Transition animation class */
  body.classList.add('theme-transitioning');

  /* Optional ripple from click point */
  if (clickEvent && typeof gsap !== 'undefined') {
    createThemeRipple(clickEvent, theme);
  }

  /* Set data attribute (CSS themes hook on this) */
  body.dataset.occasion = theme;

  /* Notify Three.js scene of color change */
  const colors = THEME_COLORS[theme] || THEME_COLORS.default;
  if (threeUpdateCallback) {
    threeUpdateCallback(colors.accent, colors.ribbon);
  }

  /* Notify particle system of hue change */
  if (particleUpdateCallback) {
    requestAnimationFrame(() => particleUpdateCallback());
  }

  /* Remove transition class after animation completes */
  setTimeout(() => {
    body.classList.remove('theme-transitioning');
  }, 700);
}

/* ---- Get Current Theme Colors ------------------------------------------- */
export function getThemeColors() {
  return THEME_COLORS[currentTheme] || THEME_COLORS.default;
}

/* ---- Theme Ripple Effect ------------------------------------------------ */
function createThemeRipple(event, theme) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.default;
  const ripple = document.createElement('div');
  ripple.className = 'theme-ripple';
  ripple.style.cssText = `
    position: fixed;
    left: ${event.clientX}px;
    top: ${event.clientY}px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle, ${colors.accent}44 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0);
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(ripple);

  gsap.to(ripple, {
    scale: Math.max(window.innerWidth, window.innerHeight) / 5,
    opacity: 0,
    duration: 0.7,
    ease: 'power2.out',
    onComplete: () => ripple.remove(),
  });
}
