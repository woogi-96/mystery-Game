// 3D 인사 장면: 멍뭉이가 집 문을 열고 나와서 인사해요
import * as THREE from './lib/three.module.js';

const COL = {
  skin: 0xf6d3b6, hair: 0x241d1a, pants: 0x2f2c2c, shoe: 0xfafafa,
  mint: 0x86d8c4, pad: 0xf5d86a, strap: 0xa86d39,
  wall: 0xfff1d6, roof: 0x6fc9b3, door: 0xa8693a, trim: 0x8a5a33,
};

/* ---------- 텍스처 ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function plaidTex() {
  const t = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#efebe3'; g.fillRect(0, 0, w, w);
    const s = w / 4;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(25,24,27,.55)'; g.fillRect(i * s, 0, s * 0.45, w);
      g.fillStyle = 'rgba(25,24,27,.45)'; g.fillRect(0, i * s, w, s * 0.45);
      g.fillStyle = 'rgba(120,115,110,.45)';
      g.fillRect(i * s + s * 0.7, 0, 3, w); g.fillRect(0, i * s + s * 0.7, w, 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

// 구 UV: 정면(+z)이 u=0.25, 적도가 v=0.5, 1라디안 ≈ 163px (1024x512 기준)
function faceTex() {
  return canvasTex(1024, 512, (g) => {
    g.fillStyle = '#f6d3b6'; g.fillRect(0, 0, 1024, 512);
    const cx = 256;
    // 볼터치
    for (const dx of [-70, 70]) {
      const gr = g.createRadialGradient(cx + dx, 306, 2, cx + dx, 306, 30);
      gr.addColorStop(0, 'rgba(245,140,130,.75)'); gr.addColorStop(1, 'rgba(245,140,130,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(cx + dx, 306, 34, 22, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(230,110,110,.7)'; g.lineWidth = 3;
      for (const k of [-10, 0, 10]) { g.beginPath(); g.moveTo(cx + dx + k - 4, 312); g.lineTo(cx + dx + k + 4, 300); g.stroke(); }
    }
    // 눈웃음 ^ ^
    g.strokeStyle = '#231a16'; g.lineWidth = 9; g.lineCap = 'round';
    for (const dx of [-48, 48]) {
      g.beginPath(); g.moveTo(cx + dx - 24, 278); g.quadraticCurveTo(cx + dx, 250, cx + dx + 24, 278); g.stroke();
    }
    // 눈썹
    g.lineWidth = 6; g.strokeStyle = 'rgba(35,26,22,.8)';
    for (const dx of [-48, 48]) { g.beginPath(); g.moveTo(cx + dx - 18, 240); g.quadraticCurveTo(cx + dx, 232, cx + dx + 18, 240); g.stroke(); }
    // 코
    g.fillStyle = '#e8b195'; g.beginPath(); g.ellipse(cx, 294, 6, 4, 0, 0, Math.PI * 2); g.fill();
    // 활짝 웃는 입
    g.fillStyle = '#a5443e';
    g.beginPath(); g.moveTo(cx - 32, 314); g.quadraticCurveTo(cx, 368, cx + 32, 314); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(cx - 28, 316); g.quadraticCurveTo(cx, 326, cx + 28, 316); g.lineTo(cx + 24, 324); g.quadraticCurveTo(cx, 332, cx - 24, 324); g.closePath(); g.fill();
    g.fillStyle = '#f08a8a';
    g.beginPath(); g.ellipse(cx, 346, 14, 7, 0, 0, Math.PI * 2); g.fill();
  });
}

function labelTex(text) {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#fffdf7'; g.strokeStyle = '#8a5a33'; g.lineWidth = 8;
    g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 22); g.fill(); g.stroke();
    g.fillStyle = '#8a5a33'; g.font = 'bold 46px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 3);
  });
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });

/* ---------- 멍뭉 캐릭터 ---------- */
function makeMeongmung() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // 걸을 때 흔들리는 부분
  root.add(body);
  const plaid = mat(0xffffff, { map: plaidTex(), roughness: 0.9 });
  const skin = mat(COL.skin, { roughness: 0.6 });
  const hairM = mat(COL.hair, { roughness: 0.45 });

  // 다리 + 신발
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, 0.42, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.26, 4, 12), mat(COL.pants, { roughness: 0.95 }));
    leg.position.y = -0.2;
    hip.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat(COL.shoe, { roughness: 0.5 }));
    shoe.scale.set(1, 0.6, 1.4); shoe.position.set(0, -0.37, 0.04);
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), mat(0x333333));
    sole.scale.set(1, 1, 1.4); sole.position.set(0, -0.42, 0.04);
    hip.add(shoe, sole);
    body.add(hip);
    legs.push(hip);
  }

  // 몸통 (체크 셔츠)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 6, 20), plaid);
  torso.scale.set(1, 1, 0.82);
  torso.position.y = 0.78;
  body.add(torso);
  // 흰 티 (목 부분)
  const tee = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xfdfbf6));
  tee.position.set(0, 1.02, 0.17); tee.rotation.x = Math.PI / 2.4; tee.scale.set(1.1, 1, 0.5);
  body.add(tee);
  // 셔츠 단추
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x222222));
    b.position.set(0, 0.9 - i * 0.13, 0.25 - i * 0.004);
    body.add(b);
  }
  // 갈색 크로스백 끈
  // 몸통 곡면을 따라 왼쪽 어깨 → 오른쪽 옆구리로 비스듬히
  const strapPts = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const x = -0.3 + k * 0.6, y = 1.08 - k * 0.6;
    const z = Math.sqrt(Math.max(0.001, 1 - (x / 0.31) ** 2)) * 0.25 + 0.012;
    strapPts.push(new THREE.Vector3(x, y, z));
  }
  const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 24, 0.03, 6), mat(COL.strap, { roughness: 0.6 }));
  strap.scale.set(1, 1, 1.02);
  body.add(strap);
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 4), mat(0xd9d9d9, { metalness: 0.6, roughness: 0.3 }));
  buckle.position.set(0.12, 0.66, 0.255); buckle.rotation.z = Math.PI / 4;
  body.add(buckle);

  // 팔 + 곰발바닥 장갑
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.33, 0.98, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 4, 12), plaid);
    arm.position.y = -0.18;
    shoulder.add(arm);
    const paw = new THREE.Group();
    paw.position.y = -0.46;
    paw.scale.setScalar(1.3);
    const pm = mat(COL.mint, { roughness: 1 });
    const pad = mat(COL.pad, { roughness: 0.5 });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), pm);
    palm.scale.set(1, 1.05, 0.8);
    paw.add(palm);
    const big = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), pad);
    big.scale.set(1.2, 0.85, 0.4); big.position.set(0, -0.02, 0.115);
    paw.add(big);
    for (let i = 0; i < 4; i++) {
      const a = -0.75 + i * 0.5;
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), pm);
      toe.position.set(Math.sin(a) * 0.13, -Math.cos(a) * 0.13 - 0.03, 0.03);
      paw.add(toe);
      const tp = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), pad);
      tp.scale.z = 0.5; tp.position.copy(toe.position).add(new THREE.Vector3(0, 0, 0.05));
      paw.add(tp);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 8), pad);
      claw.position.copy(toe.position).multiplyScalar(1.38); claw.position.z = 0.03;
      claw.rotation.z = Math.PI + a; // 발가락 바깥쪽으로
      paw.add(claw);
    }
    shoulder.add(paw);
    body.add(shoulder);
    arms.push({ shoulder, side });
  }

  // 머리
  const head = new THREE.Group();
  head.position.y = 1.42;
  body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), mat(0xffffff, { map: faceTex(), roughness: 0.6 }));
  skull.scale.set(1, 0.96, 0.95);
  head.add(skull);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skin);
    ear.scale.set(0.6, 1, 0.8); ear.position.set(side * 0.41, -0.04, 0);
    head.add(ear);
  }
  // 머리카락: 윗머리 + 뒷머리 + 앞머리 몇 가닥
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.45, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.4), hairM);
  top.scale.set(1.04, 1.02, 1.02);
  head.add(top);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.445, 40, 24, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3, 0, Math.PI * 0.72), hairM);
  head.add(back);
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.225;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), hairM);
    tuft.scale.set(0.7, 1.05 + (i % 2) * 0.2, 0.42);
    const r = 0.43;
    tuft.position.set(Math.sin(a) * r, 0.17 - Math.abs(a) * 0.05, Math.cos(a) * r * 0.95);
    tuft.rotation.set(-0.4, a, (i - 4) * 0.1);
    head.add(tuft);
  }
  const cow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 16, Math.PI * 1.2), hairM);
  cow.position.set(0.02, 0.46, -0.02); cow.rotation.set(0, Math.PI / 2, 0.3);
  head.add(cow);
  // 머리 반짝이
  const shine = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 6, 30, 1.1), mat(0x6a5a52, { roughness: 0.3 }));
  shine.position.set(0, 0.24, 0.2); shine.rotation.set(-0.9, 0, 1.0);
  head.add(shine);

  // 바닥 그림자
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005;
  root.add(shadow);

  root.userData = { body, legs, arms, head, shadow };
  return root;
}

/* ---------- 집과 마당 ---------- */
function makeWorld(scene, phase) {
  const night = phase === 'evening';
  const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), mat(night ? 0x5b8a5e : 0xa9dc8f, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.2), mat(night ? 0xbfa886 : 0xf3e0b8, { roughness: 1 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 3.1);
  scene.add(path);
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 14), mat(night ? 0xd8ccb8 : 0xfff8ea));
    st.position.set((i % 2 ? 0.12 : -0.12), 0.02, 1.6 + i * 0.75);
    scene.add(st);
  }

  const house = new THREE.Group();
  scene.add(house);
  const wall = mat(COL.wall);
  const W = 3, H = 2.2, D = 2.4;
  // 앞벽은 문 구멍이 있도록 조각으로
  const doorW = 0.95, doorH = 1.65;
  const pieces = [
    [(W - doorW) / 2, H, -(W + doorW) / 4, H / 2],
    [(W - doorW) / 2, H, (W + doorW) / 4, H / 2],
    [doorW, H - doorH, 0, doorH + (H - doorH) / 2],
  ];
  for (const [w, h, x, y] of pieces) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), wall);
    p.position.set(x, y, D / 2);
    house.add(p);
  }
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wall); backWall.position.set(0, H / 2, -D / 2); house.add(backWall);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wall); side.position.set(s * W / 2, H / 2, 0); house.add(side);
  }
  // 집 안 (어둡게, 따뜻한 빛)
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H), new THREE.MeshBasicMaterial({ color: 0x6e4a2e }));
  inside.position.set(0, H / 2, -D / 2 + 0.07);
  house.add(inside);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0x9a6a43));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; house.add(floor);
  const lamp = new THREE.PointLight(0xffc27a, 6, 4, 1.5);
  lamp.position.set(0, 1.7, 0);
  house.add(lamp);
  // 지붕
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.5, 4, 1), mat(COL.roof, { roughness: 0.6 }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 1); roof.position.y = H + 0.72;
  house.add(roof);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.1, D + 0.1), mat(COL.trim));
  ceil.position.y = H + 0.02; house.add(ceil);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), mat(0xd77d5f));
  chimney.position.set(0.85, H + 1, -0.3); house.add(chimney);
  // 문틀 + 문 (왼쪽 경첩)
  const frame = mat(COL.trim);
  for (const [w, h, x, y] of [[0.08, doorH, -doorW / 2, doorH / 2], [0.08, doorH, doorW / 2, doorH / 2], [doorW + 0.16, 0.08, 0, doorH]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), frame); f.position.set(x, y, D / 2 + 0.02); house.add(f);
  }
  const hinge = new THREE.Group();
  hinge.position.set(-doorW / 2, 0, D / 2 + 0.04);
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.07), mat(COL.door, { roughness: 0.55 }));
  door.position.set(doorW / 2, doorH / 2, 0);
  hinge.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mat(0xf5d86a, { metalness: 0.5, roughness: 0.3 }));
  knob.position.set(doorW - 0.14, doorH * 0.48, 0.06);
  hinge.add(knob);
  const heart = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), mat(0xff8fab));
  heart.position.set(doorW / 2, doorH * 0.75, 0.04);
  hinge.add(heart);
  house.add(hinge);
  // 창문
  const winMat = new THREE.MeshStandardMaterial({ color: night ? 0xffd88a : 0xcfeeff, emissive: night ? 0xffb347 : 0x000000, emissiveIntensity: night ? 1.2 : 0, roughness: 0.2 });
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), winMat);
    win.position.set(s * 1.0, 1.25, D / 2 + 0.065);
    house.add(win);
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.03), frame); bar1.position.copy(win.position).add(new THREE.Vector3(0, 0, 0.01)); house.add(bar1);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.03), frame); bar2.position.copy(bar1.position); house.add(bar2);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.16), frame); box.position.set(s * 1.0, 0.93, D / 2 + 0.12); house.add(box);
    for (let k = 0; k < 3; k++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat([0xff8fab, 0xf5d86a, 0xffffff][k]));
      fl.position.set(s * 1.0 - 0.2 + k * 0.2, 1.01, D / 2 + 0.13); house.add(fl);
    }
  }
  // 문패
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.28), new THREE.MeshBasicMaterial({ map: labelTex('멍뭉네'), transparent: true }));
  sign.position.set(0, doorH + 0.28, D / 2 + 0.07);
  house.add(sign);

  // 나무와 꽃
  const tree = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 8), mat(0x8a5a33)); trunk.position.y = 0.35; g.add(trunk);
    const leaf = mat(night ? 0x3f7a55 : 0x6fbf7a);
    for (const [y, r] of [[0.95, 0.5], [1.3, 0.4], [1.6, 0.28]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), leaf); b.position.y = y; g.add(b);
    }
    g.position.set(x, 0, z); g.scale.setScalar(s);
    scene.add(g);
  };
  tree(-2.7, -0.4, 1.1); tree(2.8, 0.3, 0.9); tree(-3.8, 2.2, 0.8); tree(3.9, 2.6, 1);
  const flowerCols = [0xff8fab, 0xf5d86a, 0xffffff, 0xb99cff];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
    const x = Math.cos(a) * r, z = Math.abs(Math.sin(a) * r) + 0.8;
    if (Math.abs(x) < 0.9 || z < 1.5) continue;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(flowerCols[i % 4]));
    f.position.set(x, 0.06, z);
    scene.add(f);
  }
  // 울타리
  for (let i = -6; i <= 6; i++) {
    if (Math.abs(i) < 1) continue;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.06), mat(0xfff8ea));
    p.position.set(i * 0.45, 0.22, 5.4);
    scene.add(p);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.06, 0.05), mat(0xfff8ea));
  for (const s of [-1, 1]) { const r = rail.clone(); r.position.set(s * 3.15, 0.3, 5.4); scene.add(r); }

  return { hinge };
}

function skyFor(phase) {
  if (phase === 'morning') return { top: '#9fdcff', bottom: '#fff4d6', sun: 0xfff2d0, amb: 1.0, sunI: 2.2, sunPos: [-4, 6, 5] };
  if (phase === 'noon') return { top: '#6cc6ff', bottom: '#d9f2ff', sun: 0xffffff, amb: 1.1, sunI: 2.6, sunPos: [2, 9, 4] };
  return { top: '#1d2150', bottom: '#f39a7a', sun: 0x9aa8ff, amb: 0.55, sunI: 0.9, sunPos: [4, 6, 3] };
}

function skyTexture(s, phase) {
  return canvasTex(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, s.top); gr.addColorStop(phase === 'evening' ? 0.75 : 1, s.bottom);
    if (phase === 'evening') gr.addColorStop(1, '#ffc58a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

/* ---------- 장면 ---------- */
export function startGreetingScene(container, { phase, onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null; // WebGL 안 되면 2D 그림으로 대체
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = skyFor(phase);
  scene.background = skyTexture(sky, phase);
  scene.fog = new THREE.Fog(new THREE.Color(sky.bottom), 12, 26);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6d6b8, sky.amb));
  const fill = new THREE.DirectionalLight(0xfff3e6, phase === 'evening' ? 0.9 : 1.3);
  fill.position.set(0, 3, 10);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(sky.sun, sky.sunI);
  sun.position.set(...sky.sunPos);
  scene.add(sun);

  // 해 / 달 + 별
  const orb = new THREE.Mesh(new THREE.SphereGeometry(phase === 'evening' ? 0.5 : 0.8, 24, 16),
    new THREE.MeshBasicMaterial({ color: phase === 'evening' ? 0xfff6cf : 0xffe08a, fog: false }));
  orb.position.set(phase === 'morning' ? -6 : 6, phase === 'noon' ? 8 : 6, -10);
  scene.add(orb);
  if (phase === 'evening') {
    const pts = [];
    for (let i = 0; i < 120; i++) pts.push((Math.random() - 0.5) * 40, 5 + Math.random() * 12, -12 - Math.random() * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, fog: false })));
  } else {
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
        p.position.set(k * 0.6, Math.random() * 0.2, 0); cloud.add(p);
      }
      cloud.position.set(-9 + i * 5.5, 6 + Math.random() * 2, -12);
      cloud.userData.speed = 0.15 + Math.random() * 0.15;
      scene.add(cloud);
      (scene.userData.clouds ||= []).push(cloud);
    }
  }

  const { hinge } = makeWorld(scene, phase);
  const mm = makeMeongmung();
  scene.add(mm);
  const { body, legs, arms, head } = mm.userData;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  const camTarget = new THREE.Vector3(0, 1.1, 1.5);

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // 타임라인
  const START_Z = -0.2, END_Z = 2.9;
  const T_DOOR = 0.6, T_WALK = 1.5, T_STOP = 3.6;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = reduce ? 10 : 0;
  let jump = 0;
  let readyFired = false;
  const clock = new THREE.Clock();
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const headPos = new THREE.Vector3();

  function update(dt) {
    t += dt;
    // 문 열기
    hinge.rotation.y = -ease((t - T_DOOR) / 0.8) * 1.75;
    // 걷기
    const walkK = ease((t - T_WALK) / (T_STOP - T_WALK));
    const walking = t > T_WALK && t < T_STOP;
    mm.position.z = START_Z + (END_Z - START_Z) * walkK;
    const ph = t * 9;
    legs[0].rotation.x = walking ? Math.sin(ph) * 0.6 : 0;
    legs[1].rotation.x = walking ? -Math.sin(ph) * 0.6 : 0;
    body.position.y = walking ? Math.abs(Math.sin(ph)) * 0.06 : 0;

    // 팔: 걸을 땐 흔들고, 멈추면 곰발바닥을 번쩍 들고 흔들며 인사
    const greet = ease((t - T_STOP) / 0.45);
    for (const { shoulder, side } of arms) {
      const swing = walking ? Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 0.5 : 0;
      const wave = Math.sin(t * 6 + (side > 0 ? 0.6 : 0)) * 0.22 * greet;
      shoulder.rotation.x = swing * (1 - greet) - greet * 0.25;
      shoulder.rotation.z = side * (0.12 + greet * 2.45 + wave);
    }
    // 머리: 인사할 때 갸웃, 숨쉬기
    const idle = Math.sin(t * 2.2);
    head.rotation.z = greet * Math.sin(t * 1.6) * 0.12;
    head.rotation.x = walking ? 0.05 : -0.05 * greet;
    body.scale.y = 1 + (t > T_STOP ? idle * 0.012 : 0);

    // 톡 누르면 점프
    if (jump > 0) {
      jump = Math.max(0, jump - dt);
      const k = 1 - jump / 0.55;
      body.position.y += Math.sin(k * Math.PI) * 0.45;
      mm.rotation.y = k * Math.PI * 2;
    } else mm.rotation.y = 0;

    // 카메라
    const camK = ease(t / 3.8);
    const sway = Math.sin(t * 0.35) * 0.6 * ease((t - T_STOP) / 2);
    camera.position.set(sway + (1 - camK) * 1.2, 1.6 + (1 - camK) * 0.9, 9.4 - camK * 1.6);
    camTarget.set(0, 1.05 - camK * 0.05, 1.3 + camK * 0.9);
    camera.lookAt(camTarget);

    for (const c of scene.userData.clouds || []) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 12) c.position.x = -12;
    }

    if (!readyFired && t > T_STOP + 0.3) {
      readyFired = true;
      onReady?.();
    }
  }

  // 말풍선 위치 (머리 위 화면 좌표)
  function bubblePos() {
    head.getWorldPosition(headPos);
    headPos.y += 0.62;
    headPos.project(camera);
    return { x: (headPos.x * 0.5 + 0.5) * 100, y: (-headPos.y * 0.5 + 0.5) * 100 };
  }

  const api = {};
  let raf = 0;
  let visible = true;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    update(Math.min(clock.getDelta(), 0.1));
    renderer.render(scene, camera);
    api.onFrame?.(bubblePos());
  }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; clock.getDelta(); });
  io.observe(container);
  loop();

  renderer.domElement.addEventListener('pointerdown', () => { if (t > T_STOP && jump === 0) { jump = 0.55; api.onTap?.(); } });

  Object.assign(api, {
    replay() { t = 0; readyFired = false; },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  });
  return api;
}
