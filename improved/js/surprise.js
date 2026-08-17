/* ==========================================================================
   GiftCustom — Surprise Animation
   Gift-open sequence, confetti burst, and personalized overlay.
   ========================================================================== */
import { $ } from './utils.js';

let confettiCanvas, confettiCtx, confettiRaf = 0;
let confettiParticles = [];
let overlayEl = null;

/* ---- Confetti Particle -------------------------------------------------- */
class Confetti {
  constructor(cx, cy, colors) {
    this.x = cx + (Math.random() - 0.5) * 60;
    this.y = cy;
    this.vx = (Math.random() - 0.5) * 9;
    this.vy = -(8 + Math.random() * 9);
    this.w = 5 + Math.random() * 7;
    this.h = 7 + Math.random() * 9;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.18;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.gravity = 0.22;
    this.opacity = 1;
    this.drag = 0.98;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    if (this.y > window.innerHeight + 20) this.opacity = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

/* ---- Build or get overlay DOM ------------------------------------------- */
function ensureOverlay() {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement('div');
  overlayEl.id = 'surpriseOverlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');
  overlayEl.setAttribute('aria-labelledby', 'surprise-title');
  overlayEl.innerHTML = `
    <canvas id="surpriseCanvas" aria-hidden="true"></canvas>
    <div class="surprise-message" role="document">
      <div class="surprise-emoji" aria-hidden="true">🎁</div>
      <h2 class="surprise-title" id="surprise-title">Your gift is special!</h2>
      <p class="surprise-text"></p>
      <p class="surprise-subtitle">Something magical is on its way…</p>
      <button class="btn btn-primary btn-glow surprise-close" type="button">
        Continue ✨
      </button>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.querySelector('.surprise-close').addEventListener('click', dismissSurprise);
  overlayEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dismissSurprise();
  });

  return overlayEl;
}

/* ---- Confetti loop ------------------------------------------------------ */
function runConfetti() {
  if (!confettiCtx) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles = confettiParticles.filter(p => p.opacity > 0);
  for (const p of confettiParticles) {
    p.update();
    p.draw(confettiCtx);
  }

  if (confettiParticles.length > 0) {
    confettiRaf = requestAnimationFrame(runConfetti);
  } else {
    cancelAnimationFrame(confettiRaf);
    confettiRaf = 0;
  }
}

/* ---- Spawn confetti burst ----------------------------------------------- */
function spawnConfetti(cx, cy) {
  const style = getComputedStyle(document.body);
  const colors = [
    style.getPropertyValue('--accent').trim()   || '#7A5566',
    style.getPropertyValue('--accent-2').trim() || '#E3CBD4',
    style.getPropertyValue('--accent-ink').trim() || '#3C2430',
    '#FFD700', '#FFFFFF', '#FF6B6B', '#4ECDC4',
  ];

  confettiParticles = [];
  for (let i = 0; i < 160; i++) {
    confettiParticles.push(new Confetti(cx, cy, colors));
  }

  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  confettiRaf = requestAnimationFrame(runConfetti);
}

/* ---- Public: trigger the full surprise sequence ------------------------- */
export async function triggerSurprise(recipientName = '', themeName = '') {
  const overlay = ensureOverlay();

  // Set personalized text
  const textEl = overlay.querySelector('.surprise-text');
  if (textEl) {
    const name = recipientName || 'someone special';
    const theme = themeName || 'curated';
    textEl.textContent = `A ${theme} gift is being prepared for ${name}!`;
  }

  // Setup confetti canvas
  confettiCanvas = overlay.querySelector('#surpriseCanvas');
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCtx = confettiCanvas.getContext('2d');
  }

  // Try to open the 3D gift box first
  try {
    const { openGiftBox } = await import('./threeScene.js');
    await openGiftBox();
  } catch (_) {}

  // Confetti burst from center of viewport
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.55;
  spawnConfetti(cx, cy);

  // Show overlay
  overlay.classList.add('is-active');
  overlay.style.display = 'flex';

  if (window.gsap) {
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(
      overlay.querySelector('.surprise-message'),
      { scale: 0.8, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.65, ease: 'back.out(1.4)', delay: 0.15 }
    );
  }

  // Focus the dialog
  requestAnimationFrame(() => {
    const closeBtn = overlay.querySelector('.surprise-close');
    if (closeBtn) closeBtn.focus();
  });
}

/* ---- Public: dismiss ---------------------------------------------------- */
export function dismissSurprise() {
  if (!overlayEl) return;

  cancelAnimationFrame(confettiRaf);
  confettiRaf = 0;

  const hide = () => {
    overlayEl.classList.remove('is-active');
    overlayEl.style.display = 'none';
    confettiParticles = [];
  };

  if (window.gsap) {
    gsap.to(overlayEl, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: hide });
  } else {
    hide();
  }

  // Reset gift box
  import('./threeScene.js').then(({ resetGiftBox }) => resetGiftBox()).catch(() => {});
}
