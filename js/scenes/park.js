import { THREE, box, rbox, cyl, sph, cone, plane, torus, group, mat, emissive, texPlane, canvasTex, textSprite, anim, wait, ease, shot, FONT, FONT2, skyDome, tree, rand, setSeed, noise2, capsule } from '../util.js';
import { npc } from '../characters.js';
import { place, talker, walkTo, turnTo, emote, marker, dreamy } from './common.js';

/*
 * 꿈 2 · 공원에서 생긴 일
 *  공원(parkScene) → 있을 수 없는 동굴 → 동굴 내부(caveScene: 세 갈래 길 / 물의 저울 / 네 개의 문)
 */
export function build(env) {
  const { mung, sfx } = env;
  setSeed(42);

  /* ═════════ 공원 ═════════ */
  const park = new THREE.Scene();
  park.background = new THREE.Color('#ffe9d6');
  park.fog = new THREE.Fog('#ffe2e8', 30, 110);
  park.add(skyDome('#8fc2ff', '#ffe3ec', 180));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 64), mat('#9fd486'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; park.add(ground);
  // 구불구불 산책로
  const pathCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(6, 0, 22), new THREE.Vector3(2, 0, 14), new THREE.Vector3(-3, 0, 7),
    new THREE.Vector3(-1, 0, 0), new THREE.Vector3(3, 0, -6), new THREE.Vector3(0, 0, -13),
  ]);
  for (let i = 0; i <= 90; i++) {
    const p = pathCurve.getPointAt(i / 90);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 20), mat('#efd9b4'));
    d.position.set(p.x, 0.03, p.z); d.receiveShadow = true; park.add(d);
  }
  // 나무들
  for (let i = 0; i < 38; i++) {
    const a = rand(0, Math.PI * 2), r = rand(9, 40);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 6 && z > -16 && z < 24) continue;
    if (z > 16 && Math.abs(x) < 14) continue;
    tree(park, x, z, rand(0.9, 1.5), i % 3 ? ['#7fbf6a', '#6aa85a', '#94cf7c'] : ['#ffc4dc', '#ffb0cf', '#ffd6e6']);
  }
  // 벤치
  function bench(x, z, r) {
    const g = group(park, [x, 0, z], [0, r, 0]);
    for (let i = 0; i < 4; i++) box(2.4, 0.08, 0.18, '#c9884e', { pos: [0, 0.75, -0.3 + i * 0.2], parent: g });
    for (let i = 0; i < 3; i++) box(2.4, 0.16, 0.06, '#c9884e', { pos: [0, 1.1 + i * 0.22, -0.42], rot: [-0.15, 0, 0], parent: g });
    for (const s of [-1, 1]) { box(0.08, 0.75, 0.7, '#3a3d44', { pos: [s * 1.0, 0.38, 0], parent: g }); box(0.08, 0.8, 0.08, '#3a3d44', { pos: [s * 1.0, 1.1, -0.42], parent: g }); }
  }
  bench(-5, 10, 0.9); bench(5.5, 2, -1.4); bench(-4.2, -4, 1.2);
  // 가로등
  function lamp(x, z) {
    const g = group(park, [x, 0, z]);
    cyl(0.08, 0.12, 4, '#2e3a4a', { pos: [0, 2, 0], parent: g });
    sph(0.35, emissive('#fff2c4', 0.4), { pos: [0, 4.2, 0], parent: g });
    cone(0.4, 0.3, '#2e3a4a', { pos: [0, 4.6, 0], parent: g });
  }
  lamp(-3.5, 15); lamp(4.5, 8); lamp(-4.5, 1); lamp(5, -8);
  // 연못 + 오리
  const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshStandardMaterial({ color: '#7cc7e8', roughness: 0.1, metalness: 0.2 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(12, 0.04, 8); park.add(pond);
  torus(5, 0.35, '#cfc6b8', { pos: [12, 0.05, 8], rot: [Math.PI / 2, 0, 0], parent: park });
  const ducks = [];
  for (let i = 0; i < 3; i++) {
    const d = group(park, [12, 0.1, 8]);
    sph(0.35, '#fff6e0', { pos: [0, 0.2, 0], scale: [1, 0.7, 1.3], parent: d });
    sph(0.22, '#fff6e0', { pos: [0, 0.55, 0.3], parent: d });
    cone(0.08, 0.2, '#ffa940', { pos: [0, 0.52, 0.55], rot: [Math.PI / 2, 0, 0], parent: d });
    ducks.push(d);
  }
  // 꽃밭
  for (let i = 0; i < 120; i++) {
    const x = rand(-12, 12), z = rand(-10, 22);
    if (Math.abs(x - pathCurve.getPointAt(Math.min(1, Math.max(0, (22 - z) / 35))).x) < 2.6) continue;
    const f = sph(0.12, ['#ff8fb1', '#ffd34d', '#ffffff', '#b49ad8', '#ff7a5c'][i % 5], { pos: [x, 0.25, z], parent: park, cast: false });
    cyl(0.015, 0.015, 0.25, '#4f9a45', { pos: [x, 0.12, z], parent: park, cast: false });
  }
  // 나비
  const butterflies = [];
  for (let i = 0; i < 6; i++) {
    const b = group(park);
    for (const s of [-1, 1]) { const w = plane(0.3, 0.25, mat(['#ffd34d', '#ff8fb1', '#9fd8ff'][i % 3], { side: THREE.DoubleSide }), { pos: [s * 0.15, 0, 0], parent: b }); w.userData.s = s; }
    b.userData.ph = rand(0, 6); b.userData.c = new THREE.Vector3(rand(-8, 8), rand(1.2, 2.5), rand(-6, 16));
    butterflies.push(b);
  }
  // 언덕 + 있을 수 없는 동굴
  const hill = sph(1, '#8cc777', { pos: [0, -2.5, -22], scale: [16, 9, 9], parent: park, seg: 40 });
  const mouthG = group(park, [0, 0, -12.9]);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#07060a' }));
  mouth.scale.set(1, 1.3, 1); mouthG.add(mouth);
  for (let i = 0; i < 16; i++) {
    const a = (i / 15) * Math.PI;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 0.9), 0), mat(['#8e8a94', '#7a7682', '#a29eaa'][i % 3], { flatShading: true }));
    r.position.set(Math.cos(a) * 2.9, Math.sin(a) * 3.4, 0.2); r.rotation.set(rand(0, 3), rand(0, 3), 0);
    r.castShadow = true; mouthG.add(r);
  }
  // 동굴 안쪽 보라빛
  const glowCave = new THREE.PointLight('#b48cff', 6, 8, 2); glowCave.position.set(0, 1.5, -12.0); park.add(glowCave);
  const caveSign = group(park, [4.0, 0, -11.0], [0, -0.3, 0]);
  cyl(0.07, 0.07, 2.2, '#8a6142', { pos: [0, 1.1, 0], parent: caveSign });
  texPlane(2.2, 1.1, 300, 150, (g, w, h) => {
    g.fillStyle = '#fff6d6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6142'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
    g.fillStyle = '#c0392b'; g.font = `34px ${FONT}`; g.textAlign = 'center'; g.fillText('⚠ 공원 관리소', w / 2, 50);
    g.fillStyle = '#5a3d5c'; g.font = `24px ${FONT2}`; g.fillText('이 언덕에는 동굴이', w / 2, 92); g.fillText('없습니다 (어제까지)', w / 2, 124);
  }, { pos: [0, 2.2, 0.08], parent: caveSign });

  // 산책하는 사람들
  const walker1 = place(park, npc('grandma'), [-6, 0, 12], 0.5, 'idle');
  const walker2 = place(park, npc('student3'), [7, 0, 4], -1.5, 'idle');
  // 공원 관리인 아저씨 (동굴에 같이 들어가 단서를 함께 찾는다)
  const ranger = npc('guard', { print: 'zip', top: '#6f8f4f', sleeve: '#6f8f4f', inner: '#f2efe6', cap: '#4a6a3a', hair: 'short', hairColor: '#777', glasses: false, pants: '#5a5040' });

  const hemiP = new THREE.HemisphereLight('#fff6f0', '#9fd486', 1.0); park.add(hemiP);
  const sunP = new THREE.DirectionalLight('#ffe6c4', 2.4);
  sunP.position.set(15, 22, 14); sunP.castShadow = true; sunP.shadow.mapSize.set(2048, 2048);
  Object.assign(sunP.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
  park.add(sunP);
  const spP = dreamy(park, { x: [-12, 12], y: [0.5, 6], z: [-14, 22] }, 0xfff0c0);

  /* ═════════ 동굴 ═════════ */
  const cave = new THREE.Scene();
  cave.background = new THREE.Color('#0d0a16');
  cave.fog = new THREE.FogExp2('#1a1230', 0.028);
  const rockM = mat('#4a4458', { flatShading: true, roughness: 0.95 });
  const rockM2 = mat('#3a3548', { flatShading: true, roughness: 0.95 });
  const flickers = [];

  function chamber(cz, r = 11, h = 8) {
    const geo = new THREE.CylinderGeometry(r, r, h, 48, 10, true);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const a = Math.atan2(v.z, v.x);
      const n = noise2(a * 3 + cz, v.y * 0.6) * 1.2 + noise2(a * 9, v.y * 2) * 0.35;
      v.x *= 1 + n * 0.08; v.z *= 1 + n * 0.08;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#4a4458', roughness: 0.95, side: THREE.BackSide, flatShading: true }));
    wall.position.set(0, h / 2, cz); wall.receiveShadow = true; cave.add(wall);
    // 바닥 (울퉁불퉁)
    const fg = new THREE.CircleGeometry(r + 0.5, 48, 0, Math.PI * 2);
    const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) { v.fromBufferAttribute(fp, i); fp.setZ(i, noise2(v.x * 0.5, v.y * 0.5) * 0.15); }
    fg.computeVertexNormals();
    const fl = new THREE.Mesh(fg, mat('#3d3648', { flatShading: true }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, cz); fl.receiveShadow = true; cave.add(fl);
    // 천장
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(r + 0.5, 48), new THREE.MeshStandardMaterial({ color: '#2e2a3a', side: THREE.DoubleSide, flatShading: true }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, h, cz); cave.add(ceil);
    // 종유석 / 석순
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), rr = rand(2, r - 1);
      const L = rand(0.6, 2.2);
      const s = new THREE.Mesh(new THREE.ConeGeometry(rand(0.15, 0.4), L, 7), rockM2);
      s.position.set(Math.cos(a) * rr, h - L / 2, cz + Math.sin(a) * rr); s.rotation.x = Math.PI; s.castShadow = true; cave.add(s);
    }
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2), rr = rand(r - 4, r - 0.8);
      const L = rand(0.4, 1.6);
      const s = new THREE.Mesh(new THREE.ConeGeometry(rand(0.2, 0.45), L, 7), rockM);
      s.position.set(Math.cos(a) * rr, L / 2, cz + Math.sin(a) * rr); s.castShadow = true; cave.add(s);
    }
    // 바위
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2), rr = rand(r - 3, r - 0.5);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4, 1.1), 0), rockM);
      m.position.set(Math.cos(a) * rr, 0.3, cz + Math.sin(a) * rr); m.rotation.set(rand(0, 3), rand(0, 3), 0); m.castShadow = true; cave.add(m);
    }
  }
  function crystal(x, y, z, color, s = 1) {
    const g = group(cave, [x, y, z]);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 * s, 0), emissive(color, 1.4, { transparent: true, opacity: 0.9 }));
      c.scale.set(0.6, 1.6 + i * 0.3, 0.6); c.position.set((i - 1.5) * 0.25 * s, 0.4 * s, Math.sin(i) * 0.2); c.rotation.z = (i - 1.5) * 0.3;
      g.add(c);
    }
    const l = new THREE.PointLight(color, 3, 6, 2); l.position.set(x, y + 0.8, z); cave.add(l);
    return g;
  }
  function torch(x, y, z) {
    cyl(0.06, 0.08, 0.7, '#5a3b26', { pos: [x, y, z], rot: [0.3, 0, 0], parent: cave });
    const f = cone(0.14, 0.4, emissive('#ffb347', 2.5), { pos: [x, y + 0.5, z + 0.1], parent: cave, cast: false });
    const l = new THREE.PointLight('#ff9a3c', 6, 10, 1.8); l.position.set(x, y + 0.8, z + 0.3); cave.add(l);
    flickers.push({ f, l, base: 6 });
  }
  function mushroom(x, z, s = 1) {
    cyl(0.05 * s, 0.07 * s, 0.3 * s, '#d8d0e0', { pos: [x, 0.15 * s, z], parent: cave });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), emissive('#7cf5d0', 1.0));
    cap.position.set(x, 0.3 * s, z); cave.add(cap);
  }

  /* ── 구역 1: 세 갈래 길 (z=0) ── */
  chamber(0, 10, 7.5);
  const tunnelX = { left: -5.5, mid: 0, right: 5.5 };
  const tunnels = {};
  for (const [k, x] of Object.entries(tunnelX)) {
    const g = group(cave, [x, 0, -8.6]);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 30, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#030205' }));
    hole.scale.set(1, 1.6, 1); g.add(hole);
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI;
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.35, 0.55), 0), rockM);
      r.position.set(Math.cos(a) * 1.9, Math.sin(a) * 2.8, 0.2); g.add(r);
    }
    const lb = textSprite({ left: '왼쪽', mid: '가운데', right: '오른쪽' }[k], { size: 60, scale: 1.0, bg: 'rgba(30,20,50,0.75)', color: '#fff', border: '#b48cff' });
    lb.position.set(0, 3.7, 0.3); g.add(lb);
    tunnels[k] = g;
  }
  // 왼쪽: 박쥐
  const bats = [];
  for (let i = 0; i < 5; i++) {
    const b = group(cave, [-5.5 + rand(-1, 1), 3.4 + rand(-0.3, 0.2), -8.2]);
    sph(0.13, '#16131c', { scale: [1, 1.4, 1], parent: b });
    for (const s of [-1, 1]) cone(0.12, 0.3, '#16131c', { pos: [s * 0.12, 0.05, 0], rot: [0, 0, s * 2.6], parent: b });
    sph(0.025, emissive('#ff5050', 2), { pos: [0.05, -0.12, 0.12], parent: b }); sph(0.025, emissive('#ff5050', 2), { pos: [-0.05, -0.12, 0.12], parent: b });
    bats.push(b);
  }
  // 가운데: 고인 물
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.6, 30), new THREE.MeshStandardMaterial({ color: '#2a4a6a', roughness: 0.05, metalness: 0.6 }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(0, 0.06, -7.6); puddle.scale.set(1, 1.6, 1); cave.add(puddle);
  // 오른쪽: 초록 이끼 + 들어오는 빛
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI), rr = rand(1.8, 2.4);
    const m = sph(rand(0.12, 0.28), emissive('#4fd06a', 0.25 + (a / Math.PI) * 0.3), { pos: [5.5 + Math.cos(a) * rr, Math.sin(a) * rr * 1.4, -8.3], scale: [1, 0.6, 0.4], parent: cave, cast: false });
  }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c4', transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(5.5, 1.6, -9.5); beam.rotation.set(Math.PI / 2 - 0.15, 0, 0); beam.scale.set(0.6, 0.35, 0.6); cave.add(beam);
  const daylight = new THREE.SpotLight('#fff3c8', 25, 16, 0.5, 0.6, 1.5);
  daylight.position.set(5.5, 2.5, -11); daylight.target.position.set(5, 0, -4); cave.add(daylight, daylight.target);
  // 촛불 (왼쪽으로 기우는 불꽃)
  const candleRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), rockM);
  candleRock.position.set(0.5, 0.4, -2.6); candleRock.scale.set(1.2, 0.8, 1); candleRock.castShadow = true; cave.add(candleRock);
  cyl(0.1, 0.1, 0.45, '#fff6e0', { pos: [0.5, 1.15, -2.6], parent: cave });
  const flameG = group(cave, [0.5, 1.4, -2.6]);
  const flame = cone(0.07, 0.3, emissive('#ffcf5a', 3), { pos: [0, 0.15, 0], parent: flameG, cast: false });
  const flameIn = cone(0.035, 0.16, emissive('#ffffff', 3), { pos: [0, 0.1, 0], parent: flameG, cast: false });
  const candleLight = new THREE.PointLight('#ffb050', 4, 7, 2); candleLight.position.set(0.3, 1.7, -2.5); cave.add(candleLight);
  // 무너진 입구 (뒤쪽)
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.2), 0), rockM);
    m.position.set(rand(-3, 3), rand(0, 3.5), rand(8.2, 9.5)); m.rotation.set(rand(0, 3), rand(0, 3), 0); cave.add(m);
  }
  crystal(-7.5, 0, -2, '#b48cff', 1.2); crystal(7.8, 0, 1, '#7cd8ff', 1.1); crystal(-6, 0, 5, '#ff8fd0', 0.9);
  torch(-8.6, 2.6, -4); torch(8.6, 2.6, -4);
  for (let i = 0; i < 9; i++) mushroom(rand(-7, 7), rand(-6, 6), rand(0.8, 1.4));

  /* ── 구역 2: 물의 저울 (z=-30) ── */
  const Z2 = -30;
  chamber(Z2, 9, 7);
  torch(-7.8, 2.6, Z2 - 3); torch(7.8, 2.6, Z2 - 3);
  crystal(-6.5, 0, Z2 + 3, '#7cd8ff', 1.2); crystal(6.5, 0, Z2 + 4, '#b48cff', 1);
  // 샘
  const spring = group(cave, [-3.6, 0, Z2 - 2.5]);
  cyl(1.3, 1.5, 0.7, rockM, { pos: [0, 0.35, 0], parent: spring });
  const springW = cyl(1.15, 1.15, 0.05, emissive('#4fb8e8', 0.5, { roughness: 0.05 }), { pos: [0, 0.68, 0], parent: spring, cast: false });
  const fountain = cyl(0.08, 0.15, 1.0, emissive('#9fe0ff', 0.8, { transparent: true, opacity: 0.7 }), { pos: [0, 1.15, 0], parent: spring, cast: false });
  // 항아리 3L / 5L
  function jar(x, z, s, label, color) {
    const pts = [[0, 0], [0.32, 0], [0.42, 0.15], [0.48, 0.45], [0.42, 0.75], [0.25, 0.92], [0.22, 1.0], [0.28, 1.08], [0, 1.08]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
    const g = group(cave, [x, 0, z]);
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat(color, { roughness: 0.6 }));
    m.castShadow = true; g.add(m);
    const lb = textSprite(label, { size: 64, scale: 0.4, bg: 'rgba(255,250,240,0.92)', border: '#d9825b' });
    lb.position.set(0, 1.25 * s + 0.3, 0); g.add(lb);
    // 안쪽 물
    const w = cyl(0.3 * s, 0.3 * s, 0.02, emissive('#5ec2f0', 0.6), { pos: [0, 0.2 * s, 0], parent: g, cast: false });
    w.visible = false;
    return { g, w };
  }
  const jar3 = jar(-1.0, Z2 - 1.0, 1.1, '3L', '#c98a5a');
  const jar5 = jar(0.6, Z2 - 1.2, 1.5, '5L', '#a86a42');
  // 저울 + 석문
  const scaleG = group(cave, [3.6, 0, Z2 - 3]);
  cyl(0.5, 0.7, 1.0, rockM, { pos: [0, 0.5, 0], parent: scaleG });
  cyl(0.9, 0.9, 0.08, mat('#c9a043', { metalness: 0.7, roughness: 0.3 }), { pos: [0, 1.05, 0], parent: scaleG });
  const drawScaleSign = t => (g, w, h) => { g.fillStyle = '#6a6278'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe08a'; g.font = `80px ${FONT}`; g.textAlign = 'center'; g.fillText(t, w / 2, 95); };
  const scaleSign = texPlane(0.8, 0.5, 200, 120, drawScaleSign('= 4'), { pos: [0, 0.6, 0.62], parent: scaleG });
  const door2 = group(cave, [3.6, 0, Z2 - 7.6]);
  const slab = rbox(3.6, 5, 0.6, 0.1, rockM2, { pos: [0, 2.5, 0], parent: door2 });
  // 석문 표지: 기본 문제는 "4", 다른 판은 "?" (그 판의 문제가 새겨진 문)
  const drawDoorSign = t => (g, w, h) => {
    g.fillStyle = '#3a3548'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9fe0ff'; g.lineWidth = 8; g.beginPath(); g.arc(150, 150, 120, 0, 7); g.stroke();
    g.fillStyle = '#9fe0ff'; g.font = `150px ${FONT}`; g.textAlign = 'center'; g.fillText(t, 150, 205);
  };
  const doorSign = texPlane(2.4, 2.4, 300, 300, drawDoorSign('4'), { glow: 0.8, pos: [0, 2.8, 0.31], parent: door2 });
  // 차오르는 물
  const flood = new THREE.Mesh(new THREE.CircleGeometry(9.5, 40), new THREE.MeshStandardMaterial({ color: '#3a7fb8', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3 }));
  flood.rotation.x = -Math.PI / 2; flood.position.set(0, 0.02, Z2); cave.add(flood);
  const drips = [];
  for (let i = 0; i < 14; i++) {
    const d = sph(0.06, emissive('#9fe0ff', 0.8), { parent: cave, cast: false });
    d.userData = { x: rand(-6, 6), z: Z2 + rand(-6, 6), ph: rand(0, 1) };
    drips.push(d);
  }

  /* ── 구역 3: 네 개의 문 (z=-60) ── */
  const Z3 = -60;
  chamber(Z3, 11, 8);
  torch(-9.5, 2.8, Z3); torch(9.5, 2.8, Z3);
  crystal(-8, 0, Z3 + 5, '#ff8fd0', 1.2); crystal(8, 0, Z3 + 5, '#7cd8ff', 1.2);
  const doorTexts = ['출구는 2번 또는\n3번이다.', '1번 문의 문장은\n거짓이다.', '출구는 4번이\n아니다.', '출구는\n1번이다.'];
  const doors3 = [];
  for (let i = 0; i < 4; i++) {
    const a = -0.75 + i * 0.5;
    const g = group(cave, [Math.sin(a) * 8.5, 0, Z3 - Math.cos(a) * 8.5], [0, -a, 0]);
    rbox(2.8, 4.6, 0.5, 0.1, rockM2, { pos: [0, 2.3, -0.1], parent: g });
    const dp = group(g, [-1.0, 0, 0.2]);
    rbox(2.0, 3.6, 0.25, 0.08, mat('#6b4e3a', { roughness: 0.8 }), { pos: [1.0, 1.8, 0], parent: dp });
    for (let k = 0; k < 3; k++) box(2.05, 0.12, 0.3, '#3a3a40', { pos: [1.0, 0.6 + k * 1.2, 0.05], parent: dp });
    texPlane(1.8, 1.1, 300, 180, (g2, w, h) => {
      g2.fillStyle = '#e8dcc0'; g2.fillRect(0, 0, w, h);
      g2.fillStyle = '#5a3d2a'; g2.font = `30px ${FONT}`; g2.textAlign = 'center';
      g2.fillText(`${i + 1}번 문`, w / 2, 40);
      g2.font = `28px ${FONT2}`;
      doorTexts[i].split('\n').forEach((l, j) => g2.fillText(l, w / 2, 90 + j * 36));
    }, { pos: [0, 3.4, 0.38], parent: g });
    const num = textSprite(`${i + 1}`, { size: 80, scale: 0.5, bg: 'rgba(30,20,50,0.8)', color: '#ffe08a', border: '#ffe08a' });
    num.position.set(0, 5.1, 0.3); g.add(num);
    doors3.push({ g, dp });
  }
  const tablet = texPlane(5, 1.4, 600, 170, (g, w, h) => {
    g.fillStyle = '#2a2438'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffe08a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#ffe08a'; g.font = `44px ${FONT}`; g.textAlign = 'center';
    g.fillText('참인 문장은 오직 하나', w / 2, 75); g.font = `32px ${FONT2}`; g.fillText('진짜 출구도 오직 하나', w / 2, 130);
  }, { glow: 0.6, pos: [0, 6.8, Z3 - 6.5], rot: [0.35, 0, 0], parent: cave });
  const exitLight = new THREE.PointLight('#fffbe8', 0, 20, 1.2);
  exitLight.position.set(Math.sin(0.75) * 8, 2, Z3 - Math.cos(0.75) * 8 - 1); cave.add(exitLight);

  const hemiC = new THREE.HemisphereLight('#a99ad8', '#3a3050', 1.4); cave.add(hemiC);
  const fillC = new THREE.DirectionalLight('#b8a8f0', 0.8); fillC.position.set(0, 10, 10); cave.add(fillC);
  const spC = dreamy(cave, { x: [-9, 9], y: [0.5, 6], z: [-68, 8] }, 0xc8b8ff);
  const mk = marker(cave);

  /* ═════════ 카메라 ═════════ */
  const shots = {
    wide: shot([4, 7, 31], [0, 1.5, 12], 50),
    walk1: shot([-6, 3.5, 4], [-1, 1.3, -3], 50),
    caveFront: shot([3.5, 2.6, -5], [0, 1.8, -12.9], 50),
    caveIn: shot([0, 2.6, -8.5], [0, 1.6, -14], 55),
    c1: shot([0, 3.6, 6.5], [0, 2, -6], 52),
    c2: shot([0, 4.0, Z2 + 7], [0.5, 1.4, Z2 - 3], 52),
    c3: shot([0, 4.0, Z3 + 6], [0, 2.6, Z3 - 6], 55),
  };
  const focus = {
    candle: { ...shot([1.6, 1.8, -0.8], [0.4, 1.4, -2.7], 34), mark: [0.5, 0.05, -2.6], r: 1 },
    midTunnel: { ...shot([0.6, 2.4, -3], [0, 0.6, -8], 42), mark: [0, 0.1, -7.6], r: 1.4 },
    rightTunnel: { ...shot([2.8, 2.4, -3.5], [5.5, 1.8, -8.6], 42) },
    leftTunnel: { ...shot([-3.4, 2.0, -4], [-5.5, 3.2, -8.6], 42) },
    jugs: { ...shot([-0.6, 2.6, Z2 + 3.5], [-0.2, 0.9, Z2 - 1], 42), mark: [-0.2, 0.05, Z2 - 1.1], r: 1.4 },
    spring: { ...shot([-2.0, 2.6, Z2 + 1.5], [-3.6, 0.8, Z2 - 2.5], 42), mark: [-3.6, 0.05, Z2 - 2.5], r: 1.6 },
    scale: { ...shot([2.6, 2.4, Z2 + 1.5], [3.6, 1.4, Z2 - 4], 42), mark: [3.6, 0.05, Z2 - 3], r: 1 },
    ceiling: shot([0, 2.0, Z2 + 3], [0, 6.5, Z2 - 3], 55),
    tablet: shot([0, 3.0, Z3 + 2], [0, 6.6, Z3 - 6.5], 46),
  };
  for (let i = 0; i < 4; i++) {
    const a = -0.75 + i * 0.5;
    const dx = Math.sin(a) * 8.5, dz = Z3 - Math.cos(a) * 8.5;
    focus['door' + (i + 1)] = { ...shot([dx * 0.45, 3.2, dz + (Z3 - dz) * 0.45 + 3.0], [dx, 3.0, dz], 40) };
  }

  const say = talker(env.ui);
  let flooding = 0;
  let flameWild = 0;

  const sc = {
    scene: park, extraScenes: [cave], shots, focus, marker: mk,
    cast: { '관리인 아저씨': ranger },
    actors: [walker1, walker2, ranger],
    startShot: () => shots.wide,
    reset() {
      place(park, ranger, [5.4, 0, -10.4], -1.2, 'idle');
      sc.scene = park;
      place(park, mung, [5.5, 0, 20], -2.6, 'idle');
      flooding = 0; flood.position.y = 0.02;
      jar3.w.visible = jar5.w.visible = false;
      doors3.forEach(d => (d.dp.rotation.y = 0));
      exitLight.intensity = 0;
      door2.position.y = 0;
      doorSign.tex.redraw(drawDoorSign(env.alt ? '?' : '4'));
      scaleSign.tex.redraw(drawScaleSign(env.alt ? '= ?' : '= 4'));
    },
    onEnter() { sc.scene.add(mung.root); },
    update(dt, t) {
      spP.update(t); spC.update(t); mk.update(t);
      ducks.forEach((d, i) => { const a = t * 0.3 + i * 2.1; d.position.set(12 + Math.cos(a) * 3, 0.1, 8 + Math.sin(a) * 3); d.rotation.y = -a; });
      butterflies.forEach(b => {
        const { ph, c } = b.userData;
        b.position.set(c.x + Math.sin(t * 0.7 + ph) * 2, c.y + Math.sin(t * 2 + ph) * 0.4, c.z + Math.cos(t * 0.5 + ph) * 2);
        b.children.forEach(w => (w.rotation.y = w.userData.s * Math.sin(t * 18 + ph) * 1.1));
      });
      // 촛불: 오른쪽 통로에서 불어오는 바람 → 왼쪽으로 눕는다
      flameG.rotation.z = 0.75 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.05 + flameWild;
      flame.scale.y = 1 + Math.sin(t * 20) * 0.1;
      candleLight.intensity = 4 + Math.sin(t * 17) * 0.6;
      flickers.forEach((f, i) => { f.l.intensity = f.base + Math.sin(t * 13 + i) * 1.2 + Math.sin(t * 29 + i) * 0.6; f.f.scale.y = 1 + Math.sin(t * 15 + i) * 0.15; });
      bats.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.5 + i) * 0.12));
      fountain.scale.y = 1 + Math.sin(t * 6) * 0.1;
      if (flooding) flood.position.y = Math.min(0.9, flood.position.y + dt * 0.03 * flooding);
      drips.forEach(d => {
        const p = (t * 0.6 + d.userData.ph) % 1;
        d.position.set(d.userData.x, 6.8 - p * 6.8, d.userData.z);
      });
      beam.material.opacity = 0.05 + Math.sin(t * 0.8) * 0.02;
    },

    async play(env) {
      const { ui } = env;
      // 공원 산책
      env.cameraTo(shots.walk1, 6);
      walker1.walking = 1;
      anim(8, k => { walker1.root.position.z = 12 - k * 6; }, ease.linear).then(() => (walker1.walking = 0));
      const pts = [0.02, 0.15, 0.3, 0.45, 0.6];
      mung.setExpr('happy');
      for (const u of pts) { const p = pathCurve.getPointAt(u); await walkTo(mung, p.x, p.z, 2.6); }
      mung.setExpr('open');
      await say(mung, '멍뭉', '집 가는 길에 공원 산책~ 오후 출근 전까지 시간 좀 있으니까 천천히 걸어야지.');
      const p70 = pathCurve.getPointAt(0.82); await walkTo(mung, p70.x, p70.z, 2.6);
      await env.cameraTo(shots.caveFront, 1.8);
      mung.setExpr('surprised');
      emote(park, mung, '?!', 2);
      await say(mung, '멍뭉', '…어? 저기 언덕에… 동굴?! 매일 지나다니는 길인데, 저런 게 있었나?');
      await say(mung, '멍뭉', '"이 언덕에는 동굴이 없습니다 (어제까지)"… 뭐야 이 안내판…');
      mung.setExpr('open');
      await turnTo(ranger, -2.4, 0.4);
      await say(ranger, '관리인 아저씨', '어이 학생! 자네도 봤나? 아침에 출근해 보니 이 동굴이 생겨 있지 뭔가.');
      await say(mung, '멍뭉', '보랏빛이 새어 나와요… 궁금해서 못 참겠어요. 같이 살짝만 들어가 봐요!');
      await say(ranger, '관리인 아저씨', '허허, 나도 확인은 해야 하니… 조심해서 따라오게.');
      const light = await env.choice('관리인 아저씨', '안이 꽤 어두워 보이는데, 준비는 됐나?', [
        { label: '🔦 휴대폰 손전등을 켠다', sub: '배터리 23%…' },
        { label: '😎 그냥 들어간다', sub: '눈이 금방 적응하겠지!' },
      ]);
      env.state.flags.light = light;
      if (light === 0) {
        await say(mung, '멍뭉', '손전등 켰어요! 발밑 조심하세요, 아저씨.');
        await say(ranger, '관리인 아저씨', '오, 준비성 좋구먼! 요즘 젊은이 답지 않게 든든해.');
      } else {
        await say(mung, '멍뭉', '괜찮아요, 금방 적응될 거예요— 아얏! 돌부리!!');
        await say(ranger, '관리인 아저씨', '허허, 그러게 내가 뭐랬나. 내 랜턴 불빛 따라오게.');
      }
      walkTo(ranger, 0.9, -11.8, 2.2);
      await walkTo(mung, 0, -11.6, 2.2);
      await env.cameraTo(shots.caveIn, 1.4);
      walkTo(ranger, 0.9, -13.6, 2.2);
      walkTo(mung, 0, -13.6, 2.2);
      await wait(0.6);
      // 동굴 내부로
      await ui.fadeTo('#000', 1, 0.8);
      sc.scene = cave;
      place(cave, mung, [0, 0, 5.5], Math.PI, 'idle');
      place(cave, ranger, [1.4, 0, 6.0], Math.PI, 'idle');
      env.cameraSet(shots.c1);
      await ui.fadeTo('#000', 0, 0.8);
      sfx.rumble(); env.shake(0.5);
      mung.setPose('panic'); mung.setExpr('surprised');
      emote(cave, mung, '!!', 1.5);
      await say(mung, '멍뭉', '으악! 입구가… 무너졌어!!');
      ranger.setPose('panic');
      await say(ranger, '관리인 아저씨', '이런! 갇혀 버렸구먼. 침착하게 다른 출구를 찾아보세.');
      ranger.setPose('idle');
      walkTo(ranger, -0.6, 1.6, 2, Math.PI);
      mung.setPose('idle'); mung.setExpr('open');
      await walkTo(mung, -2.6, 2.2, 2, Math.PI - 0.4);
      await say(mung, '멍뭉', env.alt ? '길은 세 갈래인데… 바위에 수수께끼가 새겨져 있어요! 풀어야 길이 열리나 봐요.' : '길은 세 갈래네요. 바위 위에 촛불 하나가 켜져 있어요.');
      if (await env.quiz('cave1') === 'fail') return 'fail';
      mk.hide();
      await env.popQuiz('cave', {
        asker: '관리인 아저씨', title: '돌발 퀴즈 · 동굴 상식',
        lines: [['관리인 아저씨', '가만, 천장 좀 보게. 고드름 같은 돌이 주렁주렁하구먼. 자네, 이거 이름 아나?']],
        question: '석회 동굴 천장에서 고드름처럼 아래로 자라는 돌은?',
        options: ['석순', '석주', '종유석', '현무암'],
        answer: 2, time: 10,
        right: '그렇지! 종유석이여. 바닥에서 위로 자라는 건 석순, 둘이 만나면 석주가 되지.',
        wrong: '정답은 종유석이여. 바닥에서 솟는 건 석순이고, 둘이 붙으면 석주라네.',
      });

      walkTo(ranger, 4.4, -6.2, 2.4);
      await walkTo(mung, 5.5, -6.8, 2.4);
      await say(mung, '멍뭉', env.alt ? '정답을 말하자 오른쪽 통로에서 바람이 불어와요! 이쪽이에요!' : '햇빛 냄새가 나! 이쪽이 맞아!');
      walkTo(mung, 5.5, -10, 2.4);
      await env.cut(async () => {
        place(cave, mung, [0, 0, Z2 + 5], Math.PI, 'idle');
        place(cave, ranger, [1.6, 0, Z2 + 5.6], Math.PI - 0.3, 'idle');
        env.cameraSet(shots.c2);
      });
      flooding = 1; sfx.water();
      await say(mung, '멍뭉', env.alt ? '…또 막혔어요. 석문에 문제가 새겨져 있어요!' : '…또 막혔어요. 석문에 "4"가 새겨져 있어요!');
      if (await env.quiz('cave2') === 'fail') return 'fail';
      mk.hide();

      // 물 붓기 연출 (기본 문제일 때만)
      if (!env.alt) {
        await walkTo(mung, -1.6, Z2 - 0.2, 2.6);
        jar5.w.visible = true;
        const steps = [[1, 0], [0.4, 1], [0.4, 0], [0, 0.67], [1, 0.67], [0.8, 1]];
        for (const [a, b] of steps) {
          sfx.water();
          await anim(0.4, k => { jar5.w.position.y = 0.05 + a * 1.0; jar3.w.visible = b > 0; jar3.w.position.y = 0.05 + b * 0.7; });
        }
      }
      await walkTo(mung, 3.0, Z2 - 1.8, 2.4);
      sfx.door(); env.shake(0.3);
      flooding = 0;
      await anim(1.6, k => (door2.position.y = -5.2 * k));
      await say(mung, '멍뭉', env.alt ? '열렸다! 정답을 맞히니까 석문이 스르륵 내려가요!' : '열렸다! (5L에서 딱 1L만 덜어내는 게 핵심이었어…)');
      walkTo(mung, 3.6, Z2 - 9, 2.4);
      await env.cut(async () => {
        place(cave, mung, [0, 0, Z3 + 6], Math.PI, 'idle');
        place(cave, ranger, [1.6, 0, Z3 + 6.5], Math.PI - 0.3, 'idle');
        env.cameraSet(shots.c3);
      });
      await say(mung, '멍뭉', env.alt ? '마지막 방인가 봐요… 문이 네 개나 있고, 천장에 문제가 새겨져 있어요! 맞히면 진짜 출구가 열리나 봐요.' : '마지막 방인가 봐요… 문이 네 개나 있어요.');
      if (await env.quiz('cave3') === 'fail') return 'fail';
      mk.hide();

      const d4 = doors3[3];
      const wp = new THREE.Vector3(); d4.g.getWorldPosition(wp);
      await walkTo(mung, wp.x * 0.7, Z3 + (wp.z - Z3) * 0.7, 2.4);
      sfx.door();
      anim(1.2, k => (d4.dp.rotation.y = -k * 1.6));
      await anim(1.2, k => (exitLight.intensity = k * 60));
      mung.setPose('cheer'); mung.setExpr('happy');
      await say(mung, '멍뭉', '빛이다!! 탈출 성공~!!');
      ranger.setPose('cheer'); ranger.setExpr('happy');
      await say(ranger, '관리인 아저씨', '자네 덕분에 살았네! 얼른 가 보게, 출근 늦겠어!');
      await say(mung, '멍뭉', '헉, 벌써 1시?! 오후 출근해야 돼요! 안녕히 계세요~');
      walkTo(mung, wp.x * 1.1, Z3 + (wp.z - Z3) * 1.1, 2.4);
      await ui.fadeTo('#fff', 1, 1.0);
      mung.setPose('idle'); mung.setExpr('open');
      sfx.blip();
      await ui.caption('빛 속으로 한 발 내딛자… "띵동♪" 어디선가 엘리베이터 소리가…', 2.4);
      return 'ok';
    },

    debug(state) {
      if (state === 'cave1') { sc.scene = cave; place(cave, mung, [0, 0, 0.5], Math.PI); }
      if (state === 'cave2') { sc.scene = cave; place(cave, mung, [0, 0, Z2 + 5], Math.PI); }
      if (state === 'cave3') { sc.scene = cave; place(cave, mung, [0, 0, Z3 + 6], Math.PI); }
    },
  };
  return sc;
}
