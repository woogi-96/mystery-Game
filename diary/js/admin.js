// 관리자 화면 (index.html#admin)
import { store, escapeHtml, toast, askConfirm, downloadPhoto } from './store.js';

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

function loadAll() {
  loadDiary().catch(fail);
  loadPhotos().catch(fail);
  loadTraits().catch(fail);
  $('#adminMode').textContent = {
    cloud: '지금은 claude.ai 공용 저장소를 써요. 이 페이지를 공유받은 사람끼리 같은 일기와 사진을 봐요. 관리는 이 페이지를 편집할 수 있는 사람(주인, 편집자)만 할 수 있어요.',
    server: '지금은 서버 저장 방식이에요. 모든 데이터가 서버의 diary/data 폴더에 저장돼요.',
    local: '지금은 이 브라우저에만 저장하는 방식이에요. (기본 비밀번호: meongmung)',
  }[store.mode];
}

/* ---------- 일기 ---------- */
async function loadDiary() {
  const diary = await store.getDiary();
  const rows = Object.entries(diary).sort((a, b) => b[0].localeCompare(a[0]));
  $('#diaryRows').innerHTML = rows.length
    ? rows.map(([d, e]) => `<li><div class="body"><span class="meta">${d}</span>${escapeHtml(e.text)}</div>
        <div class="actions"><button class="btn danger sm" data-del="${d}">삭제</button></div></li>`).join('')
    : '<li class="muted">아직 일기가 없어요.</li>';
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

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await store.login($('#pw').value);
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

  $('#diaryRows').addEventListener('click', async (e) => {
    const d = e.target.dataset.del;
    if (!d || !(await askConfirm(`${d} 일기를 삭제할까요?`))) return;
    try { await store.deleteDiary(d); toast('삭제했어요'); loadDiary(); } catch (err) { fail(err); }
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
