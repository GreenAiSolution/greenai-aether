import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ============================================================
   AETHER — immersive autonomous-agent experience
   A scroll-driven cinematic WebGL scene with a reasoning core,
   orbiting agent swarm, neural particle field and bloom.
============================================================ */

const canvas = document.getElementById('scene');
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.022);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 16);

const COL = {
  teal:   new THREE.Color(0x5eead4),
  violet: new THREE.Color(0x7c5cff),
  cyan:   new THREE.Color(0x22d3ee),
};

/* -------------------- Lights -------------------- */
scene.add(new THREE.AmbientLight(0x3a4a66, 0.6));
const key = new THREE.PointLight(0x5eead4, 3.2, 80); key.position.set(6, 6, 10); scene.add(key);
const rim = new THREE.PointLight(0x7c5cff, 2.6, 80); rim.position.set(-8, -4, 6); scene.add(rim);

/* ============================================================
   1. THE METROPOLIS — a spherical city of social-media skyscrapers
============================================================ */
const coreUniforms = {
  uTime:  { value: 0 },
  uPulse: { value: 0 },        // scroll-driven "city alive" intensity 0..1
};

// Dark "planet" base — the surface the city sits on
const core = new THREE.Mesh(
  new THREE.SphereGeometry(3.35, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0x07090f, metalness: 0.4, roughness: 0.9,
    emissive: 0x0a1530, emissiveIntensity: 0.5,
  })
);
scene.add(core);

// The city pulse uniform is still driven from the scroll loop (legacy name kept)
coreUniforms.uPulse.value = 0.25;

// Glowing wireframe atmosphere dome wrapping the metropolis
const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(5.4, 2),
  new THREE.MeshBasicMaterial({ color: 0x5eead4, wireframe: true, transparent: true, opacity: 0.08 })
);
scene.add(shell);

/* ----------------------------------------------------------
   THE CITY — a spherical metropolis of social-media skyscrapers
   ~720 instanced buildings distributed via Fibonacci sphere,
   each oriented outward, colored from the platform palette.
---------------------------------------------------------- */
const CITY_RADIUS = 3.4;
const CITY_COUNT  = 620;

const cityPalette = [
  new THREE.Color(0x0A66C2), // LinkedIn blue
  new THREE.Color(0x1877F2), // Facebook blue
  new THREE.Color(0xE4405F), // Instagram pink
  new THREE.Color(0xFF0000), // YouTube red
  new THREE.Color(0xBD081C), // Pinterest red
  new THREE.Color(0xFF4500), // Reddit orange
  new THREE.Color(0x25D366), // WhatsApp green
  new THREE.Color(0x5eead4), // AETHER teal
  new THREE.Color(0x7c5cff), // AETHER violet
];

const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
const buildingMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,                 // tinted per-instance via instanceColor
  metalness: 0.55, roughness: 0.35,
  emissive: 0x000000,              // ZERO emissive so per-instance brand colors don't wash out
  emissiveIntensity: 0,
});
const city = new THREE.InstancedMesh(buildingGeo, buildingMat, CITY_COUNT);
city.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const _tmpMat  = new THREE.Matrix4();
const _tmpQuat = new THREE.Quaternion();
const _tmpScl  = new THREE.Vector3();
const _tmpPos  = new THREE.Vector3();
const _localUp = new THREE.Vector3(0, 1, 0);
const _normal  = new THREE.Vector3();
const _baseCol = new THREE.Color();

const cityHeights = new Float32Array(CITY_COUNT);

// Fibonacci sphere distribution → guarantees even spread across the surface
const phi = Math.PI * (Math.sqrt(5) - 1);
for (let i = 0; i < CITY_COUNT; i++) {
  const y = 1 - (i / (CITY_COUNT - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = phi * i;

  _normal.set(Math.cos(theta) * r, y, Math.sin(theta) * r);

  // Building dimensions — most are short carpet; ~6% are dramatic landmark towers
  const isLandmark = Math.random() < 0.06;
  const height = isLandmark
    ? 1.4 + Math.random() * 0.9                                  // 1.4–2.3 iconic skyscraper
    : 0.20 + Math.pow(Math.random(), 2.4) * 0.75;                // 0.20–0.95 dense low-rise
  const footprint = isLandmark
    ? 0.20 + Math.random() * 0.08                                // 0.20–0.28 narrow tower
    : 0.24 + Math.random() * 0.14;                               // 0.24–0.38 wider base
  cityHeights[i] = height;

  // Orient so the box's local Y aligns with the outward normal
  _tmpQuat.setFromUnitVectors(_localUp, _normal);

  // Position: building base sits on the sphere, push up by half its height along the normal
  _tmpPos.copy(_normal).multiplyScalar(CITY_RADIUS + height * 0.5);
  _tmpScl.set(footprint, height, footprint);

  _tmpMat.compose(_tmpPos, _tmpQuat, _tmpScl);
  city.setMatrixAt(i, _tmpMat);

  // Color: landmark towers always brand-colored; rest mostly muted city tones with brand accents
  if (isLandmark || Math.random() < 0.32) {
    _baseCol.copy(cityPalette[Math.floor(Math.random() * cityPalette.length)]);
  } else {
    _baseCol.setHSL(0.58 + Math.random() * 0.08, 0.40, 0.16 + Math.random() * 0.14);
  }
  city.setColorAt(i, _baseCol);
}
city.instanceMatrix.needsUpdate = true;
if (city.instanceColor) city.instanceColor.needsUpdate = true;
scene.add(city);

// Antenna lights — tiny glowing points on top of every building for that "city at night" feel
const lightGeo = new THREE.SphereGeometry(0.03, 6, 6);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c4, transparent: true, opacity: 0.95 });
const cityLights = new THREE.InstancedMesh(lightGeo, lightMat, CITY_COUNT);
const _lightCol = new THREE.Color();
for (let i = 0; i < CITY_COUNT; i++) {
  const y = 1 - (i / (CITY_COUNT - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = phi * i;
  _normal.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
  const h = cityHeights[i];
  _tmpPos.copy(_normal).multiplyScalar(CITY_RADIUS + h + 0.015);
  _tmpScl.setScalar(0.4 + Math.random() * 0.7);  // smaller dots so they read as window lights, not stars
  _tmpMat.compose(_tmpPos, new THREE.Quaternion(), _tmpScl);
  cityLights.setMatrixAt(i, _tmpMat);
  // Warm white most of the time; brand-tinted occasionally
  if (Math.random() < 0.18) {
    _lightCol.copy(cityPalette[Math.floor(Math.random() * cityPalette.length)]).lerp(new THREE.Color(0xffffff), 0.4);
  } else {
    _lightCol.setRGB(1, 0.94, 0.78);
  }
  cityLights.setColorAt(i, _lightCol);
}
cityLights.instanceMatrix.needsUpdate = true;
if (cityLights.instanceColor) cityLights.instanceColor.needsUpdate = true;
scene.add(cityLights);

// Group both into a "city" parent so we can spin / pulse them together
const metropolis = new THREE.Group();
scene.remove(city); scene.remove(cityLights); scene.remove(core);
metropolis.add(core, city, cityLights);
scene.add(metropolis);

/* ============================================================
   2. SOCIAL PLATFORM SWARM — orbiting brand chips
   The 10 platforms businesses actually run on, rendered as
   floating brand-colored sprites that always face the camera.
============================================================ */
const PLATFORMS = [
  { slug: 'linkedin',  bg: '#0A66C2' },
  { slug: 'facebook',  bg: '#1877F2' },
  { slug: 'instagram', bg: '#E4405F' },
  { slug: 'x',         bg: '#0a0a0a' },
  { slug: 'youtube',   bg: '#FF0000' },
  { slug: 'tiktok',    bg: '#0a0a0a' },
  { slug: 'pinterest', bg: '#BD081C' },
  { slug: 'reddit',    bg: '#FF4500' },
  { slug: 'whatsapp',  bg: '#25D366' },
  { slug: 'threads',   bg: '#0a0a0a' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Real platform logos pulled from the SimpleIcons CDN (free, attribution-friendly,
// CORS-enabled), composited onto a brand-color rounded chip.
function makeChipTexture(slug, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;

  function paintBg() {
    ctx.clearRect(0, 0, 256, 256);
    ctx.shadowColor = bg;
    ctx.shadowBlur = 28;
    ctx.fillStyle = bg;
    roundRect(ctx, 22, 22, 212, 212, 50);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    roundRect(ctx, 22, 22, 212, 212, 50);
    ctx.stroke();
  }
  paintBg(); // initial paint so the chip is visible before the SVG arrives

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    paintBg();
    const s = 132;                       // logo size inside the 256 chip
    ctx.drawImage(img, (256 - s) / 2, (256 - s) / 2, s, s);
    tex.needsUpdate = true;
  };
  img.src = `https://cdn.simpleicons.org/${slug}/white`;
  return tex;
}

const PER_PLATFORM = 8;                           // 10 × 8 = 80 chips total
const SWARM = PLATFORMS.length * PER_PLATFORM;
const swarm = new THREE.Group();
const swarmSprites = [];
const swarmData = [];
PLATFORMS.forEach((p) => {
  const tex = makeChipTexture(p.slug, p.bg);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  for (let i = 0; i < PER_PLATFORM; i++) {
    const s = new THREE.Sprite(mat);
    swarm.add(s);
    swarmSprites.push(s);
    swarmData.push({
      radius: 7 + Math.random() * 6,               // pushed further out from the core
      speed: (0.08 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 1.4,
      yOff: (Math.random() - 0.5) * 6,
      scale: 0.32 + Math.random() * 0.32,          // much smaller — 0.32–0.64 base
    });
  }
});
scene.add(swarm);

/* ============================================================
   3. NEURAL PARTICLE FIELD — depth backdrop
============================================================ */
const STARS = 2600;
const sPos = new Float32Array(STARS * 3);
const sCol = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
  const r = 18 + Math.random() * 55;
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
  sPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
  sPos[i*3+1] = r * Math.cos(ph) * 0.6;
  sPos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  const c = Math.random() > 0.5 ? COL.cyan : (Math.random() > 0.5 ? COL.violet : COL.teal);
  sCol[i*3] = c.r; sCol[i*3+1] = c.g; sCol[i*3+2] = c.b;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.13, vertexColors: true, transparent: true, opacity: 0.85,
  depthWrite: false, blending: THREE.AdditiveBlending,
}));
scene.add(stars);

/* ============================================================
   4. ORBIT RINGS — sweeping data tracks
============================================================ */
const rings = new THREE.Group();
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6 + i * 1.6, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: i === 1 ? 0x7c5cff : 0x22d3ee, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2 + (i - 1) * 0.4;
  ring.rotation.y = i * 0.5;
  rings.add(ring);
}
scene.add(rings);

/* ============================================================
   Post-processing: bloom
============================================================ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.7, 0.32);
composer.addPass(bloom);

/* ============================================================
   Camera keyframes — one per scroll section
============================================================ */
const SHOTS = [
  { pos: new THREE.Vector3(0, 0, 13),    look: new THREE.Vector3(0, 0, 0),    pulse: 0.22, exposure: 1.15 }, // hero — closer for city legibility
  { pos: new THREE.Vector3(-7, 0.5, 8),  look: new THREE.Vector3(-3.5, 0, 0), pulse: 0.55, exposure: 1.25 }, // core close-up of the city
  { pos: new THREE.Vector3(7, -1.5, 9),  look: new THREE.Vector3(3.5, 0.4, 0),pulse: 0.45, exposure: 1.2 },  // capabilities
  { pos: new THREE.Vector3(0, 6, 13),    look: new THREE.Vector3(0, 1.4, 0),  pulse: 0.6,  exposure: 1.2 },  // scale (high angle)
  { pos: new THREE.Vector3(-5, -1, 11),  look: new THREE.Vector3(-1.8, -0.4, 0), pulse: 0.5, exposure: 1.2 }, // integrate
  { pos: new THREE.Vector3(0, 0, 11),    look: new THREE.Vector3(0, 0, 0),    pulse: 0.8,  exposure: 1.3 },  // packages
];

// smoothed scroll progress across the whole document, expressed as a float section index
let targetProg = 0;     // 0..(SHOTS.length-1)
let prog = 0;
const NSEC = SHOTS.length;

function computeScrollProgress() {
  const max = document.body.scrollHeight - innerHeight;
  const t = max > 0 ? scrollY / max : 0;
  return t * (NSEC - 1);
}

/* mouse parallax */
const mouse = new THREE.Vector2(0, 0);
const mouseTarget = new THREE.Vector2(0, 0);
addEventListener('pointermove', (e) => {
  mouseTarget.x = (e.clientX / innerWidth - 0.5) * 2;
  mouseTarget.y = (e.clientY / innerHeight - 0.5) * 2;
});

/* ============================================================
   Render loop
============================================================ */
const clock = new THREE.Clock();
const _lookCur = new THREE.Vector3(0, 0, 0);
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function lerpShot(out, a, b, t) { out.lerpVectors(a, b, t); }

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // ease scroll progress
  targetProg = computeScrollProgress();
  prog += (targetProg - prog) * Math.min(1, dt * 4.5);

  const i = Math.max(0, Math.min(NSEC - 2, Math.floor(prog)));
  const f = THREE.MathUtils.clamp(prog - i, 0, 1);
  const a = SHOTS[i], b = SHOTS[i + 1];

  // camera position + look-at
  lerpShot(_camTarget, a.pos, b.pos, f);
  lerpShot(_lookTarget, a.look, b.look, f);

  // parallax offset
  mouse.x += (mouseTarget.x - mouse.x) * 0.05;
  mouse.y += (mouseTarget.y - mouse.y) * 0.05;
  _camTarget.x += mouse.x * 1.2;
  _camTarget.y += -mouse.y * 0.9;

  camera.position.lerp(_camTarget, Math.min(1, dt * 3));
  _lookCur.lerp(_lookTarget, Math.min(1, dt * 3));
  camera.lookAt(_lookCur);

  const pulse = THREE.MathUtils.lerp(a.pulse, b.pulse, f);
  const exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, f);
  renderer.toneMappingExposure += (exposure - renderer.toneMappingExposure) * 0.05;
  bloom.strength = 0.45 + pulse * 0.45;

  // metropolis animation — the city rotates as one body; lights & glow pulse with scroll
  coreUniforms.uTime.value = t;
  coreUniforms.uPulse.value += (pulse - coreUniforms.uPulse.value) * 0.05;
  metropolis.rotation.y = t * 0.08;
  metropolis.rotation.x = Math.sin(t * 0.15) * 0.08;
  lightMat.opacity = 0.75 + Math.sin(t * 3) * 0.08 + pulse * 0.2;
  shell.rotation.y = -t * 0.06;
  shell.rotation.z = t * 0.04;
  const breathe = 1 + Math.sin(t * 1.4) * 0.02 * (0.4 + pulse);
  shell.scale.setScalar(breathe);

  // social-platform swarm orbit (sprites always face the camera)
  for (let k = 0; k < swarmSprites.length; k++) {
    const d = swarmData[k];
    const ang = d.phase + t * d.speed;
    const x = Math.cos(ang) * d.radius;
    const z = Math.sin(ang) * d.radius;
    const y = d.yOff + Math.sin(ang * 2 + d.phase) * 0.8 + Math.cos(t * 0.5 + k) * 0.3;
    const sc = d.scale * (0.75 + pulse * 0.2);
    swarmSprites[k].position.set(x, y * (1 + d.tilt * 0.2), z);
    swarmSprites[k].scale.setScalar(sc);
  }

  // ambient drift
  stars.rotation.y = t * 0.01;
  stars.rotation.x = Math.sin(t * 0.05) * 0.05;
  rings.rotation.y = t * 0.05;
  rings.rotation.z = Math.sin(t * 0.1) * 0.1;
  key.position.x = Math.cos(t * 0.3) * 8;
  key.position.z = Math.sin(t * 0.3) * 8 + 6;

  composer.render();
}

/* ============================================================
   Resize
============================================================ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

/* ============================================================
   UI: loader, reveals, rail, nav, counters, auto-tour
============================================================ */
const loader = document.getElementById('loader');
const fill = document.getElementById('loader-fill');
const pct = document.getElementById('loader-pct');

// simulate asset warm-up so first frame is smooth
let p = 0;
const warm = setInterval(() => {
  p = Math.min(100, p + Math.random() * 18);
  fill.style.width = p + '%';
  pct.textContent = Math.floor(p) + '%';
  if (p >= 100) {
    clearInterval(warm);
    setTimeout(() => {
      loader.classList.add('done');
      document.querySelectorAll('#hero .reveal').forEach((el, idx) =>
        setTimeout(() => el.classList.add('in'), 120 * idx));
    }, 350);
  }
}, 120);

// start the engine immediately
animate();

// nav background on scroll
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

// reveal on intersect
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const els = e.target.querySelectorAll('.reveal');
      els.forEach((el, idx) => setTimeout(() => el.classList.add('in'), 90 * idx));
      // counters
      e.target.querySelectorAll('.stat-num[data-count]').forEach(runCounter);
    }
  });
}, { threshold: 0.35 });
document.querySelectorAll('.panel').forEach(s => io.observe(s));

// animated stat counters
function runCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const end = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const dur = 1400; const start = performance.now();
  function step(now) {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    const val = end % 1 === 0 ? Math.floor(end * eased) : (end * eased).toFixed(2);
    el.textContent = val + suffix;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// rail + progress
const railFill = document.getElementById('rail-fill');
const railDots = [...document.querySelectorAll('.rail-dots li')];
addEventListener('scroll', () => {
  const max = document.body.scrollHeight - innerHeight;
  const t = max > 0 ? scrollY / max : 0;
  railFill.style.height = (t * 100) + '%';
  const active = Math.round(t * (NSEC - 1));
  railDots.forEach((d, i) => d.classList.toggle('active', i === active));
}, { passive: true });

// jump links (nav, dots, buttons)
function jumpTo(index) {
  const max = document.body.scrollHeight - innerHeight;
  const y = (index / (NSEC - 1)) * max;
  scrollTo({ top: y, behavior: 'smooth' });
}
document.querySelectorAll('[data-jump]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    jumpTo(parseInt(el.dataset.jump, 10));
  });
});

// ===== Auto tour: cinematic self-driving scroll through all sections =====
let touring = false; let tourTimers = [];
function clearTour() { tourTimers.forEach(clearTimeout); tourTimers = []; touring = false; updateTourBtns(); }
function updateTourBtns() {
  document.querySelectorAll('#tour-btn, #tour-btn-2').forEach(b => {
    b.textContent = touring ? '⏹ Stop tour' : '▶ Auto Tour';
  });
}
function startTour() {
  if (touring) { clearTour(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  touring = true; updateTourBtns();
  const HOLD = 4200;
  for (let i = 0; i < NSEC; i++) {
    tourTimers.push(setTimeout(() => {
      jumpTo(i);
      if (i === NSEC - 1) tourTimers.push(setTimeout(clearTour, HOLD));
    }, i * HOLD));
  }
}
document.querySelectorAll('#tour-btn, #tour-btn-2').forEach(b => b.addEventListener('click', startTour));
// cancel tour if the user grabs the wheel
['wheel', 'touchstart', 'keydown'].forEach(ev =>
  addEventListener(ev, () => { if (touring) clearTour(); }, { passive: true }));

/* ============================================================
   Onboarding modal — 4-step post-checkout flow
   Submissions POST to Formsubmit.co which forwards to jaden@greenaidigital.com.
   First-time only: Jaden must click the confirmation email Formsubmit sends.
============================================================ */
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/jaden@greenaidigital.com';

const ob = document.getElementById('onboard');
const obFill = document.getElementById('onboard-fill');
const obStepper = document.querySelectorAll('#onboard-stepper li');
const obSteps = document.querySelectorAll('.ob-step');
let obIdx = 0;

function obShow(i) {
  obIdx = Math.max(0, Math.min(obSteps.length - 1, i));
  obSteps.forEach((s, k) => s.classList.toggle('ob-active', k === obIdx));
  obStepper.forEach((s, k) => s.classList.toggle('active', k === obIdx));
  obFill.style.width = ((obIdx + 1) / obSteps.length * 100) + '%';
  ob.querySelector('.onboard-card').scrollTop = 0;
}
function obOpen(planName) {
  ob.classList.add('open');
  ob.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  obShow(0);
  if (planName) document.getElementById('ob-plan').value = planName;
  coreUniforms.uPulse.value = 1.4;
}
function obClose() {
  ob.classList.remove('open');
  ob.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

ob.querySelector('.onboard-close').addEventListener('click', obClose);
ob.addEventListener('click', (e) => { if (e.target === ob) obClose(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && ob.classList.contains('open')) obClose(); });
ob.querySelectorAll('[data-ob-next]').forEach(b => b.addEventListener('click', () => obShow(obIdx + 1)));
ob.querySelectorAll('[data-ob-prev]').forEach(b => b.addEventListener('click', () => obShow(obIdx - 1)));
// step-2 connector toggle → keep hidden field in sync
function syncConnectors() {
  const list = [...ob.querySelectorAll('.ob-conn.connected')]
    .map(b => b.textContent.replace(/^[⊕✓\s]+/, '').trim());
  document.getElementById('ob-connectors-val').value = list.join(', ');
}
ob.querySelectorAll('.ob-conn').forEach(btn => {
  btn.addEventListener('click', () => { btn.classList.toggle('connected'); syncConnectors(); });
});

// step-3 template radios → sync hidden field
ob.querySelectorAll('.ob-tpl input').forEach((r, i) => {
  r.addEventListener('change', () => {
    document.getElementById('ob-template-val').value =
      ob.querySelectorAll('.ob-tpl b')[i].textContent.trim();
  });
});

// step-4 slot pick → reveal "kickoff confirmed" + sync hidden field
ob.querySelectorAll('.ob-slot').forEach(btn => {
  btn.addEventListener('click', () => {
    ob.querySelectorAll('.ob-slot').forEach(s => s.classList.remove('picked'));
    btn.classList.add('picked');
    document.getElementById('ob-slot-val').value = btn.textContent.trim();
    ob.querySelector('.ob-done').classList.add('show');
  });
});

// Submit handler → POST to Formsubmit.co (forwards to jaden@greenaidigital.com)
const obForm = document.getElementById('onboard-form');
obForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('ob-finish');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';
  submitBtn.disabled = true;
  try {
    const data = new FormData(obForm);
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error('Submission failed');
    submitBtn.textContent = '✓ Sent — check your email';
    setTimeout(obClose, 1600);
  } catch (err) {
    // Fallback: open mailto with collected data so the lead is never lost
    const d = Object.fromEntries(new FormData(obForm));
    const body = Object.entries(d).filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `${k}: ${v}`).join('\n');
    location.href = `mailto:jaden@greenaidigital.com?subject=${encodeURIComponent('AETHER intake (manual)')}&body=${encodeURIComponent(body)}`;
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

/* Pricing buy buttons:
   - If data-stripe is set → redirect to Stripe Checkout (Stripe sends them back with ?onboard=1)
   - If empty → open the onboarding modal directly (current pre-Stripe behaviour) */
document.querySelectorAll('.buy-btn').forEach(b => {
  b.addEventListener('click', (e) => {
    e.preventDefault();
    coreUniforms.uPulse.value = 1.5;
    const stripe = b.dataset.stripe;
    const plan = b.dataset.plan || '';
    if (stripe && stripe.startsWith('http')) {
      location.href = stripe;
    } else {
      obOpen(plan);
    }
  });
});

// If Stripe sent the user back with ?onboard=1, auto-open the intake modal
const params = new URLSearchParams(location.search);
if (params.get('onboard') === '1') {
  setTimeout(() => obOpen(params.get('plan') || '(post-checkout)'), 1200);
}

// pause render when tab hidden (perf)
document.addEventListener('visibilitychange', () => {
  renderer.setAnimationLoop(null); // animate() uses rAF; nothing to do, kept for clarity
});
