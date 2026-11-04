import { THREE, box, rbox, cyl, sph, cone, plane, torus, group, mat, emissive, texPlane, canvasTex, textSprite, anim, wait, ease, shot, FONT, FONT2, roundRect, rand, setSeed, skyDome, capsule } from '../util.js';
import { npc } from '../characters.js';
import { place, talker, walkTo, turnTo, emote, marker, dreamy, sweat } from './common.js';

/*
 * 꿈 4 · 버스에서 생긴 일
 *  버스 내부(앞쪽이 -z). 바깥 도로/건물은 움직이는 무대로 연출.
 */
export function build(env) {
  const { mung, sfx } = env;
  setSeed(99);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#141a3a');
  scene.fog = new THREE.Fog('#1a2048', 25, 90);
  scene.add(skyDome('#0c1030', '#3a3170', 160, { stops: [[0, '#0c1030'], [0.45, '#2a2a66'], [0.55, '#6a4a8a'], [1, '#6a4a8a']] }));

  /* ───── 바깥 세계 (움직임) ───── */
  const world = group(scene);
  const roadTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#3a3d48'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 6, y, 12, 64);
    g.fillStyle = '#ffd34d'; g.fillRect(14, 0, 8, h); g.fillRect(w - 22, 0, 8, h);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 6);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 200), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.8 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, -1.1, -40); road.receiveShadow = true; scene.add(road);
  for (const s of [-1, 1]) box(4, 0.3, 200, '#8a8f9a', { pos: [s * 9, -1.0, -40], parent: scene });
  const groundOut = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mat('#1e2236'));
  groundOut.rotation.x = -Math.PI / 2; groundOut.position.y = -1.2; scene.add(groundOut);
  const buildings = [];
  const winTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2a2f4a'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 22) for (let x = 8; x < w; x += 22) { g.fillStyle = Math.random() < 0.55 ? '#ffe39a' : '#1a1e30'; g.fillRect(x, y, 12, 14); }
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const signs = ['카페', '편의점', '약국', 'PC방', '치킨', '꽃집', '빵집', '노래방'];
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? 1 : -1;
    const h = rand(6, 22), w = rand(4, 7);
    const g = group(world, [side * rand(13.5, 16), 0, -i * 8 + 40]);
    const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(w / 4, h / 6);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55, color: ['#3a3f5c', '#4a4060', '#33405a'][i % 3] }));
    m.position.y = h / 2 - 1.2; g.add(m);
    const sg = textSprite(signs[i % signs.length], { size: 70, scale: 1.2, bg: ['#ff6f98', '#4fd0a0', '#ffb347', '#8fa8ff'][i % 4], color: '#fff', border: '#fff' });
    sg.position.set(-side * (w / 2 + 0.1), 2.0, 0); g.add(sg);
    buildings.push(g);
  }
  const lamps = [];
  for (let i = 0; i < 10; i++) {
    const g = group(world, [(i % 2 ? 1 : -1) * 8, -1, -i * 16 + 40]);
    cyl(0.1, 0.12, 7, '#555a66', { pos: [0, 3.5, 0], parent: g });
    sph(0.35, emissive('#fff0c0', 2), { pos: [(i % 2 ? -1 : 1) * 0.8, 7, 0], parent: g });
    lamps.push(g);
  }
  // 터널 입구 (경로 퍼즐 단서와 연결되는 표지)
  const tunnelSign = group(world, [-6, -1, -60]);
  cyl(0.1, 0.1, 5, '#777', { pos: [0, 2.5, 0], parent: tunnelSign });
  texPlane(2.4, 1.4, 240, 140, (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(120, 70, 66, 0, 7); g.fill(); g.strokeStyle = '#d02020'; g.lineWidth = 12; g.stroke(); g.fillStyle = '#111'; g.font = `50px ${FONT}`; g.textAlign = 'center'; g.fillText('3.0m', 120, 88); }, { pos: [0, 5, 0.1], parent: tunnelSign });
  // 구급차
  const amb = group(scene, [7.5, -1.2, 9]);
  rbox(3.2, 3.2, 7, 0.3, '#f8f8f8', { pos: [0, 2.0, 0], parent: amb });
  box(3.25, 0.5, 7.05, '#e83030', { pos: [0, 1.6, 0], parent: amb });
  texPlane(2.4, 0.9, 260, 100, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 260, 100); g.fillStyle = '#e83030'; g.font = `70px ${FONT}`; g.fillText('119', 70, 78); }, { pos: [-1.63, 2.6, 0], rot: [0, -Math.PI / 2, 0], parent: amb });
  const sirenR = sph(0.25, emissive('#ff2020', 3), { pos: [0, 3.7, -1], parent: amb, cast: false });
  const sirenB = sph(0.25, emissive('#2060ff', 3), { pos: [0, 3.7, 1], parent: amb, cast: false });
  const sirenLight = new THREE.PointLight('#ff3030', 0, 22, 1.2); sirenLight.position.set(6, 3, 6); scene.add(sirenLight);
  amb.visible = false;

  /* ───── 버스 ───── */
  const bus = group(scene);
  const BW = 2.4, BL = 5.6, BH = 4.3;
  const floorB = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, BL * 2), mat('#5a5f6a'));
  floorB.rotation.x = -Math.PI / 2; floorB.receiveShadow = true; bus.add(floorB);
  box(BW * 2 - 2.6, 0.02, BL * 2, '#4a7a6a', { pos: [0, 0.01, 0], parent: bus, cast: false });
  box(BW * 2 + 0.3, 1.1, BL * 2 + 0.3, '#2f9a5f', { pos: [0, -0.57, 0], parent: bus });
  const bodyM = mat('#3fb36f');
  for (const s of [-1, 1]) {
    box(0.2, 1.6, BL * 2, bodyM, { pos: [s * BW, 0.8, 0], parent: bus });
    box(0.2, 0.6, BL * 2, bodyM, { pos: [s * BW, BH - 0.3, 0], parent: bus });
    for (let i = 0; i <= 6; i++) box(0.22, BH - 2.2, 0.18, '#2f8a55', { pos: [s * BW, 1.6 + (BH - 2.2) / 2, -BL + i * (BL * 2 / 6)], parent: bus });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(BL * 2, BH - 2.2), new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide }));
    glass.position.set(s * BW, 1.6 + (BH - 2.2) / 2, 0); glass.rotation.y = Math.PI / 2; bus.add(glass);
  }
  // 내부 패널 (밝은 색)
  for (const s of [-1, 1]) box(0.05, 1.5, BL * 2, '#e6e9ee', { pos: [s * (BW - 0.13), 0.8, 0], parent: bus });
  // 천장
  const roof = box(BW * 2, 0.15, BL * 2, '#f2f4f7', { pos: [0, BH, 0], parent: bus });
  roof.castShadow = false;
  const roofLights = [];
  for (let z = -4; z <= 4; z += 2.6) { roofLights.push(plane(0.5, 1.6, emissive('#eaf4ff', 1.2), { pos: [0, BH - 0.08, z], rot: [Math.PI / 2, 0, 0], parent: bus })); }
  const busLight = new THREE.PointLight('#e8f2ff', 10, 14, 1.4); busLight.position.set(0, BH - 0.5, 0); bus.add(busLight);
  const busLight2 = new THREE.PointLight('#e8f2ff', 6, 10, 1.4); busLight2.position.set(0, BH - 0.5, -4); bus.add(busLight2);
  // 뒷벽 + 앞유리
  box(BW * 2, BH, 0.2, '#e6e9ee', { pos: [0, BH / 2, BL], parent: bus });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, BH - 1.6), new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.1, roughness: 0.05, side: THREE.DoubleSide }));
  windshield.position.set(0, 1.2 + (BH - 1.6) / 2, -BL); bus.add(windshield);
  box(BW * 2, 1.2, 0.2, '#2f9a5f', { pos: [0, 0.6, -BL], parent: bus });
  // 노선 LED 전광판
  const led = texPlane(3.6, 0.45, 720, 90, () => {}, { glow: 1.2, pos: [0, BH - 0.45, -BL + 0.3], parent: bus });
  box(3.8, 0.55, 0.2, '#111', { pos: [0, BH - 0.45, -BL + 0.2], parent: bus });
  let ledT = 0;
  let ledText = '이번 정류장: 시청  ▶  다음 정류장: 별빛아파트', ledColor = '#ff9a2a', ledScroll = 0;
  function drawLed() {
    led.tex.redraw((g, w, h) => {
      g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h);
      g.fillStyle = ledColor; g.font = `52px ${FONT}`;
      const tw = g.measureText(ledText).width + 80;
      const x = w - (ledScroll % (tw + w));
      g.fillText(ledText, x, 66);
    });
  }
  // 좌석
  const seatM = mat('#3a6fd0'), seatM2 = mat('#5a8fe8');
  const seatPos = [];
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      if (s === 1 && i === 0) continue; // 앞문 자리
      const z = -2.6 + i * 1.7;
      const g = group(bus, [s * 1.55, 0, z]);
      rbox(1.3, 0.25, 1.0, 0.08, seatM, { pos: [0, 0.85, 0], parent: g });
      rbox(1.3, 1.1, 0.2, 0.08, seatM2, { pos: [0, 1.45, 0.5], rot: [0.12, 0, 0], parent: g });
      box(0.15, 0.85, 0.8, '#777', { pos: [0, 0.42, 0], parent: g });
      cyl(0.04, 0.04, 0.4, '#ffcc40', { pos: [-s * 0.6, 2.15, 0.55], parent: g });
      seatPos.push([s * 1.55, z, s]);
    }
  }
  // 손잡이 봉 + 손잡이
  const straps = [];
  for (const s of [-1, 1]) {
    cyl(0.04, 0.04, BL * 2, '#c9ccd2', { pos: [s * 0.8, BH - 0.45, 0], rot: [Math.PI / 2, 0, 0], parent: bus });
    for (let z = -4; z <= 4.5; z += 0.9) {
      const st = group(bus, [s * 0.8, BH - 0.45, z]);
      box(0.06, 0.4, 0.04, '#e8e8e8', { pos: [0, -0.2, 0], parent: st });
      torus(0.12, 0.03, '#ffcc40', { pos: [0, -0.52, 0], parent: st });
      straps.push(st);
    }
  }
  for (const [x, z] of [[0.8, -3.2], [-0.8, 0.6], [0.8, -0.6]]) cyl(0.045, 0.045, BH, '#ffcc40', { pos: [x, BH / 2, z], parent: bus });
  // 하차벨
  for (let z = -2; z <= 4; z += 2) sph(0.08, emissive('#ff3040', 0.8), { pos: [BW - 0.18, 1.9, z], parent: bus, cast: false });
  // 노선도 포스터 (지도 퍼즐)
  const mapP = texPlane(4.4, 1.1, 1100, 275, () => {}, { pos: [0, 2.55, BL - 0.16], rot: [0, Math.PI, 0], parent: bus });
  box(4.6, 1.3, 0.08, '#2f9a5f', { pos: [0, 2.55, BL - 0.08], parent: bus });
  function drawMap() {
    mapP.tex.redraw((g, w, h) => {
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f9a5f'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText('🚌 742번 주변 도로 안내도  (현재 22:05)', 14, 26);
      const N = { 시청: [90, 160], 터널: [420, 70], 강변로: [420, 250], 시장: [330, 160], 학교: [640, 160], 별빛아파트: [960, 160] };
      const edge = (a, b, t, col = '#555', dash) => {
        const [x1, y1] = N[a], [x2, y2] = N[b];
        g.strokeStyle = col; g.lineWidth = 7; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#fff'; g.beginPath(); g.arc((x1 + x2) / 2, (y1 + y2) / 2, 22, 0, 7); g.fill();
        g.fillStyle = '#222'; g.font = `20px ${FONT}`; g.textAlign = 'center'; g.fillText(t, (x1 + x2) / 2, (y1 + y2) / 2 + 7); g.textAlign = 'left';
      };
      edge('시청', '터널', '8분', '#8a6a4a'); edge('터널', '별빛아파트', '12분', '#8a6a4a');
      edge('시청', '강변로', '6분', '#3a8ad8'); edge('강변로', '별빛아파트', '9분', '#3a8ad8');
      edge('시청', '시장', '7분', '#555');
      // 시장→별빛 (일방통행: 별빛→시장)
      g.strokeStyle = '#d04040'; g.lineWidth = 6; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(330, 160); g.quadraticCurveTo(645, 290, 960, 160); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d04040'; g.font = `20px ${FONT}`; g.fillText('14분 ◀ 일방통행 (별빛→시장)', 520, 262);
      edge('시장', '학교', '8분'); edge('학교', '별빛아파트', '9분');
      for (const [k, [x, y]] of Object.entries(N)) {
        g.fillStyle = k === '시청' ? '#ff6f98' : k === '별빛아파트' ? '#ffcc40' : '#2f9a5f';
        g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
        g.fillStyle = '#222'; g.font = `24px ${FONT}`; g.textAlign = 'center'; g.fillText(k + (k === '시청' ? ' (현재)' : ''), x, y - 26); g.textAlign = 'left';
      }
      g.fillStyle = '#8a6a4a'; g.font = `19px ${FONT2}`; g.fillText('🚧 터널 높이 제한 3.0m', 470, 64);
      g.fillStyle = '#3a8ad8'; g.fillText('⛔ 강변로 22:00~06:00 대형차 통행 금지', 450, 240 - 2 + 0);
      g.fillStyle = '#555'; g.fillText('🚌 이 버스 높이 3.2m', 20, 260);
    });
  }
  drawMap();
  // 운전석
  const dSeat = group(bus, [-1.5, 0, -4.2]);
  rbox(1.1, 0.25, 1.0, 0.08, '#333', { pos: [0, 0.85, 0], parent: dSeat });
  rbox(1.1, 1.3, 0.2, 0.08, '#333', { pos: [0, 1.6, 0.5], rot: [0.12, 0, 0], parent: dSeat });
  box(0.2, 0.85, 0.8, '#555', { pos: [0, 0.42, 0], parent: dSeat });
  const dash = group(bus, [-0.6, 0, -5.1]);
  rbox(3.4, 1.3, 0.8, 0.1, '#2a2d34', { pos: [0, 0.65, 0], parent: dash });
  const wheel = group(bus, [-1.5, 1.75, -4.75], [-0.9, 0, 0]);
  torus(0.42, 0.05, '#222', { parent: wheel });
  box(0.84, 0.05, 0.05, '#222', { parent: wheel });
  cyl(0.06, 0.08, 0.6, '#333', { pos: [0, 0, -0.3], rot: [Math.PI / 2, 0, 0], parent: wheel });
  const gauge = texPlane(0.9, 0.35, 240, 94, () => {}, { glow: 1, pos: [-1.5, 1.32, -4.69], rot: [-0.4, 0, 0], parent: bus });
  let speed = 40;
  function drawGauge(hazard) {
    gauge.tex.redraw((g, w, h) => {
      g.fillStyle = '#05070c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7cf5c4'; g.font = `46px ${FONT}`; g.fillText(`${Math.round(speed)}`, 18, 62);
      g.font = `20px ${FONT}`; g.fillText('km/h', 88, 62);
      if (hazard) { g.fillStyle = '#ff9a2a'; g.font = `38px ${FONT}`; g.fillText('⚠', 180, 60); }
    });
  }
  drawGauge(false);
  // 페달
  for (const [x, c] of [[-1.75, '#555'], [-1.3, '#777']]) rbox(0.22, 0.05, 0.36, 0.02, c, { pos: [x, 0.35, -4.95], rot: [-0.5, 0, 0], parent: bus });
  // 대시보드 단서: 당뇨 수첩 / 인슐린 펜 / 운행일지
  const diabetes = group(bus, [-0.4, 1.32, -5.0]);
  rbox(0.4, 0.04, 0.5, 0.02, '#4a90e2', { parent: diabetes, rot: [0, 0.2, 0] });
  cyl(0.03, 0.03, 0.42, '#f2f2f2', { pos: [0.35, 0.03, 0], rot: [0, 0, Math.PI / 2], parent: diabetes });
  cyl(0.032, 0.032, 0.1, '#ff8a2a', { pos: [0.6, 0.03, 0], rot: [0, 0, Math.PI / 2], parent: diabetes });
  const lbl1 = textSprite('당뇨 수첩 · 인슐린 펜', { size: 40, scale: 0.35, border: '#4a90e2' }); lbl1.position.set(-0.1, 1.75, -5.0); bus.add(lbl1);
  const logbook = group(bus, [0.6, 1.32, -4.95], [0, -0.3, 0]);
  rbox(0.45, 0.03, 0.6, 0.02, '#a87a4a', { parent: logbook });
  texPlane(0.4, 0.52, 160, 208, (g, w, h) => { g.fillStyle = '#fffdf2'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.font = `18px ${FONT}`; g.fillText('운행일지', 30, 26); g.font = `14px ${FONT2}`; ['12:30 인슐린 투여', '점심 X', '(배차 지연)', '21:40 어지러움?'].forEach((t, i) => g.fillText(t, 10, 62 + i * 34)); g.strokeStyle = '#d04040'; g.strokeRect(6, 74, 140, 32); }, { pos: [0, 0.02, 0], rot: [-Math.PI / 2, 0, 0], parent: logbook });
  // 비상등
  const hazards = [];
  for (const [x, z] of [[-2.2, -5.7], [2.2, -5.7], [-2.2, 5.7], [2.2, 5.7]]) hazards.push(sph(0.18, emissive('#ff9a2a', 0), { pos: [x, 0.4, z], parent: bus, cast: false }));
  const hazardLight = new THREE.PointLight('#ff9a2a', 0, 12, 1.5); hazardLight.position.set(0, 1, -6.2); bus.add(hazardLight);

  /* 승객 / 기사 */
  const driver = npc('driver');
  const driver2 = npc('driver', { hairColor: '#222', glasses: true });
  const grandma = npc('grandma');
  const student = npc('student1', { headphones: '#ff8fb1' });
  const worker = npc('office1', { lanyard: null });
  const medic = npc('paramedic');
  // 할머니 장바구니 + 오렌지 주스
  const basket = group(scene);
  rbox(0.6, 0.45, 0.4, 0.05, '#c9884e', { pos: [0, 0.22, 0], parent: basket });
  torus(0.25, 0.03, '#a86a3a', { pos: [0, 0.5, 0], parent: basket });
  const juice = group(basket, [0.12, 0.45, 0]);
  rbox(0.16, 0.34, 0.16, 0.03, '#ff9a2a', { pos: [0, 0.1, 0], parent: juice });
  cyl(0.03, 0.03, 0.06, '#fff', { pos: [0, 0.3, 0], parent: juice });
  const sw = sweat(scene, driver);

  const sp = dreamy(scene, { x: [-2.2, 2.2], y: [0.5, 4], z: [-5, 5] }, 0xfff0d0);
  const mk = marker(scene);

  const hemi = new THREE.HemisphereLight('#c8d4ff', '#3a3048', 0.8); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffffff', 0.6); key.position.set(4, 10, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); scene.add(key);

  const shots = {
    wide: shot([0.6, 3.6, 5.2], [-0.4, 1.8, -3.5], 58),
    side: shot([1.4, 2.6, 1.5], [-1.6, 2.0, 0.6], 50),
    front: shot([0.6, 2.9, -1.2], [-1.3, 1.6, -4.6], 50),
    outside: shot([7, 4, -10], [0, 2, -2], 50),
    board: shot([-0.6, 3.0, 1.2], [1.4, 1.5, -3.6], 54),
    mapView: shot([0, 2.6, 1.4], [0, 2.5, 5.6], 52),
  };
  const focus = {
    road: shot([-0.3, 2.6, -2.5], [0, 1.5, -14], 50),
    pedals: { ...shot([-0.6, 1.6, -3.4], [-1.5, 0.4, -4.9], 42), mark: [-1.5, 0.37, -4.9], r: 0.5 },
    passengers: shot([-0.6, 3.0, -3.0], [0.4, 1.4, 3.0], 55),
    dash: { ...shot([-0.4, 2.2, -3.6], [-1.4, 1.3, -4.8], 40) },
    driverFace: { ...shot([-0.5, 2.3, -3.2], [-1.4, 1.8, -4.3], 36) },
    diabetes: { ...shot([0.2, 2.3, -3.8], [-0.2, 1.35, -5.0], 38), mark: [-0.1, 1.36, -5.0], r: 0.45 },
    log: { ...shot([0.8, 2.3, -3.8], [0.6, 1.35, -4.95], 34), mark: [0.6, 1.36, -4.95], r: 0.45 },
    juice: { ...shot([0.4, 2.0, 0.6], [1.0, 0.6, -0.7], 38), mark: [1.0, 0.05, -0.8], r: 0.5 },
    map: shot([0, 2.6, 1.6], [0, 2.5, 5.6], 50),
    tunnelSign: shot([0.4, 2.7, 3.4], [0.2, 2.9, 5.6], 34),
  };

  const say = talker(env.ui);
  let wobble = 0, blink = false, siren = false;

  const sc = {
    scene, shots, focus, marker: mk, actors: [driver, driver2, grandma, student, worker, medic],
    cast: { '회사원': worker, '대학생': student, '할머니': grandma, '대체 기사': driver2, '기사님': driver },
    startShot: () => shots.board,
    reset() {
      speed = 40; wobble = 0; blink = false; siren = false;
      ledText = '이번 정류장: 시청  ▶  다음 정류장: 별빛아파트'; ledColor = '#ff9a2a';
      amb.visible = false; sirenLight.intensity = 0;
      hazards.forEach(h => (h.material.emissiveIntensity = 0)); hazardLight.intensity = 0;
      place(scene, driver, [-1.5, 0.38, -4.2], Math.PI, 'drive');
      driver2.root.visible = false; medic.root.visible = false;
      place(scene, grandma, [1.55, 0.38, -0.9], Math.PI, 'sitChair');
      basket.position.set(1.0, 0, -1.5); basket.visible = true; juice.visible = true;
      place(scene, student, [-1.55, 0.38, 2.5], Math.PI, 'sitChair');
      place(scene, worker, [0.45, 0, -1.7], -Math.PI / 2 + 0.3, 'idle');
      place(scene, mung, [-1.55, 0.38, 0.8], Math.PI, 'sitChair');
      mung.root.rotation.y = Math.PI - 0.6;
      sw.mesh.visible = false;
      drawGauge(false);
    },
    onEnter() { scene.add(mung.root); },
    update(dt, t) {
      sp.update(t); mk.update(t);
      const v = speed * 0.14;
      roadTex.offset.y += v * dt * 0.03;
      buildings.forEach(b => { b.position.z += v * dt; if (b.position.z > 60) b.position.z -= 192; });
      lamps.forEach(l => { l.position.z += v * dt; if (l.position.z > 60) l.position.z -= 160; });
      tunnelSign.position.z += v * dt; if (tunnelSign.position.z > 60) tunnelSign.position.z -= 160;
      // 흔들림
      const sway = Math.sin(t * 2.1) * 0.004 * (speed / 40) + Math.sin(t * 7) * wobble * 0.02;
      bus.rotation.z = sway;
      world.rotation.y = Math.sin(t * 1.3) * wobble * 0.05;
      straps.forEach((s, i) => (s.rotation.x = Math.sin(t * 2 + i * 0.3) * 0.08 * (speed / 40 + wobble)));
      ledScroll += dt * 120;
      ledT += dt;
      if (ledT > 0.05) { ledT = 0; drawLed(); }
      if (blink) { const on = Math.sin(t * 8) > 0; hazards.forEach(h => (h.material.emissiveIntensity = on ? 3 : 0)); hazardLight.intensity = on ? 6 : 0; }
      if (siren) { const r = Math.sin(t * 10) > 0; sirenLight.color.set(r ? '#ff3030' : '#3060ff'); sirenLight.intensity = 30; sirenR.material.emissiveIntensity = r ? 4 : 0.5; sirenB.material.emissiveIntensity = r ? 0.5 : 4; }
      if (sw.mesh.visible) sw.update(t);
    },

    async play(env) {
      const { ui } = env;
      // 회사 앞 정류장에서 742번 버스에 탄다
      speed = 0;
      place(scene, mung, [1.7, 0, -4.4], -Math.PI / 2 - 0.4, 'idle', 'happy');
      sfx.door();
      await wait(0.6);
      sfx.blip();
      await say(null, '단말기', '삑— 감사합니다.');
      await walkTo(mung, -0.3, 0.8, 2.4);
      place(scene, mung, [-1.55, 0.38, 0.8], Math.PI - 0.6, 'sitChair', 'open');
      anim(2.5, k => (speed = 40 * k));
      await env.cameraTo(shots.side, 2);
      await say(mung, '멍뭉', '퇴근 버스~ 우기가 10시 반까지 우리 아파트 앞에 잠깐 와 있겠다고 했지. 헤헤.');
      const msg = await env.choice('멍뭉', '(우기한테 연락할까?)', [
        { label: '📱 "나 지금 버스 탔어!" 문자 보낸다', sub: '' },
        { label: '🎧 이어폰 끼고 노래 듣는다', sub: '도착해서 깜짝 등장!' },
      ]);
      env.state.flags.msg = msg;
      if (msg === 0) {
        sfx.blip();
        await say(null, '우기 (문자)', '오 빨리 왔네! 나 편의점에서 아이스크림 사 갈게 🍦');
        await say(mung, '멍뭉', '헤헤, 아이스크림…');
      } else {
        await say(mung, '멍뭉', '(창밖 야경 보면서 노래 듣는 이 시간이 제일 좋아…)');
      }
      // 돌발 퀴즈
      await say(student, '대학생', '(중얼중얼) 아… 내일 운전면허 필기 시험인데… 저기요, 혹시 이거 아세요?');
      await env.popQuiz('bus', {
        asker: '대학생', title: '돌발 퀴즈 · 교통 상식',
        question: '버스 전용차로를 표시하는 차선 색깔은 무슨 색일까요?',
        options: ['노란색', '흰색', '파란색', '빨간색'],
        answer: 2, time: 10,
        right: '파란색! 맞다, 이제 기억났어요. 감사합니다!',
        wrong: '아… 책 보니까 파란색이래요. 하나 배웠네요!',
      });
      // 노선 이탈
      wobble = 0.6;
      ledText = '⚠ 노선 이탈 ⚠  ⚠ 노선 이탈 ⚠'; ledColor = '#ff4040';
      env.shake(0.2);
      await env.cameraTo(shots.wide, 1.2);
      mung.setExpr('surprised');
      emote(scene, mung, '?!', 2);
      await say(mung, '멍뭉', '어…? 왜 좌회전해? 별빛아파트는 직진인데…!');
      mung.setExpr('open');
      await walkTo(mung, -0.3, -2.8, 2.6, Math.PI + 0.5);
      env.cameraTo(shots.front, 1.2);
      mung.setPose('point');
      await say(mung, '멍뭉', '저기, 기사님! 여기 길이 아니—');
      driver.setPose('slump'); driver.setExpr('closed');
      sfx.wrong(); env.shake(0.5);
      wobble = 1.2;
      [grandma, student, worker].forEach(c => { c.setExpr('surprised'); emote(scene, c, ['꺄악!', '헉!!', '어어?!'][[grandma, student, worker].indexOf(c)], 2); });
      worker.setPose('panic');
      mung.setPose('panic'); mung.setExpr('surprised');
      await say(null, '승객들', '기사님이 쓰러지셨어!! 버스가 계속 달려!!');
      mung.setPose('idle'); mung.setExpr('open');
      if (await env.quiz('bus1') === 'fail') return 'fail';
      mk.hide();

      // 정차
      await walkTo(mung, -0.9, -4.3, 2.4, Math.PI);
      mung.setPose('drive');
      blink = true; drawGauge(true);
      sfx.click();
      await say(mung, '멍뭉', '비상등 켜고… 핸들 꽉 잡고… 브레이크 천천히…!');
      await anim(3.5, k => { speed = 40 * (1 - k); wobble = 1.2 * (1 - k); drawGauge(true); }, ease.out);
      speed = 0; wobble = 0; drawGauge(true);
      worker.setPose('idle');
      await say(mung, '멍뭉', '……멈췄다. 휴우…!');
      mung.setPose('idle');
      sw.mesh.visible = true;
      driver.setExpr('sad');
      await walkTo(mung, -0.6, -3.4, 2, Math.PI - 0.6);
      mung.setPose('kneel');
      await say(driver, '기사님', '으… 으으… (식은땀을 흘리며 손을 떤다)');
      await say(mung, '멍뭉', '119에 신고했어요! 기사님, 제 말 들리세요? (고개를 아주 약하게 끄덕인다)');
      mung.setPose('idle');
      if (await env.quiz('bus2') === 'fail') return 'fail';
      mk.hide();

      grandma.setPose('idle'); grandma.setExpr('open');
      await walkTo(grandma, 1.0, -0.4, 1.5);
      await say(grandma, '할머니', '아이고, 이 주스 쓰구려! 우리 영감도 당뇨라 늘 들고 다녀!');
      juice.visible = false;
      await walkTo(mung, -0.7, -3.6, 2.5, Math.PI - 0.6);
      mung.setPose('kneel');
      await wait(0.8);
      driver.setPose('drive'); driver.setExpr('open'); sw.mesh.visible = false;
      await say(driver, '기사님', '고…고맙네, 학생… 머리가 하얘져서… 길을 잘못 들었었구먼…');
      mung.setPose('idle');
      // 구급대 도착
      siren = true; amb.visible = true; sfx.siren();
      env.cameraTo(shots.outside, 1.6);
      await wait(1.8);
      await env.cut(async () => {
        driver.root.visible = false;
        place(scene, driver2, [-0.8, 0, -3.0], Math.PI / 2, 'idle');
        env.cameraSet(shots.front);
      });
      await say(driver2, '대체 기사', '기사님은 구급대가 잘 모셔 갔어요. 회사에서 급히 왔는데… 이 동네는 제가 처음이라서요.');
      await say(driver2, '대체 기사', '별빛아파트까지 어느 길로 가면 될까요? 이 버스, 높이가 3.2m라 아무 길이나 못 가요!');
      mung.setExpr('open');
      await env.cameraTo(shots.mapView, 1.2);
      if (await env.quiz('bus3') === 'fail') return 'fail';
      mk.hide();

      await env.cameraTo(shots.front, 1);
      await say(mung, '멍뭉', '시장 → 학교 → 별빛아파트! 24분이면 22시 29분 도착이에요!');
      place(scene, driver2, [-1.5, 0.38, -4.2], Math.PI, 'drive');
      siren = false; amb.visible = false; sirenLight.intensity = 0; blink = false;
      hazards.forEach(h => (h.material.emissiveIntensity = 0)); hazardLight.intensity = 0;
      ledText = '다음 정류장: 시장 ▶ 학교 ▶ 별빛아파트'; ledColor = '#7cf5c4';
      await anim(2, k => (speed = 40 * k));
      env.cameraTo(shots.wide, 1.5);
      await ui.caption('🚌 22:29 · 별빛아파트 도착', 2);
      await anim(1.5, k => (speed = 40 * (1 - k)));
      ledText = '이번 정류장: 별빛아파트'; ledColor = '#ffcc40';
      [grandma, student, worker, mung].forEach(c => { c.setPose(c === mung ? 'cheer' : c.pose); c.setExpr('happy'); });
      await say(mung, '멍뭉', '도착! 1분 남았다…!');
      await say(null, '우기', '(창밖에서 손을 흔들며) 멍뭉아~! 오늘 고생 많았지? 얼굴 봤으니까 됐어. 내일 데이트 잊지 마 💗');
      await say(mung, '멍뭉', '응! 우기도 조심히 들어가~ 내일 봐!');
      mung.setPose('idle');
      sfx.door();
      await walkTo(mung, 1.6, -4.3, 2.8);
      await ui.fadeTo('#000', 1, 0.8);
      await ui.caption('🛗 우리 집, 별빛아파트 엘리베이터 · 10층…  띵!', 2.2);
      return 'ok';
    },
    debug(state) { if (state === 'stop') { speed = 0; blink = true; driver.setPose('slump'); } },
  };
  return sc;
}
