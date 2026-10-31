// Yar 3D hero mark: extruded Y (from the yar.website logo path), dark glossy metal, edge lines,
// floating shards, dust, bloom, scroll + mouse driven, press-and-hold burst.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Y_PATH = 'M158.983 4.29278C159.729 5.6484 160.064 7.07933 159.99 8.58556C159.915 10.0918 159.43 11.4474 158.535 12.6524L96.5582 103.027V161.092C96.5582 163.201 95.7751 165.046 94.2089 166.628C92.6427 168.209 90.8155 169 88.7272 169H71.4988C69.2614 169 67.3596 168.209 65.7934 166.628C64.2271 165.046 63.444 163.201 63.444 161.092V94.8931C63.444 93.3868 63.9661 91.8806 65.0102 90.3743L124.75 3.38904C125.496 2.33467 126.428 1.50624 127.547 0.903743C128.666 0.301247 129.896 0 131.239 0H152.047C153.539 0 154.918 0.376559 156.186 1.12968C157.454 1.8828 158.386 2.93717 158.983 4.29278ZM64.7865 53.9987C64.1898 55.3543 63.2576 56.4087 61.9897 57.1618C60.7218 57.9149 59.342 58.2914 57.8504 58.2914H37.0422C34.3572 58.2914 32.1198 57.1618 30.3298 54.9024L1.24303 12.6524C0.49721 11.4474 0.0870118 10.0918 0.0124303 8.58556C-0.0621513 7.07933 0.198884 5.6484 0.795536 4.29278C1.39219 2.93717 2.32446 1.8828 3.59234 1.12968C4.86023 0.376559 6.23999 0 7.73162 0H28.7636C31.2994 0 33.4622 1.12968 35.2522 3.38904L64.339 45.639C65.0848 46.844 65.495 48.1996 65.5696 49.7059C65.6442 51.2121 65.3832 52.6431 64.7865 53.9987Z';

const root = document.documentElement;
const canvas = document.getElementById('gl');
const STATIC = /static/.test(location.search);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STILL = STATIC || REDUCE;
const CAPTURE = /capture/.test(location.search);
const mq = matchMedia('(max-width:900px)');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.getContext()) throw new Error('no ctx');
} catch (e) {
  console.warn('[hero3d] WebGL unavailable, keeping CSS mark');
  canvas.remove();
  throw e; // caught by the loader; CSS fallback stays visible
}
root.classList.add('webgl');

const BG = new THREE.Color('#050608');
renderer.setClearColor(0x000000, 1); // page bg is added back after tone mapping (see bgPass)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 13);

/* ---------- the Y ---------- */
const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 169"><path d="${Y_PATH}"/></svg>`);
const shapes = data.paths.flatMap(p => p.toShapes(true));
const geo = new THREE.ExtrudeGeometry(shapes, {
  depth: 30, bevelEnabled: true, bevelThickness: 4.2, bevelSize: 3.1, bevelOffset: -0.4, bevelSegments: 8, curveSegments: 36,
});
geo.rotateX(Math.PI);            // SVG y-down -> y-up, keeps winding (det +1)
geo.center();
const S = 3.4 / 169;             // ~3.4 world units tall
geo.scale(S, S, S);
geo.computeVertexNormals();

const metal = new THREE.MeshPhysicalMaterial({
  color: 0x101317, metalness: 0.9, roughness: 0.3,
  clearcoat: 1, clearcoatRoughness: 0.22, envMapIntensity: 1,
  emissive: new THREE.Color('#3FB27F'), emissiveIntensity: 0,
});
const ymesh = new THREE.Mesh(geo, metal);

const edgeMat = new THREE.LineBasicMaterial({ color: 0xdfe3e6, transparent: true, opacity: 0.34, depthWrite: false });
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat);
edges.renderOrder = 2;
// faint green outline just behind, gives the brand rim in bloom
const edgeGreen = new THREE.LineSegments(edges.geometry, new THREE.LineBasicMaterial({ color: 0x3FB27F, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
edgeGreen.scale.setScalar(1.004);

const yGroup = new THREE.Group();   // scroll + mouse
const yFloat = new THREE.Group();   // idle float + hold jitter
yFloat.add(ymesh, edges, edgeGreen);
yGroup.add(yFloat);
scene.add(yGroup);

// soft green halo behind the mark
const haloTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(63,178,127,0.55)'); r.addColorStop(0.35, 'rgba(63,178,127,0.16)'); r.addColorStop(1, 'rgba(63,178,127,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
halo.position.set(0.15, -0.2, -2.2);
yGroup.add(halo);

/* ---------- lights: rims, not fill ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.04));
const rimW = new THREE.DirectionalLight(0xf1f3f5, 3.2); rimW.position.set(-5, 6, -4); scene.add(rimW);
const rimG = new THREE.DirectionalLight(0x3FB27F, 2.6); rimG.position.set(6, -3, -5); scene.add(rimG);
const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(3, 4, 8); scene.add(key);
const glint = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(glint);

/* ---------- shards ---------- */
const shardMat = metal.clone(); shardMat.roughness = 0.34; shardMat.clearcoat = 0.25;
const shardEdge = new THREE.LineBasicMaterial({ color: 0xe8eaec, transparent: true, opacity: 0.3, depthWrite: false });
const shards = [];
const rnd = (a, b) => a + Math.random() * (b - a);
const SHARDS = 22;
for (let i = 0; i < SHARDS; i++) {
  const g = new THREE.BoxGeometry(rnd(0.2, 0.75), rnd(0.015, 0.04), rnd(0.06, 0.2));
  const m = new THREE.Mesh(g, shardMat);
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), shardEdge);
  const o = new THREE.Group(); o.add(m, l);
  const r = rnd(3.6, 8), a = rnd(0, Math.PI * 2);
  const home = new THREE.Vector3(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.75, rnd(-9, 1));
  o.position.copy(home);
  o.rotation.set(rnd(0, 6), rnd(0, 6), rnd(-0.9, -0.5));
  o.userData = { home, vel: new THREE.Vector3(), spin: new THREE.Vector3(rnd(-.3, .3), rnd(-.3, .3), rnd(-.15, .15)), drift: rnd(0.15, 0.5), ph: rnd(0, 6) };
  shards.push(o); scene.add(o);
}

/* ---------- dust ---------- */
const DUST = 380;
const dg = new THREE.BufferGeometry(); const dp = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) { dp[i*3] = rnd(-14, 14); dp[i*3+1] = rnd(-8, 8); dp[i*3+2] = rnd(-10, 4); }
dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const r = g.createRadialGradient(16,16,0,16,16,16); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.4,'rgba(255,255,255,.5)'); r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); })();
const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.035, map: dotTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xcfd3d6 }));
scene.add(dust);

/* ---------- burst particles (press and hold) ---------- */
const BURST = 900;
const bg = new THREE.BufferGeometry();
const bp = new Float32Array(BURST * 3), bc = new Float32Array(BURST * 3), bv = new Float32Array(BURST * 3), bl = new Float32Array(BURST);
bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
bg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
const burst = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.06, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
burst.frustumCulled = false; scene.add(burst);
const surf = geo.attributes.position;
const cG = new THREE.Color('#3FB27F'), cW = new THREE.Color('#eef2f0');
let burstAlive = 0;
function fire(power) {
  const m = yFloat.matrixWorld; const v = new THREE.Vector3();
  for (let i = 0; i < BURST; i++) {
    v.fromBufferAttribute(surf, (Math.random() * surf.count) | 0).applyMatrix4(m);
    bp[i*3] = v.x; bp[i*3+1] = v.y; bp[i*3+2] = v.z;
    const d = v.clone().sub(yGroup.position).normalize().multiplyScalar(rnd(2, 9) * (0.4 + power));
    d.x += rnd(-1, 1); d.y += rnd(-1, 1); d.z += rnd(-1, 2);
    bv[i*3] = d.x; bv[i*3+1] = d.y; bv[i*3+2] = d.z;
    bl[i] = rnd(0.7, 1.6);
    const c = Math.random() < 0.55 ? cG : cW; bc[i*3] = c.r; bc[i*3+1] = c.g; bc[i*3+2] = c.b;
  }
  burstAlive = 1.8; bg.attributes.position.needsUpdate = true;
  shards.forEach(s => { const dir = s.position.clone().sub(yGroup.position).normalize(); s.userData.vel.addScaledVector(dir, 6 + power * 14); });
  spinV += 7 * (0.35 + power);
  flash = 1;
}

/* ---------- post ---------- */
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.32, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// add the page background (#050608, display space) so the canvas edge is seamless at any exposure
const bgPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, bg: { value: new THREE.Vector3(5/255, 6/255, 8/255) }, fade: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 bg; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(bg + c.rgb * (1.0 - bg), 1.0); }',
});
composer.addPass(bgPass);

/* ---------- layout ---------- */
let W = 1, H = 1, mobile = mq.matches, visW = 1, visH = 1;
function layout() {
  W = innerWidth; H = innerHeight; mobile = mq.matches;
  const pr = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  composer.setPixelRatio(pr); composer.setSize(W, H);
  bloom.resolution.set(W * pr * 0.5, H * pr * 0.5);
  camera.aspect = W / H;
  camera.fov = mobile ? 34 : 30;
  camera.updateProjectionMatrix();
  visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; visW = visH * camera.aspect;
  if (STILL) render(0);
}

/* ---------- state ---------- */
// scroll pose (scrubbed by ScrollTrigger), 0 = top of hero
const pose = { rx: 0.2, ry: -0.5, rz: 0.04, x: 0, y: 0, z: 0, s: 1, dim: 1, edge: 1 };
let mx = 0, my = 0, tx = 0, ty = 0;
let charge = 0, holding = false, spinV = 0, spinA = 0, flash = 0;
let intro = STILL ? 1 : 0;

function basePos() {
  // where the mark sits on screen at rest (fractions of viewport)
  return mobile ? { x: 0.04 * visW, y: -0.015 * visH, sc: Math.min(0.9, visW / 5.6) } : { x: 0.07 * visW, y: -0.1 * visH, sc: 0.9 };
}

const easeOut = t => 1 - Math.pow(1 - t, 4);
let last = performance.now(), time = 0;
const t0 = performance.now();
function render(dt) {
  time += dt;
  const b = basePos();
  // intro
  // intro is wall-clock based (frame-rate independent); capture mode advances it with the simulated dt
  if (intro < 1) intro = CAPTURE ? Math.min(1, intro + dt / 2.6) : Math.min(1, (performance.now() - t0) / 2600);
  const ie = easeOut(intro);
  // mouse ease
  tx += (mx - tx) * Math.min(1, dt * 3.2); ty += (my - ty) * Math.min(1, dt * 3.2);
  // hold
  charge += ((holding ? 1 : 0) - charge) * Math.min(1, dt * (holding ? 0.9 : 4));
  spinA += spinV * dt; spinV *= Math.pow(0.18, dt);
  flash *= Math.pow(0.02, dt);

  const idle = STILL ? 0 : 1;
  yGroup.position.set(b.x + pose.x * visW + tx * 0.25, b.y + pose.y * visH - ty * 0.18, pose.z);
  const s = b.sc * pose.s * (0.72 + 0.28 * ie) * (1 - 0.07 * charge);
  yGroup.scale.setScalar(s);
  yGroup.rotation.set(pose.rx + ty * 0.22, pose.ry + tx * 0.42 + spinA - (1 - ie) * 1.4, pose.rz);
  yFloat.position.y = Math.sin(time * 0.9) * 0.07 * idle;
  yFloat.rotation.x = Math.sin(time * 0.55) * 0.04 * idle + (Math.random() - .5) * 0.02 * charge;
  yFloat.rotation.y = Math.sin(time * 0.4) * 0.09 * idle + (Math.random() - .5) * 0.03 * charge;

  metal.emissiveIntensity = 0.015 * charge + 0.05 * flash;
  edgeMat.opacity = (0.22 + 0.16 * pose.edge) * ie + 0.4 * charge;
  edgeGreen.material.opacity = 0.18 * charge + 0.7 * flash;
  halo.material.opacity = (0.22 + 0.35 * charge + 0.5 * flash) * pose.dim;
  rimG.intensity = 1.9 + 5 * charge + 6 * flash;
  bloom.strength = (0.5 + 0.5 * charge + 0.9 * flash) * (0.4 + 0.6 * pose.dim);
  rimW.intensity = 3.2 * (0.15 + 0.85 * pose.dim); key.intensity = 0.5 * pose.dim;
  scene.environmentIntensity = 0.75 * (0.12 + 0.88 * pose.dim * pose.dim);
  renderer.toneMappingExposure = (0.35 + 0.65 * ie) * (0.2 + 0.8 * pose.dim) * (mobile ? 0.82 : 1);

  // glint light sweeps across the faces with the mouse
  glint.position.set(yGroup.position.x + tx * 6 - 1.5, yGroup.position.y - ty * 4 + 1.5, 3.2);
  glint.intensity = (STILL ? 1.6 : 2.2 + 2 * charge) * pose.dim * pose.dim;

  // shards: drift, pulled in while holding, pushed out on release, spring home
  for (let si = 0; si < shards.length; si++) {
    const o = shards[si], u = o.userData;
    o.visible = !(mobile && si % 2);
    if (!STILL) {
      const target = u.home.clone().lerp(yGroup.position, 0.55 * charge);
      u.vel.addScaledVector(target.sub(o.position), dt * 1.6);
      u.vel.multiplyScalar(Math.pow(0.25, dt));
      o.position.addScaledVector(u.vel, dt);
      o.position.y += Math.sin(time * u.drift + u.ph) * 0.0025;
      o.rotation.x += u.spin.x * dt * (1 + 6 * charge); o.rotation.y += u.spin.y * dt * (1 + 6 * charge); o.rotation.z += u.spin.z * dt;
    }
  }
  if (!STILL) dust.rotation.y = time * 0.01 + tx * 0.05, dust.rotation.x = ty * 0.03;

  if (burstAlive > 0) {
    burstAlive -= dt;
    for (let i = 0; i < BURST; i++) {
      bv[i*3+1] -= 1.2 * dt;
      bp[i*3] += bv[i*3] * dt; bp[i*3+1] += bv[i*3+1] * dt; bp[i*3+2] += bv[i*3+2] * dt;
      bv[i*3] *= 0.965; bv[i*3+1] *= 0.965; bv[i*3+2] *= 0.965;
    }
    bg.attributes.position.needsUpdate = true;
    burst.material.opacity = Math.max(0, burstAlive / 1.8);
    burst.visible = true;
  } else burst.visible = false;

  composer.render(dt);
}

/* ---------- loop with offscreen pause ---------- */
let active = true, raf = 0;
const aboutEl = document.querySelector('.about');
function onscreen() { return !document.hidden && aboutEl.getBoundingClientRect().bottom > 0 && +getComputedStyle(canvas).opacity > 0.01; }
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (onscreen()) render(dt);
  raf = requestAnimationFrame(frame);
}

/* ---------- input ---------- */
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
const hero = document.querySelector('.hero');
let holdT = 0;
hero.addEventListener('pointerdown', e => {
  if (STILL || e.button > 0 || e.target.closest('a,button')) return;
  holding = true; holdT = performance.now(); root.classList.add('charging');
});
const release = () => {
  if (!holding) return; holding = false; root.classList.remove('charging');
  const held = (performance.now() - holdT) / 1000;
  if (held > 0.18) fire(Math.min(1, charge + 0.15));
};
addEventListener('pointerup', release); addEventListener('pointercancel', release); hero.addEventListener('contextmenu', e => { if (holding) e.preventDefault(); });

/* ---------- scroll choreography ---------- */
function bindScroll() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST || STILL) return;
  gsap.registerPlugin(ST);
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.hero', start: 'top top', endTrigger: '#stmt', end: 'bottom top', scrub: 1.1 } });
  // through the hero: turn to show the side and bevels, rise, grow a little, drift right
  tl.to(pose, mobile ? { ry: 0.5, rx: -0.12, rz: -0.06, x: -0.02, y: 0.02, s: 0.9, dim: 0.2, edge: 0.4, duration: 0.42 }
                    : { ry: 0.85, rx: -0.12, rz: -0.06, x: 0.12, y: 0.06, s: 1.22, duration: 0.42 }, 0)
  // into about: keep turning, recede and dim so the statement stays readable
    .to(pose, { ry: 2.35, rx: 0.42, rz: 0.12, x: 0.2, y: 0.16, z: -3.2, s: mobile ? 0.8 : 0.95, dim: 0.16, edge: 0.3, duration: 0.58 }, 0.42)
    .to(canvas, { opacity: 0, duration: 0.2 }, 0.76);
  if (mobile) tl.eventCallback('onUpdate', null);
}

layout();
addEventListener('resize', layout);
if (STILL) {
  pose.ry = -0.42; render(0); render(0);
  // reduced motion still fades the canvas away past the hero
  if (REDUCE && !STATIC) addEventListener('scroll', () => { canvas.style.opacity = Math.max(0, 1 - scrollY / (innerHeight * 1.4)); }, { passive: true });
} else {
  bindScroll();
  if (!CAPTURE) raf = requestAnimationFrame(frame);
}
window.__hero3d = { pose, get charge() { return charge; }, fire, step: dt => { if (onscreen()) render(dt); }, hold: v => { if (v) { holding = true; holdT = performance.now(); } else release(); } };
