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
  // 운동장 트랙
  const track = new THREE.Mesh(new THREE.RingGeometry(8, 10, 48), mat('#e39a7a'));
  track.rotation.x = -Math.PI / 2; track.position.set(-30, 0.01, 0); scene.add(track);

  /* ───────── 교실 ───────── */
  const W = 8, D = 6, H = 5;
  const room = group(scene);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: woodTex('#d9b48a', '#b88d62', 12, [2, 2]), roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; room.add(floor);
  box(W * 2 + 0.3, 0.4, D * 2 + 0.3, '#9a8070', { pos: [0, -0.19, 0], parent: room });
  const wallTop = mat('#fbf4e6'), wallBot = mat('#9cc9b4');
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
  box(9.4, 3.4, 0.1, '#b48a5a', { pos: [0, 2.9, -D + 0.14], parent: room });
  box(9.4, 0.12, 0.3, '#b48a5a', { pos: [0, 1.18, -D + 0.25], parent: room });
  for (let i = 0; i < 4; i++) box(0.3, 0.06, 0.06, ['#ffffff', '#ffd34d', '#ff9eb5', '#9fd8ff'][i], { pos: [-3 + i * 0.4, 1.27, -D + 0.25], parent: room, cast: false });
  const drawBoard = (fn) => board.tex.redraw((g, w, h) => {
    g.fillStyle = '#2f5a46'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.07; for (let i = 0; i < 60; i++) { g.fillStyle = '#fff'; g.fillRect(Math.random() * w, Math.random() * h, 120, 3); } g.globalAlpha = 1;
    fn(g, w, h);
  });
  function boardBio() {
    drawBoard((g) => {
      g.fillStyle = '#ffffff'; g.font = `56px ${FONT}`; g.fillText('🌱 생물: 화분 실험 결과 분석', 50, 80);
      g.font = `38px ${FONT2}`;
      g.fillStyle = '#ffe9a6'; g.fillText('통제 변인 vs 조작 변인', 60, 150);
      g.fillStyle = '#ffffff';
      ['A: 빛 O · 물 O', 'B: 빛 O · 물 X', 'C: 빛 X · 물 O', 'D: 빛 O · 물 O · 밀봉'].forEach((t, i) => g.fillText(t, 60 + (i % 2) * 520, 220 + Math.floor(i / 2) * 60));
      g.fillStyle = '#ffb6c8'; g.font = `40px ${FONT}`; g.fillText('Q. C는 왜 노랗고 길쭉할까?', 60, 360);
      g.fillStyle = '#fff'; g.font = `26px ${FONT2}`; g.fillText('날짜: 11월 3일 · 주번: 멍뭉', 860, 380);
    });
  }
  function boardMath() {
    drawBoard((g) => {
      g.fillStyle = '#ffffff'; g.font = `54px ${FONT}`; g.fillText('📐 확률과 통계: 진단 검사의 함정', 50, 80);
      g.font = `36px ${FONT2}`;
      g.fillText('유병률  P(병) = 1%', 60, 150);
      g.fillText('민감도  P(양성 | 병) = 90%', 60, 205);
      g.fillText('위양성률  P(양성 | 건강) = 9%', 60, 260);
      g.fillStyle = '#ffe9a6'; g.font = `42px ${FONT}`; g.fillText('P(병 | 양성) = ?', 60, 340);
      // 1000명 도식
      g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.strokeRect(720, 120, 420, 240);
      g.fillStyle = '#ffffff'; g.font = `30px ${FONT2}`; g.fillText('1,000명', 870, 160);
      g.fillStyle = '#ff9eb5'; g.fillRect(740, 190, 40, 150);
      g.fillStyle = '#9fd8ff'; g.fillRect(800, 190, 320, 150);
      g.fillStyle = '#2f5a46'; g.font = `26px ${FONT}`; g.fillText('10', 745, 270); g.fillText('990', 930, 270);
    });
  }
  boardBio();

  // 교탁 + 선생님
  const podium = group(room, [2.6, 0, -4.3]);
  rbox(1.8, 1.4, 0.9, 0.05, '#c9a57c', { pos: [0, 0.7, 0], parent: podium });
  rbox(2.0, 0.08, 1.0, 0.03, '#b48a5a', { pos: [0, 1.44, 0], parent: podium });
  // 출석부, 화분
  rbox(0.5, 0.06, 0.7, 0.02, '#4a78c8', { pos: [-0.4, 1.51, 0], parent: podium });
  const teacher = place(scene, npc('teacher'), [3.0, 0, -5.0], 0.15);
  actors.push(teacher);

  // 시계 / 스피커 / 급훈
  const cg = group(room, [-3.5, 4.55, -D + 0.18]);
  cyl(0.35, 0.35, 0.06, '#fff', { rot: [Math.PI / 2, 0, 0], parent: cg });
  const motto = texPlane(2.4, 0.6, 400, 100, (g, w, h) => { g.fillStyle = '#fffbe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b05a7a'; g.font = `52px ${FONT}`; g.textAlign = 'center'; g.fillText('급훈: 꿈은 이루어진다', w / 2, 70); }, { pos: [0, 4.6, -D + 0.17], parent: room });
  rbox(0.6, 0.4, 0.3, 0.05, '#efefef', { pos: [4.0, 4.55, -D + 0.3], parent: room });

  // 게시판
  const notice = texPlane(4, 2.2, 600, 330, (g, w, h) => {
    g.fillStyle = '#d9a86c'; g.fillRect(0, 0, w, h);
    const papers = [['축제 D-1 🎮', '#ffe0ec'], ['코딩 동아리\n게임 부스', '#e0f0ff'], ['급식표\n오늘: 떡볶이', '#fff6cc'], ['분실물:\n민트 머리끈', '#e6ffe8']];
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
  deskCols.forEach((x, ci) => deskRows.forEach((z, ri) => {
    desk(room, x, z, 0, '#e8cfa6', 1.7, 1.0, 1.2);
    chair(room, x, z + 0.95, Math.PI, '#86a7d6');
    // 책, 필통
    rbox(0.5, 0.06, 0.7, 0.02, ['#ff9eb5', '#9fd8ff', '#ffe08a', '#b5e8c4'][(ci + ri) % 4], { pos: [x - 0.3, 1.27, z], rot: [0, 0.1 * (ci - ri), 0], parent: room });
    const isMung = ci === 2 && ri === 1;
    if (!isMung && (ci + ri) % 3 !== 2) {
      const kind = ['student1', 'student2', 'student3'][(ci * 3 + ri) % 3];
      const s = place(scene, npc(kind), [x, 0.38, z + 0.95], Math.PI, 'sitChair');
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
  box(12.3, 0.4, 10.3, '#8b7a90', { pos: [0, -0.19, 0], parent: club });
  box(12, H, 0.3, '#eaf2ff', { pos: [0, H / 2, -5], parent: club });
  box(0.3, H, 10, '#e2ecff', { pos: [-6, H / 2, 0], parent: club });
  box(0.3, H, 10, '#e2ecff', { pos: [6, H / 2, 0], parent: club });
  const sign = texPlane(4, 0.9, 520, 120, (g, w, h) => {
    g.fillStyle = '#2b2d42'; roundRect(g, 0, 0, w, h, 24); g.fill();
    g.fillStyle = '#7cf5c4'; g.font = `60px ${FONT}`; g.textAlign = 'center'; g.fillText('</> 코딩 동아리', w / 2, 82);
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
  function drawGit(restored) {
    gitScreen.tex.redraw((g, w, h) => {
      g.fillStyle = '#101218'; g.fillRect(0, 0, w, h);
      g.font = `20px monospace`;
      const lines = restored ? [
        ['$ git push origin main', '#ddd'], ['  (하린의 최신 로컬에서)', '#888'], ['+ 7c1e9a2...f3b88d1 main -> main', '#7cf5c4'],
        ['', ''], ['$ git log --oneline | wc -l', '#ddd'], ['128', '#7cf5c4'], ['', ''], ['🔒 Branch protection: main', '#ffd34d'], ['   force push: BLOCKED', '#ffd34d'], ['✔ 빌드 복구 완료!', '#7cf5c4'],
      ] : [
        ['$ git reflog show origin/main', '#ddd'], ['23:47  forced-update', '#ff6b6b'], ['  7c1e9a2 (2주 전) ← f3b88d1', '#ff9a9a'],
        ['', ''], ['$ git log --oneline | wc -l', '#ddd'], ['41   (어제: 128)', '#ff6b6b'], ['', ''], ['user: club-admin @ 공용PC', '#9fd8ff'],
        ['last pull: 14 days ago', '#ffd34d'], ['! [rejected] → --force', '#ff6b6b'],
      ];
      lines.forEach(([t, c], i) => { g.fillStyle = c; g.fillText(t, 14, 30 + i * 27); });
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
    startShot: () => shots.wide,
    reset() {
      boardBio(); drawGit(false);
      place(scene, mung, [1.5, 0.38, 1.35], Math.PI, 'sitChair');
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
      await env.cameraTo(shots.seat, 2);
      mung.setExpr('surprised');
      await say(mung, '멍뭉', '……어? 여기… 고등학교 교실? 나 방금 집에서 잤는데…?');
      mung.setExpr('open');
      await say(mung, '멍뭉', '(교복 대신 후드티… 이거 완전 꿈이네.)');
      env.cameraTo(shots.boardView, 1.5);
      T.setPose('point');
      await say(T, '선생님', '자, 멍뭉 학생! 졸지 말고. 오늘은 일주일 동안 키운 화분 실험 결과를 볼 거예요.');
      T.setPose('idle');
      await env.cameraTo(shots.pots, 1.8);
      await say(T, '선생님', '창가의 A, B, C, D 화분을 잘 관찰하고, C에게 무슨 일이 있었는지 설명해 보세요.');
      if (await env.quiz('school1') === 'fail') return 'fail';
      mk.hide();

      await env.cameraTo(shots.seat, 1.2);
      T.setPose('cheer');
      await say(T, '선생님', '정확해요! 변인 통제를 제대로 이해했군요. 👏');
      T.setPose('idle');
      await env.cut(async () => { boardMath(); env.cameraSet(shots.boardView); });
      sfx.bell();
      await ui.caption('🔔 2교시 · 수학', 1.6);
      await say(T, '선생님', '이번엔 확률이에요. 이 문제, 대부분 틀립니다. 직관 말고 숫자를 믿으세요.');
      students.slice(0, 4).forEach(s => s.setPose('cheer'));
      emote(scene, students[1], '90%!', 2);
      emote(scene, students[3], '90%!!', 2);
      await say(null, '반 친구들', '90%요!! 검사 정확도가 90%니까요!');
      students.forEach(s => s.setPose('sitChair'));
      if (await env.quiz('school2') === 'fail') return 'fail';

      await say(T, '선생님', '훌륭해요. "기저율"을 무시하면 이렇게 크게 틀리죠. 진짜 양성은 98명 중 9명뿐!');
      // 방과 후 → 동아리방
      sfx.bell();
      await ui.caption('🔔 딩동댕~ 방과 후', 1.5);
      await env.cut(async () => {
        place(scene, mung, [CX - 5, 0, 2.5], Math.PI / 2, 'idle');
        env.cameraSet(shots.clubWide);
      }, '#fff');
      walkTo(mung, CX - 2.6 + 1.3, 3.2, 2.2, Math.PI);
      emote(scene, harin, '💢', 2.5); emote(scene, doyun, '💢', 2.5);
      await say(harin, '하린', '도윤! 네가 어제 마지막까지 남아 있었잖아. 네가 지운 거지?!');
      await say(doyun, '도윤', '무슨 소리야! 난 노트북 꺼져서 아무것도 못 했어. 서준이 마지막에 사운드 올렸잖아!');
      emote(scene, seojun, '😤', 2);
      await say(seojun, '서준', '나 11시에 학원 갔거든?! 왜 나한테 그래!');
      emote(scene, jiwoo, '…', 2.5);
      await say(jiwoo, '지우', '……');
      await env.cameraTo(shots.clubMid, 1.2);
      mung.setPose('cheer');
      await say(mung, '멍뭉', '잠깐잠깐! 다들 진정하고. 감정 말고 "기록"부터 보자.');
      mung.setPose('think');
      await say(mung, '멍뭉', '(축제 하루 전인데 빌드가 통째로 사라졌다… 커밋 128개가 41개로?)');
      if (await env.quiz('school3') === 'fail') return 'fail';
      mk.hide();

      mung.setPose('idle');
      jiwoo.setExpr('sad');
      await env.cameraTo(shots.clubMid, 1.2);
      await say(jiwoo, '지우', '미안해… push가 거절되길래 "강제로" 올리면 되는 줄 알았어. 그게 다 덮어쓰는 거였구나…');
      harin.setPose('idle'); harin.setExpr('open');
      await say(harin, '하린', '…나도 미안. 도윤이 의심해서. 내 노트북에 최신 버전 있어! 지금 바로 올릴게.');
      env.cameraTo(focus.gitlog, 1.2);
      await wait(1.0);
      drawGit(true);
      dLap.scr.material = emissive('#8fd0ff', 0.6);
      sfx.correct();
      await wait(1.2);
      await env.cameraTo(shots.clubMid, 1.2);
      [harin, doyun, seojun, jiwoo, mung].forEach(c => { c.setPose('cheer'); c.setExpr('happy'); });
      await say(doyun, '도윤', '복구됐다!! 그리고 main 브랜치에 force push 금지 걸어놨어. 이제 이런 일 없을 거야!');
      await say(mung, '멍뭉', '휴… 다행이다. 그런데… 갑자기… 너무 졸려……');
      mung.setPose('idle'); mung.setExpr('sleepy');
      return 'ok';
    },
  };
  return sc;
}
