import { THREE, updateTweens, anim, wait, ease, clock } from './util.js';
import { makeMungmung, makeWoogi } from './characters.js';
import { ui } from './ui.js';
import { sfx } from './audio.js';
import { QUIZ, EPISODES } from './quizzes.js';
import { VARIANTS, POPS } from './variants.js';
import * as Room from './scenes/room.js';
import * as School from './scenes/school.js';
import * as Park from './scenes/park.js';
import * as Office from './scenes/office.js';
import * as Bus from './scenes/bus.js';
import * as Apt from './scenes/apartment.js';
import * as Ending from './scenes/ending.js';
import * as Prologue from './scenes/prologue.js';

/* ───────── 렌더러 ───────── */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 세로 화면에서는 시야를 조금 넓힌다
  camera.userData.fovBoost = w < h ? 14 : 0;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ───────── 카메라 제어 ───────── */
const camBase = { pos: new THREE.Vector3(0, 3, 8), look: new THREE.Vector3(0, 1, 0), fov: 50 };
let shake = 0;
let viewShift = 0;
let sway = 1;

function cameraTo(s, dur = 1.6, e = ease.inOut) {
  if (!s) return Promise.resolve();
  const p0 = camBase.pos.clone(), l0 = camBase.look.clone(), f0 = camBase.fov;
  const f1 = s.fov ?? f0;
  return anim(dur, k => {
    camBase.pos.lerpVectors(p0, s.pos, k);
    camBase.look.lerpVectors(l0, s.look, k);
    camBase.fov = f0 + (f1 - f0) * k;
  }, e);
}
function cameraSet(s) {
  camBase.pos.copy(s.pos); camBase.look.copy(s.look);
  if (s.fov) camBase.fov = s.fov;
}

/* ───────── 씬 관리 ───────── */
const mung = makeMungmung();
const woogi = makeWoogi();
const cache = {};
let current = null;

function getScene(mod, key) {
  if (!cache[key]) {
    cache[key] = mod.build(env);
    stabilize(cache[key]);
  }
  return cache[key];
}
/* 깜빡임 방지: 그림자 여드름(shadow acne) 보정 + 소수점 위치 흔들림 방지 */
function stabilize(sc) {
  const scenes = new Set([sc.scene, ...(sc.extraScenes || [])]);
  scenes.forEach(s => s && s.traverse(o => {
    if (o.isLight && o.castShadow) {
      o.shadow.bias = o.isPointLight ? -0.004 : -0.0006;
      o.shadow.normalBias = 0.03;
    }
  }));
}

function setScene(s) {
  current = s;
  if (s.onEnter) s.onEnter();
}

const state = { hearts: 3, ep: 0, quizIndex: 0, wrongTotal: 0, popRight: 0, popTotal: 0, path: null, startTime: 0, flags: {} };
/* ───────── 판(round): 끝까지 깨면 다음 판은 새 문제 (0~14, 15판), 중간에 실패하면 같은 판 유지 ───────── */
const ROUNDS = 15;
function loadRound() { try { const v = parseInt(localStorage.getItem('mungmung_round'), 10); return v >= 0 && v < ROUNDS ? v : 0; } catch (e) { return 0; } }
function saveRound(v) { try { localStorage.setItem('mungmung_round', String(v)); } catch (e) { /* 저장 안 되면 이번 세션에서만 유지 */ } }
state.round = loadRound();
const forced = new URLSearchParams(location.search).get('round');
if (forced != null) state.round = Math.max(0, Math.min(ROUNDS - 1, +forced || 0));
// 같은 판이면 항상 같은 순서가 되도록 판 번호로 보기를 섞는다
function seeded(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296); }
function shuffleQ(q, seed) {
  const r = seeded(seed);
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, options: idx.map(i => q.options[i]), answer: idx.indexOf(q.answer) };
}
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function getQuiz(id) {
  const base = QUIZ[id];
  if (!state.round) return base;
  const v = VARIANTS[id][state.round - 1];
  const q = { ...base, ...v, chain: v.chain || [], lines: v.lines || base.lines, clues: v.lines ? v.lines.map(([n, t]) => ({ text: `${n}: ${t}` })) : base.clues };
  return shuffleQ(q, hash(id) + state.round * 7919);
}
const POP_INTRO = {
  school: '자, 분위기 탄 김에 돌발 퀴즈! 10초 안에 대답해요~',
  club: '잠깐! 보너스 넌센스 하나 더! 빨리 대답해!',
  cave: '가만, 쉬어 가는 김에 하나 물어보세. 빨리 대답해 보게!',
  office: '아 맞다, 멍뭉님! 돌발 퀴즈로 하나만 물어볼게요!',
  bus: null,
  apt: '아 참, 학생! 분리수거 문제 하나 내 보겠네. 빨리!',
};
function getPop(key, p) {
  if (!state.round) return p;
  const v = POPS[key][state.round - 1];
  const lines = v.lines || (POP_INTRO[key] ? [[p.asker, POP_INTRO[key]]] : []);
  return shuffleQ({ ...p, ...v, lines }, hash(key) + state.round * 104729);
}
function advanceRound() { state.round = (state.round + 1) % ROUNDS; saveRound(state.round); }

const who = name => (name === '멍뭉' ? mung : (current && current.cast && current.cast[name]) || null);

const env = {
  THREE, camera, renderer, mung, woogi, ui, sfx, QUIZ,
  cameraTo, cameraSet,
  _setScene: s => setScene(s),
  get camBase() { return camBase; },
  setSway(v) { sway = v; },
  shake(a = 0.3) { shake = Math.max(shake, a); },
  state,

  /* 퀴즈 실행: 하트 관리 + 단서 포커스 */
  /* 대화형 퀴즈: 인물들이 대화로 단서를 주고 → 질문 → 선택지 팝업 → 반응 */
  async quiz(id) {
    const q = getQuiz(id);
    const ep = EPISODES[state.ep];
    ui.setEpisode(`꿈 ${ep.no} · ${ep.title}`, ep.quizzes.indexOf(id), 3);
    const before = { pos: camBase.pos.clone(), look: camBase.look.clone(), fov: camBase.fov };
    const say = (name, text) => { const ch = who(name); return ui.say(name, text, { onTalk: () => { if (ch) ch.talk = Math.min(3.5, text.length * 0.06); } }); };
    const focus = name => {
      const f = name && current.focus && current.focus[name];
      if (f) cameraTo(f, 1.1);
      if (current.marker) {
        if (f && f.mark) current.marker.show(new THREE.Vector3(...f.mark), f.r || 0.5);
        else current.marker.hide();
      }
    };
    for (const [name, text, f] of q.lines || []) {
      focus(f);
      await say(name, text);
    }
    if (current.marker) current.marker.hide();
    cameraTo(before, 1.0);
    const asker = who(q.asker);
    const wrongs = new Set();
    for (;;) {
      if (asker) asker.talk = 1.5;
      const pick = await ui.ask(q.asker, q.ask || q.question, q, wrongs);
      if (pick === q.answer) {
        sfx.correct();
        ui.toast('✔ 정답!', '#ffe08a');
        mung.setExpr('happy');
        await say(q.asker, q.explain);
        if (q.chain && q.chain.length) await say(q.asker, '정리하면 → ' + q.chain.join(' → '));
        mung.setExpr('open');
        ui.setEpisode(`꿈 ${ep.no} · ${ep.title}`, ep.quizzes.indexOf(id) + 1, 3);
        return 'ok';
      }
      sfx.wrong();
      wrongs.add(pick);
      state.hearts -= 1;
      state.wrongTotal += 1;
      ui.setHearts(state.hearts);
      ui.shakeHearts();
      env.shake(0.15);
      ui.toast('💔 하트 -1', '#ff9eb5');
      mung.setExpr('sad');
      if (state.hearts <= 0) {
        await say(q.asker, '음… 그건 아닌 것 같은데… 어라? 주변이 점점 어두워진다……');
        mung.setExpr('open');
        return 'fail';
      }
      await say(q.asker, '음, 그건 아닌 것 같아. ' + q.hint);
      mung.setExpr('open');
    }
  },

  /* 대화 속 선택: 누군가 말을 걸면 팝업으로 멍뭉의 반응을 고른다 (정답 없음, 이야기만 달라짐) */
  async choice(name, text, options) {
    const ch = who(name);
    if (ch) ch.talk = Math.min(2.5, text.length * 0.05);
    ui.showLine(name, text);
    const i = await ui.choose(options);
    ui.hideDialog();
    return i;
  },

  /* 돌발 퀴즈: 장면과 관련된 짧은 문제, 제한 시간 안에! (하트는 깎이지 않음) */
  getQuiz,
  ROUNDS,
  get alt() { return state.round > 0; },
  async popQuiz(key, p0) {
    const p = getPop(key, p0);
    const say = (name, text) => { const ch = who(name); return ui.say(name, text, { onTalk: () => { if (ch) ch.talk = Math.min(3.5, text.length * 0.06); } }); };
    sfx.ring();
    ui.toast('⚡ 돌발 퀴즈!', '#ffcc4d');
    for (const [name, text] of p.lines || []) await say(name, text);
    const pick = await ui.ask(p.asker, p.question, { title: p.title, options: p.options }, new Set(), { pop: true, time: p.time || 12 });
    state.popTotal += 1;
    if (pick === p.answer) {
      state.popRight += 1;
      sfx.correct();
      ui.toast('🎉 돌발 퀴즈 정답!', '#ffe08a');
      mung.setExpr('happy');
      await say(p.asker, p.right);
    } else {
      sfx.wrong();
      ui.toast(pick < 0 ? '⏰ 시간 초과!' : '😅 아쉽다!', '#ff9eb5');
      mung.setExpr('sad');
      await say(p.asker, (pick < 0 ? '땡! 시간 끝~ ' : '땡~ ') + p.wrong);
    }
    mung.setExpr('open');
    return pick === p.answer;
  },

  /* 꿈과 꿈 사이 전환: 카메라가 빨려 들어가며 몽환 소용돌이 → 다음 꿈에서 빠져나옴 */
  async dreamWarp(nextScene, intoShot, title) {
    sfx.dream();
    const fwd = camBase.look.clone().sub(camBase.pos).normalize();
    const p0 = camBase.pos.clone();
    const f0 = camBase.fov;
    ui.dreamFx(1, 1.6);
    await anim(1.6, k => {
      camBase.pos.copy(p0).addScaledVector(fwd, k * 3);
      camBase.fov = f0 + k * 35;
    }, ease.in);
    setScene(nextScene);
    ui.fadeOut(1.2);
    const sh = intoShot;
    const back = sh.look.clone().sub(sh.pos).normalize();
    camBase.pos.copy(sh.pos).addScaledVector(back, -3);
    camBase.look.copy(sh.look);
    camBase.fov = (sh.fov || 50) + 35;
    const fin = ui.dreamFx(0, 1.8);
    const cam = anim(2.2, k => {
      camBase.pos.copy(sh.pos).addScaledVector(back, -3 * (1 - k));
      camBase.fov = (sh.fov || 50) + 35 * (1 - k);
    }, ease.out);
    if (title) { await wait(0.6); await ui.titleCard(title.no, title.title, title.sub); }
    await Promise.all([fin, cam]);
  },

  /* 같은 꿈 안에서 장소 이동 (짧은 암전) */
  async cut(fn, color = '#000', dur = 0.5) {
    await ui.fadeTo(color, 1, dur);
    await fn();
    await ui.fadeTo(color, 0, dur);
  },
};

/* ───────── 루프 ───────── */
let last = performance.now();
const SPEED = +new URLSearchParams(location.search).get('speed') || 1;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * SPEED;
  last = now;
  updateTweens(dt);
  if (current) {
    current.update && current.update(dt, clock.t);
    mung.update(dt);
    woogi.update(dt);
    if (current.actors) current.actors.forEach(a => a.update(dt));

    const t = clock.t;
    camera.position.copy(camBase.pos);
    camera.position.x += Math.sin(t * 0.35) * 0.05 * sway;
    camera.position.y += Math.sin(t * 0.5) * 0.03 * sway;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 0.6);
    }
    camera.lookAt(camBase.look);
    const fov = camBase.fov + (camera.userData.fovBoost || 0);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // 퀴즈 패널이 오른쪽을 가리면 장면 중심을 왼쪽으로 옮긴다
    const W = window.innerWidth, H = window.innerHeight;
    const q = document.getElementById('quiz');
    const shift = W > 720 && !q.classList.contains('hidden') ? Math.min(260, q.offsetWidth / 2) : 0;
    viewShift += (shift - viewShift) * Math.min(1, dt * 4);
    if (viewShift > 0.5) camera.setViewOffset(W, H, viewShift, 0, W, H);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    renderer.render(current.scene, camera);
  }
  requestAnimationFrame(loop);
}

/* ───────── 게임 흐름 ───────── */
const EP_MODS = [
  [School, 'school'], [Park, 'park'], [Office, 'office'], [Bus, 'bus'], [Apt, 'apt'],
];

async function playEpisodes(from) {
  for (let i = from; i < EP_MODS.length; i++) {
    state.ep = i;
    state.hearts = 3;
    const ep = EPISODES[i];
    const [mod, key] = EP_MODS[i];
    const sc = getScene(mod, key);
    sc.reset && sc.reset();
    ui.clock(false);
    ui.setEpisode(`꿈 ${ep.no} · ${ep.title}`, 0, 3);
    ui.setHearts(state.hearts);
    await env.dreamWarp(sc, sc.startShot(), { no: `DREAM ${ep.no}`, title: ep.title, sub: ep.sub || '' });
    const res = await sc.play(env);
    if (res === 'fail') return { fail: i };
  }
  return { clear: true };
}

async function runGame(fromEp = null) {
  if (fromEp == null) { state.wrongTotal = 0; state.popRight = 0; state.popTotal = 0; state.flags = {}; }
  state.startTime = performance.now();
  ui.vignette(false);
  if (fromEp == null) {
    // 프롤로그: "어느 도시의 밤, 멍뭉이라는 사람이 살고 있었다…"
    if (!state.sawPrologue) {
      state.sawPrologue = true;
      const pro = getScene(Prologue, 'prologue');
      pro.reset();
      const fd = document.getElementById('fade'); fd.style.background = '#000'; fd.style.opacity = 1;
      setScene(pro);
      await pro.play();
    }
    ui.hud(true);
    const room = getScene(Room, 'room');
    room.reset();
    setScene(room);
    ui.fadeOut(1.4);
    await room.intro(env);
    fromEp = 0;
  } else {
    ui.hud(true);
    // 다시 꿈꾸기: 방에서 바로 잠든다
    const room = getScene(Room, 'room');
    room.reset();
    setScene(room);
    await room.fallAsleepAgain(env);
  }
  ui.vignette(true);
  const result = await playEpisodes(fromEp);
  ui.vignette(false);
  ui.setHearts(null);
  ui.setEpisode('', 0, 0);
  const end = getScene(Ending, 'ending');
  if (result.clear) {
    const choice = await end.happy(env, getScene(Room, 'room'));
    advanceRound();
    updateRoundBadge();
    if (choice === 0) return runGame(null);
  } else {
    const choice = await end.trapped(env, getScene(Room, 'room'), result.fail);
    if (choice === 0) return runGame(result.fail);
    return runGame(null);
  }
}

function updateRoundBadge() {
  const el = document.getElementById('roundBadge');
  if (el) el.textContent = `🌙 ${state.round + 1}번째 꿈 / ${ROUNDS} · 끝까지 깨면 다음 꿈은 새로운 문제!`;
}

/* ───────── 시작 ───────── */
async function boot() {
  try { await Promise.race([document.fonts.load('40px Jua'), wait(3)]); await document.fonts.load('20px "Gowun Dodum"'); } catch (e) { /* 폰트 없이도 진행 */ }
  const room = getScene(Room, 'room');
  room.reset();
  setScene(room);
  cameraSet(room.shots.title);
  document.getElementById('loading').textContent = '';
  updateRoundBadge();
  const btn = document.getElementById('startBtn');
  btn.disabled = false;
  btn.onclick = async () => {
    sfx.unlock();
    sfx.startMusic();
    document.getElementById('title').style.opacity = 0;
    setTimeout(() => document.getElementById('title').classList.add('hidden'), 1000);
    // 다른 씬들은 미리 만들어 둔다 (전환 때 끊김 방지)
    setTimeout(() => EP_MODS.forEach(([m, k]) => getScene(m, k)), 50);
    await runGame(null);
  };
  const params = new URLSearchParams(location.search);
  if (params.has('view')) {
    // 디버그: ?view=1&shot=wide → 해당 꿈 장면을 정지 화면으로
    document.getElementById('title').classList.add('hidden');
    const [mod, key] = params.get('view') === 'pro' ? [Prologue, 'prologue'] : EP_MODS[+params.get('view')] || [Ending, 'ending'];
    const sc = getScene(mod, key);
    sc.reset && sc.reset();
    setScene(sc);
    const nm = params.get('shot') || 'wide';
    cameraSet(sc.shots[nm] || sc.focus[nm] || sc.startShot());
    if (sc.debug) sc.debug(params.get('state'));
    return;
  }
  if (params.has('ep')) {
    // 디버그: ?ep=3 → 해당 꿈부터
    document.getElementById('title').classList.add('hidden');
    ui.hud(true); ui.vignette(true);
    const r = await playEpisodes(+params.get('ep'));
    console.log('debug result', r);
  }
}

document.getElementById('startBtn').disabled = true;
document.getElementById('muteBtn').onclick = () => {
  const m = sfx.toggle();
  document.getElementById('muteBtn').textContent = m ? '🔇' : '🔊';
};
requestAnimationFrame(loop);
boot();
window.__env = env;
