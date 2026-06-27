import * as THREE from 'three';

/* ============================================================
   AETHER — hero page 3D scene
   Lean build: no bloom, no city, no sprites.
   Wireframe sphere + rings + stars + scroll camera.
============================================================ */

const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(1); // no retina — biggest perf win
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.018);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 14);

/* -------------------- Lights -------------------- */
scene.add(new THREE.AmbientLight(0x3a4a66, 1));

/* ============================================================
   1. WIREFRAME SPHERES
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

const innerShell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(3.5, 1),
  new THREE.MeshBasicMaterial({
    color: 0x7c5cff,
    wireframe: true,
    transparent: true,
    opacity: 0.07,
  })
);
scene.add(innerShell);

/* ============================================================
   2. ORBIT RINGS
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
   3. STAR FIELD
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
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.14,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
}));
scene.add(stars);

/* ============================================================
   Camera scroll keyframes
============================================================ */
const SHOTS = [
  { pos: new THREE.Vector3(0,  0,   14), look: new THREE.Vector3(0, 0, 0) },
  { pos: new THREE.Vector3(-6, 0.5,  9), look: new THREE.Vector3(-3, 0, 0) },
  { pos: new THREE.Vector3( 6, -1.5, 9), look: new THREE.Vector3( 3, 0.4, 0) },
  { pos: new THREE.Vector3(0,  5,   13), look: new THREE.Vector3(0, 1.2, 0) },
  { pos: new THREE.Vector3(-4, -1,  11), look: new THREE.Vector3(-1.5, -0.3, 0) },
  { pos: new THREE.Vector3(0,  0,   11), look: new THREE.Vector3(0, 0, 0) },
];
const NSEC = SHOTS.length;

let targetProg = 0, prog = 0;
const _camT  = new THREE.Vector3();
const _lookT = new THREE.Vector3();
const _lookC = new THREE.Vector3();

function computeProgress() {
  const max = document.body.scrollHeight - innerHeight;
  return max > 0 ? (scrollY / max) * (NSEC - 1) : 0;
}

/* mouse parallax */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
  mouse.tx = (e.clientX / innerWidth  - 0.5) * 2;
  mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

/* ============================================================
   Render loop — direct render, no post-processing
============================================================ */
const clock = new THREE.Clock();
let animId;

function animate() {
  animId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.getElapsedTime();

  // scroll camera
  targetProg = computeProgress();
  prog += (targetProg - prog) * Math.min(1, dt * 4);
  const i = Math.max(0, Math.min(NSEC - 2, Math.floor(prog)));
  const f = THREE.MathUtils.clamp(prog - i, 0, 1);
  _camT.lerpVectors(SHOTS[i].pos,  SHOTS[i + 1].pos,  f);
  _lookT.lerpVectors(SHOTS[i].look, SHOTS[i + 1].look, f);

  // parallax
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  _camT.x += mouse.x * 1.0;
  _camT.y -= mouse.y * 0.7;

  camera.position.lerp(_camT, Math.min(1, dt * 3));
  _lookC.lerp(_lookT, Math.min(1, dt * 3));
  camera.lookAt(_lookC);

  // scene animation
  shell.rotation.y      =  t * 0.06;
  shell.rotation.x      =  Math.sin(t * 0.12) * 0.06;
  innerShell.rotation.y = -t * 0.09;
  innerShell.rotation.z =  t * 0.04;
  rings.rotation.y      =  t * 0.04;
  rings.rotation.z      =  Math.sin(t * 0.08) * 0.08;
  stars.rotation.y      =  t * 0.008;

  renderer.render(scene, camera);
}

/* ============================================================
   Resize
============================================================ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============================================================
   UI: loader, reveals, rail, counters
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
      document.querySelectorAll('#hero .reveal').forEach((el, i) =>
        setTimeout(() => el.classList.add('in'), 120 * i));
    }, 300);
  }
}, 80);

animate();

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

// reveal on intersect
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.reveal').forEach((el, i) =>
      setTimeout(() => el.classList.add('in'), 90 * i));
    e.target.querySelectorAll('.stat-num[data-count]').forEach(runCounter);
  });
}, { threshold: 0.3 });
document.querySelectorAll('.panel').forEach(s => io.observe(s));

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

// scroll rail (still used on hero)
const railFill = document.getElementById('rail-fill');
const railDots = [...document.querySelectorAll('.rail-dots li')];
addEventListener('scroll', () => {
  const max = document.body.scrollHeight - innerHeight;
  const t = max > 0 ? scrollY / max : 0;
  if (railFill) railFill.style.height = (t * 100) + '%';
  const active = Math.round(t * (NSEC - 1));
  railDots.forEach((d, i) => d.classList.toggle('active', i === active));
}, { passive: true });

// pause when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(animId);
  else animate();
});

/* ============================================================
   Onboarding modal — 4-step post-checkout flow
============================================================ */
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/jaden@greenaidigital.com';

const ob = document.getElementById('onboard');
if (ob) {
  const obFill    = document.getElementById('onboard-fill');
  const obStepper = document.querySelectorAll('#onboard-stepper li');
  const obSteps   = document.querySelectorAll('.ob-step');
  let obIdx = 0;

  function obShow(i) {
    obIdx = Math.max(0, Math.min(obSteps.length - 1, i));
    obSteps.forEach((s, k)   => s.classList.toggle('ob-active', k === obIdx));
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
  }
  function obClose() {
    ob.classList.remove('open');
    ob.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  ob.querySelector('.onboard-close').addEventListener('click', obClose);
  ob.addEventListener('click', e => { if (e.target === ob) obClose(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && ob.classList.contains('open')) obClose(); });
  ob.querySelectorAll('[data-ob-next]').forEach(b => b.addEventListener('click', () => obShow(obIdx + 1)));
  ob.querySelectorAll('[data-ob-prev]').forEach(b => b.addEventListener('click', () => obShow(obIdx - 1)));

  function syncConnectors() {
    const list = [...ob.querySelectorAll('.ob-conn.connected')]
      .map(b => b.textContent.replace(/^[⊕✓\s]+/, '').trim());
    document.getElementById('ob-connectors-val').value = list.join(', ');
  }
  ob.querySelectorAll('.ob-conn').forEach(btn =>
    btn.addEventListener('click', () => { btn.classList.toggle('connected'); syncConnectors(); }));

  ob.querySelectorAll('.ob-tpl input').forEach((r, i) => {
    r.addEventListener('change', () => {
      document.getElementById('ob-template-val').value =
        ob.querySelectorAll('.ob-tpl b')[i].textContent.trim();
    });
  });

  ob.querySelectorAll('.ob-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      ob.querySelectorAll('.ob-slot').forEach(s => s.classList.remove('picked'));
      btn.classList.add('picked');
      document.getElementById('ob-slot-val').value = btn.textContent.trim();
      ob.querySelector('.ob-done').classList.add('show');
    });
  });

  const obForm = document.getElementById('onboard-form');
  obForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = document.getElementById('ob-finish');
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST', body: new FormData(obForm),
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error();
      submitBtn.textContent = '✓ Sent — check your email';
      setTimeout(obClose, 1600);
    } catch {
      const d = Object.fromEntries(new FormData(obForm));
      const body = Object.entries(d).filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:jaden@greenaidigital.com?subject=${encodeURIComponent('AETHER intake (manual)')}&body=${encodeURIComponent(body)}`;
      submitBtn.textContent = 'Confirm & submit';
      submitBtn.disabled = false;
    }
  });

  document.querySelectorAll('.buy-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      const stripe = b.dataset.stripe;
      const plan   = b.dataset.plan || '';
      if (stripe && stripe.startsWith('http')) location.href = stripe;
      else obOpen(plan);
    });
  });

  const params = new URLSearchParams(location.search);
  if (params.get('onboard') === '1') {
    setTimeout(() => obOpen(params.get('plan') || '(post-checkout)'), 1200);
  }
}
