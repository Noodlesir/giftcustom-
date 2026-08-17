/* ==========================================================================
   GiftCustom — Three.js 3D Gift Box Scene
   Procedural gift box with ribbon, bow, floating animation, and interactions.
   ========================================================================== */

let scene, camera, renderer, giftGroup, lid, pointLight;
let sparkles = [];
let floatTime = 0;
let rotationSpeed = 0.15;
let targetRotSpeed = 0.15;
let isAnimating = false;
let isOpen = false;
let lastScrollY = 0;
let scrollOffset = 0;
let mouseNX = 0, mouseNY = 0;
let targetMouseNX = 0, targetMouseNY = 0;
let rafId = 0;
let lastTime = 0;
let ribbonMat, boxMat;

/* ---- Init --------------------------------------------------------------- */
export function initThreeScene() {
  try {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas) return false;

    if (!window.THREE) return false;

    // Test WebGL support
    const testCtx = document.createElement('canvas').getContext('webgl');
    if (!testCtx) { canvas.style.display = 'none'; return false; }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, 5);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    buildGiftBox();
    buildLighting();
    addEventListeners();

    isAnimating = true;
    rafId = requestAnimationFrame(animate);
    return true;
  } catch (err) {
    console.warn('[threeScene] init failed:', err);
    return false;
  }
}

/* ---- Gift Box Construction ---------------------------------------------- */
function buildGiftBox() {
  giftGroup = new THREE.Group();

  // Materials
  boxMat = new THREE.MeshStandardMaterial({ color: 0x7A5566, metalness: 0.25, roughness: 0.55 });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x8d6678, metalness: 0.25, roughness: 0.55 });
  ribbonMat = new THREE.MeshStandardMaterial({ color: 0xe3cbd4, metalness: 0.55, roughness: 0.3 });

  // Main box body
  const bodyGeo = new THREE.BoxGeometry(1.2, 0.78, 1.2);
  const body = new THREE.Mesh(bodyGeo, boxMat);
  body.position.y = -0.04;
  body.castShadow = true;
  giftGroup.add(body);

  // Lid (separate so it can open)
  lid = new THREE.Group();
  const lidGeo = new THREE.BoxGeometry(1.26, 0.18, 1.26);
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.castShadow = true;
  lid.add(lidMesh);

  // Ribbon on lid — cross
  const lidRibH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.19, 1.28), ribbonMat);
  const lidRibV = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.19, 0.12), ribbonMat);
  lid.add(lidRibH, lidRibV);

  // Bow (two torus loops)
  const bowGeo = new THREE.TorusGeometry(0.14, 0.038, 10, 20);
  const bow1 = new THREE.Mesh(bowGeo, ribbonMat);
  bow1.rotation.z = Math.PI / 5;
  bow1.position.set(0.08, 0.22, 0);
  const bow2 = new THREE.Mesh(bowGeo, ribbonMat);
  bow2.rotation.z = -Math.PI / 5;
  bow2.position.set(-0.08, 0.22, 0);
  lid.add(bow1, bow2);

  // Bow knot
  const knotGeo = new THREE.SphereGeometry(0.058, 8, 8);
  const knot = new THREE.Mesh(knotGeo, ribbonMat);
  knot.position.y = 0.22;
  lid.add(knot);

  lid.position.y = 0.48;
  giftGroup.add(lid);

  // Ribbon on body — vertical strip (front)
  const ribFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 1.22), ribbonMat);
  ribFront.position.y = -0.04;
  giftGroup.add(ribFront);

  // Ribbon on body — horizontal strip (side)
  const ribSide = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.8, 0.12), ribbonMat);
  ribSide.position.y = -0.04;
  giftGroup.add(ribSide);

  giftGroup.position.set(0.8, 0, 0);
  giftGroup.rotation.y = 0.3;
  scene.add(giftGroup);
}

/* ---- Lighting ----------------------------------------------------------- */
function buildLighting() {
  const ambient = new THREE.AmbientLight(0xfff5ee, 0.65);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(3, 4, 2);
  dirLight.castShadow = true;
  scene.add(dirLight);

  pointLight = new THREE.PointLight(0xc4778a, 0.45, 8);
  pointLight.position.set(-1.5, 1.5, 2);
  scene.add(pointLight);
}

/* ---- Animation Loop ----------------------------------------------------- */
function animate(timestamp) {
  rafId = requestAnimationFrame(animate);
  if (document.hidden || !isAnimating) return;

  const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  floatTime += delta;

  // Smooth rotation speed
  rotationSpeed += (targetRotSpeed - rotationSpeed) * 0.04;

  // Float Y
  giftGroup.position.y = Math.sin(floatTime * 0.9) * 0.14;

  // Slow rotation
  giftGroup.rotation.y += rotationSpeed * delta;

  // Scroll offset (drift up)
  const scrollDelta = window.scrollY - lastScrollY;
  lastScrollY = window.scrollY;
  scrollOffset += scrollDelta * -0.0006;
  scrollOffset *= 0.95; // decay
  giftGroup.position.y += scrollOffset;

  // Mouse parallax — smooth follow
  targetMouseNX += (0 - targetMouseNX) * 0.01;
  targetMouseNY += (0 - targetMouseNY) * 0.01;
  mouseNX += (targetMouseNX - mouseNX) * 0.06;
  mouseNY += (targetMouseNY - mouseNY) * 0.06;
  camera.position.x += (mouseNX * 0.3 - camera.position.x) * 0.04;
  camera.position.y += (mouseNY * 0.15 + 0.2 - camera.position.y) * 0.04;
  camera.lookAt(scene.position);

  // Animate sparkles
  animateSparkles(delta);

  renderer.render(scene, camera);
}

/* ---- Mouse Tracking ----------------------------------------------------- */
function onMouseMove(e) {
  targetMouseNX = (e.clientX / window.innerWidth) * 2 - 1;
  targetMouseNY = -(e.clientY / window.innerHeight) * 2 + 1;
}

/* ---- Resize ------------------------------------------------------------- */
let resizeTimer = 0;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 200);
}

/* ---- Visibility Pause --------------------------------------------------- */
function onVisibility() {
  isAnimating = !document.hidden;
  if (isAnimating && !rafId) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
  }
}

function addEventListeners() {
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
}

/* ---- Sparkle System ----------------------------------------------------- */
export function triggerSparkle(screenX, screenY) {
  if (!scene || !THREE) return;
  // Convert screen to normalized device coordinates
  const ndc = new THREE.Vector3(
    (screenX / window.innerWidth) * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1,
    0.5
  );
  ndc.unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const pos = camera.position.clone().addScaledVector(dir, 3);

  const color = new THREE.Color(getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7A5566');
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.SphereGeometry(0.028, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2
    );
    scene.add(mesh);
    sparkles.push({ mesh, vel, life: 1 });
  }
}

function animateSparkles(delta) {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= delta * 1.6;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      sparkles.splice(i, 1);
      continue;
    }
    s.mesh.position.addScaledVector(s.vel, delta * 2);
    s.vel.y -= 0.12 * delta;
    s.mesh.material.opacity = s.life;
    s.mesh.material.transparent = true;
  }
}

/* ---- Speed Control ------------------------------------------------------ */
export function setGiftSpeed(multiplier = 1) {
  targetRotSpeed = 0.15 * multiplier;
}

/* ---- Update Colors ------------------------------------------------------ */
export function updateGiftColors(accentHex, ribbonHex) {
  if (!boxMat || !ribbonMat) return;
  try {
    boxMat.color.set(accentHex);
    ribbonMat.color.set(ribbonHex);
    if (pointLight) pointLight.color.set(accentHex);
  } catch (_) {}
}

/* ---- Gift Open Animation ------------------------------------------------ */
export function openGiftBox() {
  return new Promise((resolve) => {
    if (isOpen || !lid || !window.gsap) { resolve(); return; }
    isOpen = true;
    targetRotSpeed = 0;

    const tl = gsap.timeline({ onComplete: resolve });

    // Shake
    tl.to(giftGroup.position, { x: 0.85, duration: 0.07, yoyo: true, repeat: 5, ease: 'none' });

    // Glow up
    tl.to(pointLight, { intensity: 2.2, duration: 0.5, ease: 'power2.out' }, '-=0.1');

    // Lid hinge: rotate around back edge (pivot at z = -0.63)
    tl.to(lid.rotation, { x: -Math.PI * 0.62, duration: 1.1, ease: 'power3.inOut' }, '-=0.2');
  });
}

/* ---- Reset -------------------------------------------------------------- */
export function resetGiftBox() {
  if (!lid) return;
  isOpen = false;
  targetRotSpeed = 0.15;

  if (window.gsap) {
    gsap.to(lid.rotation, { x: 0, duration: 0.8, ease: 'power2.inOut' });
    gsap.to(pointLight, { intensity: 0.45, duration: 0.6, ease: 'power2.out' });
    gsap.to(giftGroup.position, { x: 0.8, duration: 0.5, ease: 'power2.out' });
  } else {
    lid.rotation.x = 0;
    if (pointLight) pointLight.intensity = 0.45;
  }
}
