// 데이터 저장소
// - server.js 로 실행하면: 서버(API)에 저장 → 멍뭉이와 우기가 같은 데이터를 봐요
// - 정적 호스팅(GitHub Pages 등)이나 파일로 열면: 이 브라우저(IndexedDB)에만 저장돼요
import { DEFAULT_PROFILE, DEFAULT_TRAITS, DEFAULT_QUIZZES } from './defaults.js';

const API = 'api';
const ADMIN_KEY = 'mm-admin-key';
let modePromise = null;

export function getMode() {
  if (!modePromise) {
    modePromise = fetch(`${API}/ping`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j && j.ok ? 'server' : 'local'))
      .catch(() => 'local');
  }
  return modePromise;
}

/* ---------- 관리자 키 (세션 동안만 기억) ---------- */
function adminKey() {
  try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
}
function setAdminKey(v) {
  try { v ? sessionStorage.setItem(ADMIN_KEY, v) : sessionStorage.removeItem(ADMIN_KEY); } catch { /* 무시 */ }
}

/* ---------- 서버 ---------- */
async function api(path, { method = 'GET', body, headers = {}, admin = false } = {}) {
  const h = { ...headers };
  if (admin) h['x-admin-key'] = encodeURIComponent(adminKey());
  if (body !== undefined && !(body instanceof Blob)) {
    h['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const r = await fetch(`${API}/${path}`, { method, body, headers: h, cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || `요청 실패 (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data;
}

/* ---------- 브라우저 (IndexedDB) ---------- */
let dbPromise = null;
function idb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('meongmung-diary', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('kv');
        db.createObjectStore('photos', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function run(store, mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('저장 공간이 부족해요'));
  });
}
const kvGet = async (k, fallback) => {
  const v = await run('kv', 'readonly', (s) => s.get(k));
  return v === undefined ? structuredClone(fallback) : v;
};
const kvSet = (k, v) => run('kv', 'readwrite', (s) => s.put(v, k));

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const urlCache = new Map();

async function localAdminCheck() {
  const pw = await kvGet('adminPassword', 'meongmung');
  if (adminKey() !== pw) {
    const e = new Error('관리자 로그인이 필요해요');
    e.status = 401;
    throw e;
  }
}

/* ---------- 공개 API ---------- */
const local = await getMode() === 'local';

export const store = {
  local,

  // 프로필
  getProfile: () => (local ? kvGet('profile', DEFAULT_PROFILE) : api('profile')),
  saveProfile: (p) => (local ? kvSet('profile', p).then(() => p) : api('profile', { method: 'PUT', body: p })),

  // 설정 (특징 보기 목록)
  getSettings: async () => (local
    ? { traitOptions: await kvGet('traitOptions', DEFAULT_TRAITS) }
    : api('settings')),
  saveSettings: async (s) => {
    if (local) { await localAdminCheck(); await kvSet('traitOptions', s.traitOptions); return s; }
    return api('settings', { method: 'PUT', body: s, admin: true });
  },

  // 한 줄 일기 { 'YYYY-MM-DD': { text, at } }
  getDiary: () => (local ? kvGet('diary', {}) : api('diary')),
  saveDiary: async (date, text) => {
    if (!local) return api(`diary/${date}`, { method: 'PUT', body: { text } });
    const d = await kvGet('diary', {});
    d[date] = { text, at: new Date().toISOString() };
    await kvSet('diary', d);
    return d[date];
  },
  deleteDiary: async (date) => {
    if (!local) return api(`diary/${date}`, { method: 'DELETE', admin: true });
    await localAdminCheck();
    const d = await kvGet('diary', {});
    delete d[date];
    await kvSet('diary', d);
    return { ok: true };
  },

  // 사진
  listPhotos: async () => {
    if (!local) {
      const list = await api('photos');
      return list.map((p) => ({ ...p, src: `${API}/photos/${p.id}/file`, downloadUrl: `${API}/photos/${p.id}/file?download=1` }));
    }
    const all = await run('photos', 'readonly', (s) => s.getAll());
    return all
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .map(({ blob, ...meta }) => {
        if (!urlCache.has(meta.id)) urlCache.set(meta.id, URL.createObjectURL(blob));
        const src = urlCache.get(meta.id);
        return { ...meta, src, downloadUrl: src };
      });
  },
  uploadPhoto: async (file, caption = '') => {
    if (!local) {
      return api('photos', {
        method: 'POST',
        body: file,
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name || 'photo.jpg'),
          'x-caption': encodeURIComponent(caption),
        },
      });
    }
    const meta = { id: newId(), name: file.name || 'photo.jpg', caption, type: file.type, size: file.size, uploadedAt: new Date().toISOString() };
    await run('photos', 'readwrite', (s) => s.put({ ...meta, blob: file }));
    return meta;
  },
  deletePhoto: async (id) => {
    if (!local) return api(`photos/${id}`, { method: 'DELETE', admin: true });
    await localAdminCheck();
    await run('photos', 'readwrite', (s) => s.delete(id));
    if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
    return { ok: true };
  },

  // 퀴즈
  getQuizzes: () => (local ? kvGet('quizzes', DEFAULT_QUIZZES) : api('quizzes')),
  saveQuiz: async (q) => {
    if (!local) return q.id ? api(`quizzes/${q.id}`, { method: 'PUT', body: q, admin: true }) : api('quizzes', { method: 'POST', body: q, admin: true });
    await localAdminCheck();
    const list = await kvGet('quizzes', DEFAULT_QUIZZES);
    if (q.id) {
      const i = list.findIndex((x) => x.id === q.id);
      if (i >= 0) list[i] = q; else list.push(q);
    } else {
      q = { ...q, id: newId() };
      list.push(q);
    }
    await kvSet('quizzes', list);
    return q;
  },
  deleteQuiz: async (id) => {
    if (!local) return api(`quizzes/${id}`, { method: 'DELETE', admin: true });
    await localAdminCheck();
    const list = await kvGet('quizzes', DEFAULT_QUIZZES);
    await kvSet('quizzes', list.filter((x) => x.id !== id));
    return { ok: true };
  },

  // 퀴즈 기록 { 'YYYY-MM-DD': { quizId, choice, correct, at } }
  getQuizLog: () => (local ? kvGet('quizLog', {}) : api('quiz-log')),
  saveQuizAnswer: async (date, rec) => {
    if (!local) return api(`quiz-log/${date}`, { method: 'PUT', body: rec });
    const log = await kvGet('quizLog', {});
    if (!log[date]) log[date] = { ...rec, at: new Date().toISOString() };
    await kvSet('quizLog', log);
    return log[date];
  },
  resetQuizLog: async () => {
    if (!local) return api('quiz-log', { method: 'DELETE', admin: true });
    await localAdminCheck();
    await kvSet('quizLog', {});
    return { ok: true };
  },

  // 관리자
  isAdmin: () => !!adminKey(),
  login: async (pw) => {
    setAdminKey(pw);
    try {
      if (local) await localAdminCheck();
      else await api('admin/check', { method: 'POST', admin: true });
      return true;
    } catch (e) {
      setAdminKey('');
      throw e;
    }
  },
  logout: () => setAdminKey(''),
  changePassword: async (next) => {
    if (!local) await api('admin/password', { method: 'PUT', body: { password: next }, admin: true });
    else { await localAdminCheck(); await kvSet('adminPassword', next); }
    setAdminKey(next);
  },
  exportAll: async () => {
    if (!local) return api('export', { admin: true });
    await localAdminCheck();
    const photos = (await run('photos', 'readonly', (s) => s.getAll())).map(({ blob, ...m }) => m);
    return {
      profile: await kvGet('profile', DEFAULT_PROFILE),
      traitOptions: await kvGet('traitOptions', DEFAULT_TRAITS),
      diary: await kvGet('diary', {}),
      quizzes: await kvGet('quizzes', DEFAULT_QUIZZES),
      quizLog: await kvGet('quizLog', {}),
      photos,
    };
  },
};

/* ---------- 날짜 유틸 (항상 사용자 기기 기준 날짜) ---------- */
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, type = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2700);
}
