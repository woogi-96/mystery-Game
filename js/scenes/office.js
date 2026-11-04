import { THREE, box, rbox, cyl, sph, cone, plane, torus, group, mat, emissive, texPlane, canvasTex, tileTex, textSprite, anim, wait, ease, shot, FONT, FONT2, roundRect, rand, setSeed, capsule } from '../util.js';
import { npc } from '../characters.js';
import { place, talker, walkTo, turnTo, emote, chair, marker, dreamy } from './common.js';

/*
 * 꿈 3 · 회사에서 생긴 일
 *  사무실(원점) → 정전 → 정문 → 비상계단(x+60)
 */
export function build(env) {
  const { mung, sfx } = env;
  setSeed(7);
  const scene = new THREE.Scene();
  const BG_ON = new THREE.Color('#2a3350'), BG_OFF = new THREE.Color('#05060c');
  scene.background = BG_ON.clone();
  scene.fog = new THREE.Fog('#2a3350', 30, 90);

  const W = 12, D = 8, H = 5.2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: tileTex('#8e98a8', '#7d8797', 2, [8, 6]), roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  box(W * 2 + 0.3, 0.4, D * 2 + 0.3, '#3a3f4c', { pos: [0, -0.22, 0], parent: scene });
  const wallM = mat('#e9edf3');
  box(0.3, H, D * 2, wallM, { pos: [-W, H / 2, 0], parent: scene });
  box(0.3, H, D * 2, wallM, { pos: [W, H / 2, 0], parent: scene });
  // 뒷벽: 통유리 + 야경
  box(W * 2, 0.6, 0.3, wallM, { pos: [0, 0.3, -D], parent: scene });
  box(W * 2, 0.5, 0.3, wallM, { pos: [0, H - 0.25, -D], parent: scene });
  for (let i = 0; i <= 8; i++) box(0.15, H, 0.35, '#c4cad4', { pos: [-W + i * 3, H / 2, -D], parent: scene });
  const city = texPlane(60, 16, 1024, 280, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2350'); gr.addColorStop(0.7, '#e88aa0'); gr.addColorStop(1, '#ffc49a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const bw = 14 + Math.random() * 30, bh = 60 + Math.random() * 170, bx = i * 23 - 10;
      g.fillStyle = ['#2b2f52', '#363a62', '#23264a'][i % 3]; g.fillRect(bx, h - bh, bw, bh);
      for (let y = h - bh + 6; y < h - 6; y += 10) for (let x = bx + 3; x < bx + bw - 4; x += 7) if (Math.random() < 0.45) { g.fillStyle = Math.random() < 0.8 ? '#ffe9a6' : '#a6e0ff'; g.fillRect(x, y, 3, 4); }
    }
  }, { pos: [0, 5, -D - 14], parent: scene });
  city.material = new THREE.MeshBasicMaterial({ map: city.tex, fog: false });
  // 천장 조명 패널
  const panels = [];
  for (let x = -8; x <= 8; x += 4) for (let z = -5; z <= 5; z += 3.3) {
    const p = plane(2.2, 0.8, emissive('#ffffff', 1.4), { pos: [x, H - 0.02, z], rot: [Math.PI / 2, 0, 0], parent: scene });
    panels.push(p);
  }
  const ceilLights = [];
  for (const [x, z] of [[-6, -3], [0, -3], [6, -3], [-6, 3], [0, 3], [6, 3]]) {
    const l = new THREE.PointLight('#f2f6ff', 9, 14, 1.4); l.position.set(x, H - 0.4, z); scene.add(l); ceilLights.push(l);
  }

  /* 책상 줄 */
  const monitors = [];
  const emailTex = canvasTex(512, 300, () => {});
  function drawEmail(sent) {
    emailTex.redraw((g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3b6fd8'; g.fillRect(0, 0, w, 36);
      g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText('새 메일', 14, 25);
      g.fillStyle = '#555'; g.font = `18px ${FONT2}`;
      g.fillText('받는 사람: 팀 전체', 16, 66); g.fillText('제목: [배포] v2.3 릴리즈 완료 보고', 16, 96);
      g.fillStyle = '#888'; g.fillText('오늘 배포 무사히 끝났습니다. 다들 고생 많으셨어요!', 16, 140); g.fillText('— 멍뭉 드림', 16, 168);
      g.fillStyle = sent ? '#888' : '#3b6fd8'; roundRect(g, w - 140, h - 60, 120, 42, 10); g.fill();
      g.fillStyle = '#fff'; g.font = `22px ${FONT}`; g.fillText('보내기', w - 115, h - 32);
      // 커서
      g.fillStyle = '#111'; g.beginPath(); g.moveTo(w - 70, h - 40); g.lineTo(w - 70, h - 14); g.lineTo(w - 63, h - 21); g.lineTo(w - 56, h - 8); g.lineTo(w - 52, h - 10); g.lineTo(w - 59, h - 23); g.lineTo(w - 49, h - 24); g.closePath(); g.fill();
    });
  }
  drawEmail(false);
  const codeTex = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#1e1f29'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { let x = 10 + (i % 4) * 10; for (let k = 0; k < 3; k++) { const pw = 10 + Math.random() * 50; g.fillStyle = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9'][Math.floor(Math.random() * 5)]; g.fillRect(x, 8 + i * 11, pw, 5); x += pw + 6; } }
  });
  function workDesk(x, z, rot, isMung) {
    const g = group(scene, [x, 0, z], [0, rot, 0]);
    rbox(2.6, 0.08, 1.3, 0.02, '#f4f1ec', { pos: [0, 1.25, 0], parent: g });
    for (const s of [-1, 1]) box(0.06, 1.25, 1.2, '#b8bec8', { pos: [s * 1.25, 0.62, 0], parent: g });
    box(2.6, 0.5, 0.05, '#cdd9e8', { pos: [0, 1.5, -0.65], parent: g });
    for (const s of [-0.55, 0.55]) {
      const m = group(g, [s, 1.29, -0.3]);
      box(0.08, 0.45, 0.06, '#333', { pos: [0, 0.22, -0.05], parent: m });
      rbox(1.05, 0.65, 0.05, 0.02, '#1f2026', { pos: [0, 0.65, 0], parent: m });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.58), new THREE.MeshStandardMaterial({ map: isMung && s > 0 ? emailTex : codeTex, emissive: '#ffffff', emissiveMap: isMung && s > 0 ? emailTex : codeTex, emissiveIntensity: 0.8 }));
      scr.position.set(0, 0.65, 0.03); m.add(scr);
      monitors.push(scr);
    }
    rbox(0.8, 0.03, 0.28, 0.01, '#e8e8ec', { pos: [0, 1.31, 0.2], parent: g });
    if (isMung) {
      // 노트북 (배터리로 켜져 있음)
      const lap = group(g, [-1.0, 1.29, 0.1], [0, 0.4, 0]);
      rbox(0.6, 0.03, 0.42, 0.02, '#c9ccd2', { parent: lap });
      const lid = group(lap, [0, 0, -0.2], [-0.3, 0, 0]);
      rbox(0.6, 0.4, 0.02, 0.02, '#c9ccd2', { pos: [0, 0.2, 0], parent: lid });
      plane(0.54, 0.34, emissive('#bfe0ff', 0.9), { pos: [0, 0.2, 0.012], parent: lid });
    }
    // 소품
    cyl(0.08, 0.07, 0.2, ['#ffc4d4', '#c4e8ff', '#fff2b0'][Math.floor(rand(0, 3))], { pos: [0.95, 1.39, 0.2], parent: g });
    if (rand() < 0.5) { const pl = group(g, [-1.05, 1.29, -0.35]); cyl(0.12, 0.1, 0.2, '#fff', { pos: [0, 0.1, 0], parent: pl }); sph(0.18, '#6fbf73', { pos: [0, 0.32, 0], parent: pl }); }
    chair(scene, x + Math.sin(rot) * 1.0, z + Math.cos(rot) * 1.0, rot + Math.PI, '#3b4252');
    return g;
  }
  const deskSpots = [];
  for (const x of [-6.5, -3.5, 0.5, 3.5]) for (const [z, r] of [[-3.2, 0], [-0.8, Math.PI], [2.4, 0], [4.8, Math.PI]]) {
    const isMung = x === 0.5 && z === 2.4;
    workDesk(x, z, r, isMung);
    deskSpots.push({ x, z, r });
  }

  /* 회의실(유리) + 폰부스 (오른쪽) */
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#d8ecff', transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide });
  const meet = group(scene, [9.0, 0, -4.5]);
  for (const [w, x, z, ry] of [[5.6, 0, 2.2, 0], [4.4, -2.8, 0, Math.PI / 2]]) { const gp = new THREE.Mesh(new THREE.PlaneGeometry(w, H), glassM); gp.position.set(x, H / 2, z); gp.rotation.y = ry; meet.add(gp); }
  rbox(3.2, 0.08, 1.6, 0.04, '#d9c2a2', { pos: [0.4, 1.2, -0.4], parent: meet });
  box(0.1, 1.2, 0.1, '#888', { pos: [0.4, 0.6, -0.4], parent: meet });
  texPlane(1.8, 0.4, 300, 66, (g, w, h) => { g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fd8ff'; g.font = `36px ${FONT}`; g.fillText('회의실 A', 20, 46); }, { pos: [0, 3.4, 2.22], parent: meet });
  const booth = group(scene, [9.8, 0, 3.4]);
  rbox(2.2, H - 0.4, 2.2, 0.15, mat('#5a6a88'), { pos: [0, (H - 0.4) / 2, -0.4], parent: booth });
  const boothFront = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.6), glassM);
  boothFront.position.set(-1.12, 2.0, -0.4); boothFront.rotation.y = -Math.PI / 2; booth.add(boothFront);
  const boothHole = plane(1.6, 3.6, mat('#202838'), { pos: [-1.1, 2.0, -0.4], rot: [0, -Math.PI / 2, 0], parent: booth });
  const boothSign = texPlane(1.2, 0.35, 240, 70, (g, w, h) => { g.fillStyle = '#e04a6a'; roundRect(g, 0, 0, w, h, 14); g.fill(); g.fillStyle = '#fff'; g.font = `34px ${FONT}`; g.textAlign = 'center'; g.fillText('🔇 사용 중', w / 2, 48); }, { glow: 0.8, pos: [-1.13, 4.1, -0.4], rot: [0, -Math.PI / 2, 0], parent: booth });
  const boothLight = new THREE.PointLight('#ffd6a0', 3, 3, 2); boothLight.position.set(9.6, 3, 3.0); scene.add(boothLight);

  /* 정문 + 카드리더 + 비상 해제 버튼 (왼쪽 벽) */
  const doorG = group(scene, [-W + 0.2, 0, -1.0]);
  box(0.25, 4.0, 3.2, '#c4cad4', { pos: [0, 2.0, 0], parent: doorG });
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.7, 1.45), new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.5, roughness: 0.1 }));
  doorL.position.set(0.15, 1.85, -0.75); doorG.add(doorL);
  const doorR = doorL.clone(); doorR.position.z = 0.75; doorG.add(doorR);
  box(0.2, 0.15, 3.0, '#555', { pos: [0.12, 3.75, 0], parent: doorG });
  const maglock = rbox(0.18, 0.12, 0.45, 0.02, '#8a8f98', { pos: [0.2, 3.62, 0], parent: doorG });
  const reader = group(doorG, [0.2, 1.6, 2.0]);
  rbox(0.08, 0.38, 0.26, 0.03, '#2a2d34', { parent: reader });
  const readerLed = sph(0.04, emissive('#ff3030', 2), { pos: [0.05, 0.12, 0], parent: reader, cast: false });
  const breakGlass = group(doorG, [0.2, 1.6, 2.55]);
  rbox(0.1, 0.4, 0.36, 0.03, '#2fbf71', { parent: breakGlass });
  const bgBtn = cyl(0.08, 0.08, 0.06, emissive('#ff4040', 0.6), { pos: [0.06, 0, 0], rot: [0, 0, Math.PI / 2], parent: breakGlass });
  const bgCover = plane(0.28, 0.32, new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }), { pos: [0.07, 0, 0], rot: [0, Math.PI / 2, 0], parent: breakGlass });
  const blueprint = texPlane(1.6, 1.2, 320, 240, (g, w, h) => {
    g.fillStyle = '#1e4fa0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#cfe6ff'; g.lineWidth = 2;
    for (let i = 0; i < w; i += 20) { g.globalAlpha = 0.2; g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    g.globalAlpha = 1; g.font = `20px ${FONT}`; g.fillStyle = '#fff'; g.fillText('설비 계통도', 12, 26);
    g.strokeRect(30, 60, 80, 50); g.fillText('UPS', 48, 92);
    g.strokeRect(200, 60, 90, 50); g.fillText('서버', 222, 92);
    g.strokeRect(200, 160, 90, 50); g.fillText('정문 잠금', 204, 192);
    g.lineWidth = 4; g.strokeStyle = '#ffd34d';
    g.beginPath(); g.moveTo(110, 85); g.lineTo(200, 85); g.moveTo(140, 85); g.lineTo(140, 185); g.lineTo(200, 185); g.stroke();
  }, { pos: [-W + 0.17, 2.6, 3.2], rot: [0, Math.PI / 2, 0], parent: scene });
  // 비상구 유도등 (배터리)
  function exitSign(x, y, z, ry) {
    return texPlane(1.2, 0.45, 240, 90, (g, w, h) => {
      g.fillStyle = '#16c060'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText('🏃 비상구', 30, 62);
    }, { glow: 1.4, pos: [x, y, z], rot: [0, ry, 0], parent: scene });
  }
  const exitSign1 = exitSign(-W + 0.17, 4.35, -1.0, Math.PI / 2);
  const exitGlow = new THREE.PointLight('#30ff80', 0, 7, 1.6); exitGlow.position.set(-W + 1, 4.2, -1); scene.add(exitGlow);
  // 엘리베이터
  const elev = group(scene, [-W + 0.2, 0, -5.6]);
  box(0.25, 4.2, 2.6, '#9aa3b0', { pos: [0, 2.1, 0], parent: elev });
  const elevDoors = [-1, 1].map(s => box(0.08, 3.8, 1.15, mat('#c7ccd4', { metalness: 0.8, roughness: 0.25 }), { pos: [0.12, 1.9, s * 0.6], parent: elev }));
  plane(2.3, 3.8, emissive('#fff3d6', 0.9), { pos: [-0.05, 1.9, 0], rot: [0, Math.PI / 2, 0], parent: elev });
  const elevBtn = sph(0.06, emissive('#ffcc40', 1.2), { pos: [0.2, 1.7, 1.5], parent: elev, cast: false });
  texPlane(0.9, 0.3, 200, 66, (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 200, 66); g.fillStyle = '#ff6040'; g.font = `40px ${FONT}`; g.fillText('▲ 12F', 30, 48); }, { glow: 0.6, pos: [0.15, 4.0, 0], rot: [0, Math.PI / 2, 0], parent: elev });
  // 서버실 + UPS
  const server = group(scene, [-7.5, 0, -D + 0.2]);
  box(2.4, 4.0, 0.2, '#6a7488', { pos: [0, 2.0, 0], parent: server });
  texPlane(1.6, 0.4, 300, 75, (g) => { g.fillStyle = '#222'; g.fillRect(0, 0, 300, 75); g.fillStyle = '#fff'; g.font = `40px ${FONT}`; g.fillText('🖥 서버실', 50, 52); }, { pos: [0, 4.3, 0.12], parent: server });
  const upsPanel = texPlane(0.9, 0.6, 240, 160, () => {}, { glow: 1.0, pos: [1.7, 1.9, 0.13], parent: server });
  let upsLeft = 7;
  function drawUps(on) {
    upsPanel.tex.redraw((g, w, h) => {
      g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
      g.fillStyle = on ? '#ffb020' : '#30d070'; g.font = `26px ${FONT}`; g.fillText(on ? '⚠ UPS 배터리 모드' : 'UPS 정상', 14, 40);
      g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText(on ? `남은 시간 ${upsLeft}분` : 'AC 220V', 14, 110);
    });
  }
  drawUps(false);
  // 화분, 정수기, 화이트보드
  for (const [x, z] of [[-10.6, 6.5], [10.6, 6.6], [-10.6, -7]]) { const p = group(scene, [x, 0, z]); cyl(0.4, 0.32, 0.8, '#fff', { pos: [0, 0.4, 0], parent: p }); for (let i = 0; i < 6; i++) sph(0.4, '#5aa65a', { pos: [Math.cos(i) * 0.3, 1.3 + (i % 3) * 0.3, Math.sin(i) * 0.3], scale: [0.6, 1.3, 0.6], parent: p }); }
  const wb = texPlane(3, 1.6, 450, 240, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0457b'; g.font = `40px ${FONT}`; g.fillText('🚀 v2.3 배포 D-DAY', 20, 54); g.fillStyle = '#3a5ec2'; g.font = `28px ${FONT2}`; ['✔ QA 통과', '✔ 배포 완료', '□ 완료 메일 발송 (멍뭉)'].forEach((t, i) => g.fillText(t, 30, 110 + i * 40)); }, { pos: [W - 0.17, 2.6, 0.3], rot: [0, -Math.PI / 2, 0], parent: scene });

  // 박사원 책상: 빈 헤드폰 케이스 + 메모
  const pc = group(scene, [2.9, 1.29, 2.55]);
  rbox(0.42, 0.1, 0.36, 0.05, '#2b2d36', { pos: [0, 0.05, 0], parent: pc });
  rbox(0.42, 0.1, 0.36, 0.05, '#2b2d36', { pos: [0, 0.2, -0.22], rot: [-1.2, 0, 0], parent: pc });
  box(0.34, 0.02, 0.28, '#6a6f80', { pos: [0, 0.1, 0], parent: pc, cast: false });
  texPlane(0.32, 0.32, 128, 128, (g, w, h) => { g.fillStyle = '#ffe97a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a3d5c'; g.font = `20px ${FONT}`; g.fillText('21:30', 10, 34); g.font = `17px ${FONT2}`; g.fillText('폰부스', 10, 64); g.fillText('LA 화상', 10, 90); g.fillText('회의!', 10, 114); }, { pos: [3.5 + 0.55 + 0.42, 2.15, 2.12], rot: [0, -0.05, 0.08], parent: scene });

  /* 동료들 */
  const crewDef = [
    ['김팀장', 'office1', { glasses: true, hairColor: '#555' }],
    ['한책임', 'office4', {}],
    ['이대리', 'office1', { tie: '#c0392b', top: '#f4f4f4' }],
    ['박사원', 'office2', { headphones: '#f4f4f4' }],
    ['최주임', 'office3', {}],
    ['정인턴', 'student3', { vest: null, tie: null, top: '#ffe0a6', topKind: 'hoodie', lanyard: '#3b82f6' }],
    ['오선임', 'office2', { top: '#c8d8ff', hair: 'long', hairColor: '#2a1a14' }],
  ];
  const crew = {};
  const crewSeats = [[-6.5, -3.2 + 1.0, Math.PI], [-3.5, -3.2 + 1.0, Math.PI], [3.5, -0.8 - 1.0, 0], [3.5, 2.4 + 1.0, Math.PI], [-3.5, 4.8 - 1.0, 0], [-6.5, 2.4 + 1.0, Math.PI], [0.5, -0.8 - 1.0, 0]];
  crewDef.forEach(([name, kind, extra], i) => { crew[name] = npc(kind, extra); crew[name].name = name; });
  const crewList = Object.values(crew);

  /* 비상계단 (x + 60) */
  const SX = 60;
  const stairs = group(scene, [SX, 0, 0]);
  box(14, 0.4, 10, '#6b6f78', { pos: [0, -0.22, 0], parent: stairs });
  box(14, 9, 0.3, '#8a8e96', { pos: [0, 4.5, -5], parent: stairs });
  box(0.3, 9, 10, '#7f838c', { pos: [-7, 4.5, 0], parent: stairs });
  const landing = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), mat('#9a9ea6'));
  landing.rotation.x = -Math.PI / 2; landing.position.y = 0.01; landing.receiveShadow = true; stairs.add(landing);
  for (let i = 0; i < 12; i++) {
    box(3.2, 0.35, 0.7, '#a8acb4', { pos: [4.6, 0.17 + i * 0.35, 3.5 - i * 0.7], parent: stairs });
    box(3.2, 0.35, 0.7, '#a8acb4', { pos: [4.6, -0.17 - i * 0.35 - 0.2, 4.2 + i * 0.7], parent: stairs, cast: false });
  }
  for (let i = 0; i < 12; i++) cyl(0.035, 0.035, 1.2, '#ffcc40', { pos: [3.0, 0.6 + i * 0.35 + 0.6, 3.5 - i * 0.7], parent: stairs });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 9.3, 8), mat('#ffcc40'));
  rail.position.set(SX + 3.0, 3.3, -0.35); rail.rotation.x = Math.atan2(0.35, 0.7) - Math.PI / 2 + Math.PI; scene.add(rail);
  texPlane(2.6, 1.2, 360, 160, (g, w, h) => { g.fillStyle = '#222'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc40'; g.font = `80px ${FONT}`; g.fillText('12F', 30, 110); g.fillStyle = '#fff'; g.font = `34px ${FONT2}`; g.fillText('↓ 1F 출구', 190, 100); }, { pos: [-2, 3.5, -4.83], parent: stairs });
  const exitSign2 = exitSign(SX - 2, 5.4, -4.83, 0);
  const emerLamp = new THREE.PointLight('#ff4040', 0, 18, 1.4); emerLamp.position.set(SX, 6, 0); scene.add(emerLamp);
  const stairGreen = new THREE.PointLight('#40ff90', 6, 16, 1.4); stairGreen.position.set(SX - 2, 5, -3.5); scene.add(stairGreen);
  const lineup = [[-4.5, 1.8], [-3.2, 1.2], [-1.9, 0.8], [-0.6, 0.6], [0.7, 0.8], [2.0, 1.2]];

  /* 조명 */
  const hemi = new THREE.HemisphereLight('#e8eeff', '#5a6070', 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffffff', 1.0);
  key.position.set(6, 14, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(key);
  const red = new THREE.SpotLight('#ff2a2a', 0, 30, 0.6, 0.5, 1.2);
  red.position.set(-W + 1, H - 0.3, -1); scene.add(red, red.target);
  const flashlight = new THREE.SpotLight('#fffbe0', 0, 18, 0.45, 0.4, 1.2);
  flashlight.castShadow = true;
  scene.add(flashlight, flashlight.target);

  const sp = dreamy(scene, { x: [-12, 12], y: [0.5, 5], z: [-8, 8] }, 0xd8e8ff);
  const sp2 = dreamy(scene, { x: [SX - 7, SX + 7], y: [0.5, 7], z: [-5, 5] }, 0xd8e8ff);
  const mk = marker(scene);

  /* 카메라 */
  const shots = {
    wide: shot([2, 9.5, 18], [0, 1.2, 0], 50),
    desk: shot([2.6, 2.7, 5.6], [0.8, 1.9, 2.0], 44),
    screen: shot([1.5, 2.25, 3.2], [1.05, 1.95, 1.9], 36),
    dark: shot([4, 6.5, 12], [-3, 1.2, -1], 52),
    door: shot([-6.5, 3.2, 3.5], [-11.5, 2.0, -0.5], 50),
    elevIn: shot([-6.8, 3.0, -1.8], [-11.2, 1.9, -5.6], 50),
    stairs: shot([SX - 1, 4.0, 8.5], [SX - 1.2, 1.4, 0], 52),
  };
  const focus = {
    exitSign: { ...shot([-8, 3.4, 1.5], [-11.8, 4.3, -1.0], 40) },
    elevator: { ...shot([-8.5, 2.6, -3.0], [-11.8, 2.0, -5.6], 42) },
    ups: { ...shot([-6.0, 2.3, -4.6], [-5.8, 1.9, -7.8], 38) },
    desk: { ...shot([1.6, 2.5, 5.0], [0.3, 1.6, 2.2], 40) },
    maglock: { ...shot([-9.6, 3.4, 0.4], [-11.6, 3.6, -1.0], 38) },
    reader: { ...shot([-10.0, 2.0, 1.9], [-11.6, 1.6, 1.0], 34) },
    blueprint: { ...shot([-9.4, 2.6, 3.2], [-11.8, 2.6, 3.2], 40) },
    breakglass: { ...shot([-10.0, 1.9, 2.6], [-11.6, 1.6, 1.55], 32) },
    stairs: shot([SX - 1, 4.5, 8.0], [SX - 1.2, 1.2, 0.5], 55),
    lee: { ...shot([SX + 1.5, 2.8, 4.5], [SX + 2.0, 1.6, 1.2], 38), mark: [SX + 2.0, 0.05, 1.2] },
    parkDesk: { ...shot([3.3, 3.2, 6.0], [3.5, 1.6, 2.4], 40) },
    booth: { ...shot([6.0, 2.8, 5.5], [9.8, 2.0, 3.0], 44), mark: [9.4, 0.05, 3.0], r: 1.2 },
  };

  const say = talker(env.ui);
  let blackout = 0;
  let redSweep = 0;

  function setBlackout(k) {
    blackout = k;
    const on = 1 - k;
    panels.forEach(p => (p.material.emissiveIntensity = 1.4 * on));
    ceilLights.forEach(l => (l.intensity = 9 * on));
    monitors.forEach(m => (m.material.emissiveIntensity = 0.8 * on, m.material.color.setScalar(0.1 + on * 0.9)));
    hemi.intensity = 0.9 * on + 0.12;
    key.intensity = 1.0 * on;
    scene.background.copy(BG_ON).lerp(BG_OFF, k);
    scene.fog.color.copy(scene.background);
    exitGlow.intensity = 8 * k;
    red.intensity = 80 * k;
    elevBtn.material.emissiveIntensity = 1.2 * on;
    flashlight.intensity = 60 * k;
  }

  const sc = {
    scene, shots, focus, marker: mk, actors: crewList, cast: crew,
    startShot: () => shots.elevIn,
    reset() {
      setBlackout(0);
      elevDoors.forEach((d, i) => (d.position.z = (i ? 1 : -1) * 0.6));
      drawEmail(false); upsLeft = 7; drawUps(false);
      place(scene, mung, [0.5, 0.38, 3.4], Math.PI, 'type');
      crewList.forEach((c, i) => {
        const [x, z, r] = crewSeats[i];
        place(scene, c, [x, 0.38, z], r, 'type');
      });
      crew['박사원'].root.position.set(9.6, 0, 3.0);
      crew['박사원'].root.rotation.y = -Math.PI / 2;
      crew['박사원'].setPose('think');
      readerLed.material.emissive.set('#ff3030'); readerLed.material.color.set('#ff3030');
      doorL.position.z = -0.75; doorR.position.z = 0.75;
      bgCover.visible = true;
      boothLight.intensity = 3;
    },
    onEnter() { scene.add(mung.root); },
    update(dt, t) {
      sp.update(t); sp2.update(t); mk.update(t);
      if (blackout > 0.5) {
        redSweep += dt * 2.5;
        red.target.position.set(-W + 1 + Math.cos(redSweep) * 8, 0, -1 + Math.sin(redSweep) * 8);
        // 손전등은 멍뭉이 앞을 비춘다
        const p = mung.root.position, ry = mung.root.rotation.y;
        flashlight.position.set(p.x + Math.sin(ry) * 0.4, 1.8, p.z + Math.cos(ry) * 0.4);
        flashlight.target.position.set(p.x + Math.sin(ry) * 6, 0.5, p.z + Math.cos(ry) * 6);
        exitSign1.material.emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.2;
      }
    },

    async play(env) {
      const { ui } = env;
      // 동굴의 빛 → 회사 엘리베이터 문이 열린다
      place(scene, mung, [-11.0, 0, -5.6], Math.PI / 2, 'idle', 'surprised');
      sfx.blip();
      await anim(1.0, k => elevDoors.forEach((d, i) => (d.position.z = (i ? 1 : -1) * (0.6 + k * 1.1))));
      await walkTo(mung, -9.2, -5.2, 2.2);
      await say(mung, '멍뭉', '……어? 동굴 문을 나섰더니… 바로 우리 회사 12층?! 꿈이라 순간이동인가 봐.');
      mung.setExpr('open');
      await say(mung, '멍뭉', '오후 1시, 딱 출근 시간이다! 오늘 v2.3 배포날이니까 얼른 자리로 가자.');
      anim(1.0, k => elevDoors.forEach((d, i) => (d.position.z = (i ? 1 : -1) * (1.7 - k * 1.1))));
      env.cameraTo(shots.wide, 2.4);
      await walkTo(mung, -1.5, 5.6, 3.0);
      await walkTo(mung, 0.5, 4.4, 3.0);
      place(scene, mung, [0.5, 0.38, 3.4], Math.PI, 'type');
      await env.cameraTo(shots.desk, 1.6);
      await ui.caption('⏩ 오후 내내 개발하고, 야근까지… 밤 9시 32분', 2.2);
      await say(mung, '멍뭉', '배포 끝! 이제 완료 메일만 보내면 퇴근이다…!');
      await env.cameraTo(shots.screen, 1.4);
      await say(mung, '멍뭉', '"보내기" 클릭~');
      ui.hideDialog();
      await wait(0.4);
      // 정전!
      sfx.power();
      for (let i = 0; i < 4; i++) { setBlackout(i % 2 ? 0.2 : 0.9); await wait(0.08); }
      setBlackout(1);
      drawUps(true);
      env.shake(0.4);
      await wait(0.8);
      env.cameraTo(shots.dark, 1.6);
      crewList.forEach((c, i) => { if (c.name !== '박사원') { c.setPose('panic'); c.setExpr('surprised'); emote(scene, c, ['?!', '!!', '헉', '뭐야?!'][i % 4], 2); } });
      mung.setPose('panic'); mung.setExpr('surprised');
      await say(null, '동료들', '으악! 정전이야?! 아무것도 안 보여!!');
      sfx.alarm();
      await say(mung, '멍뭉', '메…메일은?! … 아니, 지금 그게 중요한 게 아니지.');
      mung.setPose('idle'); mung.setExpr('open');
      if (await env.quiz('office1') === 'fail') return 'fail';
      mk.hide();

      await walkTo(mung, -1.5, 6.0, 2.6);
      mung.setPose('cheer');
      await say(mung, '멍뭉', '모두 침착하세요! 엘리베이터 말고 계단으로 갑니다! 초록 유도등 따라 정문 쪽으로 모여요!');
      mung.setPose('idle');
      // 모두 정문으로 (박사원은 부스 안에 그대로)
      const gather = [[-8.5, 2.5], [-8.0, 3.6], [-9.2, 4.4], [-7.6, 5.0], [-6.8, 3.0], [-9.6, 5.6]];
      let gi = 0;
      crewList.forEach(c => { if (c.name === '박사원') return; c.setPose('idle'); c.setExpr('open'); const [x, z] = gather[gi++]; walkTo(c, x, z, 3, -Math.PI / 2); });
      env.cameraTo(shots.door, 2.2);
      await walkTo(mung, -10.2, 1.4, 3, -Math.PI / 2);
      sfx.wrong();
      await say(mung, '멍뭉', '삑— … 어? 카드를 찍었는데 문이 안 열려!');
      upsLeft = 6; drawUps(true);
      await say(crew['이대리'], '이대리', '정전이면 원래 문이 열리는 거 아니었어?!');
      if (await env.quiz('office2') === 'fail') return 'fail';
      mk.hide();

      env.cameraTo(focus.breakglass, 1);
      await wait(0.8);
      sfx.click(); bgCover.visible = false;
      await wait(0.3);
      sfx.door();
      readerLed.material.emissive.set('#000'); readerLed.material.color.set('#222');
      await anim(1.0, k => { doorL.position.z = -0.75 - k * 1.3; doorR.position.z = 0.75 + k * 1.3; });
      await env.cameraTo(shots.door, 0.8);
      await say(mung, '멍뭉', '열렸다! 잠금장치 전원만 끊으면 되는 거였어. 다들 계단으로!');
      // 비상계단
      await env.cut(async () => {
        emerLamp.intensity = 25;
        let i = 0;
        crewList.forEach(c => {
          if (c.name === '박사원') { c.root.visible = false; return; }
          const [x, z] = lineup[i++];
          place(scene, c, [SX + x, 0, z], 0.1, 'idle');
        });
        crew['이대리'].root.position.set(SX + 2.0, 0, 1.2);
        place(scene, mung, [SX - 1.0, 0, 4.0], Math.PI, 'point');
        env.cameraSet(shots.stairs);
      });
      env.ui.captionOn('출발 인원: 멍뭉 포함 8명');
      await wait(1.0);
      const counted = crewList.filter(c => c.name !== '박사원');
      for (let i = 0; i < counted.length; i++) {
        await turnTo(mung, Math.atan2(counted[i].root.position.x - mung.root.position.x, counted[i].root.position.z - mung.root.position.z) + 0, 0.25);
        emote(scene, counted[i], String(i + 1), 2.5);
        sfx.click();
        await wait(0.35);
      }
      env.ui.captionOff();
      mung.setPose('think');
      await say(mung, '멍뭉', '하나, 둘, 셋, 넷, 다섯, 여섯…? 여섯 명?!');
      if (await env.quiz('office3') === 'fail') return 'fail';
      mk.hide();

      // 박사원 구출
      await env.cut(async () => {
        crewList.forEach(c => (c.root.visible = c.name === '박사원'));
        crew['박사원'].root.visible = true;
        place(scene, mung, [7.0, 0, 3.0], Math.PI / 2, 'idle');
        env.cameraSet(focus.booth);
      });
      await walkTo(mung, 8.3, 3.0, 2.5, Math.PI / 2);
      const park = crew['박사원'];
      await turnTo(park, Math.PI / 2 + Math.PI, 0.4);
      park.setExpr('surprised');
      emote(scene, park, '?!', 2);
      await say(park, '박사원', '(헤드폰을 벗으며) 어…? 멍뭉님? 왜 이렇게 어두워요? 화면이 끊겨서 와이파이 문제인 줄…');
      await say(mung, '멍뭉', '정전이에요! 노이즈캔슬링 때문에 하나도 못 들으셨구나. 빨리 가요!');
      await env.cut(async () => {
        let i = 0;
        crewList.forEach(c => {
          c.root.visible = true;
          if (c.name === '박사원') { place(scene, c, [SX + 3.3, 0, 1.8], 0.1, 'cheer', 'happy'); return; }
          const [x, z] = lineup[i++];
          place(scene, c, [SX + x, 0, z], 0.1, 'cheer', 'happy');
        });
        place(scene, mung, [SX - 1.0, 0, 4.0], 0.2, 'cheer', 'happy');
        env.cameraSet(shots.stairs);
      });
      await say(crew['김팀장'], '김팀장', '8명 전원 확인! 멍뭉 덕분에 다 무사하다. 고마워!');
      await say(mung, '멍뭉', '헤헤… 아, 근데 그 메일… 안 보내졌겠지…?');
      await say(crew['오선임'], '오선임', '걱정 마요~ 메일은 "임시 저장"돼 있을 거예요 ㅎㅎ');
      mung.setPose('idle'); mung.setExpr('happy');
      await say(mung, '멍뭉', '다행이다! 그럼 다 같이 1층으로 내려가요. 저는 버스 타고 퇴근할게요. 우기가 아파트 앞으로 잠깐 온댔거든요!');
      await ui.fadeTo('#000', 1, 0.9);
      await ui.caption('🚏 회사 앞 버스 정류장 · 밤 10시 3분 · 742번 버스가 들어온다', 2.4);
      return 'ok';
    },

    debug(state) {
      if (state === 'dark') setBlackout(1);
      if (state === 'stairs') { emerLamp.intensity = 25; setBlackout(1); let i = 0; crewList.forEach(c => { if (c.name === '박사원') return; const [x, z] = lineup[i++]; place(scene, c, [SX + x, 0, z], 0.1); }); place(scene, mung, [SX - 1, 0, 4], Math.PI, 'point'); }
    },
  };
  return sc;
}
