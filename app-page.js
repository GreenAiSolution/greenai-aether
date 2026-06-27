import * as THREE from 'three';

/* ============================================================
   AETHER — subpage 3D background
   Lean build: no bloom, no city, no sprites — just the
   wireframe sphere + rings + star field. Buttery smooth.
============================================================ */

const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(1); // never go retina — biggest single perf win
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 14);

/* -------------------- Lights -------------------- */
scene.add(new THREE.AmbientLight(0x3a4a66, 1));

/* ============================================================
   1. WIREFRAME SPHERE — the iconic core visual
============================================================ */
const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(5.4, 2),
  new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  })
);
scene.add(shell);

/* Inner glow sphere */
const innerShell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(3.5, 1),
  new THREE.MeshBasicMaterial({
    color: 0x7c5cff,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
  })
);
scene.add(innerShell);

/* ============================================================
   2. ORBIT RINGS — sweeping data tracks
============================================================ */
const rings = new THREE.Group();
const ringColors = [0x22d3ee, 0x7c5cff, 0x5eead4];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6 + i * 1.6, 0.014, 8, 120),
    new THREE.MeshBasicMaterial({
      color: ringColors[i],
      transparent: true,
      opacity: 0.4,
    })
  );
  ring.rotation.x = Math.PI / 2 + (i - 1) * 0.4;
  ring.rotation.y = i * 0.5;
  rings.add(ring);
}
scene.add(rings);

/* ============================================================
   3. STAR FIELD — single draw call, additive blending
============================================================ */
const STARS = 800;
const sPos = new Float32Array(STARS * 3);
const sCol = new Float32Array(STARS * 3);
const palette = [
  new THREE.Color(0x22d3ee),
  new THREE.Color(0x7c5cff),
  new THREE.Color(0x5eead4),
];
for (let i = 0; i < STARS; i++) {
  const r = 18 + Math.random() * 50;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  sPos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
  sPos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
  sPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  const c = palette[i % 3];
  sCol[i * 3] = c.r; sCol[i * 3 + 1] = c.g; sCol[i * 3 + 2] = c.b;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
starGeo.setAttribute('color',    new THREE.BufferAttribute(sCol, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.14,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})));

/* ============================================================
   Render loop — direct render, no post-processing
============================================================ */
const clock = new THREE.Clock();
let animId;

function animate() {
  animId = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  shell.rotation.y      =  t * 0.06;
  shell.rotation.x      =  Math.sin(t * 0.12) * 0.06;
  innerShell.rotation.y = -t * 0.09;
  innerShell.rotation.z =  t * 0.04;
  rings.rotation.y      =  t * 0.04;
  rings.rotation.z      =  Math.sin(t * 0.08) * 0.08;

  renderer.render(scene, camera);
}

/* ============================================================
   Mouse parallax
============================================================ */
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

/* ============================================================
   Resize
============================================================ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============================================================
   UI: loader + reveals + active nav link
============================================================ */
const loader = document.getElementById('loader');
const fill   = document.getElementById('loader-fill');
const pct    = document.getElementById('loader-pct');

let p = 0;
const warm = setInterval(() => {
  p = Math.min(100, p + Math.random() * 22);
  fill.style.width = p + '%';
  pct.textContent  = Math.floor(p) + '%';
  if (p >= 100) {
    clearInterval(warm);
    setTimeout(() => {
      loader.classList.add('done');
      document.querySelectorAll('.reveal').forEach((el, i) =>
        setTimeout(() => el.classList.add('in'), 100 * i));
    }, 280);
  }
}, 80);

animate();

// Nav active state
const currentPage = location.pathname.split('/').pop();
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href').includes(currentPage)) {
    a.style.color = 'var(--accent)';
  }
});

// Stat counters
function runCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const end = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const dur = 1400; const start = performance.now();
  (function step(now) {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = (end % 1 === 0 ? Math.floor(end * eased) : (end * eased).toFixed(2)) + suffix;
    if (k < 1) requestAnimationFrame(step);
  })(performance.now());
}

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.reveal').forEach((el, i) =>
      setTimeout(() => el.classList.add('in'), 90 * i));
    e.target.querySelectorAll('.stat-num[data-count]').forEach(runCounter);
  });
}, { threshold: 0.25 });
document.querySelectorAll('.panel').forEach(s => io.observe(s));

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(animId);
  else animate();
});
