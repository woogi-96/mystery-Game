import { THREE, box, rbox, cyl, sph, plane, group, mat, emissive, texPlane, canvasTex, woodTex, tileTex, textSprite, anim, wait, ease, shot, FONT, FONT2, wrapText, roundRect, skyDome, tree, cone, capsule } from '../util.js';
import { npc } from '../characters.js';
import { place, talker, walkTo, turnTo, emote, chair, desk, marker, dreamy } from './common.js';

/*
 * 꿈 1 · 학교에서 생긴 일
 *  - 교실(원점): 생물 → 수학 수업
 *  - 코딩 동아리방(x+40): 사라진 축제 빌드 갈등
 */
export function build(env) {
  const { mung, sfx } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f6e6f5');
  scene.fog = new THREE.Fog('#f6e6f5', 30, 80);
  const actors = [];

  /* ───────── 하늘 / 바깥 ───────── */
  const sky = skyDome('#9cc9ff', '#fde8f4', 150);
  scene.add(sky);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#a8d98f'));
  outside.rotation.x = -Math.PI / 2; outside.position.y = -0.05; outside.receiveShadow = true; scene.add(outside);
  for (let i = 0; i < 9; i++) tree(scene, -16 - Math.random() * 6, -10 + i * 3, 1.1 + Math.random() * 0.4, ['#ffc4dc', '#ffb0cf', '#ffd6e6']);
  // 대학 캠퍼스: 본관 + 시계탑 + 잔디 광장 + 다른 강의동
  const campus = group(scene, [-34, 0, 0]);
  const brick = mat('#c9785a'), stone = mat('#efe6d6');
  box(10, 9, 22, brick, { pos: [-4, 4.5, 0], parent: campus });
  for (let f = 0; f < 3; f++) for (let k = 0; k < 7; k++) box(0.2, 1.4, 1.6, emissive('#cfe6ff', 0.2), { pos: [1.05, 1.6 + f * 2.6, -9 + k * 3], parent: campus });
  box(10.4, 0.6, 22.4, stone, { pos: [-4, 9.2, 0], parent: campus });
  const tower = group(campus, [-2, 0, 0]);
  box(4, 16, 4, brick, { pos: [0, 8, 0], parent: tower });
  cone(3.2, 4, mat('#4a6a8a'), { pos: [0, 18, 0], rot: [0, Math.PI / 4, 0], parent: tower, seg: 4 });
  const tclock = texPlane(2.6, 2.6, 256, 256, (g, w, h) => { g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 8; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.moveTo(128, 128); g.lineTo(190, 128); g.stroke(); }, { pos: [2.02, 13, 0], rot: [0, Math.PI / 2, 0], parent: tower, transparent: true });
  const banner = texPlane(12, 1.6, 900, 120, (g, w, h) => { g.fillStyle = '#1f3a6b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe08a'; g.font = `80px ${FONT}`; g.textAlign = 'center'; g.fillText('꿈나라대학교', w / 2, 92); }, { pos: [1.1, 7.2, 6], rot: [0, Math.PI / 2, 0], parent: campus });
  const lawnPath = new THREE.Mesh(new THREE.PlaneGeometry(20, 3), mat('#e8dcc4'));
  lawnPath.rotation.x = -Math.PI / 2; lawnPath.position.set(-24, 0.01, 0); scene.add(lawnPath);

  /* ───────── 교실 ───────── */
  const W = 8, D = 6, H = 5;
  const room = group(scene);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: woodTex('#d9b48a', '#b88d62', 12, [2, 2]), roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; room.add(floor);
  box(W * 2 + 0.3, 0.4, D * 2 + 0.3, '#9a8070', { pos: [0, -0.22, 0], parent: room });
  const wallTop = mat('#f1eee8'), wallBot = mat('#b98d5e');
  // 앞벽 (칠판)
  box(W * 2, H - 1.2, 0.3, wallTop, { pos: [0, 1.2 + (H - 1.2) / 2, -D], parent: room });
  box(W * 2, 1.2, 0.3, wallBot, { pos: [0, 0.6, -D], parent: room });
  // 오른쪽 벽 (게시판, 사물함)
  box(0.3, H - 1.2, D * 2, wallTop, { pos: [W, 1.2 + (H - 1.2) / 2, 0], parent: room });
  box(0.3, 1.2, D * 2, wallBot, { pos: [W, 0.6, 0], parent: room });
  // 왼쪽 벽 (큰 창문)
  box(0.3, 1.4, D * 2, wallBot, { pos: [-W, 0.7, 0], parent: room });
  box(0.3, 0.7, D * 2, wallTop, { pos: [-W, H - 0.35, 0], parent: room });
  for (let i = 0; i <= 4; i++) box(0.3, H, 0.25, wallTop, { pos: [-W, H / 2, -D + i * 3], parent: room });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#dff1ff', transparent: true, opacity: 0.15, roughness: 0.05 });
  for (let i = 0; i < 4; i++) {
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 2.9), glassM);
    gp.position.set(-W + 0.02, 2.85, -D + 1.5 + i * 3); gp.rotation.y = Math.PI / 2; room.add(gp);
    box(0.12, 0.08, 2.75, '#ffffff', { pos: [-W + 0.05, 2.85, -D + 1.5 + i * 3], parent: room });
  }
  // 창턱
  rbox(0.6, 0.1, D * 2, 0.03, '#ffffff', { pos: [-W + 0.3, 1.42, 0], parent: room });

  // 칠판
  const board = texPlane(9, 3, 1200, 400, () => {}, { pos: [0, 2.9, -D + 0.2], parent: room });
  box(9.4, 3.4, 0.1, '#2a2d34', { pos: [0, 2.9, -D + 0.14], parent: room });
  // 프로젝터
  rbox(0.9, 0.35, 0.7, 0.06, '#e6e8ec', { pos: [0, 4.75, -1.0], parent: room });
  cyl(0.03, 0.03, 0.3, '#999', { pos: [0, 4.95, -1.0], parent: room });
  cyl(0.1, 0.1, 0.06, emissive('#cfe6ff', 1.5), { pos: [0, 4.75, -1.37], rot: [Math.PI / 2, 0, 0], parent: room, cast: false });
  const drawBoard = (fn) => board.tex.redraw((g, w, h) => {
    // 프로젝터 슬라이드 (어두운 남색 바탕 + 강의 헤더)
    g.fillStyle = '#23305a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f4580'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#9fb8f0'; g.font = `22px ${FONT}`; g.fillText('꿈나라대학교 · 2학기', w - 240, 390);
    fn(g, w, h);
  });
  function boardBio() {
    drawBoard((g) => {
      g.fillStyle = '#ffffff'; g.font = `54px ${FONT}`; g.fillText('🌏 환경사회학 · 공유지의 비극', 50, 80);
      // 호수 + 네 마을
      g.fillStyle = '#4f86c6'; g.beginPath(); g.ellipse(330, 240, 230, 110, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.font = `30px ${FONT}`;
      [[90, 150, 'A마을'], [500, 150, 'B마을'], [90, 345, 'C마을'], [500, 345, 'D마을']].forEach(([x, y, t]) => g.fillText(t, x, y));
      g.font = `34px ${FONT}`;
      [[230, 230], [300, 270], [380, 215], [430, 280], [260, 290]].forEach(([x, y]) => g.fillText('🚤', x, y));
      // 물고기 수 그래프
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(720, 120, 420, 230);
      g.fillStyle = '#ffe9a6'; g.font = `28px ${FONT2}`; g.fillText('물고기 수 (만 마리)', 730, 112);
      [180, 160, 130, 95, 60].forEach((v, i) => { g.fillStyle = '#9fd8ff'; g.fillRect(745 + i * 80, 345 - v, 50, v); g.fillStyle = '#fff'; g.font = `22px ${FONT2}`; g.fillText(`${2021 + i}`, 742 + i * 80, 372); });
      g.fillStyle = '#fff'; g.font = `26px ${FONT2}`; g.fillText('Week 10', 50, 390);
    });
  }
  function boardMath() {
    drawBoard((g) => {
      g.fillStyle = '#ffffff'; g.font = `54px ${FONT}`; g.fillText('♻️ 환경경제학 · 연비의 역설', 50, 80);
      g.font = `38px ${FONT2}`;
      g.fillText('🚗 평균 연비      +30%', 60, 170);
      g.fillStyle = '#ff9eb5'; g.fillText('⛽ 휘발유 소비량  +10% ?!', 60, 235);
      g.fillStyle = '#ffffff'; g.fillText('🛣️ 주말 장거리 운전 ↑', 60, 300);
      g.fillText('🚌 버스 이용객 ↓', 60, 360);
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(720, 120, 420, 240);
      g.fillStyle = '#ffe9a6'; g.font = `34px ${FONT}`; g.fillText('효율 ↑  →  ???  →  소비 ↑', 745, 250);
    });
  }
  boardBio();

  // 강연대 + 교수님
  const podium = group(room, [2.6, 0, -4.3]);
  rbox(1.8, 1.4, 0.9, 0.05, '#c9a57c', { pos: [0, 0.7, 0], parent: podium });
  rbox(2.0, 0.08, 1.0, 0.03, '#b48a5a', { pos: [0, 1.44, 0], parent: podium });
  // 출석부, 화분
  rbox(0.7, 0.03, 0.5, 0.02, '#c9ccd2', { pos: [-0.3, 1.5, 0], parent: podium });
  const lid = rbox(0.7, 0.45, 0.03, 0.02, '#c9ccd2', { pos: [-0.3, 1.72, -0.24], rot: [-0.25, 0, 0], parent: podium });
  cyl(0.015, 0.015, 0.35, '#333', { pos: [0.5, 1.65, 0.2], rot: [0.5, 0, 0], parent: podium });
  const teacher = place(scene, npc('teacher'), [3.0, 0, -5.0], 0.15);
  actors.push(teacher);

  // 시계 / 스피커 / 급훈
  const cg = group(room, [-3.5, 4.55, -D + 0.18]);
  cyl(0.35, 0.35, 0.06, '#fff', { rot: [Math.PI / 2, 0, 0], parent: cg });
  const motto = texPlane(2.4, 0.6, 400, 100, (g, w, h) => { g.fillStyle = '#fffbe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b05a7a'; g.font = `52px ${FONT}`; g.textAlign = 'center'; g.fillText('꿈나라대학교 · 공학관 301호', w / 2, 70); }, { pos: [-3.0, 4.6, -D + 0.17], parent: room });
  rbox(0.6, 0.4, 0.3, 0.05, '#efefef', { pos: [4.0, 4.55, -D + 0.3], parent: room });

  // 게시판
  const notice = texPlane(4, 2.2, 600, 330, (g, w, h) => {
    g.fillStyle = '#d9a86c'; g.fillRect(0, 0, w, h);
    const papers = [['동아리 축제 D-1', '#ffe0ec'], ['코딩 동아리\n게임 부스', '#e0f0ff'], ['학생식당\n오늘: 떡볶이', '#fff6cc'], ['장학금\n신청 안내', '#e6ffe8']];
    papers.forEach(([t, c], i) => {
      const x = 20 + (i % 2) * 290, y = 20 + Math.floor(i / 2) * 155;
      g.save(); g.translate(x + 130, y + 65); g.rotate((i % 2 ? 1 : -1) * 0.04);
      g.fillStyle = c; g.fillRect(-125, -60, 250, 130);
      g.fillStyle = '#e04a6a'; g.beginPath(); g.arc(0, -52, 8, 0, 7); g.fill();
      g.fillStyle = '#5a3d5c'; g.font = `34px ${FONT}`; g.textAlign = 'center';
      t.split('\n').forEach((l, j) => g.fillText(l, 0, -5 + j * 40));
      g.restore();
    });
  }, { pos: [W - 0.17, 3.0, -1.5], rot: [0, -Math.PI / 2, 0], parent: room });
  // 사물함
  for (let i = 0; i < 6; i++) {
    rbox(0.8, 1.6, 1.0, 0.03, ['#ffd6e2', '#d6ecff', '#e0f5e6'][i % 3], { pos: [W - 0.55, 0.8, 1.5 + i * 0.75 - 0.4], parent: room });
  }

  /* 화분 실험 (창턱) */
  const pots = {};
  const potDefs = [['A', -3.3], ['B', -1.8], ['C', -0.3], ['D', 1.2]];
  potDefs.forEach(([name, z]) => {
    const p = group(room, [-W + 0.35, 1.47, z]);
    cyl(0.25, 0.18, 0.4, '#d9825b', { pos: [0, 0.2, 0], parent: p });
    cyl(0.23, 0.23, 0.04, '#5a3b26', { pos: [0, 0.39, 0], parent: p, cast: false });
    const label = textSprite(name, { size: 70, scale: 0.4, border: '#9cc9b4' });
    label.position.set(0.35, 0.25, 0); p.add(label);
    pots[name] = p;
  });
  // A: 튼튼한 초록
  cyl(0.04, 0.05, 0.7, '#4f9a45', { pos: [0, 0.75, 0], parent: pots.A });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sph(0.16, '#3fae4f', { pos: [Math.cos(a) * 0.2, 0.75 + (i % 3) * 0.15, Math.sin(a) * 0.2], scale: [1.3, 0.5, 0.8], rot: [0, -a, 0.4], parent: pots.A }); }
  // B: 시든 갈색
  const bstem = group(pots.B, [0, 0.4, 0], [0, 0, 0.9]);
  cyl(0.03, 0.03, 0.5, '#8a6a3a', { pos: [0, 0.25, 0], parent: bstem });
  for (let i = 0; i < 4; i++) sph(0.12, '#a4783a', { pos: [0.08 * (i % 2 ? 1 : -1), 0.2 + i * 0.1, 0], scale: [1.2, 0.3, 0.7], rot: [0, 0, -0.9], parent: bstem });
  // C: 웃자란 노란 줄기
  cyl(0.018, 0.022, 1.6, '#d9d26a', { pos: [0.05, 1.2, 0], rot: [0, 0, 0.08], parent: pots.C });
  for (let i = 0; i < 3; i++) sph(0.08, '#f0e27a', { pos: [0.08 + (i % 2 ? 0.1 : -0.08), 1.2 + i * 0.35, 0], scale: [1.2, 0.35, 0.7], parent: pots.C });
  // D: 밀봉된 비닐 속 작은 식물 + 물방울
  cyl(0.03, 0.03, 0.3, '#5d9a45', { pos: [0, 0.55, 0], parent: pots.D });
  sph(0.12, '#5aa65a', { pos: [0, 0.72, 0], scale: [1.4, 0.6, 1], parent: pots.D });
  const bag = sph(0.42, new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.1 }), { pos: [0, 0.5, 0], scale: [0.85, 1.3, 0.85], parent: pots.D, cast: false });
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; sph(0.025, emissive('#bfe8ff', 0.3), { pos: [Math.cos(a) * 0.33, 0.4 + Math.random() * 0.6, Math.sin(a) * 0.33], parent: pots.D, cast: false }); }
  // C를 키웠던 사물함 (열린 문)
  const darkLocker = group(room, [-W + 1.0, 0, 4.3]);
  rbox(1.0, 1.8, 0.9, 0.03, '#8792a8', { pos: [0, 0.9, 0], parent: darkLocker });
  box(0.05, 1.7, 0.85, '#6f7a90', { pos: [0.6, 0.9, 0.35], rot: [0, 0.9, 0], parent: darkLocker });
  const lockerSign = textSprite('C를 키운 사물함 (암실)', { size: 44, scale: 0.4 });
  lockerSign.position.set(0, 2.2, 0); darkLocker.add(lockerSign);

  /* 책상 + 학생들 */
  const deskCols = [-4.5, -1.5, 1.5, 4.5], deskRows = [-2.2, 0.4, 3.0];
  const students = [];
  // 계단식 강의실: 뒤로 갈수록 한 단씩 높아진다
  const rowH = [0, 0.3, 0.6];
  rowH.forEach((h, ri) => { if (h) box(15.4, h, 2.6, '#c79a6a', { pos: [0, h / 2, deskRows[ri] + 0.55], parent: room }); });
  box(15.4, 0.6, 1.4, '#c79a6a', { pos: [0, 0.3, 5.3], parent: room });
  deskCols.forEach((x, ci) => deskRows.forEach((z, ri) => {
    const h = rowH[ri];
    desk(room, x, z, 0, '#efe2cc', 2.6, 0.8, 1.2).position.y = h;
    chair(room, x, z + 0.95, Math.PI, '#4a6fa8').position.y = h;
    // 노트북 / 텀블러
    const lp = group(room, [x - 0.3, 1.24 + h, z + 0.05], [0, 0.1 * (ci - ri), 0]);
    rbox(0.6, 0.03, 0.42, 0.02, '#c9ccd2', { parent: lp });
    rbox(0.6, 0.4, 0.02, 0.02, '#c9ccd2', { pos: [0, 0.2, -0.2], rot: [-0.25, 0, 0], parent: lp });
    cyl(0.07, 0.06, 0.22, ['#ff9eb5', '#9fd8ff', '#ffe08a', '#b5e8c4'][(ci + ri) % 4], { pos: [x + 0.55, 1.35 + h, z], parent: room });
    const isMung = ci === 2 && ri === 1;
    if (!isMung && (ci + ri) % 3 !== 2) {
      const kind = ['student1', 'student2', 'student3'][(ci * 3 + ri) % 3];
      const s = place(scene, npc(kind), [x, 0.38 + h, z + 0.95], Math.PI, 'sitChair');
      s.root.rotation.y = Math.PI;
      students.push(s); actors.push(s);
    }
  }));
  students.forEach(s => (s.root.rotation.y = Math.PI));

  /* ───────── 코딩 동아리방 (x + 40) ───────── */
  const CX = 40;
  const club = group(scene, [CX, 0, 0]);
  const cfloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ map: tileTex('#e6e1ea', '#cfc7d6', 4, [4, 4]), roughness: 0.6 }));
  cfloor.rotation.x = -Math.PI / 2; cfloor.position.y = 0.01; cfloor.receiveShadow = true; club.add(cfloor);
  box(12.3, 0.4, 10.3, '#8b7a90', { pos: [0, -0.22, 0], parent: club });
  box(12, H, 0.3, '#eaf2ff', { pos: [0, H / 2, -5], parent: club });
  box(0.3, H, 10, '#e2ecff', { pos: [-6, H / 2, 0], parent: club });
  box(0.3, H, 10, '#e2ecff', { pos: [6, H / 2, 0], parent: club });
  const sign = texPlane(4, 0.9, 520, 120, (g, w, h) => {
    g.fillStyle = '#2b2d42'; roundRect(g, 0, 0, w, h, 24); g.fill();
    g.fillStyle = '#7cf5c4'; g.font = `60px ${FONT}`; g.textAlign = 'center'; g.fillText('</> 중앙동아리 코딩', w / 2, 82);
  }, { glow: 0.4, pos: [0, 4.3, -4.83], parent: club });
  // 화이트보드
  const wb = texPlane(5, 2.4, 700, 336, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e0457b'; g.font = `56px ${FONT}`; g.fillText('축제 D-1 🎮 「멍냥 런너」', 30, 70);
    g.fillStyle = '#3a5ec2'; g.font = `34px ${FONT2}`;
    ['✔ 캐릭터 애니메이션 (하린)', '✔ 사운드 (서준)', '✔ 랭킹 서버 (도윤)', '△ 버그 수정 3줄 (지우)', '빌드: v1.0  (커밋 128개)'].forEach((t, i) => g.fillText(t, 40, 130 + i * 44));
  }, { pos: [-1.5, 2.6, -4.83], parent: club });
  box(5.2, 2.6, 0.05, '#c7ccd6', { pos: [-1.5, 2.6, -4.86], parent: club });
  // 긴 테이블 + 노트북
  rbox(5, 0.1, 2, 0.04, '#f0d9b5', { pos: [-0.5, 1.2, -0.5], parent: club });
  for (const [a, b] of [[-2.9, -1.3], [1.9, -1.3], [-2.9, 0.3], [1.9, 0.3]]) cyl(0.05, 0.05, 1.2, '#999', { pos: [a, 0.6, b], parent: club });
  function laptop(x, z, rot, on = true, color = '#c9ccd2') {
    const g = group(club, [x, 1.25, z], [0, rot, 0]);
    rbox(0.8, 0.04, 0.55, 0.02, color, { parent: g });
    const lid = group(g, [0, 0.02, -0.27], [-0.25, 0, 0]);
    rbox(0.8, 0.52, 0.03, 0.02, color, { pos: [0, 0.26, 0], parent: lid });
    const scr = plane(0.72, 0.44, on ? emissive('#8fd0ff', 0.6) : mat('#0b0b10', { roughness: 0.2 }), { pos: [0, 0.26, 0.018], parent: lid });
    return { g, scr, lid };
  }
  laptop(-2.2, -0.3, 0.1);
  laptop(-0.5, -0.9, 0);
  laptop(1.2, -0.3, -0.1);
  // 도윤 노트북 (방전)
  const dLap = laptop(0.3, 0.2, Math.PI, false, '#55585f');
  const batt = textSprite('🪫 0%', { size: 56, scale: 0.35, border: '#ff6b6b' });
  batt.position.set(CX + 0.3, 2.1, 0.0); scene.add(batt);
  // 공용 PC + git 로그 모니터
  const pcDesk = group(club, [4.2, 0, -3.2], [0, -0.5, 0]);
  rbox(2.4, 0.08, 1.2, 0.03, '#e2d1b8', { pos: [0, 1.25, 0], parent: pcDesk });
  for (const [a, b] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) cyl(0.04, 0.04, 1.25, '#999', { pos: [a, 0.62, b], parent: pcDesk });
  rbox(0.5, 1.0, 1.0, 0.05, '#2f3138', { pos: [-0.9, 0.5, 0], parent: pcDesk });
  box(0.1, 0.5, 0.1, '#333', { pos: [0, 1.5, -0.3], parent: pcDesk });
  rbox(1.9, 1.15, 0.08, 0.03, '#1b1c22', { pos: [0, 2.3, -0.3], parent: pcDesk });
  const gitScreen = texPlane(1.8, 1.05, 520, 300, () => {}, { glow: 0.8, pos: [0, 2.3, -0.255], parent: pcDesk });
  function drawGit(done) {
    // 동아리방 모니터: 넌센스 퀴즈 대회 점수판
    gitScreen.tex.redraw((g, w, h) => {
      g.fillStyle = '#1b1530'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd34d'; g.font = `30px ${FONT}`; g.fillText('🏆 넌센스 퀴즈 대회', 14, 40);
      g.font = `22px ${FONT2}`;
      const rows = [['하린', 2], ['도윤', 0], ['서준', 1], ['지우', 2], ['멍뭉', done ? 3 : 0]];
      rows.forEach(([n, v], i) => {
        g.fillStyle = n === '멍뭉' ? '#7cf5c4' : '#ddd';
        g.fillText(n, 20, 90 + i * 34);
        g.fillStyle = n === '멍뭉' ? '#7cf5c4' : '#9fd8ff';
        g.fillRect(100, 74 + i * 34, 40 + v * 50, 20);
      });
      g.fillStyle = '#ff9eb5'; g.font = `20px ${FONT}`; g.fillText('우승 상품: 축제 간식 쿠폰 🍡', 14, h - 18);
    });
  }
  drawGit(false);
  // 출입 기록 태블릿 (문 옆)
  const door = group(club, [-6, 0, 2.5]);
  box(0.15, 3.6, 1.8, '#c99e74', { pos: [0.1, 1.8, 0], parent: door });
  const tablet = texPlane(0.9, 1.2, 240, 320, (g, w, h) => {
    g.fillStyle = '#1e2433'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7cf5c4'; g.font = `24px ${FONT}`; g.fillText('출입 기록', 20, 40);
    g.font = `20px ${FONT2}`;
    [['23:12', '서준 OUT'], ['23:31', '하린 OUT'], ['23:38', '도윤 IN'], ['23:40', '지우 IN'], ['00:05', '도윤 OUT'], ['00:06', '지우 OUT']].forEach(([a, b], i) => {
      g.fillStyle = i >= 2 ? '#ffd34d' : '#aab'; g.fillText(`${a}  ${b}`, 20, 90 + i * 36);
    });
  }, { glow: 0.6, pos: [-5.82, 2.0, 0.9], rot: [0, Math.PI / 2, 0], parent: club });
  // 포스터, 화분, 빈백
  sph(0.9, '#ffd6e2', { pos: [4.3, 0.5, 2.8], scale: [1, 0.6, 1], parent: club });
  for (let i = 0; i < 3; i++) rbox(0.5, 0.7, 0.5, 0.05, '#ffe6a6', { pos: [-4.5 + i * 0.6, 0.35, -4.4], parent: club });

  // 동아리원들
  const harin = place(scene, npc('office2', { top: '#ffb8cf', topKind: 'hoodie', hair: 'pony', hairColor: '#3a2418', lanyard: null }), [CX - 2.6, 0, 1.4], 0.6, 'angry');
  const doyun = place(scene, npc('office4', { top: '#7fa0d6', lanyard: null }), [CX + 0.6, 0, 1.9], -0.5, 'angry');
  const seojun = place(scene, npc('student2', { top: '#ffe08a', topKind: 'hoodie', vest: null, tie: null }), [CX + 2.5, 0, 0.9], -1.0, 'idle');
  const jiwoo = place(scene, npc('office3', { top: '#c8b8ff', hair: 'bob', lanyard: null }), [CX + 3.3, 0, -1.6], -0.9, 'idle', 'sad');
  actors.push(harin, doyun, seojun, jiwoo);

  /* ───────── 조명 ───────── */
  const hemi = new THREE.HemisphereLight('#ffffff', '#e8d0c0', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dc', 2.2);
  sun.position.set(-18, 14, 6); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(sun, sun.target);
  const sun2 = new THREE.DirectionalLight('#fff3dc', 1.6);
  sun2.position.set(CX - 10, 14, 10); sun2.target.position.set(CX, 0, 0);
  sun2.castShadow = true; sun2.shadow.mapSize.set(1024, 1024);
  Object.assign(sun2.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 50 });
  scene.add(sun2, sun2.target);
  for (const x of [-3, 3]) { const l = new THREE.PointLight('#fff8ee', 6, 14, 1.5); l.position.set(x, 4.6, 0); scene.add(l); }
  const clubLight = new THREE.PointLight('#e8f0ff', 10, 16, 1.4); clubLight.position.set(CX, 4.5, 0); scene.add(clubLight);

  const sp1 = dreamy(scene, { x: [-8, 8], y: [0.5, 5], z: [-6, 6] });
  const sp2 = dreamy(scene, { x: [CX - 6, CX + 6], y: [0.5, 5], z: [-5, 5] }, 0xd8f0ff);
  const mk = marker(scene);

  /* ───────── 카메라 ───────── */
  const shots = {
    wide: shot([3.5, 6.5, 13], [0, 1.8, -2], 50),
    seat: shot([4.2, 3.0, 4.6], [1.0, 1.7, -2.5], 48),
    boardView: shot([1.5, 2.9, 3.2], [0, 2.8, -6], 52),
    pots: shot([-6.2, 3.0, 3.8], [-7.6, 1.8, -1.0], 50),
    clubWide: shot([CX + 1, 5.5, 10.5], [CX, 1.6, -1], 50),
    clubMid: shot([CX - 0.5, 3.0, 6.0], [CX + 0.5, 1.8, 0], 50),
  };
  const focus = {
    potA: { ...shot([-5.8, 2.6, -2.0], [-7.6, 1.9, -3.3], 40), mark: [-7.65, 1.5, -3.3] },
    potB: { ...shot([-5.8, 2.6, -0.6], [-7.6, 1.9, -1.8], 40), mark: [-7.65, 1.5, -1.8] },
    potC: { ...shot([-5.4, 3.0, 0.8], [-7.6, 2.3, -0.3], 42), mark: [-7.65, 1.5, -0.3] },
    potD: { ...shot([-5.8, 2.6, 2.4], [-7.6, 1.9, 1.2], 40), mark: [-7.65, 1.5, 1.2] },
    board: shot([0, 2.9, 3.0], [0, 2.9, -6], 48),
    class: shot([-0.5, 3.4, -4.6], [0.5, 1.5, 2], 55),
    gitlog: { ...shot([CX + 2.5, 2.6, -1.8], [CX + 4.0, 2.3, -3.6], 36) },
    pc: { ...shot([CX + 1.5, 2.2, -0.6], [CX + 3.6, 1.0, -3.1], 44), mark: [CX + 3.3, 0.05, -2.9] },
    door: shot([CX - 3.5, 2.2, 1.3], [CX - 5.8, 2.0, 0.9], 40),
    laptop: { ...shot([CX + 0.3, 2.6, 2.3], [CX + 0.3, 1.4, 0.2], 40), mark: [CX + 0.3, 1.3, 0.2] },
    jiwoo: { ...shot([CX + 1.2, 2.2, 0.4], [CX + 3.3, 1.7, -1.6], 40), mark: [CX + 3.3, 0.05, -1.6] },
    harin: { ...shot([CX - 0.8, 2.2, 3.6], [CX - 2.6, 1.7, 1.4], 40), mark: [CX - 2.6, 0.05, 1.4] },
  };

  const say = talker(env.ui);
  const sc = {
    scene, actors, shots, focus, marker: mk,
    cast: { '교수님': teacher, '옆자리 친구': students[3] || students[0], '하린': harin, '도윤': doyun, '서준': seojun, '지우': jiwoo },
    startShot: () => shots.seat,
    reset() {
      boardBio(); drawGit(false);
      place(scene, mung, [1.5, 0.68, 1.35], Math.PI, 'slump', 'closed');
      teacher.root.position.set(3.0, 0, -5.0); teacher.setPose('idle');
      [harin, doyun].forEach(c => { c.setPose('angry'); c.setExpr('open'); });
      seojun.setPose('idle'); jiwoo.setPose('idle'); jiwoo.setExpr('sad');
      dLap.scr.material = mat('#0b0b10', { roughness: 0.2 });
    },
    onEnter() { scene.add(mung.root); },
    update(dt, t) {
      sp1.update(t); sp2.update(t); mk.update(t);
      batt.material.opacity = 0.6 + Math.sin(t * 4) * 0.4;
    },

    async play(env) {
      const { ui } = env;
      const T = teacher;
      // 방에서 잠든 멍뭉 → 꿈속에서도 책상에 엎드려 자고 있다
      await ui.caption('☀ 오전 10시 · 꿈나라대학교 공학관 301호', 1.8);
      const friend = students[3] || students[0];
      // 출석 부르기 (선택)
      T.setPose('idle');
      await say(T, '교수님', '자, 출석 부를게요. 김하늘? "네~" 박도현? "네!"');
      T.setPose('point');
      const attend = await env.choice('교수님', '……멍뭉 학생? 멍뭉 학생 왔어요?', [
        { label: '🙋 "네!!" 하고 벌떡 일어난다', sub: '목소리가 좀 잠겨 있다' },
        { label: '😴 계속 자는 척한다', sub: '5분만… 5분만 더…' },
      ]);
      env.state.flags.attend = attend;
      if (attend === 0) {
        mung.setPose('cheer'); mung.setExpr('surprised');
        env.shake(0.08);
        await say(mung, '멍뭉', '네, 넵!! 여기 있습니다!!');
        students.forEach(c => c.setExpr('happy'));
        emote(scene, friend, 'ㅋㅋㅋ', 2);
        await say(T, '교수님', '목소리 완전 잠겼네요 ㅋㅋ 출석 인정! 대신 오늘 질문은 멍뭉 학생한테 할 거예요~');
        mung.setPose('sitChair'); mung.setExpr('open');
        await say(mung, '멍뭉', '(…어? 여기 대학교 강의실이잖아? 분명 방에서 자고 있었는데…)');
      } else {
        await say(T, '교수님', '멍뭉 학생 결석 처리… 할까요?');
        emote(scene, friend, '!', 1.5);
        await say(friend, '옆자리 친구', '(쿡쿡 찌르며) 야, 멍뭉아! 일어나! 교수님이 너 결석 처리한대!');
        mung.setPose('sitChair'); mung.setExpr('surprised'); env.shake(0.08);
        await say(mung, '멍뭉', '……헉! 여기 있어요!! 있습니다!!');
        T.setPose('idle');
        await say(T, '교수님', '자는 척하는 거 위에서 다 보여요~ 이번만 지각으로 해 줄게요. 대신 오늘 질문은 전부 멍뭉 학생 담당!');
        students.forEach(c => c.setExpr('happy'));
        await say(mung, '멍뭉', '(으앙… 근데 여기 대학교 강의실이잖아? 분명 방에서 자고 있었는데…)');
      }
      mung.setExpr('open');
      await say(friend, '옆자리 친구', '(속닥) 오늘 환경사회학 진도 나가는 날이야. 공유지 어쩌구~');
      await env.cameraTo(shots.boardView, 1.6);
      T.setPose('point');
      if (await env.quiz('school1') === 'fail') return 'fail';
      mk.hide();

      // 돌발 퀴즈
      await env.cameraTo(shots.seat, 1.2);
      T.setPose('cheer');
      await env.popQuiz({
        asker: '교수님', title: '돌발 퀴즈 · 환경 용어',
        lines: [['교수님', '좋아요! 그럼 분위기 탄 김에 돌발 퀴즈! 10초 안에 대답해요~']],
        question: '배출한 온실가스만큼 흡수하거나 줄여서, 실질 배출량을 "0"으로 만드는 것을 뭐라고 하죠?',
        options: ['탄소발자국', '탄소중립', '탄소배출권', '탄소포집'],
        answer: 1, time: 10,
        right: '정답! 탄소중립(넷제로)이에요. 우리나라도 2050년 탄소중립이 목표예요.',
        wrong: '정답은 "탄소중립"! 탄소발자국은 내가 배출한 양을 재는 거고요~',
      });
      T.setPose('idle');
      await env.cut(async () => { boardMath(); env.cameraSet(shots.boardView); });
      await ui.caption('♻️ 11시 · 환경경제학', 1.4);
      await say(T, '교수님', '이번 건 꽤 많은 학생이 틀려요. "좋은 일 = 좋은 결과"라고 단정하지 마세요.');
      students.slice(0, 4).forEach(s => s.setPose('cheer'));
      emote(scene, students[1], '연비 짱!', 2);
      await say(null, '학생들', '연비가 좋아졌으면 당연히 기름을 덜 쓰는 거 아니에요?');
      students.forEach(s => s.setPose('sitChair'));
      if (await env.quiz('school2') === 'fail') return 'fail';

      await say(T, '교수님', '오늘 강의는 여기까지! 동아리 축제 준비하는 학생들은 힘내요~');
      // 강의 끝 → 동아리방
      await ui.caption('🕛 정오 · 학생회관 코딩 동아리방', 1.6);
      await env.cut(async () => {
        place(scene, mung, [CX - 5, 0, 2.5], Math.PI / 2, 'idle');
        env.cameraSet(shots.clubWide);
      }, '#fff');
      walkTo(mung, CX - 3.0, 3.4, 2.2, Math.PI - 0.6);
      [harin, doyun, seojun, jiwoo].forEach(c => c.setExpr('happy'));
      emote(scene, harin, '🎉', 2.5);
      await say(harin, '하린', '멍뭉 왔다! 딱 맞춰 왔네. 지금 넌센스 퀴즈 대회 시작하려던 참이야!');
      // 간식 (선택)
      const snack = await env.choice('서준', '멍뭉아, 퀴즈 전에 이거 먹을래? 내가 만든 "민트초코 떡볶이"…', [
        { label: '😋 일단 먹어 본다', sub: '도전 정신!' },
        { label: '🙅 정중하게 사양한다', sub: '오늘 컨디션이…' },
      ]);
      env.state.flags.snack = snack;
      if (snack === 0) {
        mung.setExpr('surprised'); emote(scene, mung, '…!', 2);
        await say(mung, '멍뭉', '……음? 어? 생각보다… 괜찮은데?! 아니 이상한데 자꾸 손이 가!');
        emote(scene, seojun, '😎', 2);
        await say(seojun, '서준', '그치?! 역시 멍뭉이는 뭘 좀 알아. 축제 메뉴로 낸다!');
        await say(doyun, '도윤', '(속닥) 멍뭉아… 너 그거 진심이야…?');
      } else {
        await say(mung, '멍뭉', '아… 나 오늘 위가 좀 예민해서. 다음에 꼭 먹을게!');
        seojun.setExpr('sad'); emote(scene, seojun, '💧', 2);
        await say(seojun, '서준', '흑… 다들 이러더라. 이게 얼마나 맛있는데…');
        await say(jiwoo, '지우', '(속닥) 잘했어. 나 아까 먹고 10분 동안 말 못 했어.');
      }
      mung.setExpr('open');
      await env.cameraTo(shots.clubMid, 1.2);
      mung.setPose('think');
      if (await env.quiz('school3') === 'fail') return 'fail';
      mk.hide();

      // 돌발 넌센스
      mung.setPose('idle');
      await env.popQuiz({
        asker: '지우', title: '돌발 넌센스 · 개발자 편',
        lines: [['지우', '잠깐! 보너스 문제 하나 더! 우리 동아리 맞춤형이야. 빨리 대답해!']],
        question: '개발자가 세상에서 제일 싫어하는 벌레는?',
        options: ['모기', '바퀴벌레', '버그', '개미'],
        answer: 2, time: 8,
        right: '딩동댕! 버그! 우리 축제 게임에도 버그가 없어야 할 텐데…',
        wrong: '정답은 "버그"! 개발자한테 제일 무서운 벌레지~',
      });
      drawGit(true);
      [harin, doyun, seojun, jiwoo, mung].forEach(c => { c.setPose('cheer'); c.setExpr('happy'); });
      await say(harin, '하린', '우승은 멍뭉! 축제 간식 쿠폰 여기~ 너 오늘 오후에 회사 출근이지? 조심히 가~');
      await say(mung, '멍뭉', '고마워! 출근 전에 집 가는 길에 공원 좀 걷다 가려고. 다들 내일 축제 파이팅!');
      mung.setPose('idle'); mung.setExpr('happy');
      // 동아리방 문을 열고 나가면 → 공원
      env.cameraTo(shot([CX - 1.5, 2.6, 5.5], [CX - 5.6, 1.8, 2.5], 48), 1.6);
      await walkTo(mung, CX - 5.2, 2.5, 2.4, -Math.PI / 2);
      sfx.door();
      await ui.caption('문을 열자, 따뜻한 오후 햇살이 쏟아진다…', 2);
      return 'ok';
    },
  };
  return sc;
}
