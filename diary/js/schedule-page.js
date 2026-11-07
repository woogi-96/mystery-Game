// 🗓️ 우기 스케줄 화면
import { store, dateKey, escapeHtml, toast, askConfirm } from './store.js';
import { readImage, detectMonth, parseSchedule } from './schedule.js';

const $ = (s, el = document) => el.querySelector(s);
let schedule = {};
let month = new Date(); month.setDate(1);
let selected = dateKey();
let admin = false;
let opts = {};
// 올린 캡처와 읽은 결과 (월을 바꾸면 다시 맞춰요)
let lastFile = null;
let lastOcr = null;
let rows = [];

const fmtDay = (k) => new Date(`${k}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

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
      $('#scManualDate').value = selected;
      $('#scManualText').value = schedule[selected]?.text || '';
      $('.sc-manual').open = true;
      $('#scManualText').focus();
    }
    if (e.target.closest('[data-del]') && await askConfirm(`${fmtDay(selected)} 스케줄을 지울까요?`)) {
      try { await store.deleteScheduleDay(selected); toast('스케줄을 지웠어요'); await refresh(); } catch (err) { toast(err.message, 'err'); }
    }
  });

  // 캡처 올리기 → 글자 읽기 → 확인 화면
  $('#scFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    lastFile = file;
    $('#scFileText').textContent = file.name || '스케줄 캡처';
    $('#scReview').hidden = true;
    $('#scProgress').hidden = false;
    const bar = $('#scBar');
    try {
      lastOcr = await readImage(file, (p, msg) => { bar.style.width = `${Math.round(p * 100)}%`; $('#scProgressText').textContent = msg; });
      const ym = detectMonth(lastOcr.text, { year: month.getFullYear(), month: month.getMonth() + 1 });
      $('#scMonth').value = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
      rows = parseSchedule(lastOcr, ym);
      showReview();
    } catch (err) {
      toast(err.message || '글자를 읽지 못했어요', 'err');
    } finally {
      $('#scProgress').hidden = true;
    }
  });
  $('#scMonth').addEventListener('change', () => {
    if (!lastOcr || !$('#scMonth').value) return;
    const [y, m] = $('#scMonth').value.split('-').map(Number);
    rows = parseSchedule(lastOcr, { year: y, month: m });
    showReview();
  });
  $('#scRows').addEventListener('input', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const r = rows[+li.dataset.i];
    if (e.target.type === 'date') r.date = e.target.value; else r.text = e.target.value;
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
    rows.push({ date: dateKey(next), text: '' });
    showReview();
    $('#scRows li:last-child input[type=text]')?.focus();
  });
  $('#scSave').addEventListener('click', async () => {
    const entries = rows.map((r) => ({ date: r.date, text: (r.text || '').trim() })).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.text);
    if (!entries.length) { toast('저장할 스케줄이 없어요. 줄을 추가해서 직접 써 주세요.', 'err'); return; }
    const btn = $('#scSave');
    btn.disabled = true;
    btn.textContent = '저장하는 중…';
    try {
      await store.saveScheduleDays(entries, lastFile);
      toast(`스케줄 ${entries.length}일을 달력에 넣었어요 🗓️`);
      const first = entries[0].date;
      month = new Date(`${first}T00:00`); month.setDate(1);
      selected = first;
      $('#scReview').hidden = true;
      $('#scFileText').textContent = '스케줄 캡처 고르기';
      lastFile = null; lastOcr = null; rows = [];
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
    try {
      await store.saveScheduleDays([{ date: $('#scManualDate').value, text: $('#scManualText').value.trim() }], null);
      selected = $('#scManualDate').value;
      month = new Date(`${selected}T00:00`); month.setDate(1);
      $('#scManualText').value = '';
      toast('스케줄을 저장했어요');
      await refresh();
    } catch (err) { toast(err.message, 'err'); }
  });
  $('#scManualDate').value = dateKey();

  await refresh();
}

function showReview() {
  $('#scReview').hidden = false;
  if (lastFile) {
    const pv = $('#scPreview');
    if (pv.dataset.src) URL.revokeObjectURL(pv.dataset.src);
    pv.dataset.src = URL.createObjectURL(lastFile);
    pv.src = pv.dataset.src;
  }
  $('#scFound').textContent = rows.length
    ? `${rows.length}일을 찾았어요. 틀린 곳은 고쳐 주세요.`
    : '날짜를 찾지 못했어요. “줄 추가”로 직접 넣어 주세요.';
  $('#scRows').innerHTML = rows.map((r, i) => `<li data-i="${i}">
      <input type="date" value="${r.date}" aria-label="날짜" />
      <input type="text" value="${escapeHtml(r.text)}" maxlength="200" placeholder="스케줄" aria-label="스케줄" />
      <button type="button" class="icon-btn" data-remove="${i}" aria-label="이 줄 빼기">✕</button>
    </li>`).join('');
}

/** 다시 불러와서 그리기 (다른 화면에서도 불러요) */
export async function refresh() {
  [schedule, admin] = await Promise.all([store.getSchedule().catch(() => ({})), store.isAdmin().catch(() => false)]);
  $('#scUpload').hidden = !admin;
  $('#scNote').hidden = admin;
  render();
}

function render() {
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
    html += `<button class="${cls}" data-date="${key}" aria-label="${m + 1}월 ${d}일${s ? `, ${escapeHtml(s.text)}` : ''}"><span class="num">${d}</span>${s ? `<span class="sc-chip">${escapeHtml(s.text)}</span>` : ''}</button>`;
  }
  $('#scDays').innerHTML = html;

  const s = schedule[selected];
  $('#scDetail').innerHTML = `<span class="date">🗓️ ${fmtDay(selected)}</span>${s
    ? `<p class="sc-text">${escapeHtml(s.text)}</p>
       <div class="row-actions">
         ${s.imgUrl ? '<button type="button" class="btn sm" data-img>📷 원본 캡처 보기</button>' : ''}
         ${admin ? '<button type="button" class="btn sm" data-edit>고치기</button><button type="button" class="btn danger sm" data-del>지우기</button>' : ''}
       </div>`
    : `<p class="muted">이 날은 스케줄이 없어요.${admin ? ' 아래에서 캡처를 올리거나 직접 입력해 주세요.' : ''}</p>`}`;
}
