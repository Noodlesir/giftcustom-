/* ==========================================================================
   GiftCustom — Canvas Particle System
   Ambient floating particles with connections, mouse repulsion, and scroll drift.
   ========================================================================== */

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let ctx;

// Mouse tracking (off-screen initially so no interaction on load)
let mouseX = -1000;
let mouseY = -1000;

// Scroll-based upward drift applied for one frame after a scroll event
let scrollDrift = 0;

// Animation state
let animFrameId = 0;
let particles = [];
let baseHue = 320; // default hue; overridden by --particle-color
let paused = false;

// Debounce timer for resize
let resizeTimer = 0;

/* --------------------------------------------------------------------------
   Particle class
   -------------------------------------------------------------------------- */
class Particle {
  /**
   * @param {number} canvasW
   * @param {number} canvasH
   * @param {number} hue — center hue for the particle color
   */
  constructor(canvasW, canvasH, hue) {
    this.x = Math.random() * canvasW;
    this.y = Math.random() * canvasH;
    this.size = 0.5 + Math.random() * 2;            // 0.5 – 2.5
    this.baseSpeedX = (Math.random() - 0.5) * 0.8;  // ±0.4
    this.baseSpeedY = (Math.random() - 0.5) * 0.8;
    this.speedX = this.baseSpeedX;
    this.speedY = this.baseSpeedY;
    this.opacity = 0.05 + Math.random() * 0.25;     // 0.05 – 0.3
    this.hue = hue + (Math.random() - 0.5) * 40;    // ±20 from center hue
  }

  /** Update position, apply mouse repulsion, scroll drift, and edge wrapping. */
  update(canvasW, canvasH) {
    // ---- Mouse repulsion (gentle push away within 100 px) ----
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100 && dist > 0) {
      // Temporarily nudge speed in the direction away from cursor
      const pushStrength = 1.5;
      this.speedX = this.baseSpeedX + (dx / dist) * Math.abs(this.baseSpeedX) * pushStrength;
      this.speedY = this.baseSpeedY + (dy / dist) * Math.abs(this.baseSpeedY) * pushStrength;
    } else {
      // Ease speed back to base
      this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
      this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
    }

    // ---- Scroll drift (one-frame upward impulse) ----
    this.y += this.speedY + scrollDrift;
    this.x += this.speedX;

    // ---- Edge wrapping ----
    if (this.x > canvasW) this.x = 0;
    else if (this.x < 0) this.x = canvasW;
    if (this.y > canvasH) this.y = 0;
    else if (this.y < 0) this.y = canvasH;
  }
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

/** Read the --particle-color CSS variable (a hue number) from document.body. */
function readHueFromCSS() {
  const raw = getComputedStyle(document.body).getPropertyValue('--particle-color').trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 320; // fallback hue
}

/** Determine particle count based on viewport width. */
function getParticleCount() {
  return window.matchMedia('(max-width: 760px)').matches ? 15 : 30;
}

/** Create (or recreate) the particle array. */
function createParticles() {
  const count = getParticleCount();
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(canvas.width, canvas.height, baseHue));
  }
}

/** Resize the canvas to match its CSS layout size. */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/* --------------------------------------------------------------------------
   Drawing — batched for performance
   -------------------------------------------------------------------------- */
function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // ---- Draw connection lines (single beginPath) ----
  ctx.beginPath();
  const connDist = 120;
  const connDistSq = connDist * connDist;

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dSq = dx * dx + dy * dy;
      if (dSq < connDistSq) {
        const alpha = (1 - Math.sqrt(dSq) / connDist) * 0.12;
        // We need per-line stroke style, so stroke the current sub-path
        ctx.strokeStyle = `hsla(${baseHue}, 40%, 65%, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
      }
    }
  }
  ctx.stroke();

  // ---- Draw particles ----
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 50%, 70%, ${p.opacity})`;
    ctx.fill();
  }
}

/* --------------------------------------------------------------------------
   Animation loop
   -------------------------------------------------------------------------- */
function animate() {
  if (paused) { animFrameId = 0; return; }

  // Update all particles
  const w = canvas.width;
  const h = canvas.height;
  for (const p of particles) {
    p.update(w, h);
  }

  draw();

  // Reset scroll drift after it has been consumed for this frame
  scrollDrift = 0;

  animFrameId = requestAnimationFrame(animate);
}

/* --------------------------------------------------------------------------
   Event handlers
   -------------------------------------------------------------------------- */

function onMouseMove(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function onMouseLeave() {
  mouseX = -1000;
  mouseY = -1000;
}

function onScroll() {
  // Approximate scroll delta: compare to last known scrollY
  scrollDrift = -Math.abs(window.scrollY) * 0.01;
  // Clamp so it doesn't become too strong
  if (scrollDrift < -2) scrollDrift = -2;
}

function onVisibilityChange() {
  if (document.hidden) {
    paused = true;
  } else {
    paused = false;
    if (!animFrameId) animFrameId = requestAnimationFrame(animate);
  }
}

function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas();
    createParticles(); // recreate to match new count/bounds
  }, 200);
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

/**
 * Initialise the particle canvas and start the animation loop.
 * Call once on page load.
 */
export function initParticles() {
  canvas = document.getElementById('particleCanvas');
  if (!canvas) {
    console.warn('[particles] #particleCanvas not found.');
    return;
  }

  ctx = canvas.getContext('2d');
  baseHue = readHueFromCSS();

  resizeCanvas();
  createParticles();

  // Event listeners (passive where possible)
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Kick off the loop
  animFrameId = requestAnimationFrame(animate);
}

/**
 * Re-read --particle-color from CSS and update all particle hues.
 * Call after a theme / occasion change to re-tint particles.
 */
export function updateParticleColors() {
  baseHue = readHueFromCSS();
  for (const p of particles) {
    p.hue = baseHue + (Math.random() - 0.5) * 40;
  }
}
