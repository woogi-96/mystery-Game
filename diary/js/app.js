import { store, dateKey, escapeHtml, toast } from './store.js';
import { meongmungImg, meongmungSmall, pawStampSVG } from './character.js';

const $ = (s, el = document) => el.querySelector(s);
const PAGES = ['intro', 'today', 'together', 'quiz'];
const loaded = {};

/* ---------- 라우팅 ---------- */
function route() {
  const page = PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'intro';
  PAGES.forEach((p) => { $(`#page-${p}`).hidden = p !== page; });
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === page));
  if (!loaded[page]) {
    loaded[page] = true;
    ({ intro: initIntro, today: initToday, together: initTogether, quiz: initQuiz })[page]().catch(showError);
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
  ? '💾 지금은 이 브라우저에만 저장돼요 (서버로 실행하면 함께 볼 수 있어요)'
  : '☁️ 멍뭉이와 함께 보는 공용 일지예요';

/* ---------- 1. 소개 ---------- */
async function initIntro() {
  $('#heroArt').innerHTML = `${meongmungImg()}<span class="bubble">안녕! 나 멍뭉이야 🐾</span>`;
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

async function initToday() {
  diary = await store.getDiary();
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
    if (!b || b.classList.contains('future')) return;
    selectedDay = b.dataset.date;
    renderCalendar();
  });
  selectedDay = today();
  renderCalendar();
}

function fillTodayForm() {
  const entry = diary[today()];
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

function renderCalendar(stampedDate = null) {
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  $('#calTitle').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const t = today();
  let html = '';
  for (let i = 0; i < first; i++) html += '<span class="cal-day empty"></span>';
  for (let day = 1; day <= days; day++) {
    const key = dateKey(new Date(y, m, day));
    const w = (first + day - 1) % 7;
    const cls = ['cal-day', w === 0 ? 'sun' : '', w === 6 ? 'sat' : '', key === t ? 'today' : '',
      key === selectedDay ? 'selected' : '', key > t ? 'future' : ''].join(' ');
    const stamp = diary[key] ? pawStampSVG(key === stampedDate ? 'new' : '') : '';
    html += `<button class="${cls}" data-date="${key}" aria-label="${m + 1}월 ${day}일${diary[key] ? ' 출석' : ''}"><span class="num">${day}</span>${stamp}</button>`;
  }
  $('#calDays').innerHTML = html;
  // 새로 찍힌 도장만 애니메이션
  $('#calDays').querySelectorAll('.paw-stamp:not(.new)').forEach((s) => { s.style.animation = 'none'; });

  const sel = selectedDay && diary[selectedDay];
  const label = selectedDay ? new Date(`${selectedDay}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
  $('#calDetail').innerHTML = sel
    ? `<span class="date">🐾 ${label}</span><p>${escapeHtml(sel.text)}</p>`
    : `<span class="date">${label}</span><p class="muted">${selectedDay === t ? '아직 오늘 일기가 없어요. 한 줄 남겨 볼까요?' : '이 날은 일기가 없어요.'}</p>`;

  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthCount = Object.keys(diary).filter((k) => k.startsWith(monthPrefix)).length;
  $('#diaryStats').innerHTML = `
    <div class="stat"><b>${streak()}일</b><span>연속 출석</span></div>
    <div class="stat"><b>${monthCount}일</b><span>${m + 1}월 출석</span></div>
    <div class="stat"><b>${Object.keys(diary).length}개</b><span>전체 일기</span></div>`;
}

/* ---------- 3. 멍뭉이와 함께 ---------- */
let pending = [];

async function initTogether() {
  const input = $('#fileInput');
  const drop = $('#drop');
  const setFiles = (files) => {
    pending = [...files].filter((f) => f.type.startsWith('image/'));
    $('#uploadBtn').disabled = !pending.length;
    $('#dropText').textContent = pending.length ? `사진 ${pending.length}장 선택됨 · 다시 누르면 바꿀 수 있어요` : '여기를 눌러 사진 고르기 (또는 끌어다 놓기)';
    let pv = $('.previews');
    if (!pv) { pv = document.createElement('div'); pv.className = 'previews'; $('.upload-row').before(pv); }
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
      try { await store.uploadPhoto(f, caption); ok++; } catch (err) { showError(err); }
    }
    btn.textContent = '올리기';
    input.value = '';
    $('#captionInput').value = '';
    setFiles([]);
    if (ok) toast(`사진 ${ok}장을 올렸어요 📸`);
    renderGallery();
  });

  const lb = $('#lightbox');
  $('#lbClose').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  renderGallery();
}

let photos = [];
async function renderGallery() {
  photos = await store.listPhotos();
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
        <span>${escapeHtml(p.caption || '')}<br><span class="date">${new Date(p.uploadedAt).toLocaleDateString('ko-KR')}</span></span>
        <a class="dl" href="${p.downloadUrl}" download="${escapeHtml(p.name)}" title="다운로드" aria-label="다운로드">⬇️</a>
      </figcaption>
    </figure>`).join('');
  g.onclick = (e) => {
    if (e.target.closest('.dl')) return;
    const f = e.target.closest('.photo');
    if (!f) return;
    const p = photos[+f.dataset.i];
    $('#lbImg').src = p.src;
    $('#lbCaption').textContent = p.caption || p.name;
    const dl = $('#lbDownload');
    dl.href = p.downloadUrl;
    dl.setAttribute('download', p.name);
    $('#lightbox').showModal();
  };
}

/* ---------- 4. 멍뭉 퀴즈 ---------- */
function seededOrder(ids) {
  // 날짜마다 다른 문제가 나오도록 고정된 순서로 섞기
  const arr = [...ids].sort();
  let s = 20260101;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

let quizzes = [];
let quizLog = {};

async function initQuiz() {
  [quizzes, quizLog] = await Promise.all([store.getQuizzes(), store.getQuizLog()]);
  renderQuiz();
}

function todaysQuiz() {
  const t = today();
  const done = quizLog[t] && quizzes.find((q) => q.id === quizLog[t].quizId);
  if (done) return done;
  if (!quizzes.length) return null;
  const order = seededOrder(quizzes.map((q) => q.id));
  const id = order[dayNumber(t) % order.length];
  return quizzes.find((q) => q.id === id);
}

function renderQuiz() {
  const card = $('#quizCard');
  const q = todaysQuiz();
  if (!q) {
    card.innerHTML = '<p class="muted">아직 등록된 퀴즈가 없어요. 관리자 페이지에서 추가해 주세요!</p>';
    return;
  }
  const rec = quizLog[today()];
  card.innerHTML = `
    <span class="q-label">오늘의 신조어 · ${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</span>
    <p class="word">“${escapeHtml(q.word)}”</p>
    <p class="question">${escapeHtml(q.question || '이 말의 뜻은 무엇일까요?')}</p>
    <div class="options">${q.options.map((o, i) => `
      <button class="opt" data-i="${i}"><span class="n">${i + 1}</span><span>${escapeHtml(o)}</span></button>`).join('')}
    </div>
    <div id="quizResult"></div>`;

  if (rec) showAnswer(q, rec.choice, false);
  else {
    card.querySelector('.options').addEventListener('click', async (e) => {
      const b = e.target.closest('.opt');
      if (!b || b.disabled) return;
      const choice = +b.dataset.i;
      const correct = choice === q.answer;
      card.querySelectorAll('.opt').forEach((o) => { o.disabled = true; });
      try {
        quizLog[today()] = await store.saveQuizAnswer(today(), { quizId: q.id, word: q.word, choice, correct });
      } catch (err) { showError(err); }
      showAnswer(q, choice, true);
    }, { once: false });
  }
  renderQuizStats();
}

function showAnswer(q, choice, fresh) {
  const card = $('#quizCard');
  const correct = choice === q.answer;
  card.querySelectorAll('.opt').forEach((o, i) => {
    o.disabled = true;
    if (i === q.answer) o.classList.add('correct');
    else if (i === choice) o.classList.add('wrong');
  });
  const res = $('#quizResult');
  if (correct) {
    res.innerHTML = `<div class="result ok">${meongmungSmall()}<div>
      <h4>정답이에요! 🎉</h4>
      <p>${escapeHtml(q.reason || '')}</p>
      <p class="muted small">내일 새로운 퀴즈로 또 만나요!</p></div></div>`;
    if (fresh) showCircle();
  } else {
    res.innerHTML = `<div class="result no">${meongmungSmall()}<div>
      <h4>아쉬워요, 틀렸어요 😢</h4>
      <p class="ans">정답: ${q.answer + 1}번 “${escapeHtml(q.options[q.answer])}”</p>
      <p><b>이유</b> · ${escapeHtml(q.reason || '')}</p>
      <p class="muted small">내일은 꼭 맞혀 봐요!</p></div></div>`;
    if (fresh) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
  }
  renderQuizStats();
}

function showCircle() {
  const ox = $('#ox');
  ox.classList.remove('show');
  void ox.offsetWidth;
  ox.classList.add('show');
  setTimeout(() => ox.classList.remove('show'), 1600);
}

function renderQuizStats() {
  const entries = Object.entries(quizLog).sort((a, b) => b[0].localeCompare(a[0]));
  const right = entries.filter(([, r]) => r.correct).length;
  $('#quizStats').innerHTML = `
    <div class="stat"><b>${entries.length}개</b><span>푼 퀴즈</span></div>
    <div class="stat"><b>${right}개</b><span>맞힌 퀴즈</span></div>
    <div class="stat"><b>${entries.length ? Math.round((right / entries.length) * 100) : 0}%</b><span>정답률</span></div>`;
  $('#quizHistory').innerHTML = entries.length
    ? entries.slice(0, 30).map(([d, r]) => {
      const q = quizzes.find((x) => x.id === r.quizId);
      return `<li><span class="mark">${r.correct ? '⭕' : '❌'}</span><span class="w">${escapeHtml(q ? q.word : r.word || '삭제된 퀴즈')}</span>
        <span class="muted small">${q ? escapeHtml(q.options[q.answer]) : ''}</span><span class="d">${d}</span></li>`;
    }).join('')
    : '<li class="muted">아직 푼 퀴즈가 없어요.</li>';
}

route();
