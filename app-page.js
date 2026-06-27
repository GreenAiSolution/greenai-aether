import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ============================================================
   AETHER — individual page 3D background
   Simplified version with fixed camera angle
============================================================ */

const canvas = document.getElementById('scene');
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.022);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0.5, 14);
camera.lookAt(0, 0, 0);

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
   THE METROPOLIS — background city
============================================================ */
const coreUniforms = {
  uTime:  { value: 0 },
  uPulse: { value: 0.5 },
};

const core = new THREE.Mesh(
  new THREE.SphereGeometry(3.35, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0x07090f, metalness: 0.4, roughness: 0.9,
    emissive: 0x0a1530, emissiveIntensity: 0.5,
  })
);
scene.add(core);

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(5.4, 2),
  new THREE.MeshBasicMaterial({ color: 0x5eead4, wireframe: true, transparent: true, opacity: 0.08 })
);
scene.add(shell);

/* City buildings */
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
  color: 0xffffff,
  metalness: 0.55, roughness: 0.35,
  emissive: 0x000000,
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

const phi = Math.PI * (Math.sqrt(5) - 1);
for (let i = 0; i < CITY_COUNT; i++) {
  const y = 1 - (i / (CITY_COUNT - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = phi * i;

  _normal.set(Math.cos(theta) * r, y, Math.sin(theta) * r);

  const isLandmark = Math.random() < 0.06;
  const height = isLandmark
    ? 1.4 + Math.random() * 0.9
    : 0.20 + Math.pow(Math.random(), 2.4) * 0.75;
  const footprint = isLandmark
    ? 0.20 + Math.random() * 0.08
    : 0.24 + Math.random() * 0.14;
  cityHeights[i] = height;

  _tmpQuat.setFromUnitVectors(_localUp, _normal);
  _tmpPos.copy(_normal).multiplyScalar(CITY_RADIUS + height * 0.5);
  _tmpScl.set(footprint, height, footprint);

  _tmpMat.compose(_tmpPos, _tmpQuat, _tmpScl);
  city.setMatrixAt(i, _tmpMat);

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

/* Antenna lights */
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
  _tmpScl.setScalar(0.4 + Math.random() * 0.7);
  _tmpMat.compose(_tmpPos, new THREE.Quaternion(), _tmpScl);
  cityLights.setMatrixAt(i, _tmpMat);
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

const metropolis = new THREE.Group();
scene.remove(city); scene.remove(cityLights); scene.remove(core);
metropolis.add(core, city, cityLights);
scene.add(metropolis);

/* ============================================================
   SOCIAL PLATFORM SWARM
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
  paintBg();

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    paintBg();
    const s = 132;
    ctx.drawImage(img, (256 - s) / 2, (256 - s) / 2, s, s);
    tex.needsUpdate = true;
  };
  img.src = `https://cdn.simpleicons.org/${slug}/white`;
  return tex;
}

const PER_PLATFORM = 8;
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
      radius: 7 + Math.random() * 6,
      speed: (0.08 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 1.4,
      yOff: (Math.random() - 0.5) * 6,
      scale: 0.32 + Math.random() * 0.32,
    });
  }
});
scene.add(swarm);

/* ============================================================
   NEURAL PARTICLE FIELD
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
   ORBIT RINGS
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
   Render loop
============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  coreUniforms.uTime.value = t;
  metropolis.rotation.y = t * 0.08;
  metropolis.rotation.x = Math.sin(t * 0.15) * 0.08;
  lightMat.opacity = 0.75 + Math.sin(t * 3) * 0.08 + 0.15;
  shell.rotation.y = -t * 0.06;
  shell.rotation.z = t * 0.04;
  const breathe = 1 + Math.sin(t * 1.4) * 0.02 * 0.5;
  shell.scale.setScalar(breathe);

  for (let k = 0; k < swarmSprites.length; k++) {
    const d = swarmData[k];
    const ang = d.phase + t * d.speed;
    const x = Math.cos(ang) * d.radius;
    const z = Math.sin(ang) * d.radius;
    const y = d.yOff + Math.sin(ang * 2 + d.phase) * 0.8 + Math.cos(t * 0.5 + k) * 0.3;
    const sc = d.scale * 0.9;
    swarmSprites[k].position.set(x, y * (1 + d.tilt * 0.2), z);
    swarmSprites[k].scale.setScalar(sc);
  }

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
   UI: loader, reveals, nav
============================================================ */
const loader = document.getElementById('loader');
const fill = document.getElementById('loader-fill');
const pct = document.getElementById('loader-pct');

let p = 0;
const warm = setInterval(() => {
  p = Math.min(100, p + Math.random() * 18);
  fill.style.width = p + '%';
  pct.textContent = Math.floor(p) + '%';
  if (p >= 100) {
    clearInterval(warm);
    setTimeout(() => {
      loader.classList.add('done');
      document.querySelectorAll('.reveal').forEach((el, idx) =>
        setTimeout(() => el.classList.add('in'), 120 * idx));
    }, 350);
  }
}, 120);

animate();

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const els = e.target.querySelectorAll('.reveal');
      els.forEach((el, idx) => setTimeout(() => el.classList.add('in'), 90 * idx));
      e.target.querySelectorAll('.stat-num[data-count]').forEach(runCounter);
    }
  });
}, { threshold: 0.35 });
document.querySelectorAll('.panel').forEach(s => io.observe(s));

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

document.addEventListener('visibilitychange', () => {
  renderer.setAnimationLoop(null);
});
