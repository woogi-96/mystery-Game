// 데이터 저장소 — 세 가지 방식 중 열린 곳에 맞게 자동으로 골라요
// - cloud : claude.ai 에 올린 페이지 → claude.ai 공용 저장소 (멍뭉이와 함께 봐요)
// - server: server.js 로 실행 → 서버(API)에 저장 (멍뭉이와 함께 봐요)
// - local : 정적 호스팅(GitHub Pages 등) → 이 브라우저(IndexedDB)에만 저장
import { DEFAULT_PROFILE, DEFAULT_TRAITS } from './defaults.js';

const API = 'api';
const ADMIN_KEY = 'mm-admin-key';
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const extOf = (type) => ({ 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' }[type] || '.jpg');

async function sha256(text) {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; // crypto.subtle 이 없는 아주 오래된 브라우저용
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `x${(h >>> 0).toString(16)}`;
}
const randomSalt = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const WIPE_KINDS = ['diary', 'photos', 'stamps', 'profile', 'places'];
// 다녀온 곳 한 개를 깔끔하게 (저장 전에 모든 방식에서 똑같이 정리해요)
export function cleanPlace(p) {
  const str = (v, n) => String(v ?? '').trim().slice(0, n);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) throw fail('날짜를 골라 주세요');
  if (!str(p.name, 40)) throw fail('장소 이름을 써 주세요');
  return { date: p.date, name: str(p.name, 40), area: str(p.area, 60), category: str(p.category, 12), memo: str(p.memo, 200) };
}
const photoExtra = (x = {}) => ({ ...(x.date ? { date: x.date } : {}), ...(x.placeId ? { placeId: x.placeId } : {}) });

function fail(msg, status) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

/* ---------- 관리자 키 (server / local 방식에서 세션 동안만 기억) ---------- */
function adminKey() {
  try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
}
function setAdminKey(v) {
  try { v ? sessionStorage.setItem(ADMIN_KEY, v) : sessionStorage.removeItem(ADMIN_KEY); } catch { /* 무시 */ }
}

/* =====================================================================
 * 1) claude.ai 공용 저장소
 * ===================================================================== */
async function cloudBackend() {
  if (!window.claude?.use) return null;
  const db = await window.claude.use('db').catch(() => null);
  if (!db) return null;
  const user = await window.claude.use('user').catch(() => null);
  const assetsP = window.claude.use('assets').catch(() => null);
  const downloadsP = window.claude.use('downloads').catch(() => null);

  // 저장소 오류를 알아듣기 쉬운 말로
  const wrap = async (fn) => {
    try { return await fn(); } catch (e) {
      const code = e?.code;
      if (code === 'invalid_argument') throw fail('저장 권한이 없어요. 공유받을 때 “참여자(Contributor)” 이상이어야 써요.', 403);
      if (code === 'quota_exceeded') throw fail('저장 공간이 가득 찼어요. 관리자 메뉴에서 오래된 사진을 지워 주세요.');
      if (code === 'resource_exhausted' || code === 'rate_limited') throw fail('잠깐 너무 바빠요. 조금 뒤에 다시 해 주세요.');
      if (code === 'unavailable' || code === 'store_unavailable') {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        try { return await fn(); } catch { throw fail('연결이 불안정해요. 조금 뒤에 다시 해 주세요.'); }
      }
      throw e instanceof Error ? e : fail(e?.message || '문제가 생겼어요');
    }
  };
  const docData = async (path, fallback) => {
    const s = await wrap(() => db.doc(path).get());
    return s.exists ? { ...structuredClone(fallback), ...s.data() } : structuredClone(fallback);
  };
  const isEditor = async () => (user ? !!(await user.canEdit()) : false);
  const uid = user ? await user.id().catch(() => null) : null;
  const lockRef = uid ? db.doc(`data/users/${uid}/lock`) : null;
  const allDocs = async (coll) => (await wrap(() => db.collection(coll).get())).docs;
  const needEditor = async () => { if (!(await isEditor())) throw fail('편집 권한이 있는 사람만 할 수 있어요', 401); };

  // 업로드 가능한 형식(png/jpeg/gif/webp, 20MB)이 아니면 JPEG로 바꿔요 (아이폰 HEIC 등)
  async function normalizeImage(file) {
    const ok = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type);
    if (ok && file.size <= 19 * 1024 * 1024) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) throw fail('이 사진 형식은 올릴 수 없어요. JPG나 PNG로 바꿔서 올려 주세요.');
    const scale = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    return new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  return {
    mode: 'cloud',
    getProfile: () => docData('app/profile', DEFAULT_PROFILE),
    saveProfile: (p) => wrap(() => db.doc('app/profile').set(p)).then(() => p),
    getSettings: () => docData('app/settings', { traitOptions: DEFAULT_TRAITS }),
    saveSettings: async (s) => { await needEditor(); await wrap(() => db.doc('app/settings').set({ traitOptions: s.traitOptions })); return s; },

    getDiary: async () => {
      const snap = await wrap(() => db.collection('diary').get());
      return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    },
    saveDiary: async (date, text) => {
      const entry = { text, at: new Date().toISOString() };
      await wrap(() => db.collection('diary').doc(date).set(entry));
      return entry;
    },
    deleteDiary: async (date) => { await needEditor(); await wrap(() => db.collection('diary').doc(date).delete()); return { ok: true }; },

    listPhotos: async () => {
      const snap = await wrap(() => db.collection('photos').orderBy('uploadedAt', 'desc').get());
      return snap.docs.map((d) => {
        const p = d.data();
        const src = `/_blob/${p.assetId}`;
        return { ...p, id: d.id, src, downloadUrl: src };
      });
    },
    uploadPhoto: async (file, caption = '', extra = {}) => {
      const assets = await assetsP;
      if (!assets) throw fail('사진을 올릴 권한이 없어요. 공유받을 때 “참여자(Contributor)” 이상이어야 해요.', 403);
      const img = await normalizeImage(file);
      let up;
      try { up = await assets.upload(img, { type: img.type }); } catch (e) {
        if (e?.code === 'too_large') throw fail('사진이 너무 커요 (최대 20MB)');
        if (e?.code === 'unsupported_type') throw fail('JPG, PNG, GIF, WEBP 사진만 올릴 수 있어요');
        if (e?.code === 'quota_or_state') throw fail('사진 저장 공간이 가득 찼어요');
        throw fail('사진을 올리지 못했어요. 다시 해 주세요.');
      }
      const id = newId();
      const meta = { assetId: up.id, name: img.name || `photo${extOf(img.type)}`, caption, type: up.contentType, size: up.sizeBytes, uploadedAt: new Date().toISOString(), ...photoExtra(extra) };
      await wrap(() => db.collection('photos').doc(id).set(meta));
      return { ...meta, id };
    },
    deletePhoto: async (id) => {
      await needEditor();
      const s = await wrap(() => db.collection('photos').doc(id).get());
      if (s.exists) {
        const assets = await assetsP;
        if (assets) await assets.delete(s.data().assetId).catch(() => {});
      }
      await wrap(() => db.collection('photos').doc(id).delete());
      return { ok: true };
    },
    // claude.ai 페이지에서는 일반 다운로드 링크가 막혀 있어서 저장 창으로 받아요
    downloadPhoto: async (p) => {
      const downloads = await downloadsP;
      if (!downloads) throw fail('이 화면에서는 저장할 수 없어요. 사진을 길게 눌러 저장해 주세요.');
      const blob = await (await fetch(p.src)).blob();
      const base = (p.name || 'photo').replace(/\.[^.]+$/, '');
      try { await downloads.save({ filename: base + extOf(p.type), data: blob }); } catch (e) {
        if (e?.code === 'declined') return false;
        throw fail('저장하지 못했어요');
      }
      return true;
    },
    saveFile: async (filename, data) => {
      const downloads = await downloadsP;
      if (!downloads) throw fail('이 화면에서는 파일을 저장할 수 없어요');
      try { await downloads.save({ filename, data }); } catch (e) { if (e?.code !== 'declined') throw fail('저장하지 못했어요'); }
    },

    // 다녀온 곳
    getPlaces: async () => (await allDocs('places')).map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    savePlace: async (p) => {
      const body = cleanPlace(p);
      const ref = p.id ? db.collection('places').doc(p.id) : db.collection('places').doc(newId());
      const createdAt = p.createdAt || new Date().toISOString();
      await wrap(() => ref.set({ ...body, createdAt, updatedAt: new Date().toISOString() }));
      return { ...body, createdAt, id: ref.id };
    },
    deletePlace: async (id) => { await needEditor(); await wrap(() => db.collection('places').doc(id).delete()); },

    // 참 잘했어요 도장 (관리자만 찍어요)
    getStamps: async () => Object.fromEntries((await allDocs('stamps')).map((d) => [d.id, d.data()])),
    setStamp: async (date, on) => {
      await needEditor();
      const ref = db.collection('stamps').doc(date);
      await wrap(() => (on ? ref.set({ at: new Date().toISOString() }) : ref.delete()));
    },

    // 입장 비밀번호: 사람마다 자기만 볼 수 있는 곳에 해시로 저장
    lockState: async (token) => {
      if (!lockRef) return { set: false, unsupported: true };
      const snap = await lockRef.get().catch(() => null);
      if (!snap) return { set: false, unsupported: true };
      if (!snap.exists) return { set: false };
      return { set: true, remembered: !!token && token === snap.data().hash };
    },
    setPin: async (pin) => {
      const salt = randomSalt();
      const hash = await sha256(`${salt}:${pin}`);
      await wrap(() => lockRef.set({ salt, hash, at: new Date().toISOString() }));
      return hash;
    },
    unlock: async (pin) => {
      const snap = await wrap(() => lockRef.get());
      if (!snap.exists) return null;
      const { salt, hash } = snap.data();
      return (await sha256(`${salt}:${pin}`)) === hash ? hash : null;
    },
    canResetOwnPin: true, // claude.ai 로그인으로 본인 확인이 되니까 잠금 화면에서 다시 설정할 수 있어요
    resetPin: async () => { await wrap(() => lockRef.delete()); },

    wipe: async (kinds = WIPE_KINDS) => {
      await needEditor();
      if (kinds.includes('photos')) {
        const assets = await assetsP;
        for (const d of await allDocs('photos')) {
          if (assets) await assets.delete(d.data().assetId).catch(() => {});
          await wrap(() => db.collection('photos').doc(d.id).delete());
        }
      }
      for (const coll of ['diary', 'stamps'].filter((k) => kinds.includes(k))) {
        for (const d of await allDocs(coll)) await wrap(() => db.collection(coll).doc(d.id).delete());
      }
      if (kinds.includes('profile')) await wrap(() => db.doc('app/profile').delete());
      if (kinds.includes('places')) for (const d of await allDocs('places')) await wrap(() => db.collection('places').doc(d.id).delete());
    },

    // 관리자 = claude.ai 에서 이 페이지를 편집할 수 있는 사람 (주인 / 편집자)
    usesPassword: false,
    isAdmin: isEditor,
    login: async () => { await needEditor(); return true; },
    logout: () => {},
    changePassword: async () => { throw fail('claude.ai 에서는 비밀번호 대신 공유 권한으로 관리해요'); },
    exportAll: async () => {
      await needEditor();
      const stamps = Object.fromEntries((await allDocs('stamps')).map((d) => [d.id, d.data()]));
      const places = (await allDocs('places')).map((d) => ({ id: d.id, ...d.data() }));
      const [profile, settings, diary, photos] = await Promise.all([
        docData('app/profile', DEFAULT_PROFILE), docData('app/settings', { traitOptions: DEFAULT_TRAITS }),
        (async () => Object.fromEntries((await db.collection('diary').get()).docs.map((d) => [d.id, d.data()])))(),
        (async () => (await db.collection('photos').get()).docs.map((d) => ({ id: d.id, ...d.data() })))(),
      ]);
      return { profile, traitOptions: settings.traitOptions, diary, stamps, places, photos };
    },
  };
}

/* =====================================================================
 * 2) Node 서버 (server.js)
 * ===================================================================== */
async function api(path, { method = 'GET', body, headers = {}, admin = false } = {}) {
  const h = { ...headers };
  if (admin) h['x-admin-key'] = encodeURIComponent(adminKey());
  if (body !== undefined && !(body instanceof Blob)) {
    h['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const r = await fetch(`${API}/${path}`, { method, body, headers: h, cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(data.error || `요청 실패 (${r.status})`, r.status);
  return data;
}

async function serverBackend() {
  const ok = await fetch(`${API}/ping`, { cache: 'no-store' }).then((r) => r.json()).then((j) => j?.ok).catch(() => false);
  if (!ok) return null;
  return {
    mode: 'server',
    getProfile: () => api('profile'),
    saveProfile: (p) => api('profile', { method: 'PUT', body: p }),
    getSettings: () => api('settings'),
    saveSettings: (s) => api('settings', { method: 'PUT', body: s, admin: true }),
    getDiary: () => api('diary'),
    saveDiary: (date, text) => api(`diary/${date}`, { method: 'PUT', body: { text } }),
    deleteDiary: (date) => api(`diary/${date}`, { method: 'DELETE', admin: true }),
    listPhotos: async () => (await api('photos')).map((p) => ({ ...p, src: `${API}/photos/${p.id}/file`, downloadUrl: `${API}/photos/${p.id}/file?download=1` })),
    uploadPhoto: (file, caption = '', extra = {}) => api('photos', {
      method: 'POST',
      body: file,
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name || 'photo.jpg'),
        'x-caption': encodeURIComponent(caption),
        'x-extra': encodeURIComponent(JSON.stringify(photoExtra(extra))),
      },
    }),
    deletePhoto: (id) => api(`photos/${id}`, { method: 'DELETE', admin: true }),
    downloadPhoto: null, // 일반 다운로드 링크 사용
    saveFile: null,
    getPlaces: () => api('places'),
    savePlace: (p) => { const body = cleanPlace(p); return p.id ? api(`places/${p.id}`, { method: 'PUT', body }) : api('places', { method: 'POST', body }); },
    deletePlace: (id) => api(`places/${id}`, { method: 'DELETE', admin: true }),
    getStamps: () => api('stamps'),
    setStamp: (date, on) => api(`stamps/${date}`, { method: on ? 'PUT' : 'DELETE', admin: true }),
    lockState: (token) => api(`lock?token=${encodeURIComponent(token || '')}`),
    setPin: async (pin) => (await api('lock', { method: 'POST', body: { pin } })).token,
    unlock: async (pin) => {
      try { return (await api('lock/unlock', { method: 'POST', body: { pin } })).token; } catch (e) {
        if (e.status === 401) return null;
        throw e;
      }
    },
    canResetOwnPin: false,
    resetPin: () => api('lock', { method: 'DELETE', admin: true }),
    wipe: (kinds = WIPE_KINDS) => api('admin/wipe', { method: 'POST', body: { kinds }, admin: true }),
    usesPassword: true,
    isAdmin: async () => !!adminKey(),
    login: async (pw) => {
      setAdminKey(pw);
      try { await api('admin/check', { method: 'POST', admin: true }); return true; } catch (e) { setAdminKey(''); throw e; }
    },
    logout: () => setAdminKey(''),
    changePassword: async (next) => { await api('admin/password', { method: 'PUT', body: { password: next }, admin: true }); setAdminKey(next); },
    exportAll: () => api('export', { admin: true }),
  };
}

/* =====================================================================
 * 3) 이 브라우저 (IndexedDB)
 * ===================================================================== */
function localBackend() {
  let dbPromise = null;
  const idb = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open('meongmung-diary', 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('kv');
          req.result.createObjectStore('photos', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  };
  const run = async (name, mode, fn) => {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(name, mode);
      const req = fn(t.objectStore(name));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || fail('저장 공간이 부족해요'));
    });
  };
  const kvGet = async (k, fallback) => {
    const v = await run('kv', 'readonly', (s) => s.get(k));
    return v === undefined ? structuredClone(fallback) : v;
  };
  const kvSet = (k, v) => run('kv', 'readwrite', (s) => s.put(v, k));
  const urlCache = new Map();
  const check = async () => {
    if (adminKey() !== await kvGet('adminPassword', 'meongmung')) throw fail('관리자 로그인이 필요해요', 401);
  };

  return {
    mode: 'local',
    getProfile: () => kvGet('profile', DEFAULT_PROFILE),
    saveProfile: (p) => kvSet('profile', p).then(() => p),
    getSettings: async () => ({ traitOptions: await kvGet('traitOptions', DEFAULT_TRAITS) }),
    saveSettings: async (s) => { await check(); await kvSet('traitOptions', s.traitOptions); return s; },
    getDiary: () => kvGet('diary', {}),
    saveDiary: async (date, text) => {
      const d = await kvGet('diary', {});
      d[date] = { text, at: new Date().toISOString() };
      await kvSet('diary', d);
      return d[date];
    },
    deleteDiary: async (date) => {
      await check();
      const d = await kvGet('diary', {});
      delete d[date];
      await kvSet('diary', d);
      return { ok: true };
    },
    listPhotos: async () => {
      const all = await run('photos', 'readonly', (s) => s.getAll());
      return all.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).map(({ blob, ...meta }) => {
        if (!urlCache.has(meta.id)) urlCache.set(meta.id, URL.createObjectURL(blob));
        const src = urlCache.get(meta.id);
        return { ...meta, src, downloadUrl: src };
      });
    },
    uploadPhoto: async (file, caption = '', extra = {}) => {
      const meta = { id: newId(), name: file.name || 'photo.jpg', caption, type: file.type, size: file.size, uploadedAt: new Date().toISOString(), ...photoExtra(extra) };
      await run('photos', 'readwrite', (s) => s.put({ ...meta, blob: file }));
      return meta;
    },
    deletePhoto: async (id) => {
      await check();
      await run('photos', 'readwrite', (s) => s.delete(id));
      if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
      return { ok: true };
    },
    downloadPhoto: null,
    saveFile: null,
    getPlaces: async () => (await kvGet('places', [])).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    savePlace: async (p) => {
      const body = cleanPlace(p);
      const list = await kvGet('places', []);
      const i = p.id ? list.findIndex((x) => x.id === p.id) : -1;
      const place = { ...body, id: p.id || newId(), createdAt: (i >= 0 && list[i].createdAt) || new Date().toISOString() };
      if (i >= 0) list[i] = place; else list.push(place);
      await kvSet('places', list);
      return place;
    },
    deletePlace: async (id) => { await check(); await kvSet('places', (await kvGet('places', [])).filter((x) => x.id !== id)); },
    getStamps: () => kvGet('stamps', {}),
    setStamp: async (date, on) => {
      await check();
      const st = await kvGet('stamps', {});
      if (on) st[date] = { at: new Date().toISOString() }; else delete st[date];
      await kvSet('stamps', st);
    },
    lockState: async (token) => {
      const l = await kvGet('lock', null);
      return l ? { set: true, remembered: !!token && token === l.hash } : { set: false };
    },
    setPin: async (pin) => {
      const salt = randomSalt();
      const hash = await sha256(`${salt}:${pin}`);
      await kvSet('lock', { salt, hash });
      return hash;
    },
    unlock: async (pin) => {
      const l = await kvGet('lock', null);
      return l && (await sha256(`${l.salt}:${pin}`)) === l.hash ? l.hash : null;
    },
    canResetOwnPin: false,
    resetPin: async () => { await check(); await run('kv', 'readwrite', (s) => s.delete('lock')); },
    wipe: async (kinds = WIPE_KINDS) => {
      await check();
      if (kinds.includes('diary')) await kvSet('diary', {});
      if (kinds.includes('stamps')) await kvSet('stamps', {});
      if (kinds.includes('profile')) await run('kv', 'readwrite', (s) => s.delete('profile'));
      if (kinds.includes('places')) await kvSet('places', []);
      if (kinds.includes('photos')) {
        await run('photos', 'readwrite', (s) => s.clear());
        urlCache.forEach((u) => URL.revokeObjectURL(u));
        urlCache.clear();
      }
    },
    usesPassword: true,
    isAdmin: async () => !!adminKey(),
    login: async (pw) => {
      setAdminKey(pw);
      try { await check(); return true; } catch (e) { setAdminKey(''); throw e; }
    },
    logout: () => setAdminKey(''),
    changePassword: async (next) => { await check(); await kvSet('adminPassword', next); setAdminKey(next); },
    exportAll: async () => {
      await check();
      return {
        profile: await kvGet('profile', DEFAULT_PROFILE),
        traitOptions: await kvGet('traitOptions', DEFAULT_TRAITS),
        diary: await kvGet('diary', {}),
        stamps: await kvGet('stamps', {}),
        places: await kvGet('places', []),
        photos: (await run('photos', 'readonly', (s) => s.getAll())).map(({ blob, ...m }) => m),
      };
    },
  };
}

export const store = (await cloudBackend()) || (await serverBackend()) || localBackend();
store.local = store.mode === 'local';

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

/** confirm() 대신 쓰는 화면 안 확인 창 (claude.ai 페이지에서는 confirm 이 막혀 있어요) */
export function askConfirm(message, okLabel = '삭제') {
  return new Promise((resolve) => {
    let dlg = document.getElementById('confirmDlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'confirmDlg';
      dlg.className = 'confirm-dlg';
      dlg.innerHTML = '<p id="confirmMsg"></p><div class="btn-row"><button class="btn" id="confirmNo" type="button">취소</button><button class="btn danger" id="confirmYes" type="button"></button></div>';
      document.body.appendChild(dlg);
    }
    dlg.querySelector('#confirmMsg').textContent = message;
    const yes = dlg.querySelector('#confirmYes');
    const no = dlg.querySelector('#confirmNo');
    yes.textContent = okLabel;
    // close 이벤트는 늦게 도착해서 다음 확인 창을 닫아 버릴 수 있어요 → Esc(cancel)만 따로 받아요
    const done = (v) => { yes.onclick = no.onclick = dlg.oncancel = null; if (dlg.open) dlg.close(); resolve(v); };
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
    dlg.oncancel = (e) => { e.preventDefault(); done(false); };
    dlg.showModal();
  });
}

/** 사진 다운로드: claude.ai 에서는 저장 창, 그 밖에서는 일반 다운로드 링크 */
export async function downloadPhoto(photo) {
  if (!store.downloadPhoto) {
    const a = document.createElement('a');
    a.href = photo.downloadUrl;
    a.download = photo.name || 'photo.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  try {
    if (await store.downloadPhoto(photo)) toast('사진을 저장했어요 ⬇️');
  } catch (e) { toast(e.message, 'err'); }
}
