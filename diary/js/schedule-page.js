// 🗓️ 우기 스케줄 화면
// - 우기(관리자로 로그인한 기기)가 캡처를 올리고 “글자 인식하기”를 누르면 날짜·내용·시간을 채워 줘요
// - 확인하고 고친 뒤 “달력에 저장”
// - 휴대폰 시간으로 지금 출근 중인지, 퇴근했는지 발바닥 배지로 보여 줘요
import { store, dateKey, escapeHtml, toast, askConfirm } from './store.js';
import { readImage, detectMonth, parseSchedule, splitTime, workStatus } from './schedule.js';
import { workBadge, pawStampSVG } from './character.js';

const $ = (s, el = document) => el.querySelector(s);
const TIMES_KEY = 'mm-shift-times'; // “오픈 → 09:00~18:00” 처럼 근무 이름별 시간을 이 기기에 기억
let schedule = {};
let month = new Date(); month.setDate(1);
let selected = dateKey();
let admin = false;
let opts = {};
let pickedFile = null;
let lastOcr = null;
let rows = [];

const fmtDay = (k) => new Date(`${k}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
const timeText = (e) => (e?.start ? `${e.start}${e.end ? ` ~ ${e.end}` : ''}` : '');

function knownTimes() {
  try { return JSON.parse(localStorage.getItem(TIMES_KEY) || '{}'); } catch { return {}; }
}
function rememberTimes(entries) {
  const k = knownTimes();
  for (const e of entries) if (e.text && e.start) k[e.text] = { start: e.start, end: e.end || null };
  try { localStorage.setItem(TIMES_KEY, JSON.stringify(k)); } catch { /* 무시 */ }
}

/** 읽은 글을 이름 + 시간으로 나누고, 시간이 없으면 기억해 둔 시간으로 채워요 */
function withTimes(list) {
  const k = knownTimes();
  return list.map((r) => {
    const t = splitTime(r.text);
    const label = t.label || r.text;
    const mem = !t.start && k[label];
    return { date: r.date, text: label, start: t.start || mem?.start || '', end: t.end || mem?.end || '', remembered: !!mem };
  });
}

export async function initSchedule(o) {
  opts = o; // { openImage(src, caption) }
  $('#scPrev').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); render(); });
  $('#scNext').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); render(); });
  $('#scDays').addEventListener('click', (e) => {
    const b = e.target.closest('[data-date]');
    if (!b) return;
    selected = b.dataset.date;
    render();
  });
  $('#scDetail').addEventListener('click', async (e) => {
    if (e.target.closest('[data-img]')) {
      const s = schedule[selected];
      if (s?.imgUrl) opts.openImage?.(s.imgUrl, `${fmtDay(selected)} 스케줄 캡처`);
    }
    if (e.target.closest('[data-edit]')) {
      const s = schedule[selected] || {};
      $('#scManualDate').value = selected;
      $('#scManualText').value = s.text || '';
      $('#scManualStart').value = s.start || '';
      $('#scManualEnd').value = s.end || '';
      $('.sc-manual').open = true;
      $('#scManualText').focus();
    }
    if (e.target.closest('[data-del]') && await askConfirm(`${fmtDay(selected)} 스케줄을 지울까요?`)) {
      try { await store.deleteScheduleDay(selected); toast('스케줄을 지웠어요'); await refresh(); } catch (err) { toast(err.message, 'err'); }
    }
  });

  // 1) 캡처 고르기 → 미리 보기만
  $('#scFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    pickedFile = file;
    lastOcr = null;
    rows = [];
    const pv = $('#scPick');
    if (pv.dataset.src) URL.revokeObjectURL(pv.dataset.src);
    pv.dataset.src = URL.createObjectURL(file);
    pv.src = pv.dataset.src;
    $('#scPicked').hidden = false;
    $('#scReview').hidden = true;
    $('#scFileText').textContent = '다른 캡처 고르기';
  });
  // 2) “글자 인식하기”를 누르면 그때 읽어요
  $('#scRead').addEventListener('click', async () => {
    if (!pickedFile) return;
    const btn = $('#scRead');
    btn.disabled = true;
    $('#scProgress').hidden = false;
    const bar = $('#scBar');
    try {
      lastOcr = await readImage(pickedFile, (p, msg) => { bar.style.width = `${Math.round(p * 100)}%`; $('#scProgressText').textContent = msg; });
      const ym = detectMonth(lastOcr.text, { year: month.getFullYear(), month: month.getMonth() + 1 });
      $('#scMonth').value = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
      rows = withTimes(parseSchedule(lastOcr, ym));
      showReview();
      $('#scReview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      toast(err.message || '글자를 읽지 못했어요', 'err');
    } finally {
      $('#scProgress').hidden = true;
      btn.disabled = false;
    }
  });
  $('#scMonth').addEventListener('change', () => {
    if (!lastOcr || !$('#scMonth').value) return;
    const [y, m] = $('#scMonth').value.split('-').map(Number);
    rows = withTimes(parseSchedule(lastOcr, { year: y, month: m }));
    showReview();
  });
  $('#scRows').addEventListener('input', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const r = rows[+li.dataset.i];
    const f = e.target.dataset.f;
    if (f) r[f] = e.target.value;
  });
  $('#scRows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    rows.splice(+b.dataset.remove, 1);
    showReview();
  });
  $('#scAddRow').addEventListener('click', () => {
    const last = rows[rows.length - 1]?.date;
    const next = last ? new Date(`${last}T00:00`) : new Date(month);
    if (last) next.setDate(next.getDate() + 1);
    rows.push({ date: dateKey(next), text: '', start: '', end: '' });
    showReview();
    $('#scRows li:last-child input[data-f=text]')?.focus();
  });
  $('#scSave').addEventListener('click', async () => {
    const entries = rows
      .map((r) => ({ date: r.date, text: (r.text || '').trim(), start: r.start || null, end: r.end || null }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && (r.text || r.start));
    if (!entries.length) { toast('저장할 스케줄이 없어요. 줄을 추가해서 직접 써 주세요.', 'err'); return; }
    const btn = $('#scSave');
    btn.disabled = true;
    btn.textContent = '저장하는 중…';
    try {
      await store.saveScheduleDays(entries, pickedFile);
      rememberTimes(entries);
      toast(`스케줄 ${entries.length}일을 달력에 넣었어요 🗓️`);
      selected = entries[0].date;
      month = new Date(`${selected}T00:00`); month.setDate(1);
      $('#scReview').hidden = true;
      $('#scPicked').hidden = true;
      $('#scFileText').textContent = '스케줄 캡처 고르기';
      pickedFile = null; lastOcr = null; rows = [];
      await refresh();
    } catch (err) {
      toast(err.status === 401 ? '관리자만 저장할 수 있어요. 관리자로 다시 로그인해 주세요.' : err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = '🗓️ 달력에 저장';
    }
  });
  $('#scManual').addEventListener('submit', async (e) => {
    e.preventDefault();
    const entry = { date: $('#scManualDate').value, text: $('#scManualText').value.trim(), start: $('#scManualStart').value || null, end: $('#scManualEnd').value || null };
    if (!entry.text && !entry.start) { toast('내용이나 시간을 써 주세요', 'err'); return; }
    try {
      await store.saveScheduleDays([entry], null);
      rememberTimes([entry]);
      selected = entry.date;
      month = new Date(`${selected}T00:00`); month.setDate(1);
      $('#scManualText').value = '';
      toast('스케줄을 저장했어요');
      await refresh();
    } catch (err) { toast(err.message, 'err'); }
  });
  // 근무 이름을 쓰면 기억해 둔 시간을 채워 줘요
  $('#scManualText').addEventListener('change', () => {
    const mem = knownTimes()[$('#scManualText').value.trim()];
    if (mem && !$('#scManualStart').value) { $('#scManualStart').value = mem.start; $('#scManualEnd').value = mem.end || ''; }
  });
  $('#scManualDate').value = dateKey();

  // 출근/퇴근 발바닥은 1분마다 휴대폰 시간으로 다시 확인
  setInterval(() => { if (!$('#page-schedule').hidden) render(); }, 60000);

  await refresh();
}

function showReview() {
  $('#scReview').hidden = false;
  if (pickedFile) $('#scPreview').src = $('#scPick').src;
  $('#scFound').textContent = rows.length
    ? `${rows.length}일을 찾았어요. 틀린 곳이나 빠진 시간은 고쳐 주세요.`
    : '날짜를 찾지 못했어요. “줄 추가”로 직접 넣어 주세요.';
  $('#scRows').innerHTML = rows.map((r, i) => `<li data-i="${i}">
      <input type="date" data-f="date" value="${r.date}" aria-label="날짜" />
      <input type="text" data-f="text" value="${escapeHtml(r.text)}" maxlength="200" placeholder="근무·일정 (예: 오픈)" aria-label="스케줄" />
      <button type="button" class="icon-btn" data-remove="${i}" aria-label="이 줄 빼기">✕</button>
      <span class="sc-time">⏰
        <input type="time" data-f="start" value="${r.start || ''}" aria-label="시작 시간" /> ~
        <input type="time" data-f="end" value="${r.end || ''}" aria-label="끝 시간" />
        ${r.remembered ? '<small>기억해 둔 시간</small>' : ''}
      </span>
    </li>`).join('');
}

/** 다시 불러와서 그리기 */
export async function refresh() {
  [schedule, admin] = await Promise.all([store.getSchedule().catch(() => ({})), store.isAdmin().catch(() => false)]);
  $('#scUpload').hidden = !admin;
  $('#scNote').hidden = admin;
  render();
}

function render() {
  // 지금 상태 (휴대폰 시간 기준)
  const now = workStatus(schedule);
  $('#scNow').innerHTML = now.state
    ? `<span class="sc-now-label">지금 우기는</span>${workBadge(now.state)}<span class="muted small">${escapeHtml(now.entry?.text || '')}${now.entry?.start ? ` · ${timeText(now.entry)}` : ''}</span>`
    : '<span class="muted small">오늘은 등록된 근무 시간이 없어요.</span>';

  const y = month.getFullYear();
  const m = month.getMonth();
  $('#scTitle').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const t = dateKey();
  let html = '';
  for (let i = 0; i < first; i++) html += '<span class="cal-day empty"></span>';
  for (let d = 1; d <= days; d++) {
    const key = dateKey(new Date(y, m, d));
    const w = (first + d - 1) % 7;
    const s = schedule[key];
    const cls = ['cal-day', 'sc-day', w === 0 ? 'sun' : '', w === 6 ? 'sat' : '', key === t ? 'today' : '', key === selected ? 'selected' : '', s ? 'has' : ''].join(' ');
    const paw = key === now.date && ['working', 'off', 'before'].includes(now.state) ? `<span class="sc-paw ${now.state}" aria-hidden="true">${pawStampSVG()}</span>` : '';
    html += `<button class="${cls}" data-date="${key}" aria-label="${m + 1}월 ${d}일${s ? `, ${escapeHtml(s.text || '')} ${timeText(s)}` : ''}"><span class="num">${d}</span>${paw}${s
      ? `<span class="sc-chip">${escapeHtml(s.text || '')}</span>${s.start ? `<span class="sc-hm">${s.start}</span>` : ''}`
      : ''}</button>`;
  }
  $('#scDays').innerHTML = html;

  const s = schedule[selected];
  const badge = selected === now.date ? workBadge(now.state) : '';
  $('#scDetail').innerHTML = `<span class="date">🗓️ ${fmtDay(selected)}</span>${s
    ? `<div class="sc-line"><p class="sc-text">${escapeHtml(s.text || '')}</p>${badge}</div>
       ${s.start ? `<p class="sc-when">⏰ ${timeText(s)}</p>` : ''}
       <div class="row-actions">
         ${s.imgUrl ? '<button type="button" class="btn sm" data-img>📷 원본 캡처 보기</button>' : ''}
         ${admin ? '<button type="button" class="btn sm" data-edit>고치기</button><button type="button" class="btn danger sm" data-del>지우기</button>' : ''}
       </div>`
    : `<p class="muted">이 날은 스케줄이 없어요.${admin ? ' 아래에서 캡처를 올리거나 직접 입력해 주세요.' : ''}</p>`}`;
}
