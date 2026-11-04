import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';

export { THREE };

/* ───────────── 시간 / 트윈 ───────────── */
const tweens = new Set();
export const clock = { t: 0, dt: 0 };

export function updateTweens(dt) {
  clock.dt = dt;
  clock.t += dt;
  for (const tw of [...tweens]) {
    tw.el += dt;
    const k = Math.min(1, tw.el / tw.dur);
    tw.fn(tw.ease(k), k);
    if (k >= 1) { tweens.delete(tw); tw.resolve(); }
  }
}

export const ease = {
  linear: k => k,
  inOut: k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  back: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};

export function anim(dur, fn, e = ease.inOut) {
  return new Promise(resolve => {
    if (dur <= 0) { fn(1, 1); resolve(); return; }
    tweens.add({ dur, el: 0, fn, ease: e, resolve });
  });
}
export const wait = s => anim(s, () => {});

export function lerpVec(target, from, to) {
  const a = from.clone();
  return k => target.copy(a).lerp(to, k);
}

/* ───────────── 지오메트리 / 머티리얼 ───────────── */
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.0, ...opts });
  delete m.unique;
  if (!opts.unique) matCache.set(key, m);
  return m;
}
export function emissive(color, intensity = 1, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5, ...opts });
}

function finish(mesh, o = {}) {
  mesh.castShadow = o.cast !== false;
  mesh.receiveShadow = o.receive !== false;
  if (o.pos) mesh.position.set(...o.pos);
  if (o.rot) mesh.rotation.set(...o.rot);
  if (o.scale) Array.isArray(o.scale) ? mesh.scale.set(...o.scale) : mesh.scale.setScalar(o.scale);
  if (o.parent) o.parent.add(mesh);
  return mesh;
}
const m_ = c => (c instanceof THREE.Material ? c : mat(c));

export const box = (w, h, d, c, o) => finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m_(c)), o);
export const rbox = (w, h, d, r, c, o) => finish(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m_(c)), o);
export const cyl = (rt, rb, h, c, o = {}) => finish(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 24), m_(c)), o);
export const sph = (r, c, o = {}) => finish(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 24, o.seg ? o.seg * 0.75 : 18), m_(c)), o);
export const cone = (r, h, c, o = {}) => finish(new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 16), m_(c)), o);
export const torus = (r, t, c, o = {}) => finish(new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 32, o.arc || Math.PI * 2), m_(c)), o);
export const plane = (w, h, c, o) => finish(new THREE.Mesh(new THREE.PlaneGeometry(w, h), m_(c)), { cast: false, ...o });
export const capsule = (r, l, c, o) => finish(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m_(c)), o);
export function group(parent, pos, rot) {
  const g = new THREE.Group();
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  if (parent) parent.add(g);
  return g;
}

/* ───────────── 캔버스 텍스처 ───────────── */
export const FONT = '"Jua", "Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
export const FONT2 = '"Gowun Dodum", "Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.redraw = fn => { g.clearRect(0, 0, w, h); fn(g, w, h); t.needsUpdate = true; };
  return t;
}

export function texPlane(w, h, pw, ph, draw, o = {}) {
  const tex = canvasTex(pw, ph, draw);
  const material = o.glow
    ? new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: o.glow, roughness: 0.6, transparent: !!o.transparent, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, transparent: !!o.transparent, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const m = finish(new THREE.Mesh(new THREE.PlaneGeometry(w, h), material), { cast: false, receive: false, ...o });
  // logarithmic depth buffer에서는 polygonOffset이 듣지 않아, 뒤판과 겹치지 않게 앞쪽으로 살짝 띄운다
  m.translateZ(o.lift ?? 0.012);
  m.tex = tex;
  return m;
}

export function wrapText(g, text, x, y, maxW, lh) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    lines.push(line);
  }
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return lines.length;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* 말풍선/아이콘 스프라이트 */
export function textSprite(text, o = {}) {
  const size = o.size || 96;
  const pad = 26;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `${size}px ${FONT}`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = size + pad * 1.6;
  c.width = w; c.height = h;
  g.font = `${size}px ${FONT}`;
  if (o.bg !== false) {
    g.fillStyle = o.bg || 'rgba(255,255,255,0.92)';
    roundRect(g, 4, 4, w - 8, h - 8, Math.min(40, h / 2 - 4));
    g.fill();
    g.lineWidth = 6; g.strokeStyle = o.border || '#ffb6c8'; g.stroke();
  }
  g.fillStyle = o.color || '#5a3d5c';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.bg === false) { g.lineWidth = 10; g.strokeStyle = o.stroke || 'rgba(255,255,255,0.9)'; g.strokeText(text, w / 2, h / 2 + 4); }
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: o.depthTest ?? true }));
  const sc = (o.scale || 0.5) / 100;
  s.scale.set(w * sc, h * sc, 1);
  s.renderOrder = 10;
  return s;
}

/* 하트 모양 */
export function heartShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.35 * s);
  sh.bezierCurveTo(-0.05 * s, -0.25 * s, -0.5 * s, -0.05 * s, -0.5 * s, 0.2 * s);
  sh.bezierCurveTo(-0.5 * s, 0.45 * s, -0.15 * s, 0.55 * s, 0, 0.32 * s);
  sh.bezierCurveTo(0.15 * s, 0.55 * s, 0.5 * s, 0.45 * s, 0.5 * s, 0.2 * s);
  sh.bezierCurveTo(0.5 * s, -0.05 * s, 0.05 * s, -0.25 * s, 0, -0.35 * s);
  return sh;
}
export function heartMesh(s, color, depth = 0.12, o) {
  const geo = new THREE.ExtrudeGeometry(heartShape(s), { depth: depth * s, bevelEnabled: true, bevelThickness: 0.04 * s, bevelSize: 0.04 * s, bevelSegments: 3 });
  geo.center();
  return finish(new THREE.Mesh(geo, m_(color)), o);
}

/* ───────────── 노이즈 / 랜덤 ───────────── */
let seed = 1234;
export function rand(a = 0, b = 1) { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); }
export function setSeed(s) { seed = s; }
export function noise2(x, y) {
  return Math.sin(x * 1.7 + y * 0.3) * 0.5 + Math.sin(y * 2.3 - x * 0.7) * 0.3 + Math.sin((x + y) * 4.1) * 0.15;
}

/* ───────────── 공용 환경 요소 ───────────── */
export function skyDome(top, bottom, radius = 200, o = {}) {
  const tex = canvasTex(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    const stops = o.stops || [[0, top], [0.55, bottom], [1, bottom]];
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1;
  m.tex = tex;
  return m;
}

/* 꿈 반짝이 파티클 */
export function sparkles(count, area, color = 0xffe6ff, size = 0.12) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  const ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    p[i * 3] = area.x[0] + Math.random() * (area.x[1] - area.x[0]);
    p[i * 3 + 1] = area.y[0] + Math.random() * (area.y[1] - area.y[0]);
    p[i * 3 + 2] = area.z[0] + Math.random() * (area.z[1] - area.z[0]);
    ph[i] = Math.random() * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const tex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: Math.max(2.5, size * 28) * Math.min(2, window.devicePixelRatio || 1), sizeAttenuation: false, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const base = p.slice();
  pts.update = (t) => {
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.6 + ph[i]) * 0.4;
      p[i * 3] = base[i * 3] + Math.cos(t * 0.4 + ph[i]) * 0.25;
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.75;
  };
  return pts;
}

/* 나무 바닥 텍스처 */
export function woodTex(base = '#c89a6a', dark = '#a77a4c', planks = 8, rep = [4, 4]) {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      g.fillStyle = i % 2 ? base : shade(base, -8);
      g.fillRect(0, i * ph, w, ph);
      g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(0, i * ph); g.lineTo(w, i * ph); g.stroke();
      const off = (i * 137) % w;
      g.beginPath(); g.moveTo(off, i * ph); g.lineTo(off, (i + 1) * ph); g.stroke();
      g.globalAlpha = 0.15;
      for (let k = 0; k < 6; k++) { g.beginPath(); const yy = i * ph + Math.random() * ph; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + 4, w * 0.6, yy - 4, w, yy); g.stroke(); }
      g.globalAlpha = 1;
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  return t;
}
export function tileTex(base, line, n = 4, rep = [6, 6]) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  return t;
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((r << 16) | (gg << 8) | b).toString(16).padStart(6, '0');
}

/* 간단한 나무 */
export function tree(parent, x, z, s = 1, colors = ['#7fbf6a', '#6aa85a', '#94cf7c']) {
  const g = group(parent, [x, 0, z]);
  cyl(0.18 * s, 0.26 * s, 2.2 * s, '#8a6142', { pos: [0, 1.1 * s, 0], parent: g });
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (0.8 + Math.random() * 0.5) * s;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(colors[i % colors.length], { flatShading: true }));
    m.position.set(Math.cos(a) * 0.6 * s, (2.6 + Math.random() * 0.6) * s, Math.sin(a) * 0.6 * s);
    finish(m, { parent: g });
  }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 * s, 1), mat(colors[0], { flatShading: true }));
  top.position.y = 3.4 * s;
  finish(top, { parent: g });
  return g;
}

/* 카메라 샷 묶음 */
export function shot(pos, look, fov) { return { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov }; }
