// 🗓️ 우기 스케줄: 스케줄 캡처(사진)를 올리면 글자를 읽어서 날짜별로 자동으로 채워요
// - 글자 읽기(OCR)는 Tesseract.js 로 이 휴대폰 안에서 해요 (사진이 다른 곳으로 가지 않아요)
// - 달력 모양 캡처: 날짜 숫자 아래에 있는 글자를 그 날짜의 스케줄로
// - 목록 모양 캡처: “11/7 오픈 9:00”, “11월 7일 …”, “7일 …” 처럼 날짜로 시작하는 줄
// - 읽은 결과는 저장하기 전에 직접 확인하고 고칠 수 있어요

const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const WEEKDAYS = new Set(['일', '월', '화', '수', '목', '금', '토', '일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일',
  'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (y, m, d) => {
  const dt = new Date(y, m - 1, d); // 월이 0 이나 13 이어도 알아서 앞뒤 해로 넘어가요
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

let tessPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tessPromise) {
    tessPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT;
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => { tessPromise = null; reject(new Error('글자 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(s);
    });
  }
  return tessPromise;
}

/** 캡처 사진의 글자를 읽어요. onProgress(0~1, 안내 문구) */
export async function readImage(file, onProgress = () => {}) {
  onProgress(0.02, '글자 읽기 도구를 준비하고 있어요…');
  const T = await loadTesseract();
  const worker = await T.createWorker(['kor', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(0.3 + m.progress * 0.7, `글자를 읽고 있어요… ${Math.round(m.progress * 100)}%`);
      else if (/load|initializ/i.test(m.status)) onProgress(0.05 + (m.progress || 0) * 0.25, '처음 한 번은 한글 사전을 받느라 조금 걸려요…');
    },
  });
  try {
    const { data } = await worker.recognize(file);
    let words = data.words;
    if (!words?.length && data.blocks) {
      words = data.blocks.flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
    }
    const lines = data.lines?.length ? data.lines.map((l) => l.text) : (data.text || '').split('\n');
    return {
      text: data.text || '',
      lines: lines.map((t) => t.trim()).filter(Boolean),
      words: (words || []).map((w) => ({ text: w.text.trim(), conf: w.confidence, ...w.bbox })).filter((w) => w.text),
    };
  } finally {
    await worker.terminate();
  }
}

/** 캡처에 적힌 연도·월 찾기 (예: 2026.11 / 2026년 11월 / 11월) */
export function detectMonth(text, fallback) {
  const a = text.match(/(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*월?/);
  if (a && +a[2] >= 1 && +a[2] <= 12) return { year: +a[1], month: +a[2] };
  const b = text.match(/(?:^|[^\d])(\d{1,2})\s*월/);
  if (b && +b[1] >= 1 && +b[1] <= 12) return { year: fallback.year, month: +b[1] };
  return fallback;
}

const clean = (t) => t
  .replace(/[|_~`'"“”‘’<>[\]{}]+/g, ' ')
  .replace(/\s*([-~–])\s*/g, '$1')      // 10:00- 19:00 → 10:00-19:00
  .replace(/\s+/g, ' ')
  .replace(/^[\s.,·:;]+|[\s.,·:;]+$/g, '') // 마감. → 마감
  .trim();

/** 달력 모양: 날짜 숫자 아래에 있는 글자를 그 날짜로 */
function parseGrid(words, { year, month }) {
  const cx = (w) => (w.x0 + w.x1) / 2;
  const cy = (w) => (w.y0 + w.y1) / 2;
  const isDay = (w) => /^\d{1,2}$/.test(w.text) && +w.text >= 1 && +w.text <= 31;
  const days = words.filter(isDay);
  if (days.length < 5) return [];
  const hs = days.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const h = hs[Math.floor(hs.length / 2)] || 12;

  // 같은 줄(행)끼리 묶기
  const sorted = [...days].sort((a, b) => cy(a) - cy(b));
  const rows = [];
  for (const w of sorted) {
    const row = rows.find((r) => Math.abs(r.y - cy(w)) < h * 0.8);
    if (row) { row.items.push(w); row.y = (row.y * (row.items.length - 1) + cy(w)) / row.items.length; } else rows.push({ y: cy(w), items: [w] });
  }
  const gridRows = rows.filter((r) => r.items.length >= 2);
  if (gridRows.length < 1) return [];
  const cells = [];
  for (const r of gridRows) {
    r.items.sort((a, b) => cx(a) - cx(b));
    r.items.forEach((w, i) => {
      const prev = r.items[i - 1];
      const next = r.items[i + 1];
      const half = next ? (cx(next) - cx(w)) / 2 : prev ? (cx(w) - cx(prev)) / 2 : (w.x1 - w.x0) * 3;
      cells.push({ w, n: +w.text, left: prev ? (cx(prev) + cx(w)) / 2 : cx(w) - half, right: next ? (cx(w) + cx(next)) / 2 : cx(w) + half, y: cy(w), texts: [] });
    });
  }
  // 날짜가 하나뿐인 행(예: 앞 달 날짜가 흐려서 안 읽힌 첫 주의 “1”)은
  // 다른 행의 칸 위치와 맞을 때만 달력 칸으로 써요 (시간 숫자 같은 건 빼고)
  const cols = [];
  for (const c of cells) {
    const x = cx(c.w);
    const col = cols.find((k) => Math.abs(k.x - x) < h * 1.5);
    if (col) { col.left = Math.min(col.left, c.left); col.right = Math.max(col.right, c.right); } else cols.push({ x, left: c.left, right: c.right });
  }
  for (const r of rows.filter((r) => r.items.length === 1)) {
    const w = r.items[0];
    const col = cols.find((k) => Math.abs(k.x - cx(w)) < h * 1.5);
    if (col && Math.abs(r.y - gridRows[0].y) < h * 30) cells.push({ w, n: +w.text, left: col.left, right: col.right, y: cy(w), texts: [] });
  }
  // 날짜(월) 매기기: 앞뒤 달 날짜가 섞여 있어도 순서대로
  const order = [...cells].sort((a, b) => (Math.abs(a.y - b.y) < h * 0.8 ? a.left - b.left : a.y - b.y));
  let m = order[0].n > 7 && order.some((c) => c.n === 1) ? month - 1 : month;
  let prev = 0;
  for (const c of order) {
    if (prev && c.n < prev - 7) m++;
    prev = c.n;
    c.date = ymd(year, m, c.n);
  }
  // 나머지 글자를 “위에 있는 가장 가까운 날짜 칸”에 넣기
  const daySet = new Set(cells.map((c) => c.w));
  for (const w of words) {
    if (daySet.has(w) || WEEKDAYS.has(w.text.replace(/[().]/g, '').toUpperCase()) || WEEKDAYS.has(w.text.replace(/[().]/g, ''))) continue;
    const x = cx(w);
    const y = cy(w);
    let best = null;
    for (const c of cells) {
      if (x < c.left || x > c.right || y < c.y - h * 0.4) continue;
      if (!best || c.y > best.y) best = c;
    }
    if (best && y - best.y < h * 12) best.texts.push(w);
  }
  return cells
    .map((c) => {
      const t = c.texts.sort((a, b) => (Math.abs(cy(a) - cy(b)) < h * 0.6 ? a.x0 - b.x0 : cy(a) - cy(b))).map((w) => w.text).join(' ');
      return { date: c.date, text: clean(t) };
    })
    .filter((e) => e.text);
}

/** 목록 모양: 날짜로 시작하는 줄 */
function parseLines(lines, { year, month }) {
  const out = [];
  const wd = '(?:\\(?\\s*[월화수목금토일](?:요일)?\\s*\\)?)?';
  const pats = [
    { re: new RegExp(`(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일?\\s*${wd}\\s*[:\\-–]?\\s*(.+)`), m: 1, d: 2, t: 3 },
    { re: new RegExp(`(\\d{1,2})\\s*[./]\\s*(\\d{1,2})\\.?\\s*${wd}\\s*[:\\-–]?\\s*(.+)`), m: 1, d: 2, t: 3 },
    { re: new RegExp(`^(\\d{1,2})\\s*일\\s*${wd}\\s*[:\\-–]?\\s*(.+)`), d: 1, t: 2 },
  ];
  for (const raw of lines) {
    const line = raw.trim();
    for (const p of pats) {
      const g = line.match(p.re);
      if (!g) continue;
      const mm = p.m ? +g[p.m] : month;
      const dd = +g[p.d];
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
      // 시간(예: 9.30) 을 날짜로 잘못 읽지 않게: 두 번째 패턴은 줄 맨 앞에 있을 때만
      if (p === pats[1] && line.indexOf(g[0]) > 2) continue;
      const text = clean(g[p.t]);
      if (text) out.push({ date: ymd(mm < month - 6 ? year + 1 : mm > month + 6 ? year - 1 : year, mm, dd), text });
      break;
    }
  }
  return out;
}

/** 읽은 글자 → [{date, text}] (같은 날짜는 합쳐요) */
export function parseSchedule(ocr, ym) {
  const grid = parseGrid(ocr.words || [], ym);
  const list = parseLines(ocr.lines || [], ym);
  const pick = list.length > grid.length ? list : grid;
  const map = new Map();
  for (const e of pick) map.set(e.date, map.has(e.date) ? `${map.get(e.date)} / ${e.text}` : e.text);
  return [...map].map(([date, text]) => ({ date, text })).sort((a, b) => a.date.localeCompare(b.date));
}
