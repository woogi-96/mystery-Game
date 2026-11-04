import { THREE, mat, sph, cyl, capsule, torus, box, rbox, group, heartMesh, canvasTex, clock, FONT } from './util.js';

/*
 * 캐릭터
 *  - 멍뭉 / 우기: 레퍼런스 일러스트를 따라 만든 치비 3D. 얼굴은 캔버스에 직접 그려 머리에 입힌다
 *    (큰 눈 + 짙은 속눈썹 + 하이라이트 2개 + 볼터치 빗금), 표정·깜빡임·말하기는 얼굴 그림을 다시 그려서 표현.
 *  - 그 외 사람들: 레고 미니피규어 스타일. 몸통 앞/뒤에 옷 프린트(칼라, 넥타이, 단추, 주머니, 지퍼, 명찰…)를 그린다.
 */

const SKIN = '#ffe4d2';
const rnd = (a, b) => a + Math.random() * (b - a);

function fibSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return pts;
}

/* ═══════════════════ 주인공 얼굴 (캔버스) ═══════════════════ */
const FACE_PHI = 2.2, FACE_TH = 1.7, FACE_TH0 = Math.PI / 2 - 0.75;
class FaceTex {
  constructor(skull, o) {
    this.o = o;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = 512;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const geo = new THREE.SphereGeometry(0.551, 48, 36, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, FACE_TH0, FACE_TH);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    skull.add(m);
    this.mesh = m;
    this.expr = 'open'; this.blink = false; this.mouthOpen = false; this.wink = false;
    this.draw();
  }
  P(ax, ay) { return [256 + (ax / FACE_PHI) * 512, ((0.75 + ay) / FACE_TH) * 512]; }
  set(expr) { if (expr !== this.expr) { this.expr = expr; this.draw(); } }
  setBlink(b) { if (b !== this.blink) { this.blink = b; this.draw(); } }
  setMouth(b) { if (b !== this.mouthOpen) { this.mouthOpen = b; this.draw(); } }

  draw() {
    const g = this.g, o = this.o;
    g.clearRect(0, 0, 512, 512);
    const SX = 512 / FACE_PHI, SY = 512 / FACE_TH;
    const e = this.expr;
    const es = o.eyeScale || 1;
    const eyeY = 0.1, eyeX = o.eyeX || 0.4, rx = 0.18 * SX * es, ry = 0.25 * SY * es;

    // 볼터치 (부드러운 원 + 빗금 세 줄)
    for (const s of [-1, 1]) {
      const [cx, cy] = this.P(s * 0.6, 0.36);
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 46);
      gr.addColorStop(0, `rgba(255,120,150,${o.blushA ?? 0.75})`);
      gr.addColorStop(1, 'rgba(255,140,165,0)');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(cx, cy, 48, 30, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(230,80,110,0.55)'; g.lineWidth = 3; g.lineCap = 'round';
      if (o.hatch !== false) for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + i * 12 - 5, cy + 7); g.lineTo(cx + i * 12 + 5, cy - 7); g.stroke(); }
    }
    // 코
    { const [nx, ny] = this.P(0, 0.33); g.fillStyle = 'rgba(225,140,120,0.8)'; g.beginPath(); g.ellipse(nx, ny, 5, 3.5, 0, 0, 7); g.fill(); }
    // 눈썹
    const browC = o.browColor || '#5a3420';
    for (const s of [-1, 1]) {
      const [bx, by] = this.P(s * eyeX, eyeY - 0.36);
      g.strokeStyle = browC; g.lineWidth = o.browW || 6; g.lineCap = 'round';
      const tilt = e === 'sad' ? 10 : e === 'surprised' ? -8 : 0;
      g.beginPath(); g.moveTo(bx - s * 26, by + 4 + tilt * (s > 0 ? 0 : 0)); g.quadraticCurveTo(bx, by - 8 - (e === 'surprised' ? 8 : 0), bx + s * 26, by + (e === 'sad' ? -6 : 4)); g.stroke();
    }
    // 눈
    for (const s of [-1, 1]) {
      const [ex, ey] = this.P(s * eyeX, eyeY);
      let mode = e;
      if (this.blink && (e === 'open' || e === 'sad' || e === 'surprised')) mode = 'closed';
      if (o.winkSide === s && e === 'happyWink') mode = 'happy';
      else if (e === 'happyWink') mode = 'open';
      if (mode === 'closed' || mode === 'sleepyClosed') this.closedEye(ex, ey + ry * 0.2, rx, s);
      else if (mode === 'happy') this.happyEye(ex, ey, rx, s);
      else this.openEye(ex, ey, rx, ry, s, mode);
    }
    // 입
    const [mx, my] = this.P(0, 0.52);
    let mouth = o.mouth || 'smile';
    if (e === 'surprised') mouth = 'o';
    else if (e === 'sad') mouth = 'frown';
    else if (e === 'closed' || e === 'sleepy') mouth = 'small';
    else if (e === 'happy' || e === 'happyWink') mouth = 'open';
    if (this.mouthOpen) mouth = mouth === 'open' ? 'small' : 'open';
    this.mouthShape(mx, my, mouth);
    this.tex.needsUpdate = true;
  }

  openEye(x, y, rx, ry, s, mode) {
    const g = this.g, o = this.o;
    const big = mode === 'surprised' ? 1.08 : 1;
    rx *= big; ry *= big;
    // 흰자
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    // 홍채 (위는 진한 갈색 → 아래는 호박색)
    const ir = mode === 'surprised' ? 0.72 : 0.9;
    const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
    gr.addColorStop(0, o.iris1 || '#2e160c');
    gr.addColorStop(0.55, o.iris2 || '#7a4220');
    gr.addColorStop(1, o.iris3 || '#d99a52');
    g.fillStyle = gr;
    const gx = (o.gaze || 0) * rx;
    g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.beginPath(); g.ellipse(x + gx, y + ry * 0.06, rx * ir, ry * ir * 0.98, 0, 0, Math.PI * 2); g.fill();
    // 동공
    g.fillStyle = 'rgba(25,10,5,0.85)';
    g.beginPath(); g.ellipse(x + gx, y - ry * 0.02, rx * 0.42, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
    // 아래쪽 반사광
    g.fillStyle = 'rgba(255,215,160,0.55)';
    g.beginPath(); g.ellipse(x + gx, y + ry * 0.55, rx * 0.5, ry * 0.18, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    // 하이라이트
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x - s * rx * 0.05 - rx * 0.28, y - ry * 0.35, rx * 0.34, ry * 0.26, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + rx * 0.38, y + ry * 0.28, rx * 0.14, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + rx * 0.1, y - ry * 0.55, rx * 0.07, 0, Math.PI * 2); g.fill();
    // 졸린 눈: 눈꺼풀
    if (mode === 'sleepy') {
      g.fillStyle = o.skin || SKIN;
      g.beginPath(); g.ellipse(x, y - ry * 0.25, rx * 1.15, ry * 0.85, 0, Math.PI, Math.PI * 2); g.rect(x - rx * 1.15, y - ry * 1.2, rx * 2.3, ry * 0.95); g.fill();
    }
    // 위 속눈썹 (두꺼운 선 + 바깥쪽 꼬리)
    const lidY = mode === 'sleepy' ? y - ry * 0.2 : y;
    g.strokeStyle = '#24110a'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = o.lashes ? 11 : 8;
    g.beginPath();
    if (mode === 'sleepy') { g.moveTo(x - rx * 1.05, lidY); g.quadraticCurveTo(x, lidY - ry * 0.15, x + rx * 1.05, lidY); }
    else g.ellipse(x, y, rx * 1.02, ry * 1.0, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    const ox = x + s * rx * 0.95, oy = (mode === 'sleepy' ? lidY : y - ry * 0.35);
    g.lineWidth = o.lashes ? 7 : 5;
    g.beginPath(); g.moveTo(ox - s * 6, oy + 4); g.lineTo(ox + s * 16, oy - 10); g.stroke();
    if (o.lashes) { g.beginPath(); g.moveTo(ox - s * 2, oy + 14); g.lineTo(ox + s * 18, oy + 6); g.stroke(); }
    // 아래 속눈썹
    g.strokeStyle = 'rgba(80,40,25,0.55)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, rx * 0.95, ry * 0.98, 0, Math.PI * 0.25, Math.PI * 0.75); g.stroke();
  }
  closedEye(x, y, rx, s) {
    const g = this.g;
    g.strokeStyle = '#24110a'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - rx * 0.6, rx * 0.9, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(x + s * rx * 0.85, y - rx * 0.05); g.lineTo(x + s * rx * 1.1, y + rx * 0.12); g.stroke();
  }
  happyEye(x, y, rx, s) {
    const g = this.g;
    g.strokeStyle = '#24110a'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - rx * 0.9, y + rx * 0.35); g.quadraticCurveTo(x, y - rx * 0.95, x + rx * 0.9, y + rx * 0.35); g.stroke();
  }
  mouthShape(x, y, kind) {
    const g = this.g;
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'open') {
      g.fillStyle = '#9a2438';
      g.beginPath(); g.moveTo(x - 26, y - 8); g.quadraticCurveTo(x, y - 2, x + 26, y - 8); g.quadraticCurveTo(x + 22, y + 30, x, y + 32); g.quadraticCurveTo(x - 22, y + 30, x - 26, y - 8); g.fill();
      g.fillStyle = '#ff8aa0';
      g.beginPath(); g.ellipse(x, y + 22, 15, 9, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7a1a2c'; g.lineWidth = 3; g.stroke();
    } else if (kind === 'o') {
      g.fillStyle = '#9a2438'; g.beginPath(); g.ellipse(x, y + 8, 13, 17, 0, 0, Math.PI * 2); g.fill();
    } else if (kind === 'frown') {
      g.strokeStyle = '#8a2a3a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 22, 16, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    } else if (kind === 'small') {
      g.strokeStyle = '#8a2a3a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 4, 10, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    } else {
      // ‿ 미소 (고양이 입처럼 살짝)
      g.strokeStyle = '#8a2a3a'; g.lineWidth = 5;
      g.beginPath(); g.arc(x - 10, y - 2, 10, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      g.beginPath(); g.arc(x + 10, y - 2, 10, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    }
  }
}

/* ═══════════════════ 주인공 머리카락 ═══════════════════ */
/* 머리카락 한 가닥(덩어리): 위에서 아래로 흐르는 납작한 타원 + 살짝 말린 끝 */
const UP = new THREE.Vector3(0, 1, 0);
function lock(parent, pos, dir, len, wid, m, curl = 0.3) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.quaternion.setFromUnitVectors(UP, dir.clone().multiplyScalar(-1).normalize());
  parent.add(g);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m);
  body.scale.set(wid, len * 0.55, wid * 0.62);
  body.position.y = -len * 0.45;
  body.castShadow = true;
  g.add(body);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
  tip.scale.set(wid * 0.6, wid * 0.75, wid * 0.5);
  tip.position.set(curl * wid, -len * 0.92, wid * 0.25);
  g.add(tip);
  return g;
}
function downTangent(p) {
  // 구 표면에서 정수리 → 아래로 흐르는 방향
  const n = p.clone().normalize();
  const t = new THREE.Vector3(-n.x * n.y, 1 - n.y * n.y, -n.z * n.y);
  if (t.lengthSq() < 1e-4) t.set(0, 0, -1);
  return t.normalize().multiplyScalar(-1);
}

function hairMungmung(head) {
  const base = mat('#7a4724', { roughness: 0.8 });
  const light = mat('#9c6a3c', { roughness: 0.75 });
  // 머리에 딱 맞는 기본 덮개 (얼굴은 비우고 귀까지만)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.585, 40, 24, 0, Math.PI * 2, 0, 1.9), base);
  cap.rotation.x = -0.62; cap.position.set(0, 0.03, -0.01); cap.castShadow = true;
  head.add(cap);
  // 표면의 부드러운 웨이브 결 (밖으로 튀어나오지 않게 반쯤 묻음)
  for (const p of fibSphere(46)) {
    if (p.y < -0.35) continue;
    if (p.z > 0.25 && p.y < 0.6 && Math.abs(p.x) < 0.8) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), p.y > 0.5 && Math.random() < 0.5 ? light : base);
    m.scale.set(0.14, 0.07, 0.14);
    m.position.copy(p).multiplyScalar(0.56);
    m.position.y += 0.03;
    m.lookAt(m.position.clone().multiplyScalar(2));
    m.castShadow = true;
    head.add(m);
  }
  // 앞머리: 이마에 붙어 내려오는 짧은 가닥 (끝이 눈썹 높이)
  const bangs = [-0.5, -0.3, -0.12, 0.06, 0.24, 0.42];
  bangs.forEach((a, i) => {
    const pos = new THREE.Vector3(Math.sin(a) * 0.5, 0.44 - Math.abs(a) * 0.08, Math.cos(a) * 0.33);
    const side = a < 0 ? -1 : 1;
    const dir = new THREE.Vector3(side * (0.15 + Math.abs(a) * 0.35), -1, 0.42).normalize();
    lock(head, pos, dir, 0.3, 0.1, i % 3 === 1 ? light : base, side * 0.9);
  });
  // 귀를 살짝 덮는 옆머리 + 뒷머리
  for (const s of [-1, 1]) lock(head, new THREE.Vector3(s * 0.52, 0.12, 0.08), new THREE.Vector3(s * 0.2, -1, 0.1).normalize(), 0.3, 0.1, base, -s);
  for (let k = -2; k <= 2; k++) lock(head, new THREE.Vector3(k * 0.14, -0.05, -0.5), new THREE.Vector3(k * 0.1, -1, -0.25).normalize(), 0.24, 0.1, k % 2 ? light : base, 0.5);
  // 정수리 작은 꽁지머리 + 민트 머리끈
  const tuft = group(head, [0.04, 0.58, -0.14], [-0.55, 0, 0.12]);
  torus(0.06, 0.035, mat('#a5e6c9'), { pos: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0], parent: tuft });
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    lock(tuft, new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3 - 0.25).normalize(), 0.17, 0.05, i % 2 ? light : base, 0.6);
  }
}

function hairWoogi(head) {
  const base = mat('#5a321d', { roughness: 0.8 });
  const light = mat('#774528', { roughness: 0.75 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.61, 36, 22, 0, Math.PI * 2, 0, 2.0), base);
  cap.rotation.x = -0.55; cap.position.y = 0.01; cap.castShadow = true;
  head.add(cap);
  // 일자 앞머리 (이마 전체를 덮는 뱅)
  const bang = new THREE.Mesh(new THREE.SphereGeometry(0.625, 40, 14, Math.PI / 2 - 1.05, 2.1, 0.2, 1.2), base);
  bang.castShadow = true; head.add(bang);
  for (let i = 0; i < 15; i++) {
    const phi = Math.PI / 2 - 0.95 + i * (1.9 / 14);
    const th = 1.4;
    const r = 0.62;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 8), i % 4 === 0 ? light : base);
    c.position.set(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r - 0.04, Math.sin(phi) * Math.sin(th) * r);
    c.rotation.x = Math.PI; c.rotation.z = (Math.random() - 0.5) * 0.3;
    head.add(c);
  }
  // 웨이브 긴 머리 (뒤 + 옆 + 어깨 앞으로 넘긴 머리)
  const strands = [];
  const defs = [];
  for (let i = 0; i < 16; i++) defs.push({ a: Math.PI * 0.9 + (i / 15) * Math.PI * 1.2, len: 1.15 + Math.random() * 0.15, front: false, layer: 0 });
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) defs.push({ a: Math.PI / 2 - s * (1.12 + k * 0.14), len: 0.95 + k * 0.08, front: true, s });
  defs.forEach((d, i) => {
    const sx = -Math.cos(d.a), sz = Math.sin(d.a);
    const s = group(head, [sx * 0.47, 0.1, sz * 0.43]);
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const v = k / 10;
      const out = 0.02 + v * (d.front ? 0.08 : 0.18);
      const wave = Math.sin(v * 11 + i * 1.3) * 0.06 * Math.min(1, v * 2.5);
      let x = sx * out + sz * wave, z = sz * out - sx * wave;
      if (d.front) z += v * 0.28;
      pts.push(new THREE.Vector3(x, -v * d.len, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 44, rad = 10;
    const geo = new THREE.TubeGeometry(curve, segs, d.front ? 0.1 : 0.13, rad, false);
    const pos = geo.attributes.position;
    const c = new THREE.Vector3(), v3 = new THREE.Vector3();
    for (let r = 0; r <= segs; r++) {
      const v = r / segs;
      curve.getPointAt(v, c);
      const taper = (1 - v * 0.5) * (1 + Math.sin(v * 22 + i) * 0.08);
      for (let j = 0; j <= rad; j++) {
        const idx = r * (rad + 1) + j;
        v3.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(taper).add(c);
        pos.setXYZ(idx, v3.x, v3.y, v3.z);
      }
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, i % 3 === 1 ? light : base);
    m.castShadow = true;
    s.add(m);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(d.front ? 0.06 : 0.08, 10, 8), i % 3 === 1 ? light : base);
    tip.position.copy(pts[pts.length - 1]);
    s.add(tip);
    strands.push(s);
  });
  return strands;
}

function beret(head) {
  const tex = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f2fbf2'); gr.addColorStop(0.6, '#d7f0dd'); gr.addColorStop(1, '#bfe3cb');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // 앞쪽(u≈0.25)에 파란 번개 지그재그
    g.strokeStyle = '#3d74e0'; g.lineWidth = 10; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    const zz = [[0.08, 0.5], [0.13, 0.36], [0.17, 0.56], [0.22, 0.38], [0.27, 0.6], [0.31, 0.42], [0.36, 0.62], [0.41, 0.44]];
    zz.forEach(([u, v], i) => (i ? g.lineTo(u * w, v * h) : g.moveTo(u * w, v * h)));
    g.stroke();
    g.lineWidth = 6; g.strokeStyle = '#6f9cf0';
    g.beginPath(); [[0.2, 0.22], [0.24, 0.3], [0.27, 0.2], [0.31, 0.29]].forEach(([u, v], i) => (i ? g.lineTo(u * w, v * h) : g.moveTo(u * w, v * h))); g.stroke();
  });
  const bg = group(head, [0.04, 0.5, -0.04], [-0.28, 0, -0.2]);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 40, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  b.scale.set(1.08, 0.45, 1.02); b.castShadow = true;
  bg.add(b);
  // 볼록한 주름
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; sph(0.28, '#e3f5e6', { pos: [Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.42], scale: [1.2, 0.5, 1], parent: bg }); }
  torus(0.56, 0.07, mat('#c8e8d2'), { rot: [Math.PI / 2, 0, 0], pos: [0, -0.12, 0], parent: bg });
  // 꼭지
  capsule(0.055, 0.12, mat('#d7f0dd'), { pos: [0.12, 0.33, 0.02], rot: [0, 0, -0.6], parent: bg });
  // 노란 단추
  const btn = cyl(0.07, 0.07, 0.035, '#ffd23f', { pos: [-0.52, 0.05, 0.42], rot: [1.15, 0, 0.75], parent: bg });
  for (const d of [[-0.018, -0.018], [0.018, 0.018], [-0.018, 0.018], [0.018, -0.018]]) sph(0.011, '#b98a1a', { pos: [d[0], 0.02, d[1]], parent: btn });
}

/* ═══════════════════ 주인공 몸 ═══════════════════ */
function heroBody(torso, o) {
  const pts = [[0, 0], [0.4, 0], [0.45, 0.04], [0.46, 0.14], [0.43, 0.4], [0.37, 0.62], [0.27, 0.74], [0.12, 0.79], [0, 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat(o.top));
  body.castShadow = true; body.receiveShadow = true; body.scale.set(1, 1, 0.85);
  torso.add(body);
  torus(0.43, 0.045, mat(o.top2 || o.top), { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.85, 1], parent: torso });
  // 후드
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.11, 10, 24), mat(o.top));
  hood.position.set(0, 0.76, -0.12); hood.rotation.x = Math.PI / 2 - 0.4; hood.castShadow = true;
  torso.add(hood);
  sph(0.26, o.top2 || o.top, { pos: [0, 0.7, -0.34], scale: [1.05, 0.85, 0.6], parent: torso });
  if (o.kind === 'mung') {
    for (const s of [-1, 1]) {
      cyl(0.016, 0.016, 0.34, '#fbf7ef', { pos: [s * 0.09, 0.58, 0.33], rot: [0.25, 0, 0], parent: torso });
      cyl(0.026, 0.02, 0.06, '#d8cbb5', { pos: [s * 0.09, 0.41, 0.37], parent: torso });
    }
    const pk = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.39, 0.24, 24, 1, true, -0.7, 1.4), mat(o.top2));
    pk.position.set(0, 0.2, 0); pk.scale.set(1.01, 1, 0.87); torso.add(pk);
    // 소매 끝 리브는 팔에서
  } else {
    // 집업: 지퍼, 노란 하트 지퍼고리, 흰 이너, 크로스백 끈, 주머니
    box(0.025, 0.66, 0.02, '#8e939b', { pos: [0, 0.38, 0.385], rot: [-0.14, 0, 0], parent: torso });
    heartMesh(0.15, '#ffd23f', 0.16, { pos: [0.015, 0.56, 0.4], rot: [0, 0, 0.12], parent: torso });
    sph(0.13, '#ffffff', { pos: [0, 0.73, 0.18], scale: [1, 0.5, 0.6], parent: torso });
    torus(0.2, 0.04, mat(o.top2), { pos: [0, 0.76, 0.02], rot: [Math.PI / 2 - 0.2, 0, 0], parent: torso });
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 6, 48), mat('#1f1f24'));
    strap.position.set(0, 0.42, 0); strap.rotation.set(Math.PI / 2 - 0.1, 0.8, 0); strap.scale.set(1, 0.86, 1);
    torso.add(strap);
    for (const s of [-1, 1]) box(0.16, 0.02, 0.02, '#9da1a9', { pos: [s * 0.2, 0.22, 0.39], rot: [0, s * 0.35, 0], parent: torso });
  }
}

/* ═══════════════════ 조연: 옷 프린트 ═══════════════════ */
function torsoPrint(o, back = false) {
  return canvasTex(256, 256, (g, w, h) => {
    const top = o.top;
    g.fillStyle = top; g.fillRect(0, 0, w, h);
    // 옆 음영
    const sh = g.createLinearGradient(0, 0, w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.12)'); sh.addColorStop(0.15, 'rgba(0,0,0,0)'); sh.addColorStop(0.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    const k = o.print;
    const line = (c, lw, pts) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    const button = (x, y, c = 'rgba(0,0,0,0.35)') => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); };
    if (back) {
      if (k === 'hoodie' || k === 'zip') { g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(128, 20, 70, 40, 0, 0, Math.PI); g.fill(); }
      if (k === 'medic') { g.fillStyle = '#e8e8e8'; g.fillRect(0, 150, w, 22); g.fillStyle = '#fff'; g.font = `bold 50px ${FONT}`; g.textAlign = 'center'; g.fillText('119', 128, 120); }
      if (k === 'guard') { g.fillStyle = '#fff'; g.font = `bold 34px ${FONT}`; g.textAlign = 'center'; g.fillText('경비', 128, 110); }
      return;
    }
    const shirtV = (c = '#ffffff') => { g.fillStyle = c; g.beginPath(); g.moveTo(80, 0); g.lineTo(128, 80); g.lineTo(176, 0); g.fill(); line('rgba(0,0,0,0.25)', 3, [[80, 0], [128, 80], [176, 0]]); };
    const collar = (c = '#ffffff') => { g.fillStyle = c; g.beginPath(); g.moveTo(84, 0); g.lineTo(108, 34); g.lineTo(128, 10); g.lineTo(148, 34); g.lineTo(172, 0); g.fill(); line('rgba(0,0,0,0.3)', 2, [[84, 0], [108, 34], [128, 10], [148, 34], [172, 0]]); };
    const tie = c => { g.fillStyle = c; g.beginPath(); g.moveTo(118, 14); g.lineTo(138, 14); g.lineTo(134, 28); g.lineTo(146, 150); g.lineTo(128, 172); g.lineTo(110, 150); g.lineTo(122, 28); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; for (let y = 50; y < 150; y += 22) { g.save(); g.translate(128, y); g.rotate(-0.6); g.fillRect(-12, -2, 24, 4); g.restore(); } };
    const pocket = (x, y, pw = 46, ph = 40) => { line('rgba(0,0,0,0.3)', 3, [[x, y], [x, y + ph], [x + pw, y + ph], [x + pw, y]]); line('rgba(0,0,0,0.3)', 3, [[x - 2, y], [x + pw + 2, y]]); };
    const nameTag = (x, y, t) => { g.fillStyle = '#fff'; g.fillRect(x, y, 66, 22); g.fillStyle = '#222'; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText(t, x + 33, y + 17); g.textAlign = 'left'; };
    if (k === 'shirtTie' || k === 'vest' || k === 'uniform' || k === 'guard') {
      collar(k === 'guard' ? o.top : '#ffffff');
      for (let y = 50; y < 240; y += 34) button(128, y, 'rgba(255,255,255,0.6)');
      line('rgba(0,0,0,0.18)', 2, [[128, 30], [128, 256]]);
      if (o.tie) tie(o.tie);
      pocket(160, 70);
      g.fillStyle = '#3060c0'; g.fillRect(172, 56, 5, 22);
      if (k === 'vest') {
        g.fillStyle = o.vest;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(84, 0); g.lineTo(118, 120); g.lineTo(102, 256); g.lineTo(0, 256); g.fill();
        g.beginPath(); g.moveTo(256, 0); g.lineTo(172, 0); g.lineTo(138, 120); g.lineTo(154, 256); g.lineTo(256, 256); g.fill();
        for (let y = 140; y < 250; y += 30) button(100, y, 'rgba(255,255,255,0.7)');
      }
      if (k === 'uniform') {
        for (const x of [10, 200]) { g.fillStyle = '#1d3a6b'; g.fillRect(x, 0, 46, 14); g.fillStyle = '#e8c547'; g.fillRect(x + 4, 4, 38, 4); }
        g.fillStyle = '#e8c547'; g.beginPath(); g.arc(60, 90, 16, 0, 7); g.fill(); g.fillStyle = '#1d3a6b'; g.font = `bold 16px ${FONT}`; g.textAlign = 'center'; g.fillText('BUS', 60, 96); g.textAlign = 'left';
        nameTag(150, 128, '기사');
      }
      if (k === 'guard') {
        g.fillStyle = '#e8c547'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 9 : 20; g.lineTo(60 + Math.cos(a) * r, 90 + Math.sin(a) * r); } g.fill();
        pocket(36, 120); g.fillStyle = '#4a3a2a'; g.fillRect(0, 226, w, 30); g.fillStyle = '#d8b84a'; g.fillRect(110, 228, 36, 26);
      }
    } else if (k === 'school') {
      shirtV('#ffffff');
      if (o.tie) tie(o.tie); else { g.fillStyle = o.ribbon || '#d0304a'; g.beginPath(); g.moveTo(100, 30); g.lineTo(128, 44); g.lineTo(156, 30); g.lineTo(156, 64); g.lineTo(128, 50); g.lineTo(100, 64); g.fill(); g.beginPath(); g.arc(128, 47, 9, 0, 7); g.fill(); }
      // 블레이저 라펠
      g.fillStyle = o.blazer || '#24346a';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(80, 0); g.lineTo(126, 100); g.lineTo(112, 256); g.lineTo(0, 256); g.fill();
      g.beginPath(); g.moveTo(256, 0); g.lineTo(176, 0); g.lineTo(130, 100); g.lineTo(144, 256); g.lineTo(256, 256); g.fill();
      line('rgba(255,255,255,0.35)', 3, [[80, 0], [96, 60], [126, 100]]); line('rgba(255,255,255,0.35)', 3, [[176, 0], [160, 60], [130, 100]]);
      g.fillStyle = '#e8c547'; g.beginPath(); g.moveTo(168, 92); g.lineTo(200, 92); g.lineTo(200, 120); g.lineTo(184, 132); g.lineTo(168, 120); g.fill();
      g.fillStyle = '#24346a'; g.font = `bold 18px ${FONT}`; g.fillText('꿈', 175, 118);
      button(106, 170, '#e8c547'); button(106, 210, '#e8c547');
      pocket(20, 180, 60, 10);
    } else if (k === 'hoodie') {
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(128, 0, 62, 34, 0, 0, Math.PI); g.fill();
      for (const x of [108, 148]) { line('#ffffff', 4, [[x, 20], [x - 2, 96]]); g.fillStyle = '#ddd'; g.fillRect(x - 6, 96, 8, 12); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(56, 168); g.lineTo(200, 168); g.lineTo(222, 240); g.lineTo(34, 240); g.fill();
      line('rgba(0,0,0,0.3)', 3, [[56, 168], [200, 168]]);
      if (o.logo) { g.fillStyle = o.logo; g.font = `bold 34px ${FONT}`; g.textAlign = 'center'; g.fillText(o.logoText || '★', 128, 140); g.textAlign = 'left'; }
    } else if (k === 'zip') {
      g.fillStyle = o.inner || '#ffffff'; g.beginPath(); g.moveTo(100, 0); g.lineTo(128, 40); g.lineTo(156, 0); g.fill();
      line('#9aa0a8', 5, [[128, 40], [128, 256]]);
      for (let y = 48; y < 256; y += 8) { g.fillStyle = '#7a8088'; g.fillRect(124, y, 8, 3); }
      g.fillStyle = '#c0c4c8'; g.fillRect(122, 40, 12, 20);
      pocket(40, 160, 44, 6); pocket(172, 160, 44, 6);
      line('rgba(0,0,0,0.25)', 3, [[90, 0], [110, 40]]); line('rgba(0,0,0,0.25)', 3, [[166, 0], [146, 40]]);
    } else if (k === 'cardigan') {
      shirtV(o.inner || '#ffffff');
      line('rgba(0,0,0,0.25)', 3, [[128, 80], [128, 256]]);
      for (let y = 100; y < 250; y += 30) button(136, y, '#f4e6c8');
      g.fillStyle = 'rgba(255,255,255,0.15)'; for (let y = 10; y < 256; y += 14) g.fillRect(0, y, w, 4);
      if (o.flower) for (let i = 0; i < 6; i++) { const x = 30 + (i % 2) * 180 + Math.random() * 20, y = 60 + i * 30; g.fillStyle = '#ffd6e6'; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 7, y + Math.sin(p * 1.26) * 7, 5, 0, 7); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    } else if (k === 'medic') {
      collar(o.top);
      line('#555', 4, [[128, 30], [128, 256]]);
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 150, w, 22); g.fillStyle = '#c8ff4a'; g.fillRect(0, 172, w, 8);
      g.fillStyle = '#fff'; g.fillRect(150, 70, 60, 60); g.fillStyle = '#e03030'; g.fillRect(172, 76, 16, 48); g.fillRect(156, 92, 48, 16);
      nameTag(40, 80, '구급대');
    } else if (k === 'tee') {
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(128, 0, 50, 26, 0, 0, Math.PI); g.fill();
      if (o.logoText) { g.fillStyle = o.logo || '#fff'; g.font = `bold 46px ${FONT}`; g.textAlign = 'center'; g.fillText(o.logoText, 128, 130); g.textAlign = 'left'; }
    }
    if (o.lanyard) {
      line(o.lanyard, 6, [[96, 0], [116, 120]]); line(o.lanyard, 6, [[160, 0], [140, 120]]);
      g.fillStyle = '#ffffff'; g.fillRect(104, 118, 48, 62); g.strokeStyle = o.lanyard; g.lineWidth = 3; g.strokeRect(104, 118, 48, 62);
      g.fillStyle = '#ffd0b8'; g.beginPath(); g.arc(128, 140, 10, 0, 7); g.fill();
      g.fillStyle = '#555'; g.fillRect(112, 158, 32, 4); g.fillRect(116, 166, 24, 4);
    }
    // 바지와 이어지는 벨트 라인
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 248, w, 8);
  });
}


/* 앞(가운데)과 뒤(양 끝) 프린트를 한 장으로 합친 몸통 텍스처 (LatheGeometry용) */
function wrapPrint(o) {
  const f = torsoPrint(o).image, bk = torsoPrint(o, true).image;
  return canvasTex(512, 256, (g) => {
    g.drawImage(f, 128, 0, 256, 256);
    g.drawImage(bk, 128, 0, 128, 256, 0, 0, 128, 256);
    g.drawImage(bk, 0, 0, 128, 256, 384, 0, 128, 256);
  });
}

function humanHair(head, o) {
  const base = mat(o.hairColor, { roughness: 0.75 });
  const light = mat(shadeHex(o.hairColor, 22), { roughness: 0.7 });
  const kind = o.hair;
  if (kind === 'bald') {
    for (const s of [-1, 1]) sph(0.16, base, { pos: [s * 0.5, 0.05, -0.15], scale: [0.5, 0.9, 1.3], parent: head });
    sph(0.3, base, { pos: [0, -0.05, -0.42], scale: [1.4, 0.7, 0.5], parent: head });
    return;
  }
  const len = { short: 1.75, spiky: 1.7, bob: 2.05, long: 2.05, pony: 1.8, bun: 1.8 }[kind] || 1.75;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.575, 36, 22, 0, Math.PI * 2, 0, len), base);
  cap.rotation.x = -0.42; cap.position.y = 0.03; cap.castShadow = true; head.add(cap);
  if (kind === 'bob' || kind === 'long') {
    // 일자 앞머리 + 옆 머리
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.59, 32, 12, Math.PI / 2 - 0.95, 1.9, 0.25, 1.1), base);
    bang.castShadow = true; head.add(bang);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.6, kind === 'long' ? 1.2 : 0.55, 32, 1, true, Math.PI * 0.7, Math.PI * 1.6), mat(o.hairColor, { side: THREE.DoubleSide, roughness: 0.75 }));
    side.position.y = kind === 'long' ? -0.45 : -0.15; head.add(side);
  } else {
    // 이마를 덮는 짧은 앞머리 + 끝이 갈라진 결
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.585, 32, 10, Math.PI / 2 - 0.9, 1.8, 0.2, kind === 'spiky' ? 0.85 : 0.98), base);
    bang.castShadow = true; head.add(bang);
    const th = kind === 'spiky' ? 1.05 : 1.18;
    for (let i = 0; i < 9; i++) {
      const phi = Math.PI / 2 - 0.82 + i * (1.64 / 8);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 7), i % 3 === 1 ? light : base);
      c.position.set(-Math.cos(phi) * Math.sin(th) * 0.585, Math.cos(th) * 0.585 - 0.05, Math.sin(phi) * Math.sin(th) * 0.585);
      c.rotation.set(Math.PI - 0.25, 0, (i - 4) * 0.08 + (o.part || 0.25));
      head.add(c);
    }
    if (kind === 'spiky') for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 7), i % 2 ? light : base);
      c.position.set(Math.cos(a) * 0.3, 0.52, Math.sin(a) * 0.3 + 0.05);
      c.lookAt(c.position.clone().multiplyScalar(3).add(new THREE.Vector3(0, 1.5, 0)));
      c.rotateX(Math.PI / 2);
      head.add(c);
    }
    for (const s of [-1, 1]) lock(head, new THREE.Vector3(s * 0.53, 0.18, 0.08), new THREE.Vector3(0, -1, 0.05), 0.2, 0.08, base, 0);
  }
  if (kind === 'pony') {
    const p = group(head, [0, 0.25, -0.55], [0.4, 0, 0]);
    torus(0.08, 0.035, o.tieColor || '#ff6f98', { rot: [Math.PI / 2, 0, 0], parent: p });
    lock(p, new THREE.Vector3(0, 0, -0.02), new THREE.Vector3(0, -1, -0.35).normalize(), 0.7, 0.13, base, 0.8);
  }
  if (kind === 'bun') { sph(0.2, base, { pos: [0, 0.5, -0.32], parent: head }); torus(0.15, 0.03, light, { pos: [0, 0.42, -0.28], rot: [1.2, 0, 0], parent: head }); }
  if (kind === 'long') for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i - 3) * 0.32;
    lock(head, new THREE.Vector3(Math.sin(a) * 0.5, -0.2, Math.cos(a) * 0.45), new THREE.Vector3(Math.sin(a) * 0.1, -1, Math.cos(a) * 0.1).normalize(), 0.75, 0.15, i % 2 ? light : base, 0.5);
  }
}
function shadeHex(hex, amt) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt / 255)));
  return '#' + c.getHexString();
}

/* 실제 사람 비율의 조연 (얼굴은 그려 넣고, 옷은 프린트로 디테일) */
function makeHuman(opts) {
  const o = { top: '#9fb7d9', pants: '#4b5568', shoes: '#2a2a30', hair: 'short', hairColor: '#3a2a20', skin: '#f6d6bf', scale: 1.1, print: 'tee', ...opts };
  const root = new THREE.Group();
  root.name = o.name || 'person';
  const inner = group(root);
  inner.scale.setScalar(o.scale);
  const torso = group(inner, [0, 0.42, 0]);
  // 몸통: 어깨-가슴-허리 곡선 + 옷 프린트
  const prof = [[0, 0], [0.33, 0], [0.355, 0.05], [0.34, 0.28], [0.36, 0.5], [0.375, 0.66], [0.33, 0.76], [0.2, 0.83], [0.1, 0.86], [0, 0.86]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40, -Math.PI, Math.PI * 2), new THREE.MeshStandardMaterial({ map: wrapPrint(o), roughness: 0.8 }));
  body.scale.set(1, 1, 0.74); body.castShadow = true; body.receiveShadow = true;
  torso.add(body);
  // 바지 허리 + 벨트
  cyl(0.335, 0.34, 0.12, o.pants, { pos: [0, 0.0, 0], scale: [1, 1, 0.76], parent: torso });
  torus(0.335, 0.018, o.belt || '#2a2420', { pos: [0, 0.06, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.76, 1], parent: torso, cast: false });
  if (o.skirt) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.34, 28, 1, true), mat(o.skirt, { side: THREE.DoubleSide })); sk.position.y = -0.12; sk.scale.z = 0.8; torso.add(sk); }
  if (o.print === 'hoodie' || o.print === 'zip') torus(0.2, 0.07, o.top, { pos: [0, 0.82, -0.1], rot: [Math.PI / 2 - 0.35, 0, 0], parent: torso });
  else torus(0.13, 0.03, o.collar || '#ffffff', { pos: [0, 0.84, 0.02], rot: [Math.PI / 2 - 0.15, 0, 0], parent: torso, cast: false });
  cyl(0.1, 0.11, 0.14, o.skin, { pos: [0, 0.9, 0], parent: torso });
  // 다리 (허벅지-종아리 + 신발 밑창)
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = group(inner, [s * 0.15, 0.44, 0]);
    capsule(0.115, 0.24, o.pants, { pos: [0, -0.17, 0], parent: leg });
    if (o.socks) cyl(0.09, 0.09, 0.06, o.socks, { pos: [0, -0.33, 0], parent: leg });
    rbox(0.19, 0.1, 0.32, 0.05, o.shoes, { pos: [0, -0.39, 0.05], parent: leg });
    box(0.2, 0.025, 0.33, o.sole || '#f0ece6', { pos: [0, -0.43, 0.05], parent: leg, cast: false });
    legs.push(leg);
  }
  // 팔 (소매 + 소매단 + 엄지 있는 손)
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = group(torso, [s * 0.38, 0.72, 0]);
    sph(0.1, o.sleeve || o.top, { pos: [0, 0, 0], parent: arm });
    capsule(0.088, 0.36, o.sleeve || o.top, { pos: [0, -0.22, 0], parent: arm });
    torus(0.085, 0.022, o.cuff || o.sleeve || o.top, { pos: [0, -0.42, 0], rot: [Math.PI / 2, 0, 0], parent: arm });
    const hand = sph(0.075, o.skin, { pos: [0, -0.5, 0.01], scale: [0.85, 1.1, 0.7], parent: arm });
    sph(0.03, o.skin, { pos: [-s * 0.06, 0.02, 0.04], parent: hand });
    arm.rotation.z = s * 0.12;
    arm.userData.hand = hand;
    arms.push(arm);
  }
  // 머리 (주인공보다 작은 어른 비율)
  const headPivot = group(torso, [0, 0.95, 0]);
  const head = group(headPivot, [0, 0.4, 0]);
  head.scale.setScalar(0.74);
  const skull = sph(0.55, o.skin, { seg: 40, parent: head });
  skull.scale.set(0.98, 1.04, 0.98);
  for (const s of [-1, 1]) sph(0.1, o.skin, { pos: [s * 0.54, -0.04, 0], scale: [0.45, 1, 0.75], parent: head });
  sph(0.05, shadeHex(o.skin, -12), { pos: [0, -0.16, 0.54], scale: [0.9, 1.1, 0.8], parent: head, cast: false });
  const faceTex = new FaceTex(skull, {
    skin: o.skin, iris1: '#1e120c', iris2: o.iris || '#4a2c1a', iris3: '#8a5a34', browColor: o.hair === 'bald' ? '#888' : o.hairColor,
    mouth: 'smile', lashes: !!o.lashes, eyeScale: o.eyeScale || 0.74, eyeX: 0.37, blushA: o.blush ? 0.45 : 0.18, hatch: false, browW: o.lashes ? 5 : 8,
  });
  humanHair(head, o);
  if (o.glasses) {
    for (const s of [-1, 1]) torus(0.12, 0.016, '#2a2a2a', { pos: [s * 0.21, -0.03, 0.54], parent: head, cast: false });
    box(0.12, 0.018, 0.018, '#2a2a2a', { pos: [0, -0.01, 0.57], parent: head, cast: false });
  }
  if (o.cap) {
    const c = group(head, [0, 0.42, 0.02], [-0.12, 0, 0]);
    cyl(0.56, 0.59, 0.26, o.cap, { parent: c });
    cyl(0.45, 0.56, 0.12, o.cap, { pos: [0, 0.18, 0], parent: c });
    box(0.66, 0.035, 0.36, '#151515', { pos: [0, -0.1, 0.56], rot: [0.2, 0, 0], parent: c });
    box(0.36, 0.08, 0.02, '#e8c547', { pos: [0, 0.0, 0.59], parent: c, cast: false });
  }
  if (o.headset) {
    torus(0.6, 0.035, '#222', { arc: Math.PI, pos: [0, 0.05, 0], parent: head });
    for (const s of [-1, 1]) rbox(0.12, 0.24, 0.24, 0.05, '#333', { pos: [s * 0.6, -0.05, 0], parent: head });
    cyl(0.014, 0.014, 0.4, '#222', { pos: [-0.48, -0.22, 0.28], rot: [1.2, 0.5, 0], parent: head });
    sph(0.05, '#222', { pos: [-0.3, -0.28, 0.5], parent: head });
  }
  if (o.headphones) {
    torus(0.62, 0.045, o.headphones, { arc: Math.PI, pos: [0, 0.05, 0], parent: head });
    for (const s of [-1, 1]) sph(0.19, o.headphones, { pos: [s * 0.6, -0.05, 0], scale: [0.55, 1, 1], parent: head });
  }
  const phone = rbox(0.1, 0.18, 0.02, 0.015, '#2b2d36', { parent: arms[1].userData.hand, pos: [0, -0.05, 0.06] });
  phone.visible = false;
  return baseChar({ root, inner, torso, head, headPivot, arms, legs, phone, o, faceTex, human: true });
}

/* ═══════════════════ 공통 캐릭터 객체 ═══════════════════ */
function baseChar(parts) {
  const ch = {
    ...parts,
    pose: 'idle', expr: 'open', blinkT: 2 + Math.random() * 2, blinkHold: 0, walking: 0, talk: 0, talkT: 0,
    setExpr(e) {
      this.expr = e;
      this.faceTex.blink = false;
      this.faceTex.set(e);
    },
    setPose(p) { this.pose = p; this.phone.visible = p === 'phone' || p === 'phoneLie' || p === 'phoneLook'; },
    update(dt) { animate(this, dt); },
  };
  return ch;
}

/* ═══════════════════ 주인공 생성 ═══════════════════ */
function makeHero(kind) {
  const isMung = kind === 'mung';
  const o = isMung
    ? { kind, name: '멍뭉', top: '#f2e6d2', top2: '#e6d6bb', pants: '#7e8fae', shoes: '#fbfbfb', iris1: '#2a140a', iris2: '#6b3a1c', iris3: '#c98a48', browColor: '#5a3119', mouth: 'smile', lashes: false, gaze: -0.18 }
    : { kind, name: '우기', top: '#c9cbd1', top2: '#b7bac1', pants: '#3d4352', shoes: '#ffffff', iris1: '#2e160c', iris2: '#7a4220', iris3: '#e0a55e', browColor: '#3e2214', mouth: 'open', lashes: true, winkSide: 1, phase: 1.3 };
  const root = new THREE.Group();
  root.name = o.name;
  const inner = group(root);
  const torso = group(inner, [0, 0.42, 0]);
  heroBody(torso, o);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = group(inner, [s * 0.17, 0.44, 0]);
    capsule(0.12, 0.2, o.pants, { pos: [0, -0.18, 0], parent: leg });
    rbox(0.22, 0.13, 0.32, 0.06, o.shoes, { pos: [0, -0.38, 0.05], parent: leg });
    legs.push(leg);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = group(torso, [s * 0.37, 0.64, 0]);
    capsule(0.11, 0.3, o.top, { pos: [0, -0.22, 0], parent: arm });
    torus(0.1, 0.035, o.top2, { pos: [0, -0.4, 0], rot: [Math.PI / 2, 0, 0], parent: arm });
    const hand = sph(0.1, SKIN, { pos: [0, -0.48, 0], parent: arm });
    arm.rotation.z = s * 0.25;
    arm.userData.hand = hand;
    arms.push(arm);
  }
  const headPivot = group(torso, [0, 0.8, 0]);
  const head = group(headPivot, [0, 0.54, 0]);
  head.scale.setScalar(1.1);
  const skull = sph(0.55, SKIN, { seg: 48, parent: head });
  skull.scale.set(1.05, 0.97, 0.96);
  const faceTex = new FaceTex(skull, o);
  let strands = null;
  if (isMung) hairMungmung(head);
  else { for (const s of [-1, 1]) sph(0.09, SKIN, { pos: [s * 0.55, -0.05, 0], scale: [0.5, 1, 0.8], parent: head }); strands = hairWoogi(head); beret(head); }
  const phone = rbox(0.12, 0.22, 0.025, 0.02, '#2b2d36', { parent: arms[1].userData.hand, pos: [0, -0.06, 0.08] });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.19), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
  scr.position.z = 0.014; phone.add(scr);
  phone.visible = false;
  const ch = baseChar({ root, inner, torso, head, headPivot, arms, legs, phone, o, faceTex, strands });
  ch.setExpr('open');
  return ch;
}

/* ═══════════════════ 포즈 / 애니메이션 ═══════════════════ */
const P = {
  idle:     { la: [0, 0, -0.22], ra: [0, 0, 0.22], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, 0], ty: 0.42 },
  tired:    { la: [0.1, 0, -0.08], ra: [0.1, 0, 0.08], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0.25, 0, 0], head: [0.35, 0, 0.1], ty: 0.4 },
  sitFloor: { la: [-0.5, 0, -0.2], ra: [-0.5, 0, 0.2], ll: [-1.5, 0, -0.1], rl: [-1.5, 0, 0.1], tor: [0.05, 0, 0], head: [0.1, 0, 0], ty: 0.18 },
  sitTired: { la: [-0.3, 0, -0.1], ra: [-0.3, 0, 0.1], ll: [-1.5, 0, -0.1], rl: [-1.5, 0, 0.1], tor: [0.3, 0, 0], head: [0.4, 0, 0.15], ty: 0.18 },
  sitChair: { la: [-0.9, 0, -0.1], ra: [-0.9, 0, 0.1], ll: [-1.45, 0, 0], rl: [-1.45, 0, 0], tor: [0, 0, 0], head: [0.05, 0, 0], ty: 0.42 },
  type:     { la: [-1.2, 0, -0.05], ra: [-1.2, 0, 0.05], ll: [-1.45, 0, 0], rl: [-1.45, 0, 0], tor: [0.1, 0, 0], head: [0.15, 0, 0], ty: 0.42 },
  phone:    { la: [-0.3, 0, -0.15], ra: [-2.5, -0.2, 0.75], ll: [-1.5, 0, -0.1], rl: [-1.5, 0, 0.1], tor: [0, 0, 0], head: [0, 0, 0.2], ty: 0.18 },
  phoneLook:{ la: [-0.6, 0, -0.1], ra: [-1.3, 0, 0.25], ll: [-1.5, 0, -0.1], rl: [-1.5, 0, 0.1], tor: [0.1, 0, 0], head: [0.4, 0, 0], ty: 0.18 },
  lie:      { la: [0, 0, -0.15], ra: [0, 0, 0.15], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, 0], ty: 0.42 },
  phoneLie: { la: [0, 0, -0.15], ra: [-2.6, 0, 0.8], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0.3, 0.1], ty: 0.42 },
  cheeks:   { la: [-2.3, 0, 0.55], ra: [-2.3, 0, -0.55], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, 0.15], ty: 0.42 },
  chin:     { la: [-0.4, 0, -0.1], ra: [-2.2, 0, -0.45], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0.05, 0, 0], head: [0.05, 0, -0.18], ty: 0.42 },
  cheer:    { la: [0, 0, -2.6], ra: [0, 0, 2.6], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [-0.15, 0, 0], ty: 0.42 },
  wave:     { la: [0, 0, -0.2], ra: [0, 0, 2.5], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, -0.1], ty: 0.42 },
  panic:    { la: [-0.4, 0, -2.2], ra: [-0.4, 0, 2.2], ll: [0, 0, -0.1], rl: [0, 0, 0.1], tor: [-0.1, 0, 0], head: [-0.1, 0, 0], ty: 0.42 },
  think:    { la: [-0.2, 0, -0.25], ra: [-2.4, 0.3, 0.6], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0.1, 0, 0.18], ty: 0.42 },
  point:    { la: [0, 0, -0.2], ra: [-1.55, 0, 0.1], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, 0], ty: 0.42 },
  angry:    { la: [-0.5, 0, -0.6], ra: [-0.5, 0, 0.6], ll: [0, 0, -0.08], rl: [0, 0, 0.08], tor: [0.1, 0, 0], head: [0.05, 0, 0], ty: 0.42 },
  slump:    { la: [-1.3, 0, -0.1], ra: [-1.3, 0, 0.1], ll: [-1.45, 0, 0], rl: [-1.45, 0, 0], tor: [0.75, 0, 0.1], head: [0.4, 0, 0.3], ty: 0.42 },
  drive:    { la: [-1.15, 0, 0.12], ra: [-1.15, 0, -0.12], ll: [-1.45, 0, 0], rl: [-1.45, 0, 0], tor: [0, 0, 0], head: [0, 0, 0], ty: 0.42 },
  kneel:    { la: [-1.2, 0, -0.05], ra: [-1.2, 0, 0.05], ll: [-1.6, 0, 0], rl: [-0.2, 0, 0], tor: [0.3, 0, 0], head: [0.2, 0, 0], ty: 0.3 },
  shake:    { la: [-1.4, 0, -0.1], ra: [-1.4, 0, 0.1], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0.35, 0, 0], head: [0.2, 0, 0], ty: 0.38 },
  hug:      { la: [-1.3, 0.6, 0], ra: [-1.3, -0.6, 0], ll: [0, 0, 0], rl: [0, 0, 0], tor: [0, 0, 0], head: [0, 0, 0], ty: 0.42 },
};

function lerpRot(obj, target, k) {
  obj.rotation.x += (target[0] - obj.rotation.x) * k;
  obj.rotation.y += (target[1] - obj.rotation.y) * k;
  obj.rotation.z += (target[2] - obj.rotation.z) * k;
}

function animate(ch, dt) {
  const t = clock.t + (ch.o.phase || 0);
  const p = P[ch.pose] || P.idle;
  const k = Math.min(1, dt * 7);
  const w = ch.walking;
  const swing = Math.sin(t * 9) * 0.7 * w;

  lerpRot(ch.arms[0], [p.la[0] + swing, p.la[1], p.la[2]], k);
  lerpRot(ch.arms[1], [p.ra[0] - swing, p.ra[1], p.ra[2]], k);
  const comp = 0;
  lerpRot(ch.legs[0], [p.ll[0] - swing - comp, p.ll[1], p.ll[2]], k);
  lerpRot(ch.legs[1], [p.rl[0] + swing - comp, p.rl[1], p.rl[2]], k);
  lerpRot(ch.torso, p.tor, k);
  lerpRot(ch.headPivot, p.head, k);

  const breath = Math.sin(t * 2.2) * 0.012;
  ch.torso.position.y += (p.ty + breath + Math.abs(Math.sin(t * 9)) * 0.05 * w - ch.torso.position.y) * k;
  ch.torso.scale.y = 1 + breath * 0.6;
  if (ch.pose === 'cheer' || ch.pose === 'panic') { ch.arms[0].rotation.z += Math.sin(t * 12) * 0.08; ch.arms[1].rotation.z -= Math.sin(t * 12) * 0.08; }
  if (ch.pose === 'wave') ch.arms[1].rotation.x = Math.sin(t * 8) * 0.35;
  if (ch.pose === 'type') { ch.arms[0].rotation.x += Math.sin(t * 25) * 0.03; ch.arms[1].rotation.x += Math.cos(t * 23) * 0.03; }
  if (ch.pose === 'angry') ch.headPivot.rotation.y = Math.sin(t * 4) * 0.08;
  if (ch.pose === 'shake') ch.torso.rotation.z = Math.sin(t * 14) * 0.08;
  if (ch.pose === 'cheeks') ch.headPivot.rotation.z = 0.15 + Math.sin(t * 2) * 0.08;

  // 말하기: 입 그림을 번갈아 그리고 고개를 살짝 끄덕인다
  if (ch.talk > 0) {
    ch.talk -= dt; ch.talkT += dt;
    if (ch.talkT > 0.12) { ch.talkT = 0; ch.faceTex.setMouth(!ch.faceTex.mouthOpen); }
    ch.headPivot.rotation.x += Math.sin(t * 7) * 0.035;
  } else ch.faceTex.setMouth(false);
  if (ch.expr === 'open' || ch.expr === 'sad') {
    ch.blinkT -= dt;
    ch.faceTex.setBlink(ch.blinkT < 0.12 && ch.blinkT > 0);
    if (ch.blinkT < 0) ch.blinkT = 2.5 + Math.random() * 3;
  }
  // 살아 있는 느낌: 서 있을 때 체중 이동 + 고개를 천천히 둘러본다
  const standing = ['idle', 'think', 'angry', 'point', 'wave', 'tired'].includes(ch.pose) && !w;
  const tz = standing ? Math.sin(t * 0.7) * 0.025 : 0;
  ch.inner.rotation.z += (tz - ch.inner.rotation.z) * k;
  if (standing || ch.pose === 'sitChair') {
    ch.headPivot.rotation.y += (Math.sin(t * 0.45) * 0.18 + Math.sin(t * 1.1) * 0.05) * k * 0.4;
  }
  // 걸을 때 상체가 살짝 비틀리고 흔들린다
  if (w) { ch.torso.rotation.y = Math.sin(t * 9) * 0.08 * w; ch.torso.rotation.z = Math.sin(t * 9) * 0.03 * w; }
  if (ch.strands) ch.strands.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.6 + i) * 0.035; s.rotation.x = Math.sin(t * 1.3 + i * 0.5) * 0.025 + (w ? 0.08 : 0); });
}

/* ═══════════════════ 내보내기 ═══════════════════ */
export const makeMungmung = () => makeHero('mung');
export const makeWoogi = () => makeHero('woogi');
export const makeChibi = opts => makeHuman(opts);

/* 조연 프리셋 — 장면 코드의 예전 옵션(topKind/tie/vest…)도 그대로 받는다 */
export function npc(kind, extra = {}) {
  const presets = {
    teacher:   { print: 'vest', top: '#ffffff', vest: '#6f8a5e', sleeve: '#ffffff', tie: '#8a3a3a', hair: 'short', hairColor: '#2f2620', glasses: true, pants: '#555b66' },
    student1:  { print: 'school', top: '#ffffff', blazer: '#24346a', sleeve: '#24346a', cuff: '#ffffff', ribbon: '#d0304a', hair: 'pony', hairColor: '#2d1f1a', pants: '#2f3f6a', blush: true },
    student2:  { print: 'school', top: '#ffffff', blazer: '#24346a', sleeve: '#24346a', cuff: '#ffffff', tie: '#2f5fbf', hair: 'spiky', hairColor: '#1f1a17', pants: '#2a2f45' },
    student3:  { print: 'school', top: '#ffffff', blazer: '#24346a', sleeve: '#24346a', cuff: '#ffffff', ribbon: '#d0304a', hair: 'bob', hairColor: '#4a2c1c', pants: '#2f3f6a', blush: true },
    office1:   { print: 'shirtTie', top: '#e4ecf8', sleeve: '#e4ecf8', tie: '#3d5a99', hair: 'short', hairColor: '#222', pants: '#333a4a', lanyard: '#3b82f6' },
    office2:   { print: 'cardigan', top: '#f5d0da', sleeve: '#f5d0da', inner: '#ffffff', hair: 'bob', hairColor: '#3a2418', pants: '#4a4450', lanyard: '#3b82f6', blush: true },
    office3:   { print: 'zip', top: '#bfe2cf', sleeve: '#bfe2cf', hair: 'pony', hairColor: '#2b1b14', pants: '#3a3a44', lanyard: '#3b82f6' },
    office4:   { print: 'hoodie', top: '#a6b4c8', sleeve: '#a6b4c8', hair: 'short', hairColor: '#4b3a2a', glasses: true, pants: '#2c2c34', lanyard: '#3b82f6' },
    driver:    { print: 'uniform', top: '#cfe0f0', sleeve: '#cfe0f0', tie: '#1d3a6b', hair: 'short', hairColor: '#555', pants: '#2b3448', cap: '#1d3a6b' },
    grandma:   { print: 'cardigan', top: '#b07aa1', sleeve: '#b07aa1', inner: '#f4ead8', flower: true, hair: 'bun', hairColor: '#cfcfcf', glasses: true, pants: '#5a4a5a', blush: true },
    neighbor:  { print: 'hoodie', top: '#3b3f4a', sleeve: '#3b3f4a', logo: '#ff6060', logoText: '마왕', hair: 'spiky', hairColor: '#1e1e22', pants: '#22252c', headset: true },
    paramedic: { print: 'medic', top: '#e8743b', sleeve: '#e8743b', hair: 'short', hairColor: '#222', pants: '#2b3448', cap: '#e8743b' },
    guard:     { print: 'guard', top: '#7d8a62', sleeve: '#7d8a62', hair: 'bald', hairColor: '#999', glasses: true, pants: '#4a4a3a', cap: '#3a4a3a', beard: false },
  };
  const p = { ...(presets[kind] || {}) };
  const e = { ...extra };
  // 예전 옵션 → 레고 프린트로 변환
  if (e.topKind) {
    p.print = e.topKind === 'shirt' ? (e.vest ? 'vest' : 'shirtTie') : e.topKind;
    delete e.topKind;
  }
  if (e.top && !e.sleeve) e.sleeve = e.top;
  if (e.vest === null) delete e.vest;
  if (e.hair === 'long' && p.print !== 'school') e.hair = 'long';
  return makeHuman({ ...p, ...e, phase: Math.random() * 6 });
}
