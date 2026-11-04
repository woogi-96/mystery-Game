import { THREE, box, cyl, sph, cone, torus, group, mat, emissive, canvasTex, textSprite, heartMesh, anim, wait, ease, shot, rand, setSeed, skyDome, sparkles } from '../util.js';
import { place } from './common.js';

/* 프롤로그: 동화책처럼 내레이션이 흐르는 오프닝 애니메이션
   "어느 도시의 밤, 멍뭉이라는 사람이 살고 있었다…" → 우기 등장 → 지친 일상 → 이상한 꿈 예고 */
export function build(env) {
  const { mung, woogi, sfx, ui } = env;
  setSeed(77);

  const scene = new THREE.Scene();
  const BG_DAY = new THREE.Color('#2b2457'), BG_DREAM = new THREE.Color('#1a0c30');
  scene.background = BG_DAY.clone();
  scene.fog = new THREE.Fog('#2b2457', 26, 70);
  const dome = skyDome('#1c1846', '#7a5a9a', 120, { stops: [[0, '#151238'], [0.5, '#4a3a80'], [0.72, '#c58ab0'], [1, '#c58ab0']] });
  scene.add(dome);

  /* 달 + 별 */
  const moon = sph(2.2, emissive('#fff4d6', 1.3, { fog: false }), { pos: [-14, 15, -40], parent: scene, cast: false });
  sph(3.2, emissive('#fff4d6', 0.25, { transparent: true, opacity: 0.25, fog: false }), { pos: [-14, 15, -40.5], parent: scene, cast: false });
  const stars = sparkles(260, { x: [-50, 50], y: [8, 40], z: [-60, -20] }, 0xfff6e0, 0.12);
  scene.add(stars);

  /* 도시 (빌딩 + 창문 불빛) */
  const winTex = (seedOn) => canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#2a2850'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) for (let x = 6; x < w - 6; x += 14) {
      g.fillStyle = Math.random() < seedOn ? ['#ffe08a', '#ffd0a0', '#fff2c0'][Math.floor(Math.random() * 3)] : '#3a3868';
      g.fillRect(x, y, 8, 7);
    }
  });
  const city = group(scene, [0, 0, 0]);
  const cityMats = [0.35, 0.5, 0.65].map(p => new THREE.MeshStandardMaterial({ map: winTex(p), emissiveMap: winTex(p), emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.9 }));
  for (let i = 0; i < 40; i++) {
    const a = rand(-1.25, 1.25) + Math.PI; // 뒤쪽 반원
    const r = rand(17, 38);
    const h = rand(2.5, 9) + (r - 17) * 0.25, w = rand(1.8, 3.6);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), cityMats[i % 3]);
    b.position.set(Math.sin(a) * r, h / 2 - 2.5, Math.cos(a) * r);
    b.rotation.y = rand(0, 1);
    city.add(b);
  }

  /* 떠 있는 작은 동산 (무대) */
  const island = group(scene, [0, 0, 0]);
  cyl(6, 4.6, 1.2, '#8fcf86', { pos: [0, -0.6, 0], parent: island, seg: 48 });
  cone(4.6, 3.2, '#9a7a5a', { pos: [0, -2.8, 0], rot: [Math.PI, 0, 0], parent: island, seg: 24 });
  const path = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), mat('#f2e2c6'));
  path.rotation.x = -Math.PI / 2; path.position.y = 0.012; path.receiveShadow = true; island.add(path);
  // 가로등
  const lamp = group(island, [-3.4, 0, -1.6]);
  cyl(0.07, 0.09, 3.4, '#4a4a6a', { pos: [0, 1.7, 0], parent: lamp });
  sph(0.32, emissive('#ffe8b0', 1.6), { pos: [0, 3.5, 0], parent: lamp, cast: false });
  const lampL = new THREE.PointLight('#ffd9a0', 6, 9, 1.6); lampL.position.set(-3.4, 3.3, -1.6); scene.add(lampL);
  // 벤치
  const bench = group(island, [3.2, 0, -2.0], [0, -0.5, 0]);
  box(2.0, 0.12, 0.6, '#c58a5a', { pos: [0, 0.6, 0], parent: bench });
  box(2.0, 0.5, 0.1, '#c58a5a', { pos: [0, 0.95, -0.28], parent: bench });
  for (const x of [-0.85, 0.85]) box(0.1, 0.6, 0.5, '#4a4a6a', { pos: [x, 0.3, 0], parent: bench });
  // 꽃
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2), r = rand(2.6, 5.6);
    sph(0.08, ['#ffb0cf', '#ffe08a', '#b49ad8', '#ffffff'][i % 4], { pos: [Math.cos(a) * r, 0.1, Math.sin(a) * r], parent: island, cast: false });
  }

  /* 조명 */
  const hemi = new THREE.HemisphereLight('#c8c0ff', '#5a4a7a', 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffe8f0', 1.4);
  key.position.set(6, 12, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  scene.add(key);
  const spotM = new THREE.SpotLight('#fff0e0', 0, 16, 0.38, 0.6, 1.2);
  spotM.position.set(0.9, 9, 2.5); spotM.target.position.set(0.9, 0, 0); scene.add(spotM, spotM.target);
  const spotW = new THREE.SpotLight('#ffe8f4', 0, 16, 0.38, 0.6, 1.2);
  spotW.position.set(-0.9, 9, 2.5); spotW.target.position.set(-0.9, 0, 0); scene.add(spotW, spotW.target);

  /* 소품: 떠다니는 아이콘 */
  const iconCode = textSprite('</>', { size: 80, scale: 0.55, color: '#5a7ad8', border: '#9fb8ff' });
  const iconBar = textSprite('철봉', { size: 64, scale: 0.5, color: '#5a3d5c' });
  const iconMac = textSprite('Mac mini', { size: 56, scale: 0.5, color: '#5a5a6a', border: '#c9ccd2' });
  const icons = [iconCode, iconBar, iconMac];
  icons.forEach(s => { s.visible = false; scene.add(s); });

  const hearts = [];
  for (let i = 0; i < 10; i++) { const h = heartMesh(0.35, emissive('#ff6f98', 0.5), 0.15); h.visible = false; scene.add(h); hearts.push(h); }
  const bigHeart = heartMesh(0.55, emissive('#ff6f98', 0.6), 0.18); bigHeart.visible = false; scene.add(bigHeart);

  /* 꿈 이펙트: 보랏빛 조각 + 고리 */
  const dreamG = group(scene, [0, 0, 0]); dreamG.visible = false;
  const shards = [];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.12, 0.45), 0), emissive(['#8a5ad8', '#b84a9a', '#5a6ad8'][i % 3], 0.9, { flatShading: true }));
    const a = rand(0, Math.PI * 2), r = rand(2.5, 9);
    m.userData = { a, r, y: rand(-3, 6), s: rand(0.2, 0.6) };
    dreamG.add(m); shards.push(m);
  }
  const rings = [0, 1, 2].map(i => torus(2.6 + i * 1.3, 0.03, emissive('#c8a0ff', 1.4), { pos: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0], parent: dreamG, cast: false }));

  const shots = {
    sky: shot([6, 22, 30], [0, 6, -20], 55),
    city: shot([3, 9, 16], [0, 2, -6], 50),
    approach: shot([2.5, 4.2, 9], [0.4, 1.4, 0], 46),
    mung: shot([2.2, 2.4, 5.2], [0.9, 1.7, 0], 36),
    mungWide: shot([3.4, 3.0, 6.6], [0.6, 1.8, 0], 42),
    two: shot([0, 2.5, 6.4], [0, 1.6, 0], 40),
    twoClose: shot([0, 2.6, 5.8], [0, 2.0, 0], 36),
    tired: shot([1.4, 1.5, 4.6], [0.7, 1.9, 0], 42),
    back: shot([-3.2, 2.6, -4.6], [0, 1.6, 0], 40),
    side: shot([5.2, 2.2, 0.4], [0, 1.9, 0], 34),
    up: shot([0.4, 1.0, 4.4], [0.6, 3.4, -1], 52),
  };

  let t0 = 0, dreamK = 0, heartsOn = false;
  const sc = {
    scene, shots,
    startShot: () => shots.sky,
    reset() {
      scene.background.copy(BG_DAY); dreamK = 0; heartsOn = false;
      hemi.intensity = 0.9; key.intensity = 1.4; spotM.intensity = 0; spotW.intensity = 0;
      dreamG.visible = false; bigHeart.visible = false;
      icons.forEach(s => (s.visible = false));
      hearts.forEach(h => (h.visible = false));
      place(scene, mung, [0.9, 0, 0], -0.15, 'idle', 'open');
      place(scene, woogi, [-0.9, 0, 0], 0.35, 'idle', 'happy');
      woogi.root.visible = false;
    },
    debug() {
      woogi.root.visible = true; spotM.intensity = 60; spotW.intensity = 60;
      woogi.setPose('cheeks'); woogi.setExpr('happyWink');
      mung.setPose('chin'); mung.setExpr('happy'); mung.root.rotation.y = -0.55;
    },
    update(dt, t) {
      t0 = t;
      stars.update(t);
      moon.rotation.y = t * 0.05;
      icons.forEach((s, i) => { if (s.visible) s.position.y = s.userData.y + Math.sin(t * 1.6 + i) * 0.12; });
      if (bigHeart.visible) { bigHeart.rotation.y = Math.sin(t * 1.5) * 0.4; bigHeart.position.y = 3.25 + Math.sin(t * 2) * 0.08; }
      hearts.forEach((h, i) => {
        if (!heartsOn && !h.visible) return;
        const u = h.userData;
        u.p = (u.p ?? i / hearts.length) + dt * 0.18;
        if (u.p > 1) { u.p -= 1; h.visible = heartsOn; }
        h.position.set(Math.sin(i * 2.3) * 2.2 + Math.sin(t + i) * 0.2, 0.6 + u.p * 4.2, -0.6 + Math.cos(i * 1.7) * 0.6);
        h.scale.setScalar(Math.sin(u.p * Math.PI) * 1.0 + 0.01);
        h.rotation.y = t * 1.5 + i;
      });
      if (dreamG.visible) {
        shards.forEach(m => {
          const u = m.userData;
          u.a += dt * u.s * 0.5;
          m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * u.s * 2 + u.r) * 0.5, Math.sin(u.a) * u.r);
          m.rotation.x += dt * u.s; m.rotation.y += dt * u.s * 1.3;
        });
        rings.forEach((r, i) => { r.rotation.z = t * (0.2 + i * 0.12); r.position.y = 0.2 + i * 1.1 + Math.sin(t + i) * 0.2; });
      }
    },

    /* 프롤로그 재생. 건너뛰기를 누르면 즉시 끝난다 */
    async play() {
      let skipped = false;
      const skipBtn = document.getElementById('skipBtn');
      const SKIP = new Error('skip');
      const onSkip = () => { skipped = true; sfx.click(); ui.narrateCancel(); };
      skipBtn.classList.remove('hidden');
      skipBtn.onclick = onSkip;
      const step = async p => { await p; if (skipped) throw SKIP; };
      const narr = (text, hold) => step(ui.narrate(text, hold));

      try {
        env.cameraSet(shots.sky);
        ui.letterbox(true);
        await step(ui.fadeTo('#000', 0, 2.0));
        env.cameraTo(shots.city, 7, ease.inOut);
        await narr('어느 도시의 밤.');
        await narr('반짝이는 불빛들 사이에…');

        // 멍뭉 소개
        env.cameraTo(shots.approach, 3.2);
        anim(2.5, k => (spotM.intensity = k * 60));
        await step(wait(1.6));
        mung.setPose('wave'); mung.setExpr('happy'); mung.talk = 1.2;
        sfx.bell();
        await narr('멍뭉이라는 사람이 살고 있었다.');
        await step(env.cameraTo(shots.mung, 1.6));
        ui.nameTag('멍뭉', '곱슬머리 · 크림색 후드티 · 민트 머리끈');
        mung.setPose('idle'); mung.setExpr('open');
        await narr('멍뭉은 회사에서 코드를 짜는 개발자.', 2.6);
        env.cameraTo(shots.mungWide, 1.6);
        [[1.9, 2.9, 0.4], [-0.3, 3.4, 0.2], [2.6, 1.9, 0.6]].forEach((p, i) => {
          const s = icons[i]; s.position.set(...p); s.userData.y = p[1]; s.visible = true;
          const sx = s.scale.x, sy = s.scale.y; anim(0.4, k => s.scale.set(sx * k, sy * k, 1), ease.out).then(() => s.scale.set(sx, sy, 1));
        });
        sfx.blip();
        mung.setPose('think'); mung.setExpr('happy');
        await narr('맥미니로 코딩하고, 틈만 나면 철봉에 매달리는…\n아주 평범한 사람이다.', 3.0);
        ui.nameTag(null);

        // 우기 등장
        icons.forEach(s => (s.visible = false));
        env.cameraTo(shots.two, 1.8);
        mung.setPose('idle'); mung.setExpr('open');
        await narr('그리고 멍뭉에게는,');
        woogi.root.visible = true;
        woogi.setPose('wave'); woogi.setExpr('happyWink');
        sfx.heart();
        anim(1.2, k => (spotW.intensity = k * 60));
        await step(anim(0.6, k => woogi.root.scale.setScalar(Math.max(0.01, k)), ease.back || ease.out));
        await anim(0.4, k => (mung.root.rotation.y = -0.15 - k * 0.4));
        mung.setExpr('happy');
        await step(wait(0.4));
        await step(env.cameraTo(shots.twoClose, 1.4));
        ui.nameTag('우기', '일자 앞머리 · 검정 긴 생머리 · 회색 집업', 'woogi');
        woogi.setPose('cheeks'); woogi.setExpr('happyWink');
        mung.setPose('chin'); mung.setExpr('happy');
        bigHeart.visible = true; bigHeart.position.set(0, 3.25, 0);
        anim(0.5, k => bigHeart.scale.setScalar(Math.max(0.01, k)), ease.out);
        sfx.heart();
        await narr('우기가 있다.', 2.0);
        heartsOn = true;
        env.cameraTo(shots.two, 2.4);
        await narr('평범하지만 반짝이는, 두 사람의 하루하루.', 2.8);
        ui.nameTag(null);

        // 지친 일상
        heartsOn = false; bigHeart.visible = false;
        anim(1.2, k => { spotW.intensity = 60 * (1 - k); woogi.root.scale.setScalar(Math.max(0.01, 1 - k)); }).then(() => (woogi.root.visible = false));
        env.cameraTo(shots.tired, 2.0);
        anim(2.0, k => { hemi.intensity = 0.9 - 0.5 * k; key.intensity = 1.4 - 1.0 * k; spotM.intensity = 60 - 25 * k; });
        await anim(0.4, k => (mung.root.rotation.y = -0.55 + k * 0.4));
        mung.setPose('tired'); mung.setExpr('sleepy');
        await narr('그런데 요즘 멍뭉은,\n매일 이어지는 야근에 지쳐 있다.', 2.8);

        // 이상한 꿈 예고
        dreamG.visible = true;
        sfx.dream();
        ui.dreamFx(0.45, 2.0);
        anim(2.5, k => { scene.background.lerpColors(BG_DAY, BG_DREAM, k); scene.fog.color.copy(scene.background); spotM.color.setHSL(0.75, 0.6, 0.85 - 0.1 * k); });
        env.cameraTo(shots.up, 3.0);
        await step(wait(0.8));
        mung.setPose('idle'); mung.setExpr('surprised');
        await narr('그리고 오늘 밤 —', 1.6);
        env.shake(0.08);
        await narr('멍뭉은 아주, 아주 이상한 꿈을 꾸게 된다.', 2.6);
        await step(ui.fadeTo('#000', 1, 1.2));
        ui.dreamFx(0, 0.4);
        ui.letterbox(false);
        skipBtn.classList.add('hidden');
        await ui.titleCard('PROLOGUE', '멍뭉의 꿈 미스터리', '꿈속 다섯 사건을 풀고, 우기를 만나러 가자');
      } catch (e) {
        if (e !== SKIP) throw e;
        await ui.fadeTo('#000', 1, 0.5);
      }
      // 정리
      skipBtn.classList.add('hidden');
      skipBtn.onclick = null;
      ui.narrateCancel(); ui.nameTag(null); ui.letterbox(false);
      ui.dreamFx(0, 0.3);
      woogi.root.scale.setScalar(1);
      mung.talk = 0;
    },
  };
  return sc;
}
