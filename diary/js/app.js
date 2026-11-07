import { store, dateKey, escapeHtml, toast, downloadPhoto, askConfirm } from './store.js';
import { meongmungImg, meongmungSmall, pawStampSVG, praiseStampSVG, workBadge } from './character.js';
import { statusAt, fixSchedule, workStatus } from './schedule.js';
import { gate, isUnlocked, setLockVisible } from './lock.js';
import { SUPABASE } from './config.js';
import { getOwner, setOwner, ensureOwner, NAMES, ICONS } from './owner.js';
import { initPlaces, placeCard, photoDay, render as renderPlaces } from './places.js';
import { GREETINGS, timePhase } from './greeting.js';
import { computeGrowth, LEVELS, REWARDS, TIPS } from './growth.js';

const $ = (s, el = document) => el.querySelector(s);
const PAGES = ['intro', 'today', 'together', 'growth', 'schedule', 'admin'];
const loaded = {};

/* ---------- 라우팅 ---------- */
function route() {
  const page = PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'intro';
  // 관리자 화면은 claude.ai 권한(또는 관리자 비밀번호)으로 따로 지켜요. 나머지는 입장 비밀번호 먼저
  setLockVisible(page !== 'admin');
  if (page !== 'admin' && !isUnlocked()) {
    PAGES.forEach((p) => { $(`#page-${p}`).hidden = true; });
    gate().then(route).catch(showError);
    return;
  }
  document.body.classList.toggle('admin-mode', page === 'admin');
  PAGES.forEach((p) => { $(`#page-${p}`).hidden = p !== page; });
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === page));
  if (!loaded[page]) {
    loaded[page] = true;
    ({ intro: initIntro, today: initToday, together: initTogether, growth: initGrowth, schedule: initSchedulePage, admin: initAdmin })[page]().catch(showError);
  }
  if (page === 'growth' && loaded.growthReady) {
    renderGrowth().catch(showError);
  }
  if (page === 'admin' && adminMod) adminMod.refresh();
  if (page === 'schedule' && scheduleMod && loaded.scheduleReady) scheduleMod.refresh().catch(showError);
  if (page === 'together' && loaded.together) applyPendingPlaceDate();
  if (page === 'today' && loaded.todayReady) {
    loadToday().then(() => { fillTodayForm(); renderCalendar(); }).catch(showError);
  }
  window.scrollTo({ top: 0 });
}
function showError(e) {
  console.error(e);
  toast(e.message || '문제가 생겼어요', 'err');
}
window.addEventListener('hashchange', route);
document.querySelectorAll('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  if (location.hash !== '#intro') location.hash = 'intro';
  setTimeout(() => document.getElementById(a.dataset.scroll).scrollIntoView({ behavior: 'smooth' }), 50);
}));

$('#modeNote').textContent = store.local
  ? '💾 지금은 이 브라우저에만 저장돼요'
  : '☁️ 멍뭉이와 함께 보는 공용 일지예요';

// 보기 전용으로 공유받았으면 안내를 보여 줘요
store.canWrite?.().then((ok) => { if (ok === false) $('#readonlyNote').hidden = false; }).catch(() => {});

// 아이폰 사파리에서는 “홈 화면에 추가” 방법을 알려 줘요 (이미 앱으로 열었으면 안 보여요)
(() => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  let dismissed = false;
  try { dismissed = localStorage.getItem('mm-install-tip') === 'no'; } catch { /* 무시 */ }
  if (!ios || standalone || dismissed) return;
  $('#installTip').hidden = false;
  $('#installTipClose').onclick = () => {
    $('#installTip').hidden = true;
    try { localStorage.setItem('mm-install-tip', 'no'); } catch { /* 무시 */ }
  };
})();

/* 새 버전이 올라오면 알아서 새로고침 (앱·홈 화면 앱이 예전 화면에 머무르지 않게)
   앱으로 돌아올 때와 15분마다, 주요 파일이 바뀌었는지(ETag) 확인해요 */
(() => {
  if (store.mode === 'cloud' || !/^https?:$/.test(location.protocol)) return;
  const WATCH = ['/', '/admin.html', '/js/app.js', '/js/store.js', '/js/schedule-page.js', '/css/diary.css'];
  const fingerprint = async () => {
    try {
      const tags = await Promise.all(WATCH.map((u) => fetch(u, { method: 'HEAD', cache: 'no-store' })
        .then((r) => (r.ok ? r.headers.get('etag') || r.headers.get('last-modified') || '' : ''))));
      return tags.join('|');
    } catch { return null; }
  };
  let base = null;
  let lastCheck = 0;
  let pending = false;
  // 글을 쓰는 중이거나 창이 열려 있으면 기다렸다가 새로고침
  const busy = () => document.querySelector('dialog[open]')
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
    || [...document.querySelectorAll('#diaryInput, #placeName, #placeMemo, #captionInput')].some((i) => i.value.trim())
    || !document.querySelector('#scReview')?.hidden || !document.querySelector('#scPicked')?.hidden;
  const check = async (force = false) => {
    if (!force && Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    const fp = await fingerprint();
    if (!fp) return;
    if (base === null) { base = fp; return; }
    if (fp !== base) pending = true;
    if (pending && !busy()) location.reload();
  };
  setTimeout(() => check(true), 3000);
  setInterval(() => check(true), 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) check(true); });
})();

let scheduleMod = null;
async function initSchedulePage() {
  scheduleMod = await import('./schedule-page.js');
  await scheduleMod.initSchedule({ openImage: (src, caption) => openPhoto({ src, caption, name: 'schedule.jpg', downloadUrl: src }, { readonly: true }) });
  loaded.scheduleReady = true;
}

let adminMod = null;
async function initAdmin() {
  adminMod = await import('./admin.js');
  adminMod.init();
}

/* ---------- 1. 소개 ---------- */
/* 시간대 인사 (1분마다 확인해서 아침 → 점심 → 저녁이 바뀌면 갱신) */
let phase = timePhase();
function renderGreeting() {
  const g = GREETINGS[phase];
  const now = new Date();
  $('#timeLabel').textContent = `${g.icon} 지금 ${now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })} · ${g.label}`;
  $('#greetLine').textContent = g.line;
  $('#greetSub').textContent = g.sub;
  $('#greetBubble').textContent = `${g.line} ${g.icon}`;
}
setInterval(() => {
  const p = timePhase();
  if (p !== phase) { phase = p; mountScene(); }
  renderGreeting();
}, 60000);

let scene = null;
async function mountScene() {
  const stage = $('#stage3d');
  const bubble = $('#greetBubble');
  scene?.destroy();
  bubble.hidden = true;
  stage.classList.remove('flat');
  stage.querySelector('.mm-char')?.remove();
  try {
    const { startGreetingScene } = await import('./scene3d.js');
    scene = startGreetingScene(stage, {
      phase,
      onReady: () => { bubble.hidden = false; $('#replayBtn').hidden = false; },
    });
  } catch (e) { console.warn(e); scene = null; }
  if (!scene) {
    // 3D가 안 되는 기기에서는 일러스트로 대신 인사해요
    stage.classList.add('flat');
    stage.insertAdjacentHTML('afterbegin', meongmungImg());
    bubble.hidden = false;
    return;
  }
  scene.onFrame = ({ x, y }) => {
    bubble.style.left = `${Math.min(Math.max(x, 28), 72)}%`;
    bubble.style.top = `${Math.max(y, 4)}%`;
  };
  scene.onTap = () => {
    const tapLines = ['헤헤 🐾', '멍뭉! 💗', '간지러워요 >_<', GREETINGS[phase].line];
    bubble.textContent = tapLines[Math.floor(Math.random() * tapLines.length)];
    clearTimeout(scene.tapTimer);
    scene.tapTimer = setTimeout(renderGreeting, 1800);
  };
}

async function initIntro() {
  renderGreeting();
  mountScene();
  $('#replayBtn').addEventListener('click', () => { $('#greetBubble').hidden = true; scene?.replay(); });
  const [profile, settings] = await Promise.all([store.getProfile(), store.getSettings()]);
  const form = $('#profileForm');
  ['name', 'age', 'charm', 'oneLiner'].forEach((k) => { form.elements[k].value = profile[k] || ''; });

  const selected = new Set(profile.traits || []);
  // 관리자가 목록에서 뺀 특징이라도 이미 골라둔 건 보여줘요
  const options = [...settings.traitOptions, ...[...selected].filter((t) => !settings.traitOptions.includes(t))];
  const chips = $('#traitChips');
  chips.innerHTML = options.map((t) =>
    `<button type="button" class="chip" aria-pressed="${selected.has(t)}">${escapeHtml(t)}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  if (profile.updatedAt) $('#profileSaved').textContent = `마지막 저장: ${new Date(profile.updatedAt).toLocaleString('ko-KR')}`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.elements.name.value.trim(),
      age: form.elements.age.value.trim(),
      charm: form.elements.charm.value.trim(),
      oneLiner: form.elements.oneLiner.value.trim(),
      traits: [...chips.querySelectorAll('.chip[aria-pressed="true"]')].map((b) => b.textContent),
      updatedAt: new Date().toISOString(),
    };
    try {
      await store.saveProfile(data);
      $('#profileSaved').textContent = `마지막 저장: ${new Date(data.updatedAt).toLocaleString('ko-KR')}`;
      toast('멍뭉이 소개서를 저장했어요 💗');
    } catch (err) { showError(err); }
  });
}

/* ---------- 2. 오늘의 멍뭉 ---------- */
const today = () => dateKey();
let diary = {};
let calMonth = new Date(); calMonth.setDate(1);
let selectedDay = null;

let stamps = {};
let calPlaces = [];
let calPhotos = [];
let calSchedule = {};
async function loadToday() {
  [diary, stamps, calPlaces, calPhotos, calSchedule] = await Promise.all([
    store.getDiary(), store.getStamps().catch(() => ({})), store.getPlaces().catch(() => []), store.listPhotos().catch(() => []),
    store.getSchedule?.().catch(() => ({})) ?? {},
  ]);
  calSchedule = fixSchedule(calSchedule);
}
async function initToday() {
  await loadToday();
  const d = new Date();
  $('#todayLabel').textContent = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const input = $('#diaryInput');
  const sync = () => {
    $('#diaryCount').textContent = `${input.value.length} / 80`;
  };
  input.addEventListener('input', sync);
  fillTodayForm();
  sync();

  $('#diaryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const first = !diary[today()];
    try {
      diary[today()] = await store.saveDiary(today(), text);
      selectedDay = today();
      calMonth = new Date(); calMonth.setDate(1);
      fillTodayForm();
      renderCalendar(first ? today() : null);
      toast(first ? '출석 도장 쾅! 🐾 오늘도 기록 완료' : '오늘 일기를 고쳤어요 ✏️');
    } catch (err) { showError(err); }
  });
  $('#calPrev').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); });
  $('#calDays').addEventListener('click', (e) => {
    const b = e.target.closest('.cal-day[data-date]');
    if (!b || (b.classList.contains('future') && !calSchedule[b.dataset.date])) return;
    selectedDay = b.dataset.date;
    renderCalendar();
  });
  $('#calDetail').addEventListener('click', (e) => {
    const ph = e.target.closest('[data-photo]');
    if (ph) { openPhoto(calPhotos.find((x) => x.id === ph.dataset.photo)); return; }
    const add = e.target.closest('[data-add-place]');
    if (add) {
      pendingPlaceDate = add.dataset.addPlace;
      location.hash = 'together';
    }
  });
  selectedDay = today();
  renderCalendar();
  loaded.todayReady = true;
}

function fillTodayForm() {
  const entry = diary[today()];
  $('#todayPraise').innerHTML = stamps[today()]
    ? `${praiseStampSVG('sm')}<span>오늘 일기에 <b>참 잘했어요</b> 도장을 받았어요!</span>` : '';
  $('#todayPraise').hidden = !stamps[today()];
  $('#diaryInput').value = entry ? entry.text : '';
  $('#diaryBtn').textContent = entry ? '오늘 일기 고치기 ✏️' : '출석 도장 쾅!';
  $('#diaryCount').textContent = `${$('#diaryInput').value.length} / 80`;
}

function streak() {
  let n = 0;
  const d = new Date();
  if (!diary[dateKey(d)]) d.setDate(d.getDate() - 1); // 오늘 아직 안 썼으면 어제부터
  while (diary[dateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function groupByDay() {
  const places = {};
  const photos = {};
  const byId = Object.fromEntries(calPlaces.map((p) => [p.id, p]));
  for (const p of calPlaces) (places[p.date] ||= []).push(p);
  for (const ph of calPhotos) (photos[photoDay(ph, byId)] ||= []).push(ph);
  return { places, photos };
}

function renderCalendar(stampedDate = null) {
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  $('#calTitle').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const t = today();
  const byDay = groupByDay();
  let html = '';
  for (let i = 0; i < first; i++) html += '<span class="cal-day empty"></span>';
  for (let day = 1; day <= days; day++) {
    const key = dateKey(new Date(y, m, day));
    const w = (first + day - 1) % 7;
    const cls = ['cal-day', w === 0 ? 'sun' : '', w === 6 ? 'sat' : '', key === t ? 'today' : '',
      key === selectedDay ? 'selected' : '', key > t ? 'future' : '', calSchedule[key] ? 'has-sched' : ''].join(' ');
    const placeN = byDay.places[key]?.length || 0;
    const stamp = (diary[key] ? pawStampSVG(key === stampedDate ? 'new' : '') + (stamps[key] ? '<span class="cal-praise" aria-hidden="true">💮</span>' : '') : '')
      + (placeN || byDay.photos[key] ? `<span class="cal-pin" aria-hidden="true">${placeN ? '📍' : '📷'}</span>` : '');
    html += `<button class="${cls}" data-date="${key}" aria-label="${m + 1}월 ${day}일${diary[key] ? ' 출석' : ''}${stamps[key] ? ', 참 잘했어요' : ''}${placeN ? `, 다녀온 곳 ${placeN}곳` : ''}"><span class="num">${day}</span>${stamp}</button>`;
  }
  $('#calDays').innerHTML = html;
  // 새로 찍힌 도장만 애니메이션
  $('#calDays').querySelectorAll('.paw-stamp:not(.new)').forEach((s) => { s.style.animation = 'none'; });

  const sel = selectedDay && diary[selectedDay];
  const label = selectedDay ? new Date(`${selectedDay}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
  const dayPlaces = byDay.places[selectedDay] || [];
  const dayPhotos = byDay.photos[selectedDay] || [];
  const inPlace = new Set(dayPlaces.map((p) => p.id));
  const loose = dayPhotos.filter((ph) => !inPlace.has(ph.placeId));
  const diaryHtml = sel
    ? `<div class="detail-row"><div><span class="date">🐾 ${label}</span><p>${escapeHtml(sel.text)}</p></div>${stamps[selectedDay] ? praiseStampSVG('detail') : ''}</div>`
    : `<span class="date">${label}</span><p class="muted">${selectedDay === t ? '아직 오늘 일기가 없어요. 한 줄 남겨 볼까요?' : '이 날은 일기가 없어요.'}</p>`;
  const placesHtml = dayPlaces.length
    ? `<h4 class="day-h">📍 이날 함께 다녀온 곳</h4>${dayPlaces.map((p) => placeCard(p, dayPhotos.filter((ph) => ph.placeId === p.id), { compact: true })).join('')}` : '';
  const photosHtml = loose.length
    ? `<h4 class="day-h">📷 이날 사진</h4><div class="pc-photos">${loose.map((ph) => `<button type="button" class="thumb" data-photo="${escapeHtml(ph.id)}" aria-label="사진 크게 보기"><img src="${ph.src}" alt="" loading="lazy" /></button>`).join('')}</div>` : '';
  const addLink = selectedDay && selectedDay <= t
    ? `<button type="button" class="add-place" data-add-place="${selectedDay}">＋ 이날 다녀온 곳 남기기</button>` : '';
  const sch = calSchedule[selectedDay];
  const schHtml = sch ? `<div class="day-sched"><span>🗓️ 우기 스케줄</span><b>${escapeHtml(sch.text || '근무')}${sch.start ? ` ⏰ ${sch.start}${sch.end ? `~${sch.end === '00:00' ? '24:00' : sch.end}` : ''}` : ''}</b>${workBadge(statusAt(selectedDay, sch))}</div>` : '';
  $('#calDetail').innerHTML = `<div class="day-diary">${diaryHtml}</div>${schHtml}${placesHtml}${photosHtml}${addLink}`;

  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthCount = Object.keys(diary).filter((k) => k.startsWith(monthPrefix)).length;
  $('#diaryStats').innerHTML = `
    <div class="stat"><b>${streak()}일</b><span>연속 출석</span></div>
    <div class="stat"><b>${monthCount}일</b><span>${m + 1}월 출석</span></div>
    <div class="stat"><b>${Object.keys(diary).length}개</b><span>전체 일기</span></div>`;
}

/* ---------- 3. 멍뭉이와 함께 ---------- */
let pending = [];
let pendingPlaceDate = null;

/* 사진 크게 보기 (갤러리, 장소 카드, 달력 어디서든) */
const lb = $('#lightbox');
$('#lbClose').addEventListener('click', () => lb.close());
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
let lbPhoto = null;
function openPhoto(p, { readonly = false } = {}) {
  if (!p) return;
  lbPhoto = readonly ? null : p;
  $('#lbImg').src = p.src;
  $('#lbCaption').textContent = `${p.by ? `${ICONS[p.by]} ${NAMES[p.by]} · ` : ''}${p.caption || p.name}`;
  $('#lbDownload').onclick = () => downloadPhoto(p);
  $('#lbDelete').hidden = readonly;
  $('#lbDelete').onclick = () => removePhoto(p);
  $('#lbComments').hidden = readonly;
  if (!readonly) renderComments();
  lb.showModal();
}

/* 💬 댓글 */
const ago = (iso) => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};
function renderComments() {
  const list = lbPhoto?.comments || [];
  const me = getOwner();
  $('#cmList').innerHTML = list.length
    ? list.map((c) => `<li class="cm ${c.by}">
        <span class="cm-who">${ICONS[c.by] || '🐾'} ${NAMES[c.by] || ''}</span>
        <span class="cm-text">${escapeHtml(c.text)}</span>
        <span class="cm-at">${ago(c.at)}</span>
        ${c.by === me ? `<button type="button" class="cm-del" data-cid="${escapeHtml(c.id)}" aria-label="댓글 지우기">✕</button>` : ''}
      </li>`).join('')
    : '<li class="cm-empty">첫 댓글을 남겨 보세요 💬</li>';
  const ul = $('#cmList');
  ul.scrollTop = ul.scrollHeight;
}
function applyComments(id, comments) {
  if (lbPhoto && lbPhoto.id === id) lbPhoto.comments = comments;
  const g = photos.find((x) => x.id === id);
  if (g) g.comments = comments;
  renderGallery(false);
}
$('#cmForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#cmInput').value.trim();
  if (!text || !lbPhoto) return;
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const by = await ensureOwner();
    const c = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), by, text: text.slice(0, 200), at: new Date().toISOString() };
    const next = await store.updatePhoto(lbPhoto.id, (d) => ({ ...d, comments: [...(d.comments || []), c].slice(-100) }));
    $('#cmInput').value = '';
    applyComments(lbPhoto.id, next.comments || []);
    renderComments();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
});
$('#cmList').addEventListener('click', async (e) => {
  const b = e.target.closest('.cm-del');
  if (!b || !lbPhoto) return;
  try {
    const next = await store.updatePhoto(lbPhoto.id, (d) => ({ ...d, comments: (d.comments || []).filter((c) => c.id !== b.dataset.cid) }));
    applyComments(lbPhoto.id, next.comments || []);
    renderComments();
  } catch (err) { showError(err); }
});

/* 사진 삭제 (누구나): 확인 → 지우기 → 갤러리·장소·달력 모두 새로 */
async function removePhoto(p) {
  if (!p || !(await askConfirm('이 사진을 삭제할까요? 지우면 되돌릴 수 없어요.', '삭제'))) return;
  try {
    await store.deletePhoto(p.id);
    if (lb.open) lb.close();
    toast('사진을 삭제했어요 🗑️');
    renderGallery().catch(() => {});
    if (loaded.together) renderPlaces().catch(() => {});
    if (loaded.todayReady) loadToday().then(renderCalendar).catch(() => {});
  } catch (err) {
    showError(err.status === 401 ? new Error('사진을 지울 수 없어요. 관리자에게 Supabase 설정 업데이트를 부탁해 주세요.') : err);
  }
}

function showTogetherView(v) {
  $('#viewPlaces').hidden = v !== 'places';
  $('#viewPhotos').hidden = v !== 'photos';
  document.querySelectorAll('#togetherTabs button').forEach((b) => b.classList.toggle('active', b.dataset.v === v));
}
function applyPendingPlaceDate() {
  if (!pendingPlaceDate) return;
  showTogetherView('places');
  $('#placeDate').value = pendingPlaceDate;
  pendingPlaceDate = null;
  setTimeout(() => $('#placeName').focus(), 100);
}

async function initTogether() {
  $('#togetherTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) showTogetherView(b.dataset.v);
  });
  await initPlaces({ openPhoto, onChange: () => renderGallery() });
  applyPendingPlaceDate();

  const input = $('#fileInput');
  const drop = $('#drop');
  const setFiles = (files) => {
    pending = [...files].filter((f) => f.type.startsWith('image/'));
    $('#uploadBtn').disabled = !pending.length;
    $('#dropText').textContent = pending.length ? `사진 ${pending.length}장 선택됨 · 다시 누르면 바꿀 수 있어요` : '여기를 눌러 사진 고르기 (또는 끌어다 놓기)';
    let pv = $('#uploadPreviews');
    if (!pv) { pv = document.createElement('div'); pv.className = 'previews'; pv.id = 'uploadPreviews'; $('.upload-row').before(pv); }
    pv.querySelectorAll('img').forEach((i) => URL.revokeObjectURL(i.src));
    pv.innerHTML = '';
    pending.slice(0, 12).forEach((f) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = '';
      pv.appendChild(img);
    });
  };
  input.addEventListener('change', () => setFiles(input.files));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => setFiles(e.dataTransfer.files));

  $('#uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pending.length) return;
    const btn = $('#uploadBtn');
    btn.disabled = true;
    const caption = $('#captionInput').value.trim();
    let ok = 0;
    for (const [i, f] of pending.entries()) {
      btn.textContent = `올리는 중… ${i + 1}/${pending.length}`;
      try { await store.uploadPhoto(f, caption, { date: $('#photoDate').value, by: await ensureOwner() }); ok++; } catch (err) { showError(err); }
    }
    btn.textContent = '올리기';
    input.value = '';
    $('#captionInput').value = '';
    setFiles([]);
    if (ok) toast(`사진 ${ok}장을 올렸어요 📸`);
    renderGallery();
    renderPlaces().catch(() => {});
  });
  $('#photoDate').max = dateKey();
  renderGallery();
}

let photos = [];
async function renderGallery(refetch = true) {
  if (refetch) photos = await store.listPhotos();
  const g = $('#gallery');
  if (!photos.length) {
    g.style.columns = 'auto';
    g.innerHTML = `<div class="card empty-state">${meongmungSmall()}<p>아직 사진이 없어요.<br>첫 번째 사진을 올려 볼까요?</p></div>`;
    return;
  }
  g.style.columns = '';
  g.innerHTML = photos.map((p, i) => `
    <figure class="photo" data-i="${i}">
      <img src="${p.src}" alt="${escapeHtml(p.caption || p.name)}" loading="lazy" />
      <figcaption>
        <span>${escapeHtml(p.caption || '')}${p.comments?.length ? ` <span class="cm-count">💬 ${p.comments.length}</span>` : ''}<br><span class="date">${p.placeId ? '📍 ' : ''}${new Date(`${photoDay(p)}T00:00`).toLocaleDateString('ko-KR')}</span></span>
        <span class="ph-actions">
          <button class="dl" type="button" data-i="${i}" title="다운로드" aria-label="다운로드">⬇️</button>
          <button class="del" type="button" data-i="${i}" title="삭제" aria-label="삭제">🗑️</button>
        </span>
      </figcaption>
    </figure>`).join('');
  g.onclick = (e) => {
    const dlBtn = e.target.closest('.dl');
    if (dlBtn) { downloadPhoto(photos[+dlBtn.dataset.i]); return; }
    const delBtn = e.target.closest('.del');
    if (delBtn) { removePhoto(photos[+delBtn.dataset.i]); return; }
    const f = e.target.closest('.photo');
    if (f) openPhoto(photos[+f.dataset.i]);
  };
}

/* ---------- 4. 멍뭉 성장 ---------- */
async function initGrowth() {
  $('#tipList').innerHTML = TIPS.map((t) => `<li><span class="tip-ic">${t.icon}</span><div><b>${t.title}</b><p>${t.text}</p></div></li>`).join('');
  loaded.growthReady = true;
  await renderGrowth();
}

const fmtDate = (k) => new Date(`${k}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

async function renderGrowth() {
  const [d, p, pr, st, pl] = await Promise.all([store.getDiary(), store.listPhotos(), store.getProfile(), store.getStamps().catch(() => ({})), store.getPlaces().catch(() => [])]);
  const g = computeGrowth({ diary: d, photos: p, profile: pr, stamps: st, places: pl });

  $('#lvBadge').textContent = `Lv.${g.levelIndex + 1} ${g.level.icon} ${g.level.name}`;
  $('#lvNext').textContent = g.next ? `다음: ${g.next.icon} ${g.next.name}` : '최고 단계 달성! 👑';
  $('#meterFrom').textContent = `${g.points}점`;
  $('#meterTo').textContent = g.next ? `${g.next.at}점` : 'MAX';
  $('#meterPct').textContent = g.next ? `${g.toNext}점 남았어요 · 출석 ${Math.ceil(g.toNext / REWARDS.meal.pts)}번이면 돼요!` : '전설의 멍뭉이 되었어요!';

  // 게이지와 밥그릇이 0에서부터 차오르며 이동
  const fill = $('#meterFill');
  const runner = $('#meterRunner');
  const char = $('#growChar');
  const pct = Math.round(g.progress * 100);
  fill.style.transition = runner.style.transition = 'none';
  fill.style.width = '0%';
  runner.style.left = '0%';
  char.style.setProperty('--s', LEVELS[Math.max(0, g.levelIndex - 1)].scale);
  void fill.offsetWidth;
  fill.style.transition = 'width 1.6s cubic-bezier(.3,.9,.3,1)';
  runner.style.transition = 'left 1.6s cubic-bezier(.3,.9,.3,1)';
  requestAnimationFrame(() => {
    fill.style.width = `${pct}%`;
    runner.style.left = `${pct}%`;
    char.style.setProperty('--s', g.level.scale);
  });
  runner.textContent = g.fedToday ? '🍚' : '🥣';
  runner.classList.toggle('run', true);
  setTimeout(() => runner.classList.remove('run'), 1700);

  // 오늘 먹은 음식이 멍뭉이에게 날아가요
  const stage = $('#growStage');
  stage.querySelectorAll('.fly').forEach((e) => e.remove());
  const todayFood = g.feed.filter((f) => f.date === dateKey());
  todayFood.slice(0, 5).forEach((f, i) => {
    const el = document.createElement('span');
    el.className = 'fly';
    el.textContent = REWARDS[f.type].icon;
    el.style.setProperty('--x', `${(i - (todayFood.length - 1) / 2) * 34}px`);
    el.style.animationDelay = `${0.3 + i * 0.25}s`;
    stage.appendChild(el);
  });
  if (todayFood.length) {
    const yum = $('#yum');
    setTimeout(() => { yum.hidden = false; char.classList.add('munch'); }, 900 + todayFood.length * 250);
    setTimeout(() => { yum.hidden = true; char.classList.remove('munch'); }, 2600 + todayFood.length * 250);
  }

  $('#growCta').innerHTML = g.fedToday
    ? '<p class="fed-ok">오늘 밥 먹었어요! 냠냠 😋 내일도 출석해 주세요</p>'
    : '<a class="btn primary block" href="#today">🥣 오늘 출석하고 밥 주기</a>';

  $('#growStats').innerHTML = `
    <div class="stat"><b>${g.counts.meal}</b><span>🍚 밥</span></div>
    <div class="stat"><b>${g.counts.snack + g.counts.feast + g.counts.photo + g.counts.praise + g.counts.place}</b><span>🍪 간식</span></div>
    <div class="stat"><b>${g.streak}일</b><span>🔥 연속 출석</span></div>`;

  $('#growRoad').innerHTML = LEVELS.map((l, i) => `
    <div class="node ${i < g.levelIndex ? 'done' : ''} ${i === g.levelIndex ? 'now' : ''}" style="--d:${i * 0.12}s">
      <span class="dot">${i === g.levelIndex ? `<img src="assets/meongmung-sm.jpg" alt="" />` : l.icon}</span>
      <span class="nm">${l.name}</span><span class="pt">${l.at}점</span>
    </div>`).join('');

  $('#feedList').innerHTML = g.feed.length
    ? g.feed.slice(0, 12).map((f) => {
      const r = REWARDS[f.type];
      const why = { meal: '출석', snack: `${f.run}일 연속 출석`, feast: `${f.run}일 연속 출석`, photo: '사진 올리기', profile: '소개서 완성', praise: '참 잘했어요 도장', place: f.name ? `추억 장소 · ${escapeHtml(f.name)}` : '추억 장소' }[f.type];
      return `<li><span class="fi">${r.icon}</span><span>${r.name} <span class="muted small">· ${why}</span></span><b>+${r.pts}</b><span class="fd">${fmtDate(f.date)}</span></li>`;
    }).join('')
    : '<li class="muted">아직 먹은 게 없어요. 오늘 첫 출석으로 밥을 주세요! 🥣</li>';
}

/* ---------- 안드로이드 앱 알림 (window.MeongmungApp 이 있을 때만) ---------- */
const nativeApp = window.MeongmungApp;
function syncNative() {
  if (!nativeApp || store.mode !== 'supa') return;
  let token = '';
  try { token = localStorage.getItem('mm-pass') || localStorage.getItem('mm-admin-key') || sessionStorage.getItem('mm-admin-key') || ''; } catch { /* 무시 */ }
  try { nativeApp.setSession(token, SUPABASE.url, SUPABASE.anonKey); } catch { /* 예전 앱 */ }
}
async function initNotifCard() {
  if (!nativeApp?.getSettings || store.mode !== 'supa') return;
  const card = $('#notifCard');
  const read = () => { try { return JSON.parse(nativeApp.getSettings()); } catch { return null; } };
  let st = read();
  if (!st) return;
  // 알림은 멍뭉이 휴대폰에만: 처음 한 번 “이 휴대폰은 누구 거예요?” (관리자로 로그인한 휴대폰은 우기 것)
  let owner = getOwner();
  // 일기·출퇴근 알림은 멍뭉이 휴대폰에만, 사진·댓글 알림은 둘 다
  const applyOwner = (o) => {
    owner = o;
    setOwner(o);
    nativeApp.setReminders(o === 'meongmung', o === 'meongmung');
    st = read();
  };
  const askOwner = async () => {
    const isMeong = await askConfirm('이 휴대폰은 누구 거예요? 일기·출퇴근 알림은 멍뭉이 휴대폰에만 울려요.', '🐶 멍뭉이 휴대폰', '🐰 우기 휴대폰', 'primary');
    applyOwner(isMeong ? 'meongmung' : 'woogi');
    toast(isMeong ? '멍뭉이 휴대폰으로 정했어요. 알림을 켰어요 🔔' : '우기 휴대폰으로 정했어요. 사진·댓글 알림만 받아요');
  };
  if (!owner) {
    if (await store.isAdmin().catch(() => false)) applyOwner('woogi');
    else await askOwner();
  } else {
    setOwner(owner); // 앱에 주인 알려 주기 (사진·댓글 알림에 써요)
    if (!st.set) applyOwner(owner);
  }
  const paint = () => {
    st = read() || st;
    $('#notifOwner').textContent = owner === 'meongmung' ? '🐶 멍뭉이 휴대폰' : '🐰 우기 휴대폰';
    $('#notifDiary').checked = st.diary;
    $('#notifWork').checked = st.work;
    $('#notifSocialRow').hidden = st.social === undefined; // 1.2 앱부터
    $('#notifSocial').checked = st.social !== false;
    $('#notifPerm').hidden = st.permission || !(st.diary || st.work || st.social);
  };
  paint();
  card.hidden = false;
  // 앱 버전: 1.2 부터는 앱이 스스로 업데이트를 확인해요. 그 전 앱이면 한 번만 새로 받게 안내
  if (nativeApp.checkUpdate) {
    $('#appVer').hidden = false;
    $('#appVerText').textContent = `앱 버전 ${st.version || ''}`;
    $('#appCheck').addEventListener('click', () => nativeApp.checkUpdate());
  } else {
    $('#appOld').hidden = false;
  }
  const save = () => { nativeApp.setReminders($('#notifDiary').checked, $('#notifWork').checked); setTimeout(paint, 1500); toast('알림 설정을 저장했어요 🔔'); };
  $('#notifDiary').addEventListener('change', save);
  $('#notifWork').addEventListener('change', save);
  $('#notifSocial').addEventListener('change', () => { nativeApp.setSocial?.($('#notifSocial').checked); setTimeout(paint, 1500); toast('알림 설정을 저장했어요 🔔'); });
  $('#notifOpen').addEventListener('click', () => nativeApp.openNotificationSettings());
  $('#notifOwnerChange').addEventListener('click', async () => { await askOwner(); paint(); });
  card.querySelector('.notif-test').addEventListener('click', (e) => {
    const b = e.target.closest('[data-test]');
    if (b) nativeApp.test(b.dataset.test);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') paint(); });
}
gate().then(() => { syncNative(); initNotifCard().catch(() => {}); }).catch(() => {});
window.addEventListener('mm-schedule-changed', () => { try { nativeApp?.refresh?.(); } catch { /* 무시 */ } });

/* 맨 아래 “이 기기: 🐶 멍뭉이 / 🐰 우기 · 바꾸기” (아이폰·브라우저에서도 바꿀 수 있게) */
function paintOwnerLine() {
  const o = getOwner();
  $('#ownerLine').hidden = false;
  $('#ownerName').textContent = o ? `${ICONS[o]} ${NAMES[o]}` : '아직 안 정했어요';
  $('#ownerChange').textContent = o ? '바꾸기' : '정하기';
}
$('#ownerChange').addEventListener('click', async () => {
  const isMeong = await askConfirm('이 기기는 누구 거예요? 댓글·사진에 이름으로 쓰여요.', '🐶 멍뭉이', '🐰 우기', 'primary');
  const o = isMeong ? 'meongmung' : 'woogi';
  setOwner(o);
  if (nativeApp?.setReminders) nativeApp.setReminders(o === 'meongmung', o === 'meongmung'); // 앱이면 알림도 맞춰요
  paintOwnerLine();
  toast(`이 기기를 ${ICONS[o]} ${NAMES[o]} 기기로 정했어요`);
  if (location.hash === '#today') location.reload();
});
gate().then(paintOwnerLine).catch(() => {});
window.addEventListener('storage', paintOwnerLine);

/* 화면 위 “우기 🐾 출근 중” : 입장한 뒤 1분마다, 앱으로 돌아올 때마다 다시 확인 */
async function updateHeaderWork() {
  const el = $('#hdrWork');
  if (!isUnlocked() && !(await store.isAdmin().catch(() => false))) { el.hidden = true; return; }
  const sc = fixSchedule(await store.getSchedule?.().catch(() => ({})) || {});
  const ws = workStatus(sc);
  if (!ws.state) { el.hidden = true; return; }
  el.innerHTML = `<span class="hw-name">우기</span>${workBadge(ws.state)}`;
  el.hidden = false;
}
gate().then(updateHeaderWork).catch(() => {});
setInterval(() => updateHeaderWork().catch(() => {}), 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateHeaderWork().catch(() => {}); });
let lastHdr = 0;
window.addEventListener('hashchange', () => {
  if (Date.now() - lastHdr < 15000) return; // 탭을 자주 바꿔도 15초에 한 번만
  lastHdr = Date.now();
  updateHeaderWork().catch(() => {});
});
// 스케줄을 저장·수정하면 바로 다시
window.addEventListener('mm-schedule-changed', () => updateHeaderWork().catch(() => {}));

route();
