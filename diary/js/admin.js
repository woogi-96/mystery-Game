// 관리자 화면 (index.html#admin)
import { store, escapeHtml, toast, askConfirm, downloadPhoto } from './store.js';
import { praiseStampSVG } from './character.js';

const $ = (s, el = document) => el.querySelector(s);
const fail = (e) => {
  console.error(e);
  if (e.status === 401) { store.logout(); show(); }
  toast(e.message || '문제가 생겼어요', 'err');
};

async function show() {
  const authed = await store.isAdmin();
  const pw = store.usesPassword;
  $('#loginBox').hidden = authed || !pw;
  $('#noAccess').hidden = authed || pw;
  $('#adminBox').hidden = !authed;
  $('#logoutBtn').hidden = !authed || !pw;
  $('#pwForm').hidden = !pw;
  if (authed) loadAll();
}

async function loadPlaces() {
  const places = await store.getPlaces();
  $('#placeRows').innerHTML = places.length
    ? places.map((p) => `<li><div class="body"><span class="meta">${fmt(p.date)}${p.area ? ` · ${escapeHtml(p.area)}` : ''}</span><b>${escapeHtml(p.name)}</b>${p.memo ? `<span class="meta">${escapeHtml(p.memo)}</span>` : ''}</div>
        <div class="actions"><button class="btn danger sm" data-del="${escapeHtml(p.id)}" type="button">삭제</button></div></li>`).join('')
    : '<li class="muted">아직 남긴 장소가 없어요.</li>';
}

function loadAll() {
  loadDiary().catch(fail);
  loadPlaces().catch(fail);
  loadPhotos().catch(fail);
  loadTraits().catch(fail);
  $('#pinReset').hidden = store.canResetOwnPin;
  $('#pinAdminText').textContent = store.canResetOwnPin
    ? '입장 비밀번호는 사람마다 따로 정하고, 각자만 볼 수 있게 암호화해서 저장해요. 잊어버리면 잠금 화면의 “비밀번호를 잊었어요”로 새로 정할 수 있어요.'
    : '모두가 같은 입장 비밀번호 4자리를 써요. 잊어버렸다면 여기서 초기화한 뒤 새로 정하면 돼요.';
  $('#adminMode').textContent = {
    cloud: '지금은 claude.ai 공용 저장소를 써요. 이 페이지를 공유받은 사람끼리 같은 일기와 사진을 봐요. 관리는 이 페이지의 주인만 할 수 있고, 편집자로 초대받은 사람은 일기·사진·장소를 쓸 수만 있어요.',
    supa: '지금은 Supabase 저장소를 써요. 로그인 없이 주소만 열면 들어오고, 모든 데이터는 입장 비밀번호가 있어야 볼 수 있어요. 관리자 비밀번호는 처음 로그인할 때 쓴 비밀번호예요.',
    server: '지금은 서버 저장 방식이에요. 모든 데이터가 서버의 data 폴더에 저장돼요.',
    local: '지금은 이 브라우저에만 저장하는 방식이에요. (기본 비밀번호: meongmung)',
  }[store.mode];
}

/* ---------- 일기 · 참 잘했어요 도장 ---------- */
let diary = {};
let stamps = {};
let filter = 'new';
const fmt = (k) => new Date(`${k}T00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

async function loadDiary() {
  [diary, stamps] = await Promise.all([store.getDiary(), store.getStamps()]);
  renderDiary();
}
function renderDiary() {
  const all = Object.entries(diary).sort((a, b) => b[0].localeCompare(a[0]));
  const waiting = all.filter(([d]) => !stamps[d]);
  $('#newCount').textContent = waiting.length ? `도장 기다리는 일기 ${waiting.length}개` : '모두 확인했어요 ✓';
  $('#newCount').classList.toggle('done', !waiting.length);
  document.querySelectorAll('#diaryFilter button').forEach((b) => b.classList.toggle('active', b.dataset.f === filter));
  const rows = filter === 'new' ? waiting : all;
  $('#diaryRows').innerHTML = rows.length
    ? rows.map(([d, e]) => {
      const on = !!stamps[d];
      return `<li class="${on ? 'stamped' : ''}">
        <div class="body"><span class="meta">${fmt(d)}</span><p class="entry">${escapeHtml(e.text)}</p>
          <div class="row-actions">
            <button class="btn sm ${on ? '' : 'praise'}" data-stamp="${d}" data-on="${on ? 1 : 0}" type="button">${on ? '도장 빼기' : '🐾 참 잘했어요'}</button>
            <button class="btn danger sm" data-del="${d}" type="button">삭제</button>
          </div></div>
        <div class="stamp-slot">${on ? praiseStampSVG('admin') : '<span class="stamp-empty">도장<br>자리</span>'}</div></li>`;
    }).join('')
    : `<li class="muted">${filter === 'new' && all.length ? '도장을 기다리는 일기가 없어요. 모두 확인했어요! 💮' : '아직 일기가 없어요.'}</li>`;
}

/* ---------- 사진 ---------- */
let photos = [];
async function loadPhotos() {
  photos = await store.listPhotos();
  $('#photoGrid').innerHTML = photos.length
    ? photos.map((p, i) => `<figure><img src="${p.src}" alt="" loading="lazy" />
        <figcaption>${escapeHtml(p.caption || p.name)}<br><span class="muted">${new Date(p.uploadedAt).toLocaleString('ko-KR')}</span></figcaption>
        <div class="row"><button class="btn sm" data-dl="${i}" type="button">⬇</button>
        <button class="btn danger sm" data-del="${escapeHtml(p.id)}" type="button">삭제</button></div></figure>`).join('')
    : '<p class="muted">아직 사진이 없어요.</p>';
}

/* ---------- 특징 ---------- */
let traits = [];
async function loadTraits() {
  traits = [...(await store.getSettings()).traitOptions];
  renderTraits();
}
function renderTraits() {
  $('#traitList').innerHTML = traits.map((t, i) => `<button class="chip" data-i="${i}" title="눌러서 삭제">${escapeHtml(t)} ✕</button>`).join('');
}

let inited = false;
export function init() {
  if (inited) return;
  inited = true;
  // 홈 화면 앱(/admin)이나 설치된 앱에서는 로그인 유지를 기본으로
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  $('#keepLogin').checked = !!standalone || /^\/admin\/?$/.test(location.pathname);

  $('#forgotAdmin').addEventListener('click', () => {
    const r = store.adminReset;
    const f = $('#resetAdminForm');
    f.hidden = !f.hidden;
    $('#resetAdminHelp').textContent = r?.help || '관리자 비밀번호를 다시 정할 수 없는 방식이에요.';
    $('#resetAdminFields').hidden = r?.how !== 'pin';
  });
  $('#resetAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await store.adminReset.run($('#resetPin').value, $('#resetNewPw').value);
      $('#resetPin').value = $('#resetNewPw').value = '';
      $('#resetAdminForm').hidden = true;
      toast('새 관리자 비밀번호로 바꿨어요 🔐');
      show();
    } catch (err) { toast(err.message, 'err'); }
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await store.login($('#pw').value, $('#keepLogin').checked);
      $('#pw').value = '';
      toast('어서 와요, 관리자님 🐾');
      show();
    } catch (err) {
      toast(err.status === 401 ? '비밀번호가 틀렸어요' : err.message, 'err');
    }
  });
  $('#logoutBtn').addEventListener('click', () => { store.logout(); show(); });

  $('#adminTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    document.querySelectorAll('#adminTabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.t; });
  });

  $('#diaryFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { filter = b.dataset.f; renderDiary(); }
  });
  $('#diaryRows').addEventListener('click', async (e) => {
    const sb = e.target.closest('[data-stamp]');
    if (sb) {
      const d = sb.dataset.stamp;
      const on = sb.dataset.on !== '1';
      sb.disabled = true;
      try {
        await store.setStamp(d, on);
        if (on) { stamps[d] = { at: new Date().toISOString() }; toast('참 잘했어요 도장을 쾅! 💮'); } else { delete stamps[d]; toast('도장을 뺐어요'); }
        if (on && filter === 'new') {
          const li = sb.closest('li');
          li.querySelector('.stamp-slot').innerHTML = praiseStampSVG('admin new');
          li.classList.add('stamped');
          setTimeout(renderDiary, 900);
        } else renderDiary();
      } catch (err) { sb.disabled = false; fail(err); }
      return;
    }
    const d = e.target.closest('[data-del]')?.dataset.del;
    if (!d || !(await askConfirm(`${fmt(d)} 일기를 삭제할까요?`))) return;
    try {
      await store.deleteDiary(d);
      if (stamps[d]) await store.setStamp(d, false).catch(() => {});
      toast('삭제했어요');
      loadDiary();
    } catch (err) { fail(err); }
  });

  // 데이터 삭제 (관리자만)
  const WIPE_LABEL = { diary: '한 줄 일기', stamps: '참 잘했어요 도장', photos: '사진', profile: '멍뭉이 소개서', places: '다녀온 곳', schedule: '우기 스케줄' };
  $('[data-panel="data"]').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wipe]');
    if (!b) return;
    const kinds = b.dataset.wipe.split(',');
    const what = kinds.length >= 6 ? '모든 데이터(일기, 도장, 사진, 소개서, 다녀온 곳, 스케줄)' : kinds.filter((k) => !(k === 'stamps' && kinds.includes('diary'))).map((k) => WIPE_LABEL[k]).join(', ');
    if (!(await askConfirm(`${what}를 모두 삭제할까요? 되돌릴 수 없어요.`, '삭제하기'))) return;
    if (kinds.length >= 6 && !(await askConfirm('정말 전부 지울까요? 마지막으로 한 번 더 확인해요.', '전부 삭제'))) return;
    b.disabled = true;
    try {
      await store.wipe(kinds);
      toast(`${what}를 삭제했어요`);
      loadAll();
    } catch (err) { fail(err); } finally { b.disabled = false; }
  });
  $('#placeRows').addEventListener('click', async (e) => {
    const id = e.target.closest('[data-del]')?.dataset.del;
    if (!id || !(await askConfirm('이 장소 기록을 삭제할까요?'))) return;
    try { await store.deletePlace(id); toast('장소를 삭제했어요'); loadPlaces(); } catch (err) { fail(err); }
  });
  $('#pinReset').addEventListener('click', async () => {
    if (!(await askConfirm('입장 비밀번호를 지울까요? 다음에 들어오는 사람이 새 비밀번호 4자리를 정하게 돼요.', '초기화'))) return;
    try { await store.resetPin(); toast('입장 비밀번호를 초기화했어요'); } catch (err) { fail(err); }
  });

  $('#photoGrid').addEventListener('click', async (e) => {
    const { del, dl } = e.target.dataset;
    if (dl !== undefined) { downloadPhoto(photos[+dl]); return; }
    if (!del || !(await askConfirm('이 사진을 삭제할까요? 되돌릴 수 없어요.'))) return;
    try { await store.deletePhoto(del); toast('사진을 삭제했어요'); loadPhotos(); } catch (err) { fail(err); }
  });

  $('#traitList').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    traits.splice(+b.dataset.i, 1);
    renderTraits();
  });
  $('#traitForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#traitInput').value.trim();
    if (v && !traits.includes(v)) traits.push(v);
    $('#traitInput').value = '';
    renderTraits();
  });
  $('#traitSave').addEventListener('click', async () => {
    try { await store.saveSettings({ traitOptions: traits }); toast('특징 목록을 저장했어요'); } catch (err) { fail(err); }
  });

  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await store.changePassword($('#newPw').value); $('#newPw').value = ''; toast('비밀번호를 바꿨어요 🔐'); } catch (err) { fail(err); }
  });
  $('#exportBtn').addEventListener('click', async () => {
    try {
      const data = await store.exportAll();
      const json = JSON.stringify(data, null, 2);
      const filename = `meongmung-diary-${new Date().toISOString().slice(0, 10)}.json`;
      if (store.saveFile) { await store.saveFile(filename, json); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) { fail(err); }
  });

  show();
}

export function refresh() {
  show();
}
