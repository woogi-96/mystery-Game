import { THREE, box, rbox, cyl, sph, cone, plane, torus, group, mat, emissive, texPlane, canvasTex, tileTex, textSprite, anim, wait, ease, shot, FONT, FONT2, roundRect, rand, setSeed, skyDome, capsule } from '../util.js';
import { npc } from '../characters.js';
import { place, talker, walkTo, turnTo, emote, marker, dreamy } from './common.js';

/*
 * 꿈 5 · 아파트에서 생긴 일
 *  10층 복도식 아파트, 새벽 2시. 1004호의 수상한 이웃.
 */
export function build(env) {
  const { mung, sfx } = env;
  setSeed(1004);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1030');
  scene.fog = new THREE.Fog('#121540', 30, 120);
  scene.add(skyDome('#070a24', '#2a2a5e', 170, { stops: [[0, '#070a24'], [0.48, '#1c1f52'], [0.55, '#4a3a78'], [1, '#4a3a78']] }));

  // 바깥 야경 (아래쪽 도시 + 달)
  const moon = sph(4, emissive('#fff6d8', 1.2), { pos: [-30, 40, 90], parent: scene, cast: false });
  for (let i = 0; i < 40; i++) {
    const h = rand(10, 45), w = rand(6, 12);
    const t = canvasTex(64, 128, (g, cw, ch) => { g.fillStyle = '#20244a'; g.fillRect(0, 0, cw, ch); for (let y = 4; y < ch; y += 10) for (let x = 4; x < cw; x += 10) if (Math.random() < 0.25) { g.fillStyle = '#ffe39a'; g.fillRect(x, y, 5, 6); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 6, h / 10);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ map: t, emissive: '#fff', emissiveMap: t, emissiveIntensity: 0.6, color: '#2a2e52' }));
    b.position.set(rand(-80, 80), -30 + h / 2, rand(30, 110)); scene.add(b);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? rand(20, 90) : i % 3 === 0 ? rand(-150, 150) : rand(40, 150))), 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 0.5, fog: false }));
  scene.add(stars);

  /* 복도 */
  const L = 14;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L * 2, 4.4), new THREE.MeshStandardMaterial({ map: tileTex('#c9c4bc', '#b0aaa0', 2, [14, 2]), roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 0; floor.receiveShadow = true; scene.add(floor);
  box(L * 2, 0.6, 4.6, '#d8d4cc', { pos: [0, -0.3, 0], parent: scene });
  // 복도 벽 (1004호 문 자리는 비워 둠)
  box(L + 1.55, 5, 0.3, '#efe8dc', { pos: [(-L + 1.55) / 2, 2.5, -2.3], parent: scene });
  box(L - 3.45, 5, 0.3, '#efe8dc', { pos: [(L + 3.45) / 2, 2.5, -2.3], parent: scene });
  box(1.9, 1.4, 0.3, '#efe8dc', { pos: [2.5, 4.3, -2.3], parent: scene });
  // 건물 외벽 (아래층/위층)
  box(L * 2 + 0.6, 40, 5, '#cfc8bc', { pos: [0, -20.6, -0.2], parent: scene });
  box(L * 2 + 0.6, 0.4, 5, '#d8d4cc', { pos: [0, 5.3, -0.2], parent: scene });
  for (let i = 1; i < 8; i++) box(L * 2 + 0.4, 0.25, 0.3, '#b8b0a4', { pos: [0, -i * 5, 2.35], parent: scene });
  box(L * 2, 0.3, 4.6, '#e6e0d6', { pos: [0, 5, 0], parent: scene });
  // 난간
  box(L * 2, 1.1, 0.2, '#e6e0d6', { pos: [0, 0.55, 2.2], parent: scene });
  cyl(0.06, 0.06, L * 2, '#9aa0aa', { pos: [0, 1.6, 2.2], rot: [0, 0, Math.PI / 2], parent: scene });
  for (let x = -L; x <= L; x += 1) cyl(0.025, 0.025, 0.5, '#9aa0aa', { pos: [x, 1.35, 2.2], parent: scene });
  for (const x of [-L, L]) box(0.3, 5, 4.6, '#efe8dc', { pos: [x, 2.5, 0], parent: scene });
  // 천장 센서등
  const ceil = [];
  for (let x = -10; x <= 10; x += 5) {
    const m = cyl(0.4, 0.4, 0.08, emissive('#fff6e0', 0), { pos: [x, 4.82, 0], parent: scene, cast: false });
    const l = new THREE.PointLight('#ffe9c4', 0, 9, 1.6); l.position.set(x, 4.4, 0.2); scene.add(l);
    ceil.push({ m, l, on: 0, x });
  }

  /* 현관문들 */
  const doors = {};
  function aptDoor(num, x) {
    const g = group(scene, [x, 0, -2.15]);
    for (const s of [-1, 1]) box(0.15, 3.8, 0.4, '#8a8f98', { pos: [s * 1.02, 1.9, 0], parent: g });
    box(2.2, 0.2, 0.4, '#8a8f98', { pos: [0, 3.7, 0], parent: g });
    const pivot = group(g, [-0.95, 0, 0.1]);
    rbox(1.9, 3.6, 0.12, 0.03, mat('#5a6578', { metalness: 0.3, roughness: 0.5 }), { pos: [0.95, 1.8, 0], parent: pivot });
    cyl(0.04, 0.04, 0.35, mat('#d8d8dc', { metalness: 0.8, roughness: 0.2 }), { pos: [1.65, 1.8, 0.12], rot: [0, 0, Math.PI / 2], parent: pivot });
    rbox(0.22, 0.32, 0.06, 0.02, '#222', { pos: [1.65, 2.15, 0.08], parent: pivot });
    texPlane(0.9, 0.35, 200, 78, (gg, w, h) => { gg.fillStyle = '#2b2f3a'; roundRect(gg, 0, 0, w, h, 12); gg.fill(); gg.fillStyle = '#fff'; gg.font = `54px ${FONT}`; gg.textAlign = 'center'; gg.fillText(num, w / 2, 60); }, { pos: [0, 4.15, 0.08], parent: g });
    // 우유 투입구 / 초인종
    sph(0.06, emissive('#ff9a2a', 0.5), { pos: [1.3, 1.9, 0.1], parent: g, cast: false });
    doors[num] = { g, pivot, x };
    return doors[num];
  }
  aptDoor('1002', -9); aptDoor('1003', -3.5); aptDoor('1004', 2.5); aptDoor('1005', 8.5);
  // 1003 (멍뭉네) 장식
  const wreath = torus(0.35, 0.08, '#7cc48a', { pos: [-3.5, 2.6, -1.98], parent: scene });
  texPlane(0.9, 0.3, 200, 66, (g) => { g.fillStyle = '#ffe6ef'; g.fillRect(0, 0, 200, 66); g.fillStyle = '#e0457b'; g.font = `34px ${FONT}`; g.fillText('멍뭉 🐶', 40, 46); }, { pos: [-3.5, 3.5, -1.98], parent: scene });
  // 1004 문틈 빛 + 흡음재 (문 열리면 보이는 안쪽)
  const gap = plane(0.05, 3.4, emissive('#a8c8ff', 1.4), { pos: [2.5 - 0.98, 1.8, -2.05], parent: scene, cast: false });
  const inside = group(scene, [2.5, 0, -3.6]);
  box(2.2, 3.8, 0.1, '#3a3e48', { pos: [0, 1.9, -1.2], parent: inside });
  for (const s of [-1, 1]) box(0.1, 3.8, 2.6, '#3a3e48', { pos: [s * 1.05, 1.9, 0], parent: inside });
  box(2.2, 0.05, 2.6, '#2a2c34', { pos: [0, 0.02, 0], parent: inside });
  box(2.2, 0.1, 2.6, '#2a2c34', { pos: [0, 3.85, 0], parent: inside });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const foam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.25, 4), mat('#5a5e6a', { flatShading: true }));
    foam.rotation.x = Math.PI / 2; foam.position.set(-0.75 + i * 0.5, 0.6 + j * 0.8, -1.1); inside.add(foam);
  }
  cyl(0.02, 0.02, 1.6, '#222', { pos: [0, 0.8, -0.6], parent: inside });
  capsule(0.1, 0.18, '#333', { pos: [0, 1.75, -0.6], parent: inside });
  torus(0.18, 0.01, '#666', { pos: [0, 1.75, -0.35], parent: inside });
  const booLight = new THREE.PointLight('#a8c8ff', 0, 6, 1.8); booLight.position.set(2.5, 2, -2.8); scene.add(booLight);
  inside.visible = false;

  // 택배 상자 (LA 발송, 흡음 스펀지)
  const parcels = group(scene, [4.0, 0, -1.6]);
  rbox(1.0, 0.7, 0.8, 0.03, '#c9a06a', { pos: [0, 0.35, 0], parent: parcels });
  rbox(0.8, 0.5, 0.6, 0.03, '#d4ad78', { pos: [0.1, 0.95, 0], rot: [0, 0.2, 0], parent: parcels });
  texPlane(0.7, 0.42, 280, 168, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = `22px ${FONT}`;
    g.fillText('FROM: Los Angeles, CA', 10, 32); g.fillText('TO: 1004호', 10, 64);
    g.font = `20px ${FONT2}`; g.fillText('흡음 스펀지 30EA', 10, 104); g.fillText('팝필터 (마이크용)', 10, 134);
    for (let i = 0; i < 26; i++) g.fillRect(180 + i * 3, 110, i % 3 ? 1 : 2, 40);
  }, { pos: [0, 0.4, 0.41], parent: parcels });
  // 분리수거함 + 교재 + 찢어진 대본
  const recycle = group(scene, [-11.6, 0, -1.4]);
  rbox(1.2, 1.1, 0.9, 0.05, '#4a90e2', { pos: [0, 0.55, 0], parent: recycle });
  rbox(1.2, 1.1, 0.9, 0.05, '#4fb86a', { pos: [1.3, 0.55, 0], parent: recycle });
  rbox(0.5, 0.08, 0.7, 0.02, '#ff9eb5', { pos: [0, 1.15, 0], rot: [0, 0.3, 0.05], parent: recycle });
  rbox(0.5, 0.08, 0.7, 0.02, '#ffe08a', { pos: [0.05, 1.23, 0.05], rot: [0, -0.2, 0], parent: recycle });
  const lblBook = textSprite('「발성·호흡 트레이닝」', { size: 40, scale: 0.35, border: '#4a90e2' }); lblBook.position.set(0, 1.6, 0); recycle.add(lblBook);
  for (let i = 0; i < 5; i++) rbox(0.3, 0.12, 0.2, 0.02, '#e84a6a', { pos: [1.1 + i * 0.12, 1.15, -0.1 + (i % 2) * 0.2], rot: [0, i, 0], parent: recycle });
  const script = texPlane(0.8, 0.55, 320, 220, (g, w, h) => {
    g.fillStyle = '#fffdf6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w - 20, h * 0.4); g.lineTo(w, h * 0.6); g.lineTo(w - 30, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = '#222'; g.font = `22px ${FONT}`; g.fillText('SCENE 12  (Take 3)', 14, 36);
    g.fillStyle = '#c0392b'; g.font = `26px ${FONT}`; g.fillText('[마왕]', 14, 84);
    g.fillStyle = '#222'; g.font = `24px ${FONT2}`; g.fillText('크하하! 이 몸이 바로—', 14, 124); g.fillText('(낮게, 울리게)', 14, 160);
  }, { pos: [1.3, 1.13, 0.2], rot: [-Math.PI / 2, 0, 0.3], parent: recycle });
  script.material.side = THREE.DoubleSide;
  // 엘리베이터 + 광고 모니터 + 디지털 시계
  const elev = group(scene, [-13.8, 0, 0]);
  for (const s of [-1, 1]) box(0.1, 3.8, 0.95, mat('#c7ccd4', { metalness: 0.8, roughness: 0.25 }), { pos: [0.15, 1.9, s * 0.5], parent: elev });
  const clockP = texPlane(1.6, 0.55, 320, 110, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff5a5a'; g.font = `80px ${FONT}`; g.textAlign = 'center'; g.fillText('AM 02:00', w / 2, 86); }, { glow: 1.2, pos: [0.17, 4.25, 0], rot: [0, Math.PI / 2, 0], parent: elev });
  const tv = texPlane(1.5, 1.0, 300, 200, () => {}, { glow: 1.0, pos: [0.17, 2.3, -1.55], rot: [0, Math.PI / 2, 0], parent: elev });
  tv.tex.redraw((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a0a3a'); gr.addColorStop(1, '#b0204a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd34d'; g.font = `30px ${FONT}`; g.fillText('NEW GAME', 16, 40);
    g.fillStyle = '#fff'; g.font = `34px ${FONT}`; g.fillText('「마왕의 귀환」', 16, 90);
    g.font = `18px ${FONT2}`; g.fillText('LA 인디 스튜디오 신작', 16, 124); g.fillText('한국어 더빙 지원!', 16, 150);
    g.fillStyle = '#ff6060'; g.beginPath(); g.arc(240, 140, 34, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.moveTo(215, 115); g.lineTo(208, 85); g.lineTo(228, 108); g.fill(); g.beginPath(); g.moveTo(265, 115); g.lineTo(272, 85); g.lineTo(252, 108); g.fill();
    g.fillStyle = '#ffff60'; g.fillRect(226, 132, 8, 6); g.fillRect(246, 132, 8, 6);
  });
  box(1.6, 1.1, 0.06, '#111', { pos: [0.14, 2.3, -1.55], rot: [0, Math.PI / 2, 0], parent: elev });
  // 화분, 자전거
  const pl = group(scene, [12.6, 0, -1.4]); cyl(0.4, 0.3, 0.7, '#e8dcc8', { pos: [0, 0.35, 0], parent: pl }); for (let i = 0; i < 6; i++) sph(0.35, '#5aa65a', { pos: [Math.cos(i) * 0.3, 1.1 + (i % 2) * 0.3, Math.sin(i) * 0.3], scale: [0.6, 1.3, 0.6], parent: pl });
  const bike = group(scene, [-7, 0, -1.5], [0, 0.05, 0]);
  for (const x of [-0.7, 0.7]) torus(0.45, 0.05, '#222', { pos: [x, 0.5, 0], parent: bike });
  box(1.4, 0.06, 0.06, '#ff6f98', { pos: [0, 0.85, 0], rot: [0, 0, 0.2], parent: bike });
  box(0.06, 0.6, 0.06, '#ff6f98', { pos: [-0.2, 0.8, 0], parent: bike });

  /* 인물 */
  const neighbor = npc('neighbor');
  const guard = npc('driver', { cap: '#3a4a3a', top: '#6a7a5a', tie: null, hairColor: '#999', glasses: true });

  const hemi = new THREE.HemisphereLight('#8a94d8', '#2a2440', 0.7); scene.add(hemi);
  const moonL = new THREE.DirectionalLight('#b8c4ff', 0.9);
  moonL.position.set(-10, 20, 30); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048);
  Object.assign(moonL.shadow.camera, { left: -16, right: 16, top: 10, bottom: -10, near: 1, far: 80 }); scene.add(moonL);
  const sp = dreamy(scene, { x: [-14, 14], y: [0.5, 5], z: [-2, 6] }, 0xc8d0ff);
  const mk = marker(scene);

  const shots = {
    wide: shot([3, 3.6, 12], [0, 2.0, -1.5], 50),
    hall: shot([6.5, 2.8, 2.0], [-2, 2.0, -1.6], 54),
    door: shot([6.8, 2.8, 3.0], [2.6, 1.8, -1.6], 46),
    elev: shot([-8.5, 2.6, 1.6], [-13.6, 2.0, -0.8], 50),
  };
  const focus = {
    clock: { ...shot([-10.5, 3.6, 1.5], [-13.7, 4.2, 0], 40) },
    parcel: { ...shot([5.0, 1.8, 0.8], [4.0, 0.6, -1.3], 38), mark: [4.0, 0.05, -1.5], r: 0.8 },
    door1004: { ...shot([4.6, 2.6, 1.6], [2.5, 2.0, -2.1], 42) },
    recycle: { ...shot([-9.6, 2.4, 0.9], [-11.4, 1.2, -1.4], 40), mark: [-11.6, 0.05, -1.4], r: 0.9 },
    script: { ...shot([-9.9, 2.4, -0.2], [-10.3, 1.1, -1.2], 34), mark: [-10.3, 1.16, -1.2], r: 0.5 },
    tv: { ...shot([-11.2, 2.4, 0.2], [-13.6, 2.3, -1.55], 38) },
  };

  const say = talker(env.ui);
  const sc = {
    scene, shots, focus, marker: mk, actors: [neighbor, guard],
    startShot: () => shots.wide,
    reset() {
      place(scene, mung, [-12.0, 0, 0.8], Math.PI / 2, 'idle');
      neighbor.root.visible = false; guard.root.visible = false;
      inside.visible = false; booLight.intensity = 0;
      doors['1004'].pivot.rotation.y = 0;
      ceil.forEach(c => (c.on = 0));
    },
    onEnter() { scene.add(mung.root); },
    update(dt, t) {
      sp.update(t); mk.update(t);
      // 센서등: 사람이 가까우면 켜진다
      const people = [mung, neighbor, guard].filter(c => c.root.visible && c.root.parent === scene);
      ceil.forEach(c => {
        const near = people.some(p => Math.abs(p.root.position.x - c.x) < 3.5);
        c.on += ((near ? 1 : 0) - c.on) * Math.min(1, dt * 4);
        c.l.intensity = c.on * 9; c.m.material.emissiveIntensity = c.on * 1.6;
      });
      gap.material.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.3;
    },

    async play(env) {
      const { ui } = env;
      await env.cameraTo(shots.elev, 1.8);
      mung.setExpr('surprised');
      await say(mung, '멍뭉', '……어? 버스에서 내렸는데… 여긴 우리 아파트 10층 복도잖아?');
      mung.setExpr('open');
      await say(mung, '멍뭉', '시계는 새벽 2시… 꿈이라 그런가, 장면이 뚝뚝 끊기네.');
      walkTo(mung, 0.6, 0.6, 2.2);
      await env.cameraTo(shots.hall, 2.4);
      const voice = textSprite('🎙 "Good morning, team!"', { size: 54, scale: 0.6, border: '#a8c8ff' });
      voice.position.set(2.5, 3.2, -1.4); scene.add(voice);
      sfx.blip();
      await turnTo(mung, Math.PI, 0.4);
      mung.setExpr('surprised');
      emote(scene, mung, '?', 2);
      await say(mung, '멍뭉', '1004호…? 새벽 2시에 "좋은 아침"이라니. 요즘 옆집 사람, 수상하단 말이야.');
      await say(mung, '멍뭉', '말투도 이상하고, 집 밖에도 잘 안 나오고, 새벽에만 움직이고… 설마 간첩…?');
      mung.setExpr('open');
      if (await env.quiz('apt1') === 'fail') return 'fail';
      mk.hide();
      scene.remove(voice);

      await say(mung, '멍뭉', 'LA는 지금 전날 아침 9시… 시차 때문에 새벽에 일하는 거구나.');
      // 며칠 뒤, 엘리베이터 앞
      await env.cut(async () => {
        place(scene, mung, [-11.5, 0, 0.9], -Math.PI / 2, 'idle');
        place(scene, neighbor, [-12.9, 0, 0.2], Math.PI / 2, 'idle');
        env.cameraSet(shots.elev);
      });
      await ui.caption('며칠 뒤 · 엘리베이터 앞', 1.6);
      neighbor.setExpr('happy');
      await say(neighbor, '1004호', '(아이 같은 목소리로) 안녕하세요오~ 좋은 새벽이에요오~');
      await say(mung, '멍뭉', '(어제는 사극 말투, 그제는 로봇 말투였는데…?!)');
      walkTo(neighbor, 2.5, 0.4, 2.2).then(() => (neighbor.root.visible = false));
      await wait(0.6);
      await walkTo(mung, -10.6, 0.4, 2.2, Math.PI);
      if (await env.quiz('apt2') === 'fail') return 'fail';
      mk.hide();

      // 경비 아저씨 등장
      place(scene, guard, [-8.5, 0, 1.2], -Math.PI / 2, 'think');
      await env.cameraTo(shots.elev, 1);
      await say(guard, '경비 아저씨', '학생, 1004호 말이야… 그래도 간첩일 수도 있잖아? 새벽에만 다니고, 방음재 붙이고, 해외랑 연락하고…');
      mung.setPose('think');
      await say(mung, '멍뭉', '(그 단서들은 두 가설 모두로 설명돼… 둘을 "가르는" 증거가 필요해.)');
      mung.setPose('idle');
      if (await env.quiz('apt3') === 'fail') return 'fail';
      mk.hide();

      // 정체 공개
      await env.cut(async () => {
        place(scene, mung, [3.6, 0, 1.2], Math.PI + 0.5, 'idle');
        place(scene, guard, [5.3, 0, 0.0], Math.PI + 1.0, 'idle');
        env.cameraSet(shots.door);
      });
      sfx.door();
      inside.visible = true;
      booLight.intensity = 6;
      await anim(1, k => (doors['1004'].pivot.rotation.y = k * 1.4));
      place(scene, neighbor, [2.5, 0, -1.2], 0, 'cheer');
      neighbor.setExpr('happy');
      await say(neighbor, '1004호', '(낮고 울리는 목소리로) 크하하! 이 몸이 바로 마왕이다—!');
      neighbor.setPose('idle'); neighbor.setExpr('surprised');
      await say(neighbor, '1004호', '앗… 아, 안녕하세요! 녹음 중이라 그만…! 시끄러우셨죠? 죄송해요.');
      neighbor.setExpr('open');
      await say(neighbor, '1004호', '저 성우예요. LA 게임 회사 「마왕의 귀환」 한국어 더빙을 맡았거든요. 시차 때문에 새벽에 녹음해요.');
      guard.setExpr('happy');
      await say(guard, '경비 아저씨', '허허, 간첩이 아니라 마왕이었구먼! 내 손주가 그 게임 한다던데!');
      neighbor.setPose('wave');
      await say(neighbor, '1004호', '이웃사촌 기념으로 사인 카드 드릴게요. 엔딩 크레딧에 제 이름 있어요! 😆');
      mung.setPose('cheer'); mung.setExpr('happy');
      await say(mung, '멍뭉', '역시 "가설을 가르는 증거"가 답이었어! 그런데… 왠지… 모든 게… 하얗게……');
      mung.setPose('idle'); mung.setExpr('sleepy');
      return 'ok';
    },
    debug(state) {
      if (state === 'door') { inside.visible = true; booLight.intensity = 6; doors['1004'].pivot.rotation.y = 1.4; place(scene, neighbor, [2.5, 0, -1.2], 0, 'cheer'); place(scene, mung, [3.6, 0, 1.2], Math.PI + 0.5); }
    },
  };
  return sc;
}
