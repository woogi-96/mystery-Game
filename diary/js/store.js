// 데이터 저장소 — 세 가지 방식 중 열린 곳에 맞게 자동으로 골라요
// - cloud : claude.ai 에 올린 페이지 → claude.ai 공용 저장소 (멍뭉이와 함께 봐요)
// - supa  : GitHub Pages 등에 올리고 js/config.js 에 Supabase 주소를 넣으면 → Supabase 에 저장 (로그인 없이 함께 봐요)
// - server: server.js 로 실행 → 서버(API)에 저장 (멍뭉이와 함께 봐요)
// - local : 정적 호스팅(GitHub Pages 등) → 이 브라우저(IndexedDB)에만 저장
import { DEFAULT_PROFILE, DEFAULT_TRAITS } from './defaults.js';
import { SUPABASE } from './config.js';

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
      if (code === 'invalid_argument') throw fail('저장 권한이 없어요. 주인에게 이메일로 “편집자(Editor)” 초대를 받으면 쓸 수 있어요.', 403);
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
  // 관리자 = 이 페이지의 주인(우기님)만. 편집자로 초대받은 사람(멍뭉이)은 쓰기만 하고 관리는 못 해요
  const isEditor = async () => (user ? !!(await user.isOwner()) : false);
  const uid = user ? await user.id().catch(() => null) : null;
  const lockRef = uid ? db.doc(`data/users/${uid}/lock`) : null;
  const allDocs = async (coll) => (await wrap(() => db.collection(coll).get())).docs;
  const needEditor = async () => { if (!(await isEditor())) throw fail('페이지 주인(관리자)만 할 수 있어요', 401); };


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
      if (!assets) throw fail('사진을 올릴 권한이 없어요. 주인에게 이메일로 “편집자(Editor)” 초대를 받으면 올릴 수 있어요.', 403);
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

    // 관리자 = 이 페이지의 주인
    usesPassword: false,
    // 이 사람이 일기·사진을 저장할 수 있는지 (null = 알 수 없음 → 써 보고 판단)
    canWrite: async () => (user ? await user.can('data.write').catch(() => null) : null),
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
 * 1-b) Supabase (로그인 없이 웹브라우저로 여는 공개 사이트용)
 *      모든 데이터는 입장 비밀번호로 받은 토큰이 있어야 읽고 쓸 수 있어요 (supabase/setup.sql)
 * ===================================================================== */
function supaBackend() {
  if (!SUPABASE?.url || !SUPABASE?.anonKey) return null;
  const base = SUPABASE.url.replace(/\/+$/, '');
  const BUCKET = 'mm-photos';
  // 예전 anon 키(eyJ…)는 Authorization 에도 넣고, 새 publishable 키(sb_publishable_…)는 apikey 에만 넣어요
  const headers = SUPABASE.anonKey.startsWith('sb_')
    ? { apikey: SUPABASE.anonKey }
    : { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` };
  let userTok = '';
  const tok = () => adminKey() || userTok;

  const MSG = {
    mm_locked: '입장 비밀번호를 먼저 입력해 주세요',
    mm_admin_only: '관리자만 할 수 있어요',
    mm_too_many: '여러 번 틀려서 1분 동안 잠겼어요. 잠시 뒤에 다시 해 주세요.',
    mm_bad_pin: '숫자 4자리로 정해 주세요',
    mm_pin_exists: '이미 다른 기기에서 비밀번호를 정했어요. 정해 둔 비밀번호를 입력해 주세요.',
    mm_bad_pw: '비밀번호는 4자 이상이어야 해요',
    mm_too_big: '내용이 너무 길어요',
  };
  async function rpc(name, args = {}) {
    let r;
    try {
      r = await fetch(`${base}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(args),
      });
    } catch { throw fail('인터넷 연결을 확인해 주세요'); }
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) {
      const key = Object.keys(MSG).find((k) => (data?.message || '').includes(k));
      throw fail(MSG[key] || '저장소에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.', key === 'mm_locked' || key === 'mm_admin_only' ? 401 : r.status);
    }
    return data;
  }
  const list = async (coll) => (await rpc('mm_list', { p_token: tok(), p_coll: coll })) || [];
  const get = (coll, id) => rpc('mm_get', { p_token: tok(), p_coll: coll, p_id: id });
  const put = (coll, id, data) => rpc('mm_put', { p_token: tok(), p_coll: coll, p_id: id, p_data: data });
  const del = (coll, id) => rpc('mm_del', { p_token: tok(), p_coll: coll, p_id: id });
  const fileUrl = (file) => `${base}/storage/v1/object/public/${BUCKET}/${file}`;
  const removeFile = (file) => fetch(`${base}/storage/v1/object/${BUCKET}/${file}`, { method: 'DELETE', headers }).catch(() => {});
  const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '');

  return {
    mode: 'supa',
    canWrite: async () => true,
    getProfile: async () => ({ ...structuredClone(DEFAULT_PROFILE), ...(await get('app', 'profile')) }),
    saveProfile: (p) => put('app', 'profile', p).then(() => p),
    getSettings: async () => ({ traitOptions: DEFAULT_TRAITS, ...(await get('app', 'settings')) }),
    saveSettings: (s) => put('app', 'settings', { traitOptions: s.traitOptions }).then(() => s),

    getDiary: async () => Object.fromEntries((await list('diary')).map((d) => [d.id, d.data])),
    saveDiary: async (date, text) => { const e = { text, at: new Date().toISOString() }; await put('diary', date, e); return e; },
    deleteDiary: (date) => del('diary', date),

    listPhotos: async () => (await list('photos'))
      .map((d) => ({ ...d.data, id: d.id, src: fileUrl(d.data.file), downloadUrl: `${fileUrl(d.data.file)}?download=${encodeURIComponent(d.data.name || 'photo.jpg')}` }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    uploadPhoto: async (file, caption = '', extra = {}) => {
      if (!tok()) throw fail('입장 비밀번호를 먼저 입력해 주세요', 401);
      const img = await normalizeImage(file);
      const id = newId();
      const name = `${crypto.randomUUID ? crypto.randomUUID() : randomSalt() + randomSalt()}${extOf(img.type)}`;
      const r = await fetch(`${base}/storage/v1/object/${BUCKET}/${name}`, {
        method: 'POST', headers: { ...headers, 'content-type': img.type, 'x-upsert': 'false' }, body: img,
      }).catch(() => null);
      if (!r || !r.ok) throw fail(r?.status === 413 ? '사진이 너무 커요 (최대 20MB)' : '사진을 올리지 못했어요. 다시 해 주세요.');
      const meta = { file: name, name: img.name || `photo${extOf(img.type)}`, caption, type: img.type, size: img.size, uploadedAt: new Date().toISOString(), ...photoExtra(extra) };
      try { await put('photos', id, meta); } catch (e) { removeFile(name); throw e; }
      return { ...meta, id };
    },
    deletePhoto: async (id) => {
      const p = await get('photos', id);
      await del('photos', id);
      if (p?.file) await removeFile(p.file);
    },
    downloadPhoto: null,
    saveFile: null,

    getPlaces: async () => (await list('places')).map((d) => ({ ...d.data, id: d.id })).sort(byDateDesc),
    savePlace: async (p) => {
      const body = cleanPlace(p);
      const id = p.id || newId();
      const createdAt = p.createdAt || new Date().toISOString();
      await put('places', id, { ...body, createdAt });
      return { ...body, createdAt, id };
    },
    deletePlace: (id) => del('places', id),

    getStamps: async () => Object.fromEntries((await list('stamps')).map((d) => [d.id, d.data])),
    setStamp: (date, on) => (on ? put('stamps', date, { at: new Date().toISOString() }) : del('stamps', date)),

    // 입장 비밀번호: 모두가 같은 4자리를 써요 (Supabase 에 암호화해서 저장)
    lockState: async (token) => {
      const st = await rpc('mm_status');
      if (!st.pin_set) return { set: false };
      if (token && (await rpc('mm_check', { p_token: token }))) { userTok = token; return { set: true, remembered: true }; }
      return { set: true, remembered: false };
    },
    setPin: async (pin) => { userTok = await rpc('mm_set_pin', { p_pin: pin }); return userTok; },
    unlock: async (pin) => {
      const t = await rpc('mm_unlock', { p_pin: pin });
      if (t) userTok = t;
      return t || null;
    },
    canResetOwnPin: false,
    resetPin: () => rpc('mm_reset_pin', { p_token: adminKey() }),

    wipe: async (kinds = WIPE_KINDS) => {
      if (kinds.includes('photos')) for (const d of await list('photos')) if (d.data.file) await removeFile(d.data.file);
      await rpc('mm_wipe', { p_token: adminKey(), p_colls: kinds });
    },

    // 관리자: 처음 로그인할 때 쓴 비밀번호가 관리자 비밀번호가 돼요
    usesPassword: true,
    isAdmin: async () => !!adminKey() && (await rpc('mm_check', { p_token: adminKey() }).catch(() => null)) === 'admin',
    login: async (pw) => {
      const t = await rpc('mm_admin_login', { p_pw: pw });
      if (!t) throw fail('비밀번호가 틀렸어요', 401);
      setAdminKey(t);
      return true;
    },
    logout: () => setAdminKey(''),
    changePassword: (next) => rpc('mm_admin_password', { p_token: adminKey(), p_new: next }),
    adminReset: {
      how: 'help',
      help: 'Supabase 대시보드 → SQL Editor 에서  delete from mm_secret where k = \'admin\';  을 실행한 뒤, 이 화면에서 새 비밀번호로 로그인하면 그게 새 관리자 비밀번호가 돼요.',
    },
    exportAll: async () => {
      const [profile, settings, diary, stamps, places, photos] = await Promise.all([
        get('app', 'profile'), get('app', 'settings'), list('diary'), list('stamps'), list('places'), list('photos')]);
      const obj = (arr) => Object.fromEntries(arr.map((d) => [d.id, d.data]));
      return { profile, traitOptions: settings?.traitOptions || DEFAULT_TRAITS, diary: obj(diary), stamps: obj(stamps), places: places.map((d) => ({ id: d.id, ...d.data })), photos: photos.map((d) => ({ id: d.id, ...d.data, url: fileUrl(d.data.file) })) };
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
    canWrite: async () => true,
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
    adminReset: {
      how: 'help',
      help: '서버를 RESET_PASSWORD=1 ADMIN_PASSWORD=새비밀번호 npm start 로 한 번 다시 켜면 새 비밀번호로 바뀌어요.',
    },
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
    canWrite: async () => true,
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
    // 이 브라우저에만 저장하는 방식: 데이터가 이 기기에만 있으니 입장 비밀번호를 아는 사람이 주인이에요
    adminReset: {
      how: 'pin',
      help: '입장 비밀번호 4자리를 넣으면 새 관리자 비밀번호를 정할 수 있어요.',
      run: async (pin, next) => {
        if (String(next || '').length < 4) throw fail('새 비밀번호는 4자 이상이어야 해요');
        const l = await kvGet('lock', null);
        if (!l) throw fail('아직 입장 비밀번호가 없어요. 처음 비밀번호는 meongmung 이에요.');
        if ((await sha256(`${l.salt}:${pin}`)) !== l.hash) throw fail('입장 비밀번호가 달라요', 401);
        await kvSet('adminPassword', next);
        setAdminKey(next);
      },
    },
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

export const store = (await cloudBackend()) || supaBackend() || (await serverBackend()) || localBackend();
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
