import { THREE, updateTweens, anim, wait, ease, clock } from './util.js';
import { makeMungmung, makeWoogi } from './characters.js';
import { ui } from './ui.js';
import { sfx } from './audio.js';
import { QUIZ, EPISODES } from './quizzes.js';
import * as Room from './scenes/room.js';
import * as School from './scenes/school.js';
import * as Park from './scenes/park.js';
import * as Office from './scenes/office.js';
import * as Bus from './scenes/bus.js';
import * as Apt from './scenes/apartment.js';
import * as Ending from './scenes/ending.js';

/* ───────── 렌더러 ───────── */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 600);
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
  if (!cache[key]) cache[key] = mod.build(env);
  return cache[key];
}
function setScene(s) {
  current = s;
  if (s.onEnter) s.onEnter();
}

const state = { hearts: 3, ep: 0, quizIndex: 0, wrongTotal: 0, path: null, startTime: 0 };

const env = {
  THREE, camera, renderer, mung, woogi, ui, sfx, QUIZ,
  cameraTo, cameraSet,
  _setScene: s => setScene(s),
  get camBase() { return camBase; },
  setSway(v) { sway = v; },
  shake(a = 0.3) { shake = Math.max(shake, a); },
  state,

  /* 퀴즈 실행: 하트 관리 + 단서 포커스 */
  async quiz(id) {
    const q = QUIZ[id];
    const ep = EPISODES[state.ep];
    ui.setEpisode(`꿈 ${ep.no} · ${ep.title}`, ep.quizzes.indexOf(id), 3);
    const before = { pos: camBase.pos.clone(), look: camBase.look.clone(), fov: camBase.fov };
    const res = await ui.quiz(q, {
      focus: name => {
        const f = current.focus && current.focus[name];
        if (f) cameraTo(f, 1.1);
        if (current.marker) {
          if (f && f.mark) current.marker.show(new THREE.Vector3(...f.mark), f.r || 0.5);
          else current.marker.hide();
        }
        if (current.onFocus) current.onFocus(name);
      },
      wrong: () => {
        state.hearts -= 1;
        state.wrongTotal += 1;
        ui.setHearts(state.hearts);
        env.shake(0.15);
        if (current.onWrong) current.onWrong();
        return state.hearts;
      },
    });
    await cameraTo(before, 1.0);
    if (res === 'ok') ui.setEpisode(`꿈 ${ep.no} · ${ep.title}`, ep.quizzes.indexOf(id) + 1, 3);
    return res;
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
    await env.dreamWarp(sc, sc.startShot(), { no: `DREAM ${ep.no}`, title: ep.title, sub: ['중간', '어려움', '초어려움'].join(' → ') });
    const res = await sc.play(env);
    if (res === 'fail') return { fail: i };
  }
  return { clear: true };
}

async function runGame(fromEp = null) {
  state.wrongTotal = fromEp == null ? 0 : state.wrongTotal;
  state.startTime = performance.now();
  ui.hud(true);
  ui.vignette(false);
  if (fromEp == null) {
    const room = getScene(Room, 'room');
    room.reset();
    setScene(room);
    await room.intro(env);
    fromEp = 0;
  } else {
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
    if (choice === 0) return runGame(null);
  } else {
    const choice = await end.trapped(env, getScene(Room, 'room'), result.fail);
    if (choice === 0) return runGame(result.fail);
    return runGame(null);
  }
}

/* ───────── 시작 ───────── */
async function boot() {
  try { await Promise.race([document.fonts.load('40px Jua'), wait(3)]); await document.fonts.load('20px "Gowun Dodum"'); } catch (e) { /* 폰트 없이도 진행 */ }
  const room = getScene(Room, 'room');
  room.reset();
  setScene(room);
  cameraSet(room.shots.title);
  document.getElementById('loading').textContent = '';
  const btn = document.getElementById('startBtn');
  btn.disabled = false;
  btn.onclick = async () => {
    sfx.unlock();
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
    const [mod, key] = EP_MODS[+params.get('view')] || [Ending, 'ending'];
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
