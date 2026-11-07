// 🗓️ 우기 스케줄: 스케줄 캡처(사진)를 올리면 글자를 읽어서 날짜별로 자동으로 채워요
// - 글자 읽기(OCR)는 Tesseract.js 로 이 휴대폰 안에서 해요 (사진이 다른 곳으로 가지 않아요)
// - 날짜 · 출근 시간 · 퇴근 시간이 적힌 표에서, 세 가지가 다 있는 행만 달력에 넣어요
// - 읽은 결과는 저장하기 전에 직접 확인하고 고칠 수 있어요

const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

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


/* ---------- 출근·퇴근 시간표만 읽기 ----------
   한 줄(표의 한 행)에 “날짜”와 “시간 두 개(출근, 퇴근)”가 같이 있는 것만 스케줄로 써요.
   제목, 메모, 시간이 없는 줄(휴무 등)은 모두 건너뛰어요. */

// 표의 행: 글자들을 높이(y)로 묶어서 왼쪽→오른쪽으로 이어 붙여요 (넓은 표도 한 줄로)
function tableRows(ocr) {
  const words = (ocr.words || []).filter((w) => w.text);
  if (!words.length) return (ocr.lines || []).map((t) => t.trim()).filter(Boolean);
  const cy = (w) => (w.y0 + w.y1) / 2;
  const hs = words.map((w) => w.y1 - w.y0).sort((x, y) => x - y);
  const h = hs[Math.floor(hs.length / 2)] || 12;
  const rows = [];
  for (const w of [...words].sort((x, y) => cy(x) - cy(y))) {
    const r = rows.find((row) => Math.abs(row.y - cy(w)) < h * 0.6);
    if (r) { r.items.push(w); r.y = (r.y * (r.items.length - 1) + cy(w)) / r.items.length; } else rows.push({ y: cy(w), items: [w] });
  }
  return rows.map((r) => r.items.sort((x, y) => x.x0 - y.x0).map((w) => w.text).join(' '));
}

const DATE_PATTERNS = [
  { re: /(20\d{2})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/, y: 1, m: 2, d: 3 }, // 2026-11-07, 2026.11.07, 2026년 11월 7일
  { re: /(\d{1,2})\s*월\s*(\d{1,2})\s*일?/, m: 1, d: 2 },                                   // 11월 7일
  { re: /(?<![\d:])(\d{1,2})\s*[/.-]\s*(\d{1,2})(?![\d:])(?!\s*[:시])/, m: 1, d: 2 },        // 11/7, 11.07, 11-07
  { re: /^\s*(\d{1,2})\s*(?:일|\(\s*[월화수목금토일]\s*\)|[월화수목금토일]요일)/, d: 1 },        // 7일, 7(금)
];
const WEEKDAY = /\(?\s*[월화수목금토일](?:요일)?\s*\)?/;

function findDate(text, { year, month }) {
  let best = null;
  for (const p of DATE_PATTERNS) {
    const g = text.match(p.re);
    if (!g) continue;
    if (!best || g.index < best.g.index) best = { p, g };
  }
  if (!best) return null;
  const { p, g } = best;
  const mm = p.m ? +g[p.m] : month;
  const dd = +g[p.d];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const yy = p.y ? +g[p.y] : (mm < month - 6 ? year + 1 : mm > month + 6 ? year - 1 : year);
  let rest = text.slice(0, g.index) + ' ' + text.slice(g.index + g[0].length);
  rest = rest.replace(WEEKDAY, ' ');
  return { date: ymd(yy, mm, dd), rest };
}

// 시간들: 09:00, 9:00, 18.00, 0900, 오후 6:00, 9시, 9시 30분
function findTimes(text) {
  const out = [];
  const re = /(오전|오후|AM|PM|am|pm)?\s*(\d{1,2})\s*[:：.]\s*(\d{2})(?!\d)|(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?(?!간)|(?<![\d:.])([01]\d|2[0-3])([0-5]\d)(?![\d:])/g;
  let g;
  while ((g = re.exec(text))) {
    let ap; let hh; let mi;
    if (g[2] !== undefined) { ap = g[1]; hh = +g[2]; mi = +g[3]; } else if (g[5] !== undefined) { ap = g[4]; hh = +g[5]; mi = +(g[6] || 0); } else { hh = +g[7]; mi = +g[8]; }
    if (/오후|pm/i.test(ap || '') && hh < 12) hh += 12;
    if (/오전|am/i.test(ap || '') && hh === 12) hh = 0;
    if (hh > 24 || mi > 59) continue;
    out.push(`${String(hh % 24).padStart(2, '0')}:${String(mi).padStart(2, '0')}`);
  }
  return out;
}

/** 읽은 글자 → [{date, start, end, text: ''}] : 날짜 + 출근 시간 + 퇴근 시간이 있는 행만 */
export function parseSchedule(ocr, ym) {
  const map = new Map();
  for (const row of tableRows(ocr)) {
    const d = findDate(row, ym);
    if (!d) continue;
    const times = findTimes(d.rest);
    if (times.length < 2) continue; // 출근·퇴근 시간이 둘 다 있어야 표의 행으로 봐요
    if (!map.has(d.date)) map.set(d.date, { date: d.date, text: '', start: times[0], end: times[1] });
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** “오픈 09:00-18:00”, “마감 오후 1시~10시” → { label: '오픈', start: '09:00', end: '18:00' } */
export function splitTime(text = '') {
  const T = '(오전|오후|AM|PM|am|pm)?\\s*(\\d{1,2})\\s*(?:[:시.]\\s*(\\d{2})?\\s*분?)';
  // si: “2시”처럼 ‘시’로 쓴 시간. 오전/오후 없이 1~6시면 보통 오후라서 오후로 봐요
  const norm = (ap, h, m, si = false) => {
    let hh = +h;
    if (/오후|pm/i.test(ap || '') && hh < 12) hh += 12;
    if (!ap && si && hh >= 1 && hh <= 6) hh += 12;
    if (/오전|am/i.test(ap || '') && hh === 12) hh = 0;
    if (hh > 24) return null;
    return `${String(hh).padStart(2, '0')}:${String(+(m || 0)).padStart(2, '0')}`;
  };
  const range = text.match(new RegExp(`${T}\\s*[-~–]\\s*${T.replace('?\\s*(\\d{1,2})', '?\\s*(\\d{1,2})')}?`));
  let start = null;
  let end = null;
  let rest = text;
  if (range) {
    start = norm(range[1], range[2], range[3], /\d\s*시/.test(range[0].split(/[-~–]/)[0]));
    end = range[5] ? norm(range[4] || (/오후|pm/i.test(range[1] || '') ? range[1] : ''), range[5], range[6]) : null;
    // “오후 1시~10시”: 끝 시간이 시작보다 이르면 오후로
    if (start && end && end < start && +end.slice(0, 2) < 12) end = `${String(+end.slice(0, 2) + 12).padStart(2, '0')}${end.slice(2)}`;
    rest = text.replace(range[0], ' ');
  } else {
    const one = text.match(new RegExp(T));
    if (one && (one[3] || /시/.test(one[0]))) { start = norm(one[1], one[2], one[3], /시/.test(one[0])); rest = text.replace(one[0], ' '); }
  }
  const label = rest.replace(/\s*[-~–]\s*$/, '').replace(/\s+/g, ' ').replace(/^[\s,./:]+|[\s,./:]+$/g, '').trim();
  return { label, start, end };
}

/**
 * 지금(휴대폰 시간) 우기가 출근 중인지, 퇴근했는지
 * schedule: { 'YYYY-MM-DD': { text, start, end } }
 * → { state: 'working' | 'off' | 'before' | 'rest' | null, entry, date }
 *   밤샘 근무(끝 시간이 시작보다 이르면 다음 날 끝)도 알아봐요
 */
export function workStatus(schedule, now = new Date()) {
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const at = (date, hm) => new Date(`${date}T${hm}:00`);
  const range = (date, e) => {
    if (!e?.start || !e?.end) return null;
    const s = at(date, e.start);
    const f = at(date, e.end);
    if (f <= s) f.setDate(f.getDate() + 1);
    return [s, f];
  };
  const today = key(now);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yKey = key(y);
  // 어제 시작한 밤샘 근무가 아직 안 끝났으면 출근 중
  const yr = range(yKey, schedule[yKey]);
  if (yr && now >= yr[0] && now < yr[1]) return { state: 'working', entry: schedule[yKey], date: yKey };
  const e = schedule[today];
  if (!e) return { state: null };
  const r = range(today, e);
  if (!r) return { state: /휴무|휴일|쉬는|오프|off|OFF/.test(e.text || '') ? 'rest' : null, entry: e, date: today };
  if (now < r[0]) return { state: 'before', entry: e, date: today };
  if (now < r[1]) return { state: 'working', entry: e, date: today };
  return { state: 'off', entry: e, date: today };
}

/** 어떤 날짜의 근무가 지금(휴대폰 시간) 기준으로 출근 전 / 출근 중 / 퇴근 / 쉬는 날인지 */
export function statusAt(date, entry, now = new Date()) {
  if (!entry) return null;
  if (!entry.start || !entry.end) return /휴무|휴일|쉬는|오프|off|OFF/.test(entry.text || '') ? 'rest' : null;
  const s = new Date(`${date}T${entry.start}:00`);
  const f = new Date(`${date}T${entry.end}:00`);
  if (f <= s) f.setDate(f.getDate() + 1); // 밤샘 근무
  if (now < s) return 'before';
  if (now < f) return 'working';
  return 'off';
}
