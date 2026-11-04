import { THREE, box, rbox, cyl, sph, cone, torus, plane, group, mat, emissive, textSprite, texPlane, skyDome, tree, sparkles, shot, FONT, FONT2, roundRect, capsule } from './util.js';

/*
 * 2·3번째 꿈: 문제마다 새로 만든 3D 장소.
 * 퀴즈가 시작되면 이 장소로 넘어가 인물들이 그 안에서 대화하고 문제를 푼다.
 * 각 장소: { scene, shots: { main, prop }, spots(n), update(t) }
 */

/* ── 공용 재료 ── */
function world(o) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.bg);
  scene.fog = new THREE.Fog(o.fog || o.bg, o.fogNear || 25, o.fogFar || 80);
  if (o.sky) scene.add(skyDome(o.sky[0], o.sky[1], 120));
  const hemi = new THREE.HemisphereLight(o.hemi || '#ffffff', o.ground || '#888888', o.hemiI ?? 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sun || '#ffffff', o.sunI ?? 2.0);
  sun.position.set(...(o.sunPos || [8, 16, 10]));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  // 인물 얼굴이 어둡지 않게 카메라 쪽에서 비추는 보조광
  const fill = new THREE.DirectionalLight(o.fillC || '#fff4ec', o.fillI ?? 0.7);
  fill.position.set(0, 5, 14); scene.add(fill);
  if (o.floor) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(o.floorR || 45, 48), typeof o.floor === 'string' ? mat(o.floor) : o.floor);
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  }
  return { scene, hemi, sun };
}
const glass = (c = '#dff4ff', op = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: op, roughness: 0.05, depthWrite: false });
function sign(parent, text, pos, o = {}) { const s = textSprite(text, { size: 72, scale: o.scale || 0.9, ...o }); s.position.set(...pos); parent.add(s); return s; }
function puffs(parent, origin, n, color, rise = 4, spread = 0.8, size = 0.6) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(sph(size, mat(color, { transparent: true, opacity: 0.6, depthWrite: false }), { parent, cast: false }));
  return t => arr.forEach((m, i) => {
    const k = (t * 0.18 + i / n) % 1;
    m.position.set(origin[0] + Math.sin(k * 5 + i) * spread, origin[1] + k * rise, origin[2] + Math.cos(k * 3 + i) * spread * 0.5);
    m.scale.setScalar(0.5 + k * 1.6);
    m.material.opacity = 0.65 * (1 - k);
  });
}
function caveRoom(o = {}) {
  const w = world({ bg: '#1b1528', fog: '#1b1528', fogNear: 12, fogFar: 40, hemi: '#a89ad8', ground: '#2a2238', hemiI: 0.8, sun: '#ffd9b0', sunI: 0.8, sunPos: [3, 14, 8], floor: '#3a3348', fillC: '#ffe2c8', fillI: 1.3 });
  const { scene } = w;
  const rockM = mat('#4a4258', { flatShading: true, roughness: 1 });
  // 둥근 동굴 벽과 천장 바위
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 0.05 + (i / 25) * Math.PI * 0.9;
    const r = 13 + Math.sin(i * 3.1) * 1.2;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6 + (i % 3), 0), rockM);
    m.position.set(Math.cos(a) * r, 1.5 + (i % 4) * 1.2, -Math.sin(a) * r + 2);
    m.rotation.set(i, i * 2, i * 3);
    scene.add(m);
  }
  for (let i = 0; i < 14; i++) cone(0.4 + (i % 3) * 0.2, 1.6 + (i % 4) * 0.6, rockM, { pos: [-9 + i * 1.4, 9 - (i % 3) * 0.5, -6 + (i % 5) * 1.5], rot: [Math.PI, 0, 0], parent: scene });
  // 횃불
  for (const [x, z] of o.torches || [[-6, -4], [6, -4]]) {
    cyl(0.08, 0.1, 2.2, '#5a4030', { pos: [x, 1.1, z], parent: scene });
    const fl = cone(0.22, 0.6, emissive('#ffb347', 2.5), { pos: [x, 2.5, z], parent: scene, cast: false });
    const L = new THREE.PointLight('#ffb070', 18, 14, 1.6); L.position.set(x, 2.8, z); scene.add(L);
    fl.userData.flicker = true;
  }
  scene.add(sparkles(120, { x: [-10, 10], y: [0.5, 8], z: [-10, 6] }, 0xd8b8ff, 0.12));
  return { ...w, rockM };
}
const SPOTS = [[-2.2, 1.0], [1.8, 0.6], [3.6, 1.6], [-4.0, 0.2], [0.0, 2.0], [5.2, 0.4]];

/* ── 장소 16곳 ── */
const STAGES = {
  // 강가의 공장: 공장 폐수가 흘러드는 강, 죽은 물고기, 근심하는 어부의 배
  school1_1() {
    const w = world({ bg: '#cfe7ff', sky: ['#8fc4ff', '#e8f4ff'], hemi: '#ffffff', ground: '#7cbf6a', floor: '#8fcf86' });
    const s = w.scene;
    const river = plane(60, 7, emissive('#4f86c6', 0.15, { roughness: 0.1 }), { pos: [0, 0.03, -4], rot: [-Math.PI / 2, 0, 0], parent: s });
    const sludge = plane(6, 7.2, mat('#4a3a24', { transparent: true, opacity: 0.85 }), { pos: [-4, 0.05, -4], rot: [-Math.PI / 2, 0, 0], parent: s });
    const f = group(s, [-6, 0, -12]);
    box(10, 6, 6, '#8d8f99', { pos: [0, 3, 0], parent: f });
    box(10.4, 0.5, 6.4, '#6c6e78', { pos: [0, 6.2, 0], parent: f });
    for (let i = 0; i < 4; i++) box(1.4, 1.2, 0.1, emissive('#ffe7a0', 0.4), { pos: [-3.6 + i * 2.4, 3.4, 3.05], parent: f });
    for (const x of [-2.5, 2.5]) cyl(0.6, 0.8, 7, '#6c6e78', { pos: [x, 9.5, -1], parent: f });
    cyl(0.5, 0.5, 6, '#5a4a3a', { pos: [2, 1.2, 4.5], rot: [Math.PI / 2, 0, 0], parent: f });
    sign(f, '🏭 ○○화학', [0, 7.5, 3.3], { scale: 1.1 });
    const fish = [];
    for (let i = 0; i < 9; i++) {
      const g = group(s, [-1 + i * 1.3, 0.12, -2.5 - (i % 3) * 1.6], [Math.PI, i, 0]);
      sph(0.25, '#ff9a5a', { scale: [1.7, 0.6, 0.8], parent: g });
      cone(0.15, 0.3, '#ff9a5a', { pos: [-0.5, 0, 0], rot: [0, 0, Math.PI / 2], parent: g });
      fish.push(g);
    }
    const boat = group(s, [7, 0.1, -4.5], [0, -0.6, 0]);
    rbox(3.2, 0.6, 1.4, 0.2, '#a8754a', { pos: [0, 0.2, 0], parent: boat });
    cyl(0.04, 0.04, 3, '#5a4030', { pos: [1, 1.6, 0], rot: [0, 0, -0.6], parent: boat });
    sign(boat, '😢 물고기가 다 죽었어…', [0, 2.6, 0], { scale: 0.7 });
    for (let i = 0; i < 6; i++) tree(s, 12 + (i % 2) * 3, -2 + i * 3, 1.2, ['#7cc46a', '#5aa84f']);
    const sm1 = puffs(s, [-8.5, 13, -13], 6, '#7a7a86', 6, 1.2, 0.9);
    const sm2 = puffs(s, [-3.5, 13, -13], 6, '#8a8a96', 6, 1.2, 0.9);
    return { ...w, shots: { main: shot([1, 3.6, 10], [0, 2.2, -3], 50), prop: shot([4, 4.5, 4], [-4, 2.5, -8], 52) },
      update(t) { sm1(t); sm2(t); boat.rotation.z = Math.sin(t * 1.2) * 0.04; fish.forEach((g, i) => (g.position.y = 0.12 + Math.sin(t * 2 + i) * 0.03)); } };
  },
  // 뜨거운 도시: 빽빽한 빌딩과 아스팔트, 쉬지 않는 실외기, 38도 전광판
  school1_2() {
    const w = world({ bg: '#ffd9b0', fog: '#ffcf9a', sky: ['#ffb37a', '#ffe7c8'], hemi: '#fff0dc', ground: '#555', sun: '#ffd0a0', sunI: 2.6, floor: '#4a4a52' });
    const s = w.scene;
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const h = 7 + (k * 37 % 9);
      const x = side * (6 + (k % 2) * 2.5), z = 2 - k * 4;
      box(4, h, 3.4, ['#b8bcc8', '#9aa0b0', '#c8b8a8', '#a8b0c0'][i % 4], { pos: [x, h / 2, z], parent: s });
      for (let j = 0; j < 3; j++) box(0.7, 0.5, 0.6, '#e6e6e6', { pos: [x - side * 2.2, 1.5 + j * 2.2, z + 0.6], parent: s });
    }
    for (let z = 2; z > -30; z -= 4) box(0.25, 0.02, 1.6, '#ffffff', { pos: [0, 0.02, z], parent: s });
    const sun = sph(3, emissive('#ff6a3a', 1.6, { fog: false }), { pos: [0, 22, -40], parent: s, cast: false });
    const board = group(s, [3.2, 0, -3]);
    cyl(0.12, 0.12, 4, '#666', { pos: [0, 2, 0], parent: board });
    const tt = sign(board, '🌡️ 지금 기온 38℃ (근교 35℃)', [0, 4.4, 0], { scale: 0.8, bg: '#2a2a30', color: '#ff7a5a', border: '#ff7a5a' });
    tree(s, -3.6, -1.5, 0.9, ['#7cc46a']);
    const haze = [];
    for (let i = 0; i < 8; i++) haze.push(torus(1.2 + i * 0.3, 0.02, emissive('#ffffff', 0.25, { transparent: true, opacity: 0.25 }), { pos: [0, 0.3, -2 - i * 2], rot: [Math.PI / 2, 0, 0], parent: s, cast: false }));
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.4, -3], 52), prop: shot([-1.5, 2.6, 4], [4, 5, -14], 58) },
      update(t) { sun.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04); haze.forEach((h, i) => { h.position.y = 0.3 + ((t * 0.6 + i * 0.3) % 2.5); h.material.opacity = 0.25 * (1 - h.position.y / 2.8); }); } };
  },
  // 차 없는 날: 텅 빈 대로, 바람과 비, 걷히는 미세먼지
  school2_1() {
    const w = world({ bg: '#c8ccd8', fog: '#b8bcc8', fogNear: 15, fogFar: 60, sky: ['#9aa0b0', '#dfe3ea'], hemi: '#e8ecf4', ground: '#555', sunI: 1.2, floor: '#5a5a62' });
    const s = w.scene;
    box(12, 0.02, 80, '#3e3e46', { pos: [0, 0.01, -20], parent: s });
    for (let z = 4; z > -40; z -= 5) box(0.3, 0.03, 2, '#ffffff', { pos: [0, 0.03, z], parent: s });
    for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1; const h = 8 + (i * 13 % 7); box(5, h, 4, ['#a8acb8', '#b8b0a8'][i % 2], { pos: [side * 10, h / 2, -2 - Math.floor(i / 2) * 6], parent: s }); }
    const ban = group(s, [0, 0, -6]);
    for (const x of [-5.5, 5.5]) cyl(0.12, 0.12, 5, '#888', { pos: [x, 2.5, 0], parent: ban });
    texPlane(11, 1.4, 1100, 140, (g, w2, h) => { g.fillStyle = '#2e9a5a'; g.fillRect(0, 0, w2, h); g.fillStyle = '#fff'; g.font = `90px ${FONT}`; g.textAlign = 'center'; g.fillText('🚫🚗 오늘은 차 없는 날', w2 / 2, 105); }, { pos: [0, 4.4, 0], parent: ban });
    const parked = group(s, [-4.2, 0, -1]);
    rbox(4, 1.3, 1.9, 0.3, '#ff8fb1', { pos: [0, 0.9, 0], parent: parked });
    rbox(2.2, 0.9, 1.7, 0.3, '#dfefff', { pos: [-0.2, 1.9, 0], parent: parked });
    for (const [x, z] of [[-1.3, 0.95], [1.3, 0.95], [-1.3, -0.95], [1.3, -0.95]]) cyl(0.45, 0.45, 0.3, '#222', { pos: [x, 0.45, z], rot: [Math.PI / 2, 0, 0], parent: parked });
    const cloud = group(s, [2, 9, -6]);
    [[0, 0, 0, 2.2], [2.4, 0.3, 0, 1.8], [-2.4, 0.2, 0, 1.7], [1, 1.2, 0, 1.6]].forEach(([x, y, z, r]) => sph(r, '#9aa0b0', { pos: [x, y, z], parent: cloud }));
    const drops = [];
    for (let i = 0; i < 60; i++) drops.push(cyl(0.02, 0.02, 0.5, emissive('#9fd0ff', 0.6), { parent: s, cast: false }));
    const smog = [];
    for (let i = 0; i < 10; i++) smog.push(sph(1.4, mat('#a8a090', { transparent: true, opacity: 0.35, depthWrite: false }), { pos: [-8 + i * 1.8, 2.5, -8], parent: s, cast: false }));
    sign(s, '💨 강풍 + 🌧️ 비', [6, 5.5, -4], { scale: 0.8 });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.4, -3], 52), prop: shot([0, 3, 4], [0, 4, -8], 56) },
      update(t) {
        drops.forEach((d, i) => { const k = (t * 1.2 + i / 60) % 1; d.position.set(-2 + (i % 12) * 0.7, 8 - k * 8, -8 + Math.floor(i / 12) * 0.8); });
        smog.forEach((m, i) => { m.position.x = -8 + i * 1.8 + ((t * 0.8) % 6); m.material.opacity = 0.2 + Math.sin(t + i) * 0.08; });
      } };
  },
  // 먼 길 온 딸기: 화물 비행기에서 내리는 딸기 상자 vs 바로 옆 동네 딸기밭
  school2_2() {
    const w = world({ bg: '#dff0ff', sky: ['#8fc4ff', '#f4fbff'], ground: '#7cbf6a', floor: '#9ad07a' });
    const s = w.scene;
    box(14, 0.03, 9, '#8a8a92', { pos: [-7, 0.02, -8], parent: s });
    const pl = group(s, [-8, 0, -10], [0, 0.4, 0]);
    capsule(1.6, 9, '#f4f6fa', { pos: [0, 2.8, 0], rot: [Math.PI / 2, 0, 0], parent: pl });
    box(14, 0.3, 2.4, '#e0e6f0', { pos: [0, 2.8, 0.5], parent: pl });
    box(4.5, 0.25, 1.4, '#e0e6f0', { pos: [0, 3.2, -5.5], parent: pl });
    box(0.25, 2.6, 1.6, '#4f86c6', { pos: [0, 4.6, -5.6], parent: pl });
    for (const x of [-3.5, 3.5]) cyl(0.6, 0.6, 1.6, '#c9ccd2', { pos: [x, 2.3, 1.2], rot: [Math.PI / 2, 0, 0], parent: pl });
    for (let i = 0; i < 5; i++) { const c = group(s, [-3 + (i % 3) * 1.4, 0, -4 - Math.floor(i / 3) * 1.4]); box(1.2, 0.8, 1, '#c99a6a', { pos: [0, 0.4 + (i > 2 ? 0.8 : 0), 0], parent: c }); }
    sign(s, '✈️ 칠레산 딸기 · 13,000km', [-3, 2.8, -4.5], { scale: 0.8 });
    const farm = group(s, [7, 0, -6]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
      const p = group(farm, [-3 + c * 1.2, 0, -2 + r * 1.4]);
      sph(0.35, '#3a9a45', { pos: [0, 0.3, 0], scale: [1, 0.6, 1], parent: p });
      cone(0.12, 0.25, '#ff3a5a', { pos: [0.2, 0.25, 0.2], rot: [Math.PI, 0, 0], parent: p });
    }
    sign(farm, '🚜 우리 동네 딸기 · 5km', [0, 2.6, 0], { scale: 0.8 });
    const jet = group(s, [0, 12, -30]);
    capsule(0.5, 3, '#ffffff', { rot: [0, 0, Math.PI / 2], parent: jet });
    box(0.6, 0.1, 4, '#dfe6ff', { parent: jet });
    return { ...w, shots: { main: shot([0.5, 3.6, 10], [0, 2.4, -3], 52), prop: shot([0, 4.5, 5], [0, 2, -8], 58) },
      update(t) { jet.position.set(Math.sin(t * 0.2) * 25, 12 + Math.sin(t * 0.5), -30); jet.rotation.y = Math.cos(t * 0.2) > 0 ? 0 : Math.PI; } };
  },
  // 넌센스 ①: 왕궁 알현실, 바나나 껍질에 미끄러져 쓰러진 왕 동상
  school3_1() {
    const w = world({ bg: '#3a1e2a', fog: '#3a1e2a', fogNear: 20, fogFar: 50, hemi: '#ffd9c0', ground: '#5a2a2a', hemiI: 0.9, sun: '#ffe0c0', sunI: 1.4, floor: '#7a2e3a' });
    const s = w.scene;
    box(3, 0.02, 30, '#c0392b', { pos: [0, 0.02, -8], parent: s });
    for (let i = 0; i < 6; i++) for (const x of [-6, 6]) { cyl(0.5, 0.6, 9, '#e8d8c0', { pos: [x, 4.5, 2 - i * 4], parent: s }); }
    const throne = group(s, [0, 0, -12]);
    box(3, 0.6, 2, '#a8754a', { pos: [0, 0.3, 0], parent: throne });
    box(2.6, 4, 0.4, emissive('#c0392b', 0.2), { pos: [0, 2.6, -0.8], parent: throne });
    sph(0.4, emissive('#ffd34d', 0.6), { pos: [0, 4.8, -0.8], parent: throne });
    const king = group(s, [1.2, 0.6, -6], [0, 0.5, Math.PI / 2.2]);
    cone(1.1, 2.4, '#c0392b', { pos: [0, 1.2, 0], parent: king });
    sph(0.6, '#ffe0c8', { pos: [0, 2.8, 0], parent: king });
    const crown = group(s, [-0.6, 0.35, -5.2]);
    cyl(0.45, 0.45, 0.35, emissive('#ffd34d', 0.5), { parent: crown });
    for (let i = 0; i < 6; i++) cone(0.1, 0.35, emissive('#ffd34d', 0.5), { pos: [Math.cos(i) * 0.4, 0.3, Math.sin(i) * 0.4], parent: crown });
    torus(0.45, 0.12, '#ffd34d', { pos: [2.8, 0.15, -4.2], rot: [Math.PI / 2, 0, 0], parent: s, arc: Math.PI });
    sign(s, '💫 쿵!', [1.6, 3.2, -6], { scale: 0.9 });
    const L = new THREE.PointLight('#ffd9a0', 30, 20, 1.5); L.position.set(0, 7, -8); s.add(L);
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.2, -3], 52), prop: shot([3, 3, -0.5], [0, 1, -6], 50) }, update(t) { crown.rotation.y = t * 0.6; } };
  },
  // 넌센스 ②: 꽁꽁 언 연못, 얼음 속 오리
  school3_2() {
    const w = world({ bg: '#e8f2ff', fog: '#e8f2ff', sky: ['#bcd8ff', '#ffffff'], hemi: '#ffffff', ground: '#dfe8f0', floor: '#f4f8fc' });
    const s = w.scene;
    cyl(7, 7, 0.1, glass('#bfe6ff', 0.7), { pos: [0, 0.05, -6], parent: s, seg: 48 });
    const duck = group(s, [0, 0.9, -5]);
    sph(0.8, '#ffd34d', { scale: [1.25, 0.9, 1], parent: duck });
    sph(0.5, '#ffd34d', { pos: [0.75, 0.75, 0], parent: duck });
    cone(0.2, 0.45, '#ff8a2a', { pos: [1.3, 0.7, 0], rot: [0, 0, -Math.PI / 2], parent: duck });
    sph(0.08, '#222', { pos: [1.0, 0.95, 0.3], parent: duck });
    box(3.4, 2.6, 2.6, glass('#cfefff', 0.4), { pos: [0.2, 1.3, -5], parent: s, cast: false });
    for (let i = 0; i < 8; i++) { const x = (i % 2 ? 1 : -1) * (9 + (i % 3) * 2), z = -12 + i * 2; cone(1.4, 4, '#3a7a5a', { pos: [x, 2, z], parent: s }); cone(1.2, 1.2, '#ffffff', { pos: [x, 3.6, z], parent: s }); }
    for (let i = 0; i < 6; i++) sph(1.2, '#ffffff', { pos: [-8 + i * 3.2, 0.2, 4], scale: [1.4, 0.4, 1], parent: s });
    const snow = sparkles(300, { x: [-15, 15], y: [0, 12], z: [-15, 8] }, 0xffffff, 0.18);
    s.add(snow);
    sign(s, '🥶 꽁꽁…', [2.4, 3.2, -5], { scale: 0.9 });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2, -3], 52), prop: shot([3.5, 2.6, 0], [0, 1.2, -5], 48) }, update(t) { snow.update(t); } };
  },

  // 동굴 ①: 스위치 세 개가 박힌 벽, 닫힌 문 너머 전구 방
  cave1_1() {
    const w = caveRoom();
    const s = w.scene;
    const wall = group(s, [-3, 0, -6]);
    box(7, 6, 1, w.rockM, { pos: [0, 3, 0], parent: wall });
    const levers = [0, 1, 2].map(i => {
      const x = -2 + i * 2;
      box(1, 1.6, 0.3, '#2a2433', { pos: [x, 2.8, 0.6], parent: wall });
      const lv = group(wall, [x, 2.8, 0.8]);
      box(0.18, 0.9, 0.18, '#c9a043', { pos: [0, 0.4, 0], parent: lv });
      sph(0.18, '#e03030', { pos: [0, 0.85, 0], parent: lv });
      sign(wall, String(i + 1), [x, 4.3, 0.8], { scale: 0.6 });
      return lv;
    });
    const room = group(s, [5, 0, -7]);
    box(5, 5, 5, w.rockM, { pos: [0, 2.5, 0], parent: room });
    box(2, 3.4, 0.2, '#6a4a30', { pos: [-0.5, 1.7, 2.55], parent: room });
    sph(0.12, '#c9a043', { pos: [0.2, 1.7, 2.7], parent: room });
    const bulb = sph(0.45, emissive('#ffe08a', 1.5), { pos: [0, 5.6, 0], parent: room, cast: false });
    sign(room, '💡 안쪽 방 · 딱 한 번만 들어갈 수 있다', [0, 6.8, 0], { scale: 0.7 });
    return { ...w, shots: { main: shot([0.5, 3.4, 9], [0.5, 2.6, -4], 52), prop: shot([0.5, 3.2, 1.5], [1, 3, -7], 55) },
      update(t) { levers.forEach((l, i) => (l.rotation.x = Math.sin(t * 1.5 + i) * 0.35)); bulb.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.7; } };
  },
  // 동굴 ②: 지하 강 나루터, 늑대·염소·양배추와 작은 배
  cave1_2() {
    const w = caveRoom({ torches: [[-7, -2], [7, -2], [0, -10]] });
    const s = w.scene;
    const water = plane(40, 6, emissive('#2a6fb8', 0.35, { roughness: 0.05 }), { pos: [0, 0.04, -5], rot: [-Math.PI / 2, 0, 0], parent: s });
    box(4, 0.4, 2, '#7a5a3a', { pos: [-4, 0.2, -1.5], parent: s });
    const boat = group(s, [0, 0.15, -5]);
    rbox(3, 0.6, 1.4, 0.2, '#a8754a', { pos: [0, 0.2, 0], parent: boat });
    sign(boat, '배에는 나 + 하나만!', [0, 1.8, 0], { scale: 0.6 });
    const animal = (x, z, color, ears) => {
      const a = group(s, [x, 0, z], [0, 0.6, 0]);
      capsule(0.4, 0.9, color, { pos: [0, 0.75, 0], rot: [0, 0, Math.PI / 2], parent: a });
      sph(0.38, color, { pos: [0.9, 1.05, 0], parent: a });
      for (const zz of [-0.25, 0.25]) for (const xx of [-0.45, 0.45]) cyl(0.08, 0.08, 0.6, color, { pos: [xx, 0.3, zz], parent: a });
      if (ears) for (const zz of [-0.15, 0.15]) cone(0.1, 0.3, color, { pos: [0.95, 1.5, zz], parent: a });
      return a;
    };
    const wolf = animal(-6, -0.5, '#7a7a86', true);
    const goat = animal(-3.5, 0.5, '#f4f4f4', false);
    cone(0.06, 0.4, '#c9b89a', { pos: [-2.6, 1.6, 0.6], rot: [0, 0, 0.5], parent: s });
    for (let i = 0; i < 3; i++) sph(0.6 - i * 0.12, ['#7cc46a', '#9ad87a', '#bfe8a0'][i], { pos: [-1.2, 0.55 + i * 0.1, 1.6], parent: s });
    sign(s, '🐺 🐐 🥬', [-3.5, 3.2, 0.3], { scale: 0.8 });
    box(4, 0.4, 2, '#7a5a3a', { pos: [5, 0.2, -9], parent: s });
    return { ...w, shots: { main: shot([1, 3.6, 9], [-1, 1.6, -3], 52), prop: shot([2, 3, 3], [-3, 1, -3], 55) },
      update(t) { boat.position.x = Math.sin(t * 0.4) * 3; boat.rotation.z = Math.sin(t * 1.6) * 0.04; wolf.rotation.y = 0.6 + Math.sin(t) * 0.2; goat.position.y = Math.abs(Math.sin(t * 2)) * 0.05; } };
  },
  // 동굴 ③: 거대한 4분 · 7분 모래시계
  cave2_1() {
    const w = caveRoom();
    const s = w.scene;
    const hg = (x, sc, txt) => {
      const h = group(s, [x, 0, -5]); h.scale.setScalar(sc);
      cyl(1.2, 1.3, 0.5, w.rockM, { pos: [0, 0.25, 0], parent: h });
      cyl(1.1, 1.1, 0.2, '#a8754a', { pos: [0, 0.6, 0], parent: h });
      cyl(1.1, 1.1, 0.2, '#a8754a', { pos: [0, 4.6, 0], parent: h });
      cone(0.95, 1.9, glass(), { pos: [0, 1.65, 0], rot: [Math.PI, 0, 0], parent: h, cast: false });
      cone(0.95, 1.9, glass(), { pos: [0, 3.55, 0], parent: h, cast: false });
      const top = cone(0.7, 1.3, emissive('#e8c87a', 0.3), { pos: [0, 3.3, 0], rot: [Math.PI, 0, 0], parent: h });
      const bot = cone(0.8, 0.9, emissive('#e8c87a', 0.3), { pos: [0, 1.15, 0], parent: h });
      const stream = cyl(0.03, 0.03, 1.6, emissive('#ffe08a', 0.8), { pos: [0, 2.0, 0], parent: h, cast: false });
      for (const a of [0, 2.1, 4.2]) cyl(0.08, 0.08, 4, '#a8754a', { pos: [Math.cos(a) * 1.05, 2.6, Math.sin(a) * 1.05], parent: h });
      sign(s, txt, [x, 5.6 * sc + 0.4, -5], { scale: 0.8 });
      return { top, bot, stream };
    };
    const a = hg(-3, 0.75, '⏳ 4분'), b = hg(3, 1.0, '⏳ 7분');
    sign(s, '정확히 9분을 재라!', [0, 7.4, -7], { scale: 1.0 });
    return { ...w, shots: { main: shot([0.5, 3.6, 9.5], [0, 2.8, -3], 52), prop: shot([0, 4, 3], [0, 3, -5], 55) },
      update(t) { const ka = (t / 4) % 1, kb = (t / 7) % 1; a.top.scale.setScalar(Math.max(0.05, 1 - ka)); a.bot.scale.setScalar(0.15 + ka * 0.85); b.top.scale.setScalar(Math.max(0.05, 1 - kb)); b.bot.scale.setScalar(0.15 + kb * 0.85); } };
  },
  // 동굴 ④: 마법진 위의 거대한 주사위 두 개, "7" 석문
  cave2_2() {
    const w = caveRoom();
    const s = w.scene;
    const ring = torus(4, 0.08, emissive('#b48cff', 1.4), { pos: [0, 0.05, -4], rot: [Math.PI / 2, 0, 0], parent: s, cast: false });
    torus(3, 0.05, emissive('#b48cff', 1.0), { pos: [0, 0.05, -4], rot: [Math.PI / 2, 0, 0], parent: s, cast: false });
    const die = (x, n) => {
      const d = group(s, [x, 1.3, -4]);
      rbox(2.2, 2.2, 2.2, 0.3, '#fdfdfd', { parent: d });
      const P = { 3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]], 4: [[-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5]], 2: [[-0.5, -0.5], [0.5, 0.5]], 5: [[-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [0, 0]] };
      P[n].forEach(([a, b]) => sph(0.18, '#222', { pos: [a, 1.12, b], scale: [1, 0.3, 1], parent: d }));
      P[n === 3 ? 4 : 3].forEach(([a, b]) => sph(0.18, '#222', { pos: [a, b, 1.12], scale: [1, 1, 0.3], parent: d }));
      P[2].forEach(([a, b]) => sph(0.18, '#222', { pos: [1.12, a, b], scale: [0.3, 1, 1], parent: d }));
      return d;
    };
    const d1 = die(-1.8, 3), d2 = die(1.8, 4);
    const door = group(s, [0, 0, -10]);
    box(4, 6, 0.6, w.rockM, { pos: [0, 3, 0], parent: door });
    sign(door, '합 = 7 ?', [0, 4.2, 0.5], { scale: 1.0, bg: '#3a3548', color: '#d8b8ff', border: '#b48cff' });
    return { ...w, shots: { main: shot([0.5, 3.6, 9.5], [0, 2.4, -3], 52), prop: shot([0, 4, 2], [0, 1.5, -4], 52) },
      update(t) { d1.position.y = 1.3 + Math.abs(Math.sin(t * 1.6)) * 0.6; d2.position.y = 1.3 + Math.abs(Math.sin(t * 1.6 + 1.2)) * 0.6; d1.rotation.y = t * 0.4; d2.rotation.y = -t * 0.35; ring.rotation.z = t * 0.3; } };
  },
  // 동굴 ⑤: 몬티 홀, 빨강·파랑·초록 세 문, 3번 문 뒤엔 염소
  cave3_1() {
    const w = caveRoom({ torches: [[-7, -5], [7, -5]] });
    const s = w.scene;
    const cols = ['#c0392b', '#2e86c1', '#27ae60'];
    const pivots = [-4, 0, 4].map((x, i) => {
      const d = group(s, [x, 0, -6]);
      box(3, 5.2, 0.6, w.rockM, { pos: [0, 2.6, -0.2], parent: d });
      const pv = group(d, [-1.2, 0, 0.15]);
      box(2.4, 4.4, 0.25, cols[i], { pos: [1.2, 2.2, 0], parent: pv });
      sph(0.12, '#ffd34d', { pos: [2.1, 2.2, 0.2], parent: pv });
      sign(d, `${i + 1}`, [0, 5.8, 0.2], { scale: 0.8 });
      return pv;
    });
    const goat = group(s, [4, 0, -7.2]);
    capsule(0.4, 0.9, '#f4f4f4', { pos: [0, 0.75, 0], rot: [0, 0, Math.PI / 2], parent: goat });
    sph(0.38, '#f4f4f4', { pos: [0.9, 1.05, 0], parent: goat });
    sign(s, '🙋 1번을 골랐다 → 석상이 3번을 열었다. 바꿀까?', [0, 7.2, -6], { scale: 0.75 });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.6, -3], 52), prop: shot([0, 3.6, 2.5], [0, 2.6, -6], 58) },
      update(t) { pivots[2].rotation.y = -1.3; pivots[0].rotation.y = Math.sin(t * 2) * 0.03; } };
  },
  // 동굴 ⑥: 동굴 연회장, 거대한 케이크와 공중의 칼
  cave3_2() {
    const w = caveRoom();
    const s = w.scene;
    box(8, 0.3, 4, '#7a5a3a', { pos: [0, 1.2, -5], parent: s });
    for (const [x, z] of [[-3.6, -3.4], [3.6, -3.4], [-3.6, -6.6], [3.6, -6.6]]) cyl(0.15, 0.15, 1.2, '#5a4030', { pos: [x, 0.6, z], parent: s });
    const cake = group(s, [0, 1.35, -5]);
    cyl(1.8, 1.8, 0.8, '#ffd6e6', { pos: [0, 0.4, 0], parent: cake, seg: 48 });
    cyl(1.85, 1.85, 0.15, '#ffffff', { pos: [0, 0.85, 0], parent: cake, seg: 48 });
    cyl(1.8, 1.8, 0.6, '#ffe9a6', { pos: [0, 1.2, 0], parent: cake, seg: 48 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(0.05, 0.05, 0.5, '#9fd8ff', { pos: [Math.cos(a) * 1.2, 1.75, Math.sin(a) * 1.2], parent: cake }); sph(0.08, emissive('#ffcf5a', 2.5), { pos: [Math.cos(a) * 1.2, 2.05, Math.sin(a) * 1.2], parent: cake, cast: false }); }
    sph(0.25, '#ff3a5a', { pos: [0, 1.65, 0], parent: cake });
    const knife = group(s, [0, 5, -5]);
    box(3.4, 0.5, 0.08, '#d8dde6', { parent: knife });
    box(1.1, 0.35, 0.2, '#5a4030', { pos: [2.2, 0, 0], parent: knife });
    sign(s, '칼질 3번으로 똑같이 8조각!', [0, 7.2, -6], { scale: 0.9 });
    return { ...w, shots: { main: shot([0.5, 3.6, 9.5], [0, 2.6, -3], 52), prop: shot([0, 4.5, 1.5], [0, 2.4, -5], 52) },
      update(t) { knife.position.y = 4.8 + Math.sin(t * 1.5) * 0.4; knife.rotation.y = Math.floor(t / 2.5) * (Math.PI / 2); } };
  },

  // 회사 ①: 보안 관제실, 대형 화면의 피싱 메일과 천장에서 내려온 낚싯바늘
  office1_1() {
    const w = world({ bg: '#141a2a', fog: '#141a2a', fogNear: 18, fogFar: 45, hemi: '#9fb8ff', ground: '#202838', hemiI: 0.8, sun: '#c8d8ff', sunI: 0.9, floor: '#2a3040', fillI: 1.3 });
    const s = w.scene;
    box(16, 7, 0.4, '#1e2433', { pos: [0, 3.5, -8], parent: s });
    texPlane(10, 5, 1000, 500, (g, W, H) => {
      g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#c0392b'; g.fillRect(0, 0, W, 70);
      g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText('⚠ 받은 메일함', 24, 50);
      g.fillStyle = '#222'; g.font = `52px ${FONT}`; g.fillText('[긴급] 급여 계좌 확인 요청', 40, 150);
      g.font = `36px ${FONT2}`; g.fillStyle = '#c0392b'; g.fillText('보낸 사람: pay@c0mpany-pay.com', 40, 220);
      g.fillStyle = '#444'; g.fillText('24시간 안에 로그인하지 않으면 급여가 중지됩니다.', 40, 290);
      g.fillStyle = '#2e6ee0'; roundRect(g, 40, 340, 360, 90, 16); g.fill();
      g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText('지금 로그인 ▶', 70, 400);
    }, { glow: 0.7, pos: [0, 3.6, -7.75], parent: s });
    const hook = group(s, [3.5, 7.5, -4]);
    cyl(0.02, 0.02, 4, '#ddd', { pos: [0, -2, 0], parent: hook, cast: false });
    torus(0.35, 0.06, '#c0c4cc', { pos: [0, -4.3, 0], rot: [0, 0, 0.6], parent: hook, arc: Math.PI * 1.4 });
    const env = group(hook, [0, -5, 0]);
    box(1.2, 0.8, 0.05, '#fff6d8', { parent: env });
    sign(env, '✉', [0, 0, 0.1], { scale: 0.5, bg: false });
    for (const x of [-6, 6]) { const L = new THREE.PointLight('#ff3030', 12, 12, 1.6); L.position.set(x, 5, -5); s.add(L); }
    for (let i = 0; i < 4; i++) { box(1.6, 0.8, 1, '#2a3040', { pos: [-5 + i * 3.3, 0.4, -4], parent: s }); box(1.2, 0.7, 0.05, emissive('#4a8aff', 0.6), { pos: [-5 + i * 3.3, 1.2, -4], parent: s }); }
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.8, -3], 52), prop: shot([0, 3.6, 2], [0, 3.6, -8], 60) },
      update(t) { hook.position.y = 7.5 + Math.sin(t * 1.3) * 0.3; hook.rotation.z = Math.sin(t * 0.8) * 0.06; } };
  },
  // 회사 ②: 서버실, 빨간 경보와 결제 오류 500
  office1_2() {
    const w = world({ bg: '#10141e', fog: '#10141e', fogNear: 14, fogFar: 40, hemi: '#8aa0d8', ground: '#1a2030', hemiI: 0.7, sun: '#c8d8ff', sunI: 0.6, floor: '#2a3040', fillI: 1.3 });
    const s = w.scene;
    const leds = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const x = (r ? 1 : -1) * 4.5, z = 1 - i * 2.4;
      box(1.8, 4.2, 1.6, '#232733', { pos: [x, 2.1, z], parent: s });
      for (let k = 0; k < 8; k++) { box(1.5, 0.3, 0.02, '#2e3442', { pos: [x - (r ? 1 : -1) * 0.91, 0.5 + k * 0.45, z], rot: [0, Math.PI / 2, 0], parent: s }); leds.push(sph(0.05, emissive('#ff3030', 2.5), { pos: [x - (r ? 1 : -1) * 0.93, 0.5 + k * 0.45, z + 0.5], parent: s, cast: false })); }
    }
    const siren = group(s, [0, 5.6, -4]);
    cyl(0.3, 0.35, 0.4, emissive('#ff2020', 1.8), { parent: siren, cast: false });
    const sL = new THREE.SpotLight('#ff3030', 60, 20, 0.5, 0.5, 1.2); sL.position.set(0, 5.4, -4); siren.add(sL.target); sL.target.position.set(4, -5, 0); s.add(sL);
    texPlane(6, 2.6, 600, 260, (g, W, H) => { g.fillStyle = '#1a0a0a'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff4a4a'; g.font = `70px ${FONT}`; g.textAlign = 'center'; g.fillText('💳 결제 오류 500', W / 2, 110); g.font = `38px ${FONT2}`; g.fillStyle = '#ffb0b0'; g.fillText('배포 v2.3 직후 · 오류 1,284건 ↑', W / 2, 190); }, { glow: 0.9, pos: [0, 3.2, -12], parent: s });
    box(7, 3.4, 0.3, '#1e2433', { pos: [0, 3.2, -12.2], parent: s });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.6, -3], 52), prop: shot([0, 3.2, 1], [0, 3, -12], 50) },
      update(t) { siren.rotation.y = t * 4; sL.target.position.set(Math.cos(t * 4) * 6, -5, Math.sin(t * 4) * 6); leds.forEach((l, i) => (l.visible = Math.sin(t * 9 + i * 1.7) > -0.2)); } };
  },
  // 회사 ③: 회의실 브레인스토밍, 포스트잇 벽과 떠오르는 전구
  office2_1() {
    const w = world({ bg: '#f4f6fa', fog: '#f4f6fa', fogNear: 20, fogFar: 50, hemi: '#ffffff', ground: '#c8ccd8', sunI: 1.6, floor: '#d8dce6' });
    const s = w.scene;
    box(16, 6, 0.3, '#eef0f6', { pos: [0, 3, -7], parent: s });
    box(9, 3.6, 0.1, '#ffffff', { pos: [0, 3, -6.8], parent: s });
    const colors = ['#ffe08a', '#ff9eb5', '#9fd8ff', '#b4f0c0'];
    for (let i = 0; i < 40; i++) box(0.7, 0.65, 0.03, colors[i % 4], { pos: [-4 + (i % 10) * 0.9, 1.6 + Math.floor(i / 10) * 0.8, -6.72], rot: [0, 0, ((i * 7) % 5 - 2) * 0.05], parent: s });
    cyl(2.4, 2.4, 0.15, '#c9a57c', { pos: [0, 1.4, -2.6], parent: s, seg: 40 });
    cyl(0.2, 0.3, 1.4, '#888', { pos: [0, 0.7, -2.6], parent: s });
    const bulbs = [];
    for (let i = 0; i < 6; i++) { const b = group(s, [-4 + i * 1.6, 5.4, -4]); sph(0.35, emissive('#ffe08a', 1.6), { parent: b, cast: false }); cyl(0.14, 0.14, 0.25, '#999', { pos: [0, -0.4, 0], parent: b }); bulbs.push(b); }
    sign(s, '💡 브레인스토밍 · 아이디어 많이!', [0, 5.6, -6.6], { scale: 0.9 });
    for (let i = 0; i < 6; i++) box(10, 0.05, 0.4, emissive('#ffffff', 0.5), { pos: [0, 6.2, 2 - i * 2], parent: s, cast: false });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.8, -3], 52), prop: shot([0, 3.4, 1.5], [0, 3, -6.8], 55) },
      update(t) { bulbs.forEach((b, i) => (b.position.y = 5.2 + Math.sin(t * 1.6 + i) * 0.25)); } };
  },
  // 회사 ④: A/B 테스트 실험실, 빨강·파랑 거대 버튼과 작은 사람들
  office2_2() {
    const w = world({ bg: '#eef2fa', fog: '#eef2fa', fogNear: 20, fogFar: 50, hemi: '#ffffff', ground: '#c8ccd8', sunI: 1.6, floor: '#dfe3ec' });
    const s = w.scene;
    box(16, 6, 0.3, '#e6eaf2', { pos: [0, 3, -8], parent: s });
    const btn = (x, color, txt) => {
      const p = group(s, [x, 0, -4.5]);
      cyl(1.3, 1.5, 1.6, '#c9ccd2', { pos: [0, 0.8, 0], parent: p, seg: 40 });
      const b = cyl(1.0, 1.0, 0.4, emissive(color, 0.5), { pos: [0, 1.8, 0], parent: p, seg: 40 });
      sign(p, txt, [0, 3.2, 0], { scale: 0.8 });
      return b;
    };
    const a = btn(-3.2, '#e03030', 'A · 빨간 버튼'), b = btn(3.2, '#2e6ee0', 'B · 파란 버튼');
    const mini = (x, z, c) => { const p = group(s, [x, 0, z]); capsule(0.15, 0.3, c, { pos: [0, 0.32, 0], parent: p }); sph(0.15, '#ffe0c8', { pos: [0, 0.7, 0], parent: p }); };
    for (let i = 0; i < 10; i++) mini(-4.4 + (i % 5) * 0.6, -1.8 + Math.floor(i / 5) * 0.7, '#ff8fb1');
    for (let i = 0; i < 10; i++) mini(2.0 + (i % 5) * 0.6, -1.8 + Math.floor(i / 5) * 0.7, '#6a8fd8');
    texPlane(6, 2.4, 600, 240, (g, W, H) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.fillStyle = '#333'; g.font = `40px ${FONT}`; g.fillText('하루 결과 (각 10명)', 30, 50); [[2, '#e03030', 'A'], [4, '#2e6ee0', 'B']].forEach(([v, c, l], i) => { g.fillStyle = c; g.fillRect(80 + i * 260, 210 - v * 30, 160, v * 30); g.fillStyle = '#333'; g.fillText(`${l} 클릭 ${v}명`, 70 + i * 260, 232 - v * 30 - 14); }); }, { pos: [0, 4.4, -7.8], parent: s });
    return { ...w, shots: { main: shot([0.5, 3.4, 9.5], [0, 2.6, -3], 52), prop: shot([0, 4, 2], [0, 2.6, -5], 56) },
      update(t) { a.position.y = 1.8 - Math.max(0, Math.sin(t * 2.4)) * 0.15; b.position.y = 1.8 - Math.max(0, Math.sin(t * 2.4 + 1.6)) * 0.15; } };
  },
};

const cache = {};
export const hasStage = key => !!STAGES[key];
export function getStage(key) {
  if (!STAGES[key]) return null;
  if (!cache[key]) {
    const st = STAGES[key]();
    // 대사창에 인물이 가리지 않게: 시선을 조금 낮추고 화각을 넓힌다
    const m = st.shots.main;
    st.shots.main = shot([m.pos.x, m.pos.y - 0.3, m.pos.z + 0.8], [m.look.x, m.look.y - 1.0, m.look.z], (m.fov || 50) + 4);
    st.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow !== false && o.castShadow; } if (o.isLight && o.castShadow) { o.shadow.bias = o.isPointLight ? -0.004 : -0.0006; o.shadow.normalBias = 0.03; } });
    // 인물이 설 자리: 카메라를 바라보는 반원
    st.spots = n => SPOTS.slice(0, n).map(([x, z]) => ({ pos: [x, 0, z], rot: Math.atan2(st.shots.main.pos.x - x, st.shots.main.pos.z - z) * 0.7 }));
    cache[key] = st;
  }
  return cache[key];
}
