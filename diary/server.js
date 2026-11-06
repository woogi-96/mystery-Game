// 멍뭉일지 서버 (외부 패키지 없이 Node.js 만으로 동작)
//   node server.js            → http://localhost:3000
//   PORT=8080 ADMIN_PASSWORD=비밀번호 node server.js
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROFILE, DEFAULT_TRAITS } from './js/defaults.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const DB_FILE = path.join(DATA, 'db.json');
const PORT = Number(process.env.PORT) || 3000;
const MAX_PHOTO = 20 * 1024 * 1024;
const MAX_JSON = 256 * 1024;

fs.mkdirSync(UPLOADS, { recursive: true });

/* ---------- DB ---------- */
let db;
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch {
  db = {};
}
db.profile ??= structuredClone(DEFAULT_PROFILE);
db.traitOptions ??= [...DEFAULT_TRAITS];
db.diary ??= {};
db.photos ??= [];
db.adminPassword ??= process.env.ADMIN_PASSWORD || 'meongmung';
if (process.env.ADMIN_PASSWORD && process.env.RESET_PASSWORD === '1') db.adminPassword = process.env.ADMIN_PASSWORD;

let saving = Promise.resolve();
function save() {
  saving = saving.then(async () => {
    const tmp = `${DB_FILE}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(db, null, 2));
    await fsp.rename(tmp, DB_FILE);
  }).catch((e) => console.error('저장 실패', e));
  return saving;
}
save();

/* ---------- 유틸 ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif', '.bmp': 'image/bmp',
};
const EXT = Object.fromEntries(Object.entries(MIME).filter(([, v]) => v.startsWith('image/')).map(([k, v]) => [v, k]));

class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}
function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, '파일이 너무 커요 (최대 20MB)')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req, MAX_JSON);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new HttpError(400, '잘못된 요청이에요'); }
}
function isAdmin(req) {
  let key = '';
  try { key = decodeURIComponent(req.headers['x-admin-key'] || ''); } catch { /* 무시 */ }
  const a = crypto.createHash('sha256').update(key).digest();
  const b = crypto.createHash('sha256').update(db.adminPassword).digest();
  return key.length > 0 && crypto.timingSafeEqual(a, b);
}
function requireAdmin(req) {
  if (!isAdmin(req)) throw new HttpError(401, '관리자 로그인이 필요해요');
}
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function checkDate(d) {
  if (!DATE_RE.test(d)) throw new HttpError(400, '날짜 형식이 올바르지 않아요');
  return d;
}
const newId = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

/* ---------- API ---------- */
async function handleApi(req, res, parts) {
  const [resource, id, sub] = parts;
  const m = req.method;

  if (resource === 'ping') return send(res, 200, { ok: true });

  if (resource === 'profile') {
    if (m === 'GET') return send(res, 200, db.profile);
    if (m === 'PUT') {
      const p = await readJson(req);
      db.profile = {
        name: str(p.name, 20) || '멍뭉', age: str(p.age, 20), charm: str(p.charm, 40), oneLiner: str(p.oneLiner, 60),
        traits: Array.isArray(p.traits) ? p.traits.slice(0, 60).map((t) => str(t, 30)).filter(Boolean) : [],
        updatedAt: new Date().toISOString(),
      };
      await save();
      return send(res, 200, db.profile);
    }
  }

  if (resource === 'settings') {
    if (m === 'GET') return send(res, 200, { traitOptions: db.traitOptions });
    if (m === 'PUT') {
      requireAdmin(req);
      const s = await readJson(req);
      if (!Array.isArray(s.traitOptions)) throw new HttpError(400, '특징 목록이 필요해요');
      db.traitOptions = [...new Set(s.traitOptions.map((t) => str(t, 30)).filter(Boolean))].slice(0, 100);
      await save();
      return send(res, 200, { traitOptions: db.traitOptions });
    }
  }

  if (resource === 'diary') {
    if (m === 'GET' && !id) return send(res, 200, db.diary);
    if (m === 'PUT' && id) {
      checkDate(id);
      const { text } = await readJson(req);
      const t = str(text, 80);
      if (!t) throw new HttpError(400, '일기 내용을 써 주세요');
      db.diary[id] = { text: t, at: new Date().toISOString() };
      await save();
      return send(res, 200, db.diary[id]);
    }
    if (m === 'DELETE' && id) {
      requireAdmin(req);
      delete db.diary[checkDate(id)];
      await save();
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'photos') {
    if (m === 'GET' && !id) return send(res, 200, db.photos);
    if (m === 'POST' && !id) {
      const type = String(req.headers['content-type'] || '').split(';')[0].trim();
      if (!type.startsWith('image/')) throw new HttpError(400, '사진 파일만 올릴 수 있어요');
      const buf = await readBody(req, MAX_PHOTO);
      if (!buf.length) throw new HttpError(400, '빈 파일이에요');
      let name = 'photo.jpg';
      let caption = '';
      try { name = decodeURIComponent(req.headers['x-file-name'] || name); } catch { /* 무시 */ }
      try { caption = decodeURIComponent(req.headers['x-caption'] || ''); } catch { /* 무시 */ }
      const pid = newId();
      const file = pid + (EXT[type] || path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.img');
      await fsp.writeFile(path.join(UPLOADS, file), buf);
      const meta = { id: pid, file, name: str(path.basename(name), 120) || 'photo.jpg', caption: str(caption, 60), type, size: buf.length, uploadedAt: new Date().toISOString() };
      db.photos.unshift(meta);
      await save();
      return send(res, 201, meta);
    }
    const photo = id && db.photos.find((p) => p.id === id);
    if (id && !photo) throw new HttpError(404, '사진을 찾을 수 없어요');
    if (m === 'GET' && sub === 'file') {
      const url = new URL(req.url, 'http://x');
      const headers = { 'content-type': photo.type || 'application/octet-stream', 'cache-control': 'private, max-age=86400' };
      if (url.searchParams.get('download')) {
        headers['content-disposition'] = `attachment; filename="photo${path.extname(photo.file)}"; filename*=UTF-8''${encodeURIComponent(photo.name)}`;
      }
      const fp = path.join(UPLOADS, photo.file);
      try {
        const st = await fsp.stat(fp);
        headers['content-length'] = st.size;
      } catch { throw new HttpError(404, '사진 파일이 없어요'); }
      res.writeHead(200, headers);
      fs.createReadStream(fp).pipe(res);
      return;
    }
    if (m === 'DELETE' && id) {
      requireAdmin(req);
      db.photos = db.photos.filter((p) => p.id !== id);
      await fsp.rm(path.join(UPLOADS, photo.file), { force: true });
      await save();
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'admin') {
    requireAdmin(req);
    if (id === 'check' && m === 'POST') return send(res, 200, { ok: true });
    if (id === 'password' && m === 'PUT') {
      const { password } = await readJson(req);
      const p = String(password || '');
      if (p.length < 4) throw new HttpError(400, '비밀번호는 4자 이상이어야 해요');
      db.adminPassword = p;
      await save();
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'export' && m === 'GET') {
    requireAdmin(req);
    const { adminPassword, ...rest } = db;
    return send(res, 200, rest);
  }

  throw new HttpError(404, '없는 주소예요');
}

/* ---------- 정적 파일 ---------- */
const PUBLIC = new Set(['index.html', 'admin.html']);
const PUBLIC_DIRS = ['css', 'js', 'assets'];

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const top = rel.split('/')[0];
  if (!(PUBLIC.has(rel) || PUBLIC_DIRS.includes(top)) || rel.includes('..')) throw new HttpError(404, 'Not found');
  const fp = path.join(ROOT, rel);
  let st;
  try { st = await fsp.stat(fp); } catch { throw new HttpError(404, 'Not found'); }
  if (!st.isFile()) throw new HttpError(404, 'Not found');
  res.writeHead(200, {
    'content-type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
    'content-length': st.size,
    'cache-control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(fp).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname.slice(5).split('/').filter(Boolean));
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res, pathname);
    } else {
      throw new HttpError(405, '허용되지 않는 요청이에요');
    }
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: status === 500 ? '서버 오류가 났어요' : e.message });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🐾 멍뭉일지: http://localhost:${PORT}`);
  console.log(`   관리자: http://localhost:${PORT}/admin.html`);
});
