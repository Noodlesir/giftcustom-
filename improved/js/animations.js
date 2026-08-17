/* ==========================================================================
   GiftCustom — GSAP Animations Module
   Screen entrance reveals, counters, hover micro-interactions, ripples.
   ========================================================================== */
import { $$, $ } from './utils.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- Screen entrance animations ----------------------------------------- */
export function animateScreenIn(screenName) {
  if (REDUCED_MOTION || !window.gsap) return;

  const screen = $(`#screen-${screenName}`);
  if (!screen) return;

  // Stagger children that have the animated base classes
  const targets = screen.querySelectorAll(
    '.step-eyebrow, .screen-title, .screen-sub, .field, ' +
    '.occasion-card, .chip-card, .currency-bar, .theme-card, ' +
    '.checkout-card, .price-summary, .confirm-illustration, ' +
    '.confirm-receipt, .feature-strip, .hero-meta'
  );

  gsap.fromTo(targets,
    { opacity: 0, y: 18 },
    {
      opacity: 1, y: 0,
      duration: 0.55,
      stagger: 0.07,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
      overwrite: true,
    }
  );
}

/* ---- Counter animation for hero numbers --------------------------------- */
export function animateCounters() {
  if (REDUCED_MOTION) {
    // Just set final values immediately
    $$('.meta-num[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count);
      el.textContent = target === 50 ? '∞' : target;
    });
    return;
  }

  if (!window.gsap) { fallbackCounters(); return; }

  $$('.meta-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const obj = { val: 0 };

    gsap.to(obj, {
      val: target,
      duration: 1.6,
      delay: 0.4,
      ease: 'power2.out',
      onUpdate() {
        const v = Math.round(obj.val);
        el.textContent = (target === 50 && v === target) ? '∞' : v + (target === 50 ? '+' : '');
      },
    });
  });
}

function fallbackCounters() {
  $$('.meta-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const start = performance.now();
    const duration = 1500;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const v = Math.round((1 - Math.pow(1 - p, 3)) * target);
      el.textContent = target === 50 && v === target ? '∞' : v + (target === 50 ? '+' : '');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* ---- Button click ripple ------------------------------------------------ */
export function initRipples() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn || REDUCED_MOTION) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `
      position: absolute; border-radius: 50%; pointer-events: none;
      width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px;
      background: rgba(255,255,255,0.25);
      transform: scale(0); opacity: 1;
    `;

    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);

    if (window.gsap) {
      gsap.to(ripple, {
        scale: 1, opacity: 0, duration: 0.55, ease: 'power2.out',
        onComplete: () => ripple.remove(),
      });
    } else {
      ripple.animate([
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(1)', opacity: 0 },
      ], { duration: 550, easing: 'ease-out' }).onfinish = () => ripple.remove();
    }
  }, { passive: true });
}

/* ---- Card tilt hover (subtle 3D perspective) ----------------------------- */
export function initCardTilt() {
  if (REDUCED_MOTION) return;

  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.occasion-card, .theme-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((e.clientY - cy) / rect.height) * 8;
    const ry = -((e.clientX - cx) / rect.width) * 8;

    if (window.gsap) {
      gsap.to(card, {
        rotationX: rx, rotationY: ry,
        transformPerspective: 800,
        duration: 0.4, ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  }, { passive: true });

  document.addEventListener('mouseleave', (e) => {
    const card = e.target.closest('.occasion-card, .theme-card');
    if (!card) return;
    if (window.gsap) {
      gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' });
    }
  }, { capture: true, passive: true });
}

/* ---- Button hover → speed up gift box ----------------------------------- */
export function initButtonHoverGiftSpeed(setGiftSpeedFn) {
  if (!setGiftSpeedFn) return;

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.btn-primary')) setGiftSpeedFn(2.5);
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.btn-primary')) setGiftSpeedFn(1);
  }, { passive: true });
}

/* ---- Confirmation screen pop animation ---------------------------------- */
export function animateConfirmation() {
  if (REDUCED_MOTION || !window.gsap) return;

  const mark = $('.confirm-mark');
  const receipt = $('.confirm-receipt');
  if (mark) gsap.fromTo(mark, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.6)', delay: 0.1 });
  if (receipt) gsap.fromTo(receipt, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.45 });
}
