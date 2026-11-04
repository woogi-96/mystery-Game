import { THREE, box, rbox, cyl, sph, cone, plane, torus, group, mat, emissive, texPlane, canvasTex, textSprite, heartMesh, anim, wait, ease, shot, FONT, FONT2, roundRect, rand, setSeed, skyDome, tree, sparkles } from '../util.js';
import { place, talker, walkTo, turnTo, emote } from './common.js';
import { EPISODES } from '../quizzes.js';

/* 엔딩: (1) 알고 보니 다 꿈 → 우기와 데이트  (2) 꿈에 갇힘 → 우기가 깨워줌 */
export function build(env) {
  const { mung, woogi, sfx } = env;
  setSeed(520);

  /* ═════ 데이트 장소 ═════ */
  const date = new THREE.Scene();
  date.background = new THREE.Color('#ffe9f0');
  date.fog = new THREE.Fog('#ffe9f0', 30, 100);
  date.add(skyDome('#8fd0ff', '#fff0f6', 160));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(100, 48), mat('#a6dc8c'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; date.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9, 48), mat('#f2e2cf'));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; date.add(plaza);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4, 40), mat('#efd9b4'));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.015, 24); date.add(road);
  // 분수
  const fountain = group(date, [0, 0, -1]);
  cyl(2.6, 2.8, 0.7, '#e6e0f0', { pos: [0, 0.35, 0], parent: fountain });
  cyl(2.3, 2.3, 0.05, emissive('#8fd8ff', 0.3, { roughness: 0.05 }), { pos: [0, 0.68, 0], parent: fountain, cast: false });
  cyl(0.3, 0.4, 1.8, '#e6e0f0', { pos: [0, 1.2, 0], parent: fountain });
  cyl(1.1, 0.9, 0.3, '#e6e0f0', { pos: [0, 2.1, 0], parent: fountain });
  const spray = cone(0.5, 1.4, emissive('#bfeaff', 0.6, { transparent: true, opacity: 0.6 }), { pos: [0, 2.9, 0], parent: fountain, cast: false });
  // 벚꽃 나무
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const r = rand(11, 16); tree(date, Math.cos(a) * r, Math.sin(a) * r - 2, rand(1.1, 1.5), ['#ffc4dc', '#ffb0cf', '#ffd6e6']); }
  for (let i = 0; i < 8; i++) { tree(date, (i % 2 ? 4.5 : -4.5), 14 + Math.floor(i / 2) * 6, 1.2, ['#ffc4dc', '#ffb0cf', '#ffd6e6']); }
  // 카페
  const cafe = group(date, [-9, 0, -9], [0, 0.6, 0]);
  rbox(7, 5, 5, 0.2, '#fff6ea', { pos: [0, 2.5, 0], parent: cafe });
  for (let i = 0; i < 7; i++) box(1, 0.3, 1.6, i % 2 ? '#ff8fb1' : '#ffffff', { pos: [-3 + i, 3.6, 3.0], rot: [0.5, 0, 0], parent: cafe });
  texPlane(3.5, 0.9, 400, 100, (g, w, h) => { g.fillStyle = '#5a3d5c'; roundRect(g, 0, 0, w, h, 20); g.fill(); g.fillStyle = '#ffe08a'; g.font = `62px ${FONT}`; g.textAlign = 'center'; g.fillText('☕ 꿈속 카페', w / 2, 72); }, { pos: [0, 4.5, 2.55], parent: cafe });
  plane(2.4, 2, emissive('#ffe7b8', 0.6), { pos: [-1.5, 1.6, 2.52], parent: cafe });
  plane(1.2, 2.6, mat('#a87a4a'), { pos: [1.8, 1.3, 2.52], parent: cafe });
  for (const x of [-2, 2]) { const tb = group(date, [-6 + x, 0, -4.5]); cyl(0.6, 0.6, 0.06, '#fff', { pos: [0, 1.1, 0], parent: tb }); cyl(0.05, 0.05, 1.1, '#888', { pos: [0, 0.55, 0], parent: tb }); cone(1.2, 0.8, '#ff8fb1', { pos: [0, 3.1, 0], parent: tb }); cyl(0.04, 0.04, 2.6, '#ddd', { pos: [0, 1.6, 0], parent: tb }); }
  // 풍선
  const balloons = [];
  for (let i = 0; i < 6; i++) {
    const b = group(date, [rand(-6, 6), 0, rand(-6, 6)]);
    sph(0.45, ['#ff8fb1', '#ffd34d', '#9fd8ff', '#b49ad8', '#7cd8b0'][i % 5], { pos: [0, 0, 0], scale: [1, 1.2, 1], parent: b });
    b.userData = { ph: rand(0, 6), y: rand(4, 7) };
    balloons.push(b);
  }
  const petals = sparkles(260, { x: [-14, 14], y: [0.3, 9], z: [-12, 20] }, 0xffb8d8, 0.22);
  date.add(petals);
  const hearts = [];
  for (let i = 0; i < 14; i++) { const h = heartMesh(0.5, emissive('#ff6f98', 0.4), 0.15); h.visible = false; date.add(h); hearts.push(h); }
  const hemiD = new THREE.HemisphereLight('#fff6fa', '#a6dc8c', 1.1); date.add(hemiD);
  const sunD = new THREE.DirectionalLight('#fff0dc', 2.4);
  sunD.position.set(10, 20, 14); sunD.castShadow = true; sunD.shadow.mapSize.set(2048, 2048);
  Object.assign(sunD.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 }); date.add(sunD);

  /* ═════ 꿈의 감옥 (보이드) ═════ */
  const voidS = new THREE.Scene();
  voidS.background = new THREE.Color('#120820');
  voidS.fog = new THREE.FogExp2('#1a0c30', 0.05);
  const shards = [];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.2, 0.9), 0), emissive(['#6a3ab8', '#3a2a78', '#b84a9a'][i % 3], 0.6, { flatShading: true }));
    const r = rand(4, 16), a = rand(0, Math.PI * 2);
    m.position.set(Math.cos(a) * r, rand(-6, 8), Math.sin(a) * r);
    m.userData = { a, r, s: rand(0.05, 0.2), y: m.position.y };
    voidS.add(m); shards.push(m);
  }
  const ringV = [];
  for (let i = 0; i < 4; i++) { const t = torus(3 + i * 1.6, 0.03, emissive('#b48cff', 1.2), { pos: [0, 1, 0], parent: voidS, cast: false }); ringV.push(t); }
  const vLight = new THREE.PointLight('#b48cff', 20, 20, 1.5); vLight.position.set(0, 4, 3); voidS.add(vLight);
  voidS.add(new THREE.HemisphereLight('#6a5ab8', '#1a0c30', 0.8));
  const vSp = sparkles(200, { x: [-10, 10], y: [-4, 8], z: [-10, 10] }, 0xd8b8ff, 0.15);
  voidS.add(vSp);
  const rescue = new THREE.PointLight('#fff4d0', 0, 30, 1.2); rescue.position.set(0, 9, 0); voidS.add(rescue);

  const say = talker(env.ui);
  let heartOn = false;
  const sc = {
    scene: date, extraScenes: [voidS], actors: [],
    shots: {
      wide: shot([0, 6, 22], [0, 1.5, 0], 50),
      meet: shot([4.5, 2.8, 8.5], [0, 1.4, 3.0], 46),
      couple: shot([0.5, 2.2, 7.2], [0, 1.5, 3.0], 40),
      away: shot([3, 7, 14], [-2.5, 1.5, 1], 50),
    },
    focus: {},
    startShot() { return sc.shots.wide; },
    update(dt, t) {
      petals.update(t);
      spray.scale.y = 1 + Math.sin(t * 5) * 0.1;
      balloons.forEach(b => { b.position.y = b.userData.y + Math.sin(t + b.userData.ph) * 0.4; });
      if (heartOn) hearts.forEach((h, i) => {
        const p = (t * 0.25 + i / hearts.length) % 1;
        h.visible = true;
        const a = i * 2.4;
        h.position.set(Math.cos(a) * (1.2 + p * 2) + mung.root.position.x * 0.5 + woogi.root.position.x * 0.5, 1 + p * 5, 3 + Math.sin(a) * (1 + p * 2));
        h.rotation.y = t * 2 + i;
        h.scale.setScalar(Math.sin(p * Math.PI) * 0.9 + 0.01);
      });
      shards.forEach(s => { s.userData.a += s.userData.s * dt; s.position.x = Math.cos(s.userData.a) * s.userData.r; s.position.z = Math.sin(s.userData.a) * s.userData.r; s.rotation.x += dt; s.rotation.y += dt * 0.7; });
      ringV.forEach((r, i) => { r.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.4; r.rotation.y = t * 0.2 * (i % 2 ? 1 : -1); });
      vSp.update(t);
      if (sc.scene === voidS) {
        mung.root.position.y = 1 + Math.sin(t * 1.2) * 0.3;
        mung.root.rotation.y += dt * 0.3;
      }
    },

    /* ───────── 해피 엔딩 ───────── */
    async happy(env, room) {
      const { ui } = env;
      await ui.fadeTo('#fff', 1, 1.4);
      ui.dreamFx(0, 0.1);
      room.reset();
      room.setTime(8.2);
      room.st.zzz = false;
      mung.root.visible = true;
      room.placeLying(); mung.setExpr('closed');
      room.blanket.visible = true; room.blanket.scale.set(1, 1, 1);
      env._setScene(room);
      env.cameraSet(room.shots.face);
      ui.clock(true, '08:12', '');
      await ui.fadeTo('#fff', 0, 2.0);
      sfx.ring();
      await wait(0.8);
      mung.setExpr('open');
      await anim(1.0, k => { mung.root.rotation.x = -Math.PI / 2 * (1 - k); mung.root.position.y = 0.92 - 0.56 * k; mung.root.position.z = -2.35 - 1.05 * k; });
      room.placeSitting(); mung.setPose('sitFloor'); mung.setExpr('surprised');
      room.blanket.visible = false;
      await env.cameraTo(room.shots.bed, 1.2);
      await ui.caption('✨ 알고 보니… 다 꿈이었다! ✨', 2.6);
      await say(mung, '멍뭉', '……꿈? 학교에, 동굴에, 정전에, 버스에, 마왕 성우까지… 전부 꿈이었어?!');
      mung.setExpr('happy');
      await say(mung, '멍뭉', '이상하게 머리는 개운하네. 밤새 추리를 했더니…');
      sfx.ring();
      mung.setPose('phone'); mung.setExpr('open');
      await say('', '', '📱 우기 💗 에게서 전화가 왔다!');
      await say(woogi, '우기', '멍뭉아~ 일어났어? 오늘 데이트하는 날인 거 안 잊었지? 11시에 분수 광장!');
      mung.setExpr('surprised');
      await say(mung, '멍뭉', '헉, 맞다!! 금방 갈게!! 기다려 우기야!');
      // 데이트 장면으로
      await ui.fadeTo('#fff', 1, 0.9);
      ui.clock(false);
      sc.scene = date;
      env._setScene(sc);
      place(date, woogi, [0.9, 0, 3.0], Math.PI, 'idle');
      woogi.root.rotation.y = 0.3;
      place(date, mung, [1.0, 0, 20], Math.PI, 'idle');
      env.cameraSet(sc.shots.wide);
      await ui.fadeTo('#fff', 0, 1.0);
      await ui.caption('☀ 오전 11시 · 분수 광장', 1.6);
      env.cameraTo(sc.shots.meet, 3);
      mung.setExpr('happy');
      await walkTo(mung, -0.4, 4.2, 4.2, 0.6);
      woogi.setPose('wave'); woogi.setExpr('happy');
      await turnTo(woogi, -0.7, 0.4);
      await say(woogi, '우기', '멍뭉아! 여기야 여기~!');
      // 꿈 이야기 옹알옹알 (그 판에서 푼 문제와 고른 선택이 그대로 들어간다)
      const f = env.state.flags || {};
      const R0 = env.state.round;
      const topic = id => { const t = env.getQuiz(id).title; return t.includes('·') ? t.split('·').pop().trim() : t; };
      const riddle = () => { const q = env.getQuiz('school3'); return (q.ask || '').replace(/^문제!\s*/, ''); };
      const pick = (arr, k) => arr[(R0 + k) % arr.length];
      const babble = (text) => say(mung, '멍뭉', text, { speed: 16 });
      const wsay = (text) => say(woogi, '우기', text);
      await env.cameraTo(sc.shots.couple, 1.4);
      mung.setPose('cheer'); mung.setExpr('happy');
      await babble(pick(['우기야 우기야! 나 어젯밤에 진짜 이상한 꿈 꿨어! 들어 봐 들어 봐!', '우기야! 나 꿈에서 하루를 통째로 살고 왔어! 들어 볼래?', '대박 사건! 나 어젯밤 꿈이 완전 영화였어! 얘기해 줄게!'], 0));
      woogi.setPose('idle'); woogi.setExpr('happy');
      await wsay(pick(['응응, 무슨 꿈인데? ㅎㅎ', '뭔데 뭔데? 궁금해!', '또 무슨 꿈을 꿨길래~ ㅋㅋ'], 1));
      mung.setPose('wave');
      await babble((f.attend === 1 ? '처음엔 대학교였는데, 교수님이 출석 부를 때 자는 척하다가 딱 걸렸어…' : '처음엔 대학교였는데, 교수님이 출석 부르길래 "네!!" 했더니 목소리가 다 잠겨서 다들 웃고…')
        + ` 수업에선 「${topic('school1')}」, 「${topic('school2')}」 문제도 풀었다?`);
      await wsay(pick(['꿈에서도 수업을 들었어? ㅋㅋ 대학생 멍뭉이 귀엽다', '헐 꿈에서도 공부했구나~ 기특해', '어려운 거 했네? 나도 그 수업 듣고 싶다 ㅋㅋ'], 2));
      await babble((f.snack === 0 ? '동아리방에선 서준이가 민트초코 떡볶이를 줬는데… 이상하게 맛있었어!!' : '동아리방에선 서준이가 민트초코 떡볶이를 주길래 겨우 피했지 ㅋㅋ')
        + ` 넌센스 대회에선 "${riddle()}" 이거 맞혀서 내가 우승!`);
      await wsay(pick(['ㅋㅋㅋ 민트초코 떡볶이는 뭐야~', '넌센스 우승이라니, 역시 아재개그 장인~', 'ㅋㅋㅋ 그 문제 나도 내 봐야지'], 3));
      mung.setPose('think');
      await babble((f.light === 1 ? '그다음엔 공원 동굴에 갇혔는데 손전등도 안 켜고 들어갔다가 돌부리에 쿵!' : '그다음엔 공원 동굴에 갇혔는데, 손전등 켜고 들어가서 관리인 아저씨한테 칭찬받았다?')
        + ` 「${topic('cave1')}」, 「${topic('cave2')}」, 「${topic('cave3')}」… 수수께끼 세 개 풀고 탈출했어!`);
      await wsay(pick(['우와, 머리 엄청 썼겠다!', '동굴이라니 무서웠겠다… 그래도 잘 나왔네!', '그거 나 풀어 보라 하면 못 풀었을 듯 ㅋㅋ'], 4));
      mung.setPose('panic');
      await babble(`회사에선 「${topic('office1')}」, 「${topic('office2')}」 문제 풀면서 일하다가`
        + (f.mail === 0 ? ' 야근 중에 정전이 났는데, 메일부터 보내려다 팀장님한테 혼나고…' : ' 야근 중에 정전이 났는데, 내가 "다들 계단으로!" 외쳤다?')
        + ` 「${topic('office3')}」 문제까지 풀어서 폰부스에 남은 박사원님도 찾았어!`);
      woogi.setExpr('surprised');
      await wsay(pick(['헐 대박, 우리 멍뭉이 영웅이네?', '박사원님 큰일 날 뻔했네! 멍뭉이 최고!', '꿈에서도 야근이라니… 고생했어 ㅠㅠ'], 5));
      mung.setPose('point');
      await babble('버스에선 기사님이 쓰러지셔서 내가 버스를 세웠어!'
        + ` 「${topic('bus2')}」 문제로 기사님도 살리고, 「${topic('bus3')}」 문제로 길도 찾았어.`
        + (f.msg === 0 ? ' 너한테 문자 보냈더니 아이스크림 사 온다 그랬고 ㅋㅋ' : '') + ' 근데 너도 나왔다? 아파트 앞에서 손 흔들어 줬어!');
      woogi.setExpr('happy');
      await wsay(pick(['꿈에서도 나 보러 왔구나~ 헤헤', '나도 나왔다니 기분 좋다 ㅎㅎ', '버스 운전까지? 못 하는 게 없네 ㅋㅋ'], 6));
      mung.setPose('think');
      await babble((f.night === 1 ? '집에 와서 게임 한 판만 한다는 게 새벽 2시가 됐는데,' : '집에 와서 자는데 새벽 2시에 깼거든?')
        + ` 옆집 사람이 간첩인 줄 알았는데… 「${topic('apt3')}」 문제까지 풀어 보니까 알고 보니 게임 성우였어!!`);
      await wsay(pick(['ㅋㅋㅋ 성우라니 반전이다', '간첩 아니라서 다행이다 ㅋㅋㅋ', '완전 추리왕 멍뭉이네~'], 7));
      await babble(`그리고 돌발 퀴즈도 ${env.state.popTotal}개 중에 ${env.state.popRight}개 맞혔다? 헥헥…`);
      woogi.setPose('cheeks'); woogi.setExpr('happyWink');
      await wsay('ㅋㅋㅋ 숨 좀 쉬고 말해~ 꿈에서도 열심히 살았네, 우리 멍뭉이. 그럼 오늘은 아무 생각 말고 놀자!');
      mung.setPose('cheeks'); mung.setExpr('happy');
      heartOn = true; sfx.heart();
      await say(mung, '멍뭉', '응! …근데 우기야, 오늘 왜케 이뻐?');
      await say(woogi, '우기', '꺄 ㅎㅎ 빨리 가자! 카페 예약했단 말이야~');
      woogi.setPose('idle'); mung.setPose('idle');
      env.cameraTo(sc.shots.away, 4);
      walkTo(woogi, -2.8, 3.2, 1.6);
      await walkTo(mung, -3.6, 4.0, 1.6);
      woogi.setPose('wave'); mung.setPose('wave');
      const mins = Math.round((performance.now() - env.state.startTime) / 60000);
      const res = await ui.ending('💗 HAPPY END 💗', `알고 보니 다 꿈이었다!<br>멍뭉이는 우기와 데이트를 떠났습니다.<br><br><small>꿈속 퀴즈 15문제 클리어 · 오답 ${env.state.wrongTotal}회<br>돌발 퀴즈 ${env.state.popRight}/${env.state.popTotal} · 플레이 약 ${mins}분</small>`, [{ label: '🔄 게임 다시 시작하기' }, { label: '👋 게임 끝내기', sub: true }]);
      heartOn = false; hearts.forEach(h => (h.visible = false));
      return res;
    },

    /* ───────── 꿈에 갇힘 ───────── */
    async trapped(env, room, epIdx) {
      const { ui } = env;
      ui.hideQuiz();
      await ui.fadeTo('#000', 1, 1.2);
      ui.dreamFx(0, 0.1);
      sc.scene = voidS;
      env._setScene(sc);
      place(voidS, mung, [0, 1, 0], 0, 'tired', 'sad');
      env.cameraSet(shot([0, 3, 9], [0, 1.5, 0], 50));
      await ui.fadeTo('#000', 0, 1.5);
      env.cameraTo(shot([0, 2.2, 5], [0, 1.6, 0], 44), 4);
      await ui.caption('💤 꿈에 갇혀 버렸다……', 2.6);
      await say(mung, '멍뭉', '여긴 어디지… 아무리 걸어도 끝이 없어… 깨어날 수가 없어……');
      await say(mung, '멍뭉', '(누가… 나 좀 깨워줘……)');
      await anim(1.6, k => (rescue.intensity = k * 120));
      await say(woogi, '???', '……멍뭉아!! 멍뭉아!!!');
      await ui.fadeTo('#fff', 1, 1.0);
      // 현실의 방: 우기가 와서 흔들어 깨운다
      room.reset();
      room.setTime(9.5);
      room.setLight(true, 0);
      env._setScene(room);
      mung.root.visible = true;
      room.placeLying(); mung.setExpr('closed');
      room.blanket.visible = true; room.blanket.scale.set(1, 1, 1);
      room.st.zzz = false;
      room.scene.add(woogi.root);
      place(room.scene, woogi, [-1.9, 0, -3.6], -Math.PI / 2 - 0.2, 'shake', 'open');
      env.cameraSet(shot([-0.2, 3.0, 1.2], [-2.8, 1.1, -3.5], 46));
      ui.clock(true, '09:30', '');
      await ui.fadeTo('#fff', 0, 1.2);
      env.shake(0.15);
      await say(woogi, '우기', '멍뭉아!! 일어나!! 알람이 열 번은 울렸어! 연락이 안 돼서 걱정돼서 왔잖아!');
      mung.setExpr('open');
      await anim(0.9, k => { mung.root.rotation.x = -Math.PI / 2 * (1 - k); mung.root.position.y = 0.92 - 0.56 * k; mung.root.position.z = -2.35 - 1.05 * k; });
      room.placeSitting(); mung.setPose('sitFloor');
      room.blanket.visible = false;
      woogi.setPose('idle');
      await say(mung, '멍뭉', '……우기? 나… 꿈속에서 퀴즈를 못 풀어서… 갇혀 있었어……');
      woogi.setPose('cheeks'); woogi.setExpr('happy');
      await say(woogi, '우기', '무슨 꿈이길래~ 내가 왔으니까 이제 괜찮아. 그래도 그 퀴즈, 궁금하다? 다시 도전해 볼래?');
      ui.clock(false);
      const ep = EPISODES[epIdx];
      const res = await ui.ending('💤 꿈에 갇힘…', `「꿈 ${ep.no} · ${ep.title}」에서 하트를 모두 잃었다.<br>다행히 우기가 와서 멍뭉이를 깨워 주었다!`, [{ label: `다시 꿈꾸기 (꿈 ${ep.no}부터)` }, { label: '처음부터', sub: true }]);
      woogi.root.visible = false;
      return res;
    },
  };
  return sc;
}
