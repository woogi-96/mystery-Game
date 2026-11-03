import { THREE, mat, sph, cyl, capsule, torus, box, rbox, group, heartMesh, canvasTex, clock } from './util.js';

/*
 * 치비 스타일 3D 캐릭터.
 *  - 멍뭉: 갈색 곱슬머리 + 정수리 똥머리(민트 머리끈), 베이지 후드티
 *  - 우기: 긴 웨이브 갈색 머리, 민트 베레모(파란 지그재그 + 노란 단추), 회색 집업 + 노란 하트 지퍼
 *  - 그 외 NPC: 옵션 조합
 */

const SKIN = '#ffe2cc';

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

function buildEyes(head, o) {
  const eyes = { open: [], closed: [], happy: [] };
  const eyeMat = mat(o.eyeColor || '#3a2216');
  const irisMat = mat(o.irisColor || '#9a6230');
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const eg = group(head, [side * 0.2, -0.04, 0.47]);
    eg.rotation.set(0.06, Math.atan2(side * 0.2, 0.47), 0);
    // 뜬 눈
    const open = group(eg);
    const e = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), eyeMat);
    e.scale.set(0.12, 0.155, 0.06);
    e.position.z = 0.02;
    open.add(e);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), irisMat);
    iris.scale.set(0.09, 0.1, 0.04); iris.position.set(0, -0.035, 0.05);
    open.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), eyeMat);
    pupil.scale.set(0.05, 0.06, 0.03); pupil.position.set(0, -0.01, 0.07);
    open.add(pupil);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), white); h1.position.set(-0.03 * side + 0.01, 0.055, 0.085); open.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), white); h2.position.set(0.04, -0.06, 0.085); open.add(h2);
    eyes.open.push(open);
    // 감은 눈 (곡선)
    const closed = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 6, 16, Math.PI), eyeMat);
    closed.rotation.z = Math.PI; closed.position.set(0, 0.02, 0.03); closed.visible = false;
    eg.add(closed); eyes.closed.push(closed);
    // 웃는 눈 (^ ^)
    const happy = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 6, 16, Math.PI), eyeMat);
    happy.position.set(0, -0.04, 0.03); happy.visible = false;
    eg.add(happy); eyes.happy.push(happy);
    // 속눈썹 (여자 캐릭터)
    if (o.lashes) {
      const l = box(0.06, 0.016, 0.02, eyeMat, { pos: [side * 0.1, 0.11, 0.02], rot: [0, 0, side * -0.5], parent: open, cast: false });
      l.userData.lash = true;
    }
    // 눈썹
    box(0.12, 0.022, 0.02, mat(o.hairColor || '#5a3418'), { pos: [side * 0.2, 0.17, 0.5], rot: [-0.25, side * 0.3, side * -0.12], parent: head, cast: false });
  }
  return eyes;
}

function buildFace(head, o) {
  // 볼터치
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9eb5, transparent: true, opacity: 0.55, depthWrite: false });
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), blushMat);
    const p = new THREE.Vector3(side * 0.31, -0.17, 0.41);
    b.position.copy(p);
    b.rotation.set(-Math.asin(p.y / p.length()), Math.atan2(p.x, p.z), 0, 'YXZ');
    b.scale.set(1.25, 0.8, 1);
    head.add(b);
  }
  // 입
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 16, Math.PI), mat('#a8384a'));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.2, 0.505); mouth.rotation.x = -0.2;
  head.add(mouth);
  const mouthO = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat('#b23c55'));
  mouthO.scale.set(1, 1.1, 0.4); mouthO.position.set(0, -0.22, 0.49); mouthO.visible = false;
  head.add(mouthO);
  // 코
  sph(0.022, '#f5c2a8', { pos: [0, -0.1, 0.53], parent: head, cast: false });
  // 귀
  for (const side of [-1, 1]) sph(0.09, SKIN, { pos: [side * 0.53, -0.05, 0], scale: [0.5, 1, 0.8], parent: head });
  return { mouth, mouthO };
}

/* ───── 머리 스타일 ───── */
function hairCurly(head, color) {
  const hm = mat(color, { roughness: 0.9 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.585, 32, 20, 0, Math.PI * 2, 0, 1.75), hm);
  cap.rotation.x = -0.35; cap.position.y = 0.03; cap.castShadow = true;
  head.add(cap);
  const pts = fibSphere(140);
  for (const p of pts) {
    if (p.y < -0.25) continue;
    if (p.z > 0.55 && p.y < 0.42) continue; // 얼굴 비우기
    if (p.z > 0.2 && p.y < -0.05 && Math.abs(p.x) < 0.8) continue;
    const r = 0.11 + Math.random() * 0.06;
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hm);
    c.position.copy(p).multiplyScalar(0.6);
    c.position.y += 0.04;
    c.castShadow = true;
    head.add(c);
  }
  // 앞머리 곱슬
  for (let i = 0; i < 7; i++) {
    const x = -0.36 + i * 0.12;
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.03, 10, 8), hm);
    c.position.set(x, 0.3 - Math.abs(x) * 0.15 + (i % 2) * 0.04, 0.46 - Math.abs(x) * 0.3);
    head.add(c);
  }
  // 옆머리
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    sph(0.11, hm, { pos: [side * 0.52, 0.08 - i * 0.13, 0.12 - i * 0.04], parent: head });
  }
  // 정수리 똥머리 + 민트 머리끈
  const bun = group(head, [0.05, 0.66, -0.1]);
  for (const p of fibSphere(26)) {
    if (p.y < -0.4) continue;
    sph(0.075, hm, { pos: [p.x * 0.17, 0.08 + p.y * 0.15, p.z * 0.17], parent: bun });
  }
  sph(0.16, hm, { pos: [0, 0.07, 0], parent: bun });
  torus(0.12, 0.045, mat('#a7e0cf'), { pos: [0, -0.05, 0], rot: [Math.PI / 2, 0, 0], parent: bun });
}

function hairLongWavy(head, color) {
  const hm = mat(color, { roughness: 0.85 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20, 0, Math.PI * 2, 0, 1.9), hm);
  cap.rotation.x = -0.45; cap.position.y = 0.02; cap.castShadow = true;
  head.add(cap);
  // 앞머리 (뭉툭한 뱅)
  for (let i = 0; i < 9; i++) {
    const x = -0.4 + i * 0.1;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), hm);
    b.scale.set(1, 1.6, 0.7);
    b.position.set(x, 0.22 - Math.abs(x) * 0.25, 0.5 - Math.abs(x) * 0.42);
    b.castShadow = true;
    head.add(b);
  }
  // 웨이브 긴 머리 가닥 (가늘어지는 튜브)
  const strands = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = -2.1 + (i / (N - 1)) * 4.2;
    const front = Math.abs(a) > 1.6;
    const s = group(head, [Math.sin(a) * 0.5, 0.1, -Math.cos(a) * 0.42]);
    const len = front ? 1.05 : 1.35;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const v = k / 8;
      const out = 0.06 + v * 0.12;
      pts.push(new THREE.Vector3(
        Math.sin(a) * out + Math.cos(a) * Math.sin(v * 9 + i) * 0.06,
        -v * len,
        -Math.cos(a) * out + Math.sin(a) * Math.sin(v * 9 + i) * 0.06 + (front ? v * 0.12 : 0)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 40, rad = 10;
    const geo = new THREE.TubeGeometry(curve, segs, 0.14, rad, false);
    const pos = geo.attributes.position;
    const c = new THREE.Vector3(), vtx = new THREE.Vector3();
    for (let r = 0; r <= segs; r++) {
      const v = r / segs;
      curve.getPointAt(v, c);
      const taper = 1 - v * 0.55 + Math.sin(v * 18 + i) * 0.05;
      for (let j = 0; j <= rad; j++) {
        const idx = r * (rad + 1) + j;
        vtx.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(taper).add(c);
        pos.setXYZ(idx, vtx.x, vtx.y, vtx.z);
      }
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, hm);
    m.castShadow = true;
    s.add(m);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.063, 10, 8), hm);
    tip.position.copy(pts[pts.length - 1]);
    s.add(tip);
    strands.push(s);
  }
  return strands;
}

function hairShort(head, color, o = {}) {
  const hm = mat(color, { roughness: 0.85 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20, 0, Math.PI * 2, 0, o.len || 1.7), hm);
  cap.rotation.x = -0.4; cap.position.y = 0.03; cap.castShadow = true;
  head.add(cap);
  for (let i = 0; i < 7; i++) {
    const x = -0.33 + i * 0.11;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hm);
    b.scale.set(1, 1.2, 0.6);
    b.position.set(x, 0.32 - Math.abs(x) * 0.2, 0.47 - Math.abs(x) * 0.35);
    head.add(b);
  }
}
function hairBob(head, color) {
  hairShort(head, color, { len: 2.15 });
}
function hairPony(head, color) {
  hairShort(head, color, { len: 1.9 });
  const hm = mat(color);
  const p = group(head, [0, 0.25, -0.58]);
  for (let k = 0; k < 6; k++) sph(0.13 - k * 0.01, hm, { pos: [0, -k * 0.12, -k * 0.04], parent: p });
  torus(0.07, 0.03, '#ff7a9c', { pos: [0, 0.04, 0], rot: [0.3, 0, 0], parent: p });
}

function beret(head) {
  const tex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#d4f0e2'; g.fillRect(0, 0, w, h);
    // 파란 지그재그 (앞쪽 영역 → u≈0.75)
    g.strokeStyle = '#3f7fe6'; g.lineWidth = 9; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = w * 0.06 + i * 22;
      const y = h * 0.5 + (i % 2 ? -22 : 22) + (i * 3);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.beginPath();
    for (let i = 0; i <= 5; i++) {
      const x = w * 0.16 + i * 16;
      const y = h * 0.25 + (i % 2 ? -14 : 14);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  });
  const bg = group(head, [0.02, 0.48, -0.05], [-0.25, 0, -0.18]);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  b.scale.set(1.05, 0.42, 1.0); b.castShadow = true;
  bg.add(b);
  torus(0.55, 0.06, mat('#c8eada'), { rot: [Math.PI / 2, 0, 0], pos: [0, -0.1, 0], parent: bg });
  // 꼭지
  capsule(0.06, 0.1, mat('#d4f0e2'), { pos: [0.12, 0.28, 0], rot: [0, 0, -0.5], parent: bg });
  // 노란 단추
  const btn = cyl(0.06, 0.06, 0.03, '#ffd34d', { pos: [-0.38, 0.0, 0.48], rot: [1.2, 0, 0.5], parent: bg });
  for (const d of [[-0.015, -0.015], [0.015, 0.015], [-0.015, 0.015], [0.015, -0.015]]) sph(0.01, '#b98a1a', { pos: [d[0], 0.02, d[1]], parent: btn });
}

/* ───── 몸 ───── */
function hoodieBody(torso, o) {
  const pts = [
    [0, 0], [0.4, 0], [0.45, 0.04], [0.46, 0.14], [0.43, 0.4], [0.37, 0.62], [0.27, 0.74], [0.12, 0.79], [0, 0.8],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 32);
  const body = new THREE.Mesh(geo, mat(o.top));
  body.castShadow = true; body.receiveShadow = true;
  body.scale.set(1, 1, 0.85);
  torso.add(body);
  // 밑단 리브
  torus(0.43, 0.04, mat(o.top), { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.85, 1], parent: torso });
  const kind = o.topKind || 'hoodie';
  if (kind === 'hoodie' || kind === 'zip') {
    // 후드
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.1, 10, 24), mat(o.top));
    hood.position.set(0, 0.76, -0.12); hood.rotation.x = Math.PI / 2 - 0.4; hood.castShadow = true;
    torso.add(hood);
    sph(0.24, o.top, { pos: [0, 0.72, -0.34], scale: [1.05, 0.8, 0.6], parent: torso });
  }
  if (kind === 'hoodie') {
    // 끈
    for (const s of [-1, 1]) {
      cyl(0.015, 0.015, 0.3, '#fafafa', { pos: [s * 0.09, 0.6, 0.32], rot: [0.25, 0, 0], parent: torso });
      sph(0.03, '#e9e4dc', { pos: [s * 0.09, 0.45, 0.36], parent: torso });
    }
    // 캥거루 주머니
    const pk = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.39, 0.22, 24, 1, true, -0.7, 1.4), mat(o.top2 || shade2(o.top)));
    pk.position.set(0, 0.2, 0); pk.scale.set(1, 1, 0.9);
    pk.rotation.y = 0;
    torso.add(pk);
  }
  if (kind === 'zip') {
    box(0.02, 0.62, 0.02, '#6f737a', { pos: [0, 0.38, 0.38], rot: [-0.15, 0, 0], parent: torso });
    const hp = heartMesh(0.13, '#ffd23f', 0.15, { pos: [0.02, 0.55, 0.39], parent: torso });
    hp.rotation.z = 0.1;
    // 크로스백 끈
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 40), mat('#2a2a2e'));
    strap.position.set(0, 0.42, 0); strap.rotation.set(Math.PI / 2 - 0.1, 0.75, 0); strap.scale.set(1, 0.85, 1);
    torso.add(strap);
    // 흰 이너
    sph(0.12, '#ffffff', { pos: [0, 0.74, 0.18], scale: [1, 0.5, 0.6], parent: torso });
  }
  if (kind === 'shirt') {
    sph(0.13, '#ffffff', { pos: [0, 0.73, 0.2], scale: [1, 0.55, 0.6], parent: torso });
    if (o.tie) {
      box(0.07, 0.4, 0.03, o.tie, { pos: [0, 0.5, 0.37], rot: [-0.18, 0, 0], parent: torso });
      box(0.09, 0.07, 0.04, o.tie, { pos: [0, 0.71, 0.3], parent: torso });
    }
    if (o.vest) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.55, 24, 1, true, Math.PI * 0.2, Math.PI * 1.6), mat(o.vest, { side: THREE.DoubleSide }));
      v.position.y = 0.32; v.scale.set(1.03, 1, 0.88);
      torso.add(v);
    }
  }
  if (o.lanyard) {
    const l = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24, Math.PI), mat(o.lanyard));
    l.position.set(0, 0.62, 0.22); l.rotation.set(-0.3, 0, Math.PI);
    torso.add(l);
    rbox(0.13, 0.17, 0.02, 0.02, '#ffffff', { pos: [0, 0.42, 0.4], rot: [-0.2, 0, 0], parent: torso });
  }
  return body;
}
function shade2(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.round(v * 0.92));
  return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}

/* ───── 캐릭터 생성 ───── */
export function makeChibi(opts = {}) {
  const o = {
    hair: 'short', hairColor: '#5a3418', top: '#9fb7d9', pants: '#4b5568', shoes: '#ffffff', scale: 1,
    ...opts,
  };
  const root = new THREE.Group();
  root.name = o.name || 'chibi';
  const inner = group(root);
  inner.scale.setScalar(o.scale);

  const torso = group(inner, [0, 0.42, 0]);
  hoodieBody(torso, o);

  // 다리
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = group(inner, [s * 0.17, 0.44, 0]);
    capsule(0.12, 0.2, o.pants, { pos: [0, -0.18, 0], parent: leg });
    rbox(0.2, 0.12, 0.3, 0.05, o.shoes, { pos: [0, -0.38, 0.05], parent: leg });
    legs.push(leg);
  }
  if (o.skirt) {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.25, 24, 1, true), mat(o.skirt, { side: THREE.DoubleSide }));
    sk.position.y = 0.42; inner.add(sk);
  }

  // 팔
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = group(torso, [s * 0.37, 0.64, 0]);
    const sleeve = capsule(0.105, 0.3, o.top, { pos: [0, -0.22, 0], parent: arm });
    torus(0.1, 0.03, o.top, { pos: [0, -0.4, 0], rot: [Math.PI / 2, 0, 0], parent: arm });
    const hand = sph(0.1, SKIN, { pos: [0, -0.47, 0], parent: arm });
    arm.rotation.z = s * 0.25;
    arm.userData.hand = hand;
    arms.push(arm);
  }

  // 머리
  const headPivot = group(torso, [0, 0.8, 0]);
  const head = group(headPivot, [0, 0.5, 0]);
  const skull = sph(0.55, SKIN, { seg: 40, parent: head });
  skull.scale.set(1.04, 0.96, 0.95);
  const eyes = buildEyes(head, o);
  const face = buildFace(head, o);
  let strands = null;
  if (o.hair === 'curly') hairCurly(head, o.hairColor);
  else if (o.hair === 'long') strands = hairLongWavy(head, o.hairColor);
  else if (o.hair === 'bob') hairBob(head, o.hairColor);
  else if (o.hair === 'pony') hairPony(head, o.hairColor);
  else if (o.hair === 'bald') { sph(0.57, o.hairColor, { pos: [0, 0.05, -0.12], scale: [1, 0.7, 0.8], parent: head }); }
  else hairShort(head, o.hairColor);
  if (o.beret) beret(head);
  if (o.glasses) {
    for (const s of [-1, 1]) torus(0.13, 0.014, '#333', { pos: [s * 0.2, -0.04, 0.53], parent: head, cast: false });
    box(0.12, 0.014, 0.014, '#333', { pos: [0, -0.02, 0.55], parent: head, cast: false });
  }
  if (o.cap) {
    const c = group(head, [0, 0.42, 0.02], [-0.15, 0, 0]);
    cyl(0.5, 0.56, 0.25, o.cap, { parent: c });
    box(0.6, 0.04, 0.35, '#222', { pos: [0, -0.1, 0.5], rot: [0.2, 0, 0], parent: c });
    box(0.5, 0.06, 0.02, '#e8c547', { pos: [0, -0.05, 0.56], parent: c });
  }
  if (o.headset) {
    torus(0.6, 0.035, '#222', { rot: [0, 0, 0], arc: Math.PI, pos: [0, 0.05, 0], parent: head });
    for (const s of [-1, 1]) rbox(0.12, 0.22, 0.22, 0.05, '#333', { pos: [s * 0.58, -0.05, 0], parent: head });
    cyl(0.012, 0.012, 0.35, '#222', { pos: [-0.45, -0.2, 0.25], rot: [1.2, 0.4, 0], parent: head });
  }
  if (o.headphones) {
    torus(0.6, 0.04, o.headphones, { arc: Math.PI, pos: [0, 0.05, 0], parent: head });
    for (const s of [-1, 1]) sph(0.17, o.headphones, { pos: [s * 0.58, -0.05, 0], scale: [0.6, 1, 1], parent: head });
  }

  // 소품 (폰)
  const phone = rbox(0.12, 0.22, 0.025, 0.02, '#2b2d36', { parent: arms[1].userData.hand, pos: [0, -0.06, 0.08] });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.19), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
  scr.position.z = 0.014; phone.add(scr);
  phone.visible = false;

  const ch = {
    root, inner, torso, head, headPivot, arms, legs, eyes, face, strands, phone, o,
    pose: 'idle', expr: 'open', blinkT: 2 + Math.random() * 2, walking: 0, talk: 0,
    poseW: {},
    setExpr(e) {
      this.expr = e;
      const show = (arr, v) => arr.forEach(m => (m.visible = v));
      show(eyes.open, e === 'open' || e === 'surprised' || e === 'sad');
      show(eyes.closed, e === 'closed' || e === 'sleepy');
      show(eyes.happy, e === 'happy');
      face.mouthO.visible = e === 'surprised';
      face.mouth.visible = e !== 'surprised';
      face.mouth.rotation.z = e === 'sad' ? 0 : Math.PI;
      face.mouth.position.y = e === 'sad' ? -0.26 : -0.2;
      if (e === 'surprised') eyes.open.forEach(m => m.scale.set(1.1, 1.15, 1));
      else eyes.open.forEach(m => m.scale.set(1, 1, 1));
    },
    setPose(p) { this.pose = p; this.phone.visible = p === 'phone' || p === 'phoneLie' || p === 'phoneLook'; },
    update(dt) { animate(this, dt); },
  };
  ch.setExpr('open');
  return ch;
}

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
  lerpRot(ch.legs[0], [p.ll[0] - swing, p.ll[1], p.ll[2]], k);
  lerpRot(ch.legs[1], [p.rl[0] + swing, p.rl[1], p.rl[2]], k);
  lerpRot(ch.torso, p.tor, k);
  lerpRot(ch.headPivot, p.head, k);

  // 포즈별 추가 모션
  const breath = Math.sin(t * 2.2) * 0.012;
  ch.torso.position.y += (p.ty + breath + Math.abs(Math.sin(t * 9)) * 0.06 * w - ch.torso.position.y) * k;
  ch.torso.scale.y = 1 + breath * 0.8;
  if (ch.pose === 'cheer' || ch.pose === 'panic') {
    ch.arms[0].rotation.z += Math.sin(t * 12) * 0.08;
    ch.arms[1].rotation.z -= Math.sin(t * 12) * 0.08;
  }
  if (ch.pose === 'wave') ch.arms[1].rotation.x = Math.sin(t * 8) * 0.35;
  if (ch.pose === 'type') { ch.arms[0].rotation.x += Math.sin(t * 25) * 0.03; ch.arms[1].rotation.x += Math.cos(t * 23) * 0.03; }
  if (ch.pose === 'angry') ch.headPivot.rotation.y = Math.sin(t * 4) * 0.08;
  if (ch.pose === 'shake') ch.torso.rotation.z = Math.sin(t * 14) * 0.08;
  if (ch.pose === 'cheeks') ch.headPivot.rotation.z = 0.15 + Math.sin(t * 2) * 0.08;

  // 말할 때 입
  if (ch.talk > 0) {
    ch.talk -= dt;
    ch.face.mouth.scale.y = 1 + Math.abs(Math.sin(t * 16)) * 1.4;
  } else ch.face.mouth.scale.y += (1 - ch.face.mouth.scale.y) * k;

  // 깜빡임
  if (ch.expr === 'open') {
    ch.blinkT -= dt;
    const blink = ch.blinkT < 0.12 && ch.blinkT > 0;
    ch.eyes.open.forEach(m => (m.scale.y = blink ? 0.1 : 1));
    if (ch.blinkT < 0) ch.blinkT = 2 + Math.random() * 3;
  }

  // 머리카락 흔들림
  if (ch.strands) ch.strands.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.6 + i) * 0.04; s.rotation.x = Math.sin(t * 1.3 + i * 0.5) * 0.03 + (w ? 0.08 : 0); });
}

/* ───── 주인공들 ───── */
export function makeMungmung() {
  return makeChibi({ name: '멍뭉', hair: 'curly', hairColor: '#8a5230', top: '#f3e6d1', top2: '#e9dabf', pants: '#7e8fae', shoes: '#fbfbfb', topKind: 'hoodie' });
}
export function makeWoogi() {
  return makeChibi({ name: '우기', hair: 'long', hairColor: '#7a4526', top: '#b9bdc6', pants: '#3d4352', shoes: '#ffffff', topKind: 'zip', beret: true, lashes: true, irisColor: '#a76a32', phase: 1.3 });
}

/* NPC 프리셋 */
export function npc(kind, extra = {}) {
  const presets = {
    teacher:   { hair: 'short', hairColor: '#2f2620', top: '#ffffff', topKind: 'shirt', vest: '#7a8f6a', glasses: true, pants: '#555' },
    student1:  { hair: 'pony', hairColor: '#2d1f1a', top: '#ffffff', topKind: 'shirt', tie: '#c0392b', vest: '#2f4f8f', pants: '#2f4f8f' },
    student2:  { hair: 'short', hairColor: '#1f1a17', top: '#ffffff', topKind: 'shirt', tie: '#2f4f8f', vest: '#2f4f8f', pants: '#2a2f45' },
    student3:  { hair: 'bob', hairColor: '#4a2c1c', top: '#ffffff', topKind: 'shirt', tie: '#c0392b', vest: '#2f4f8f', pants: '#2f4f8f' },
    office1:   { hair: 'short', hairColor: '#222', top: '#dfe8f5', topKind: 'shirt', tie: '#3d5a99', pants: '#333a4a', lanyard: '#3b82f6' },
    office2:   { hair: 'bob', hairColor: '#3a2418', top: '#f5d9de', topKind: 'hoodie', pants: '#444', lanyard: '#3b82f6' },
    office3:   { hair: 'pony', hairColor: '#2b1b14', top: '#c9e4d4', topKind: 'zip', pants: '#3a3a44', lanyard: '#3b82f6' },
    office4:   { hair: 'short', hairColor: '#4b3a2a', top: '#a6b4c8', topKind: 'hoodie', pants: '#2c2c34', glasses: true, lanyard: '#3b82f6' },
    driver:    { hair: 'short', hairColor: '#555', top: '#cfe0f0', topKind: 'shirt', tie: '#1d3a6b', pants: '#2b3448', cap: '#1d3a6b' },
    grandma:   { hair: 'bob', hairColor: '#cfcfcf', top: '#b07aa1', topKind: 'zip', pants: '#5a4a5a', glasses: true },
    neighbor:  { hair: 'short', hairColor: '#1e1e22', top: '#3b3f4a', topKind: 'hoodie', pants: '#22252c', headset: true },
    paramedic: { hair: 'short', hairColor: '#222', top: '#e8743b', topKind: 'zip', pants: '#2b3448', cap: '#e8743b' },
  };
  return makeChibi({ ...(presets[kind] || {}), phase: Math.random() * 6, ...extra });
}
