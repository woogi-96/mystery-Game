// 📍 함께 다녀온 곳: 날짜 · 장소 이름 · 동네/주소 · 종류 · 한 줄 추억 · 그날 사진
import { store, dateKey, escapeHtml, toast } from './store.js';
import { ensureOwner } from './owner.js';

export const CATEGORIES = [
  { id: 'cafe', icon: '☕', name: '카페' },
  { id: 'food', icon: '🍽️', name: '맛집' },
  { id: 'walk', icon: '🌳', name: '산책' },
  { id: 'play', icon: '🎡', name: '놀거리' },
  { id: 'show', icon: '🎬', name: '영화·공연' },
  { id: 'shop', icon: '🛍️', name: '쇼핑' },
  { id: 'trip', icon: '✈️', name: '여행' },
  { id: 'etc', icon: '💗', name: '기타' },
];
const cat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
const $ = (s, el = document) => el.querySelector(s);
const fmt = (k) => new Date(`${k}T00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

/** 지도 앱에서 바로 찾아보는 링크 (지도 그림은 페이지 안에 못 띄워서 링크로 열어요) */
export function mapLinks(p) {
  const q = encodeURIComponent([p.area, p.name].filter(Boolean).join(' '));
  return `<span class="map-links">
    <a href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener">네이버지도</a>
    <a href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">카카오맵</a>
  </span>`;
}

/** 장소 카드 (목록과 달력 아래에서 같이 써요) */
export function placeCard(p, photos = [], { compact = false, editable = false } = {}) {
  const c = cat(p.category);
  const thumbs = photos.map((ph) => `<button type="button" class="thumb" data-photo="${escapeHtml(ph.id)}" aria-label="사진 크게 보기"><img src="${ph.src}" alt="" loading="lazy" /></button>`).join('');
  return `<article class="place-card ${compact ? 'compact' : ''}" data-place="${escapeHtml(p.id)}">
    <div class="pc-head">
      <span class="pc-icon" title="${c.name}">${c.icon}</span>
      <div class="pc-title">
        <b>${escapeHtml(p.name)}</b>
        <span class="pc-meta">${compact ? '' : `${fmt(p.date)} · `}${c.name}${p.area ? ` · ${escapeHtml(p.area)}` : ''}</span>
      </div>
      ${editable ? `<button type="button" class="btn sm" data-edit="${escapeHtml(p.id)}">수정</button>` : ''}
    </div>
    ${p.memo ? `<p class="pc-memo">${escapeHtml(p.memo)}</p>` : ''}
    ${thumbs ? `<div class="pc-photos">${thumbs}</div>` : ''}
    ${mapLinks(p)}
  </article>`;
}

/** 사진이 어느 날 것인지: 찍은 날(또는 장소 날짜)을 우선, 없으면 올린 날 */
export const photoDay = (ph, placesById = {}) => ph.date || placesById[ph.placeId]?.date || dateKey(new Date(ph.uploadedAt));

let places = [];
let photos = [];
let editing = null;
let pendingFiles = [];
let category = 'cafe';
let opts = {};

export async function initPlaces(o) {
  opts = o; // { openPhoto(photo), onChange() }
  $('#placeCats').innerHTML = CATEGORIES.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === category}">${c.icon} ${c.name}</button>`).join('');
  $('#placeCats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    category = b.dataset.cat;
    $('#placeCats').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#placeDate').value = dateKey();
  $('#placeDate').max = dateKey();

  const setFiles = (files) => {
    pendingFiles = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    $('#placeDropText').textContent = pendingFiles.length ? `사진 ${pendingFiles.length}장 선택됨` : '그날 사진 추가하기 (선택)';
    const pv = $('#placePreviews');
    pv.querySelectorAll('img').forEach((i) => URL.revokeObjectURL(i.src));
    pv.innerHTML = '';
    pendingFiles.slice(0, 12).forEach((f) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = '';
      pv.appendChild(img);
    });
  };
  $('#placeFiles').addEventListener('change', (e) => setFiles(e.target.files));

  $('#placeCancel').addEventListener('click', () => resetForm(setFiles));
  $('#placeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#placeSave');
    btn.disabled = true;
    try {
      const saved = await store.savePlace({
        id: editing?.id, createdAt: editing?.createdAt,
        date: $('#placeDate').value, name: $('#placeName').value, area: $('#placeArea').value,
        category, memo: $('#placeMemo').value,
      });
      let ok = 0;
      for (const [i, f] of pendingFiles.entries()) {
        btn.textContent = `사진 올리는 중… ${i + 1}/${pendingFiles.length}`;
        try { await store.uploadPhoto(f, saved.name, { date: saved.date, placeId: saved.id, by: await ensureOwner() }); ok++; } catch (err) { toast(err.message, 'err'); }
      }
      toast(editing ? '추억 장소를 고쳤어요 ✏️' : `📍 ${saved.name}을(를) 추억 지도에 남겼어요${ok ? ` (사진 ${ok}장)` : ''}`);
      resetForm(setFiles);
      await render();
      opts.onChange?.();
    } catch (err) { toast(err.message || '저장하지 못했어요', 'err'); } finally {
      btn.disabled = false;
      btn.textContent = editing ? '수정 저장' : '📍 추억 장소 저장';
    }
  });

  $('#placeList').addEventListener('click', (e) => {
    const ph = e.target.closest('[data-photo]');
    if (ph) { opts.openPhoto?.(photos.find((x) => x.id === ph.dataset.photo)); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) startEdit(places.find((p) => p.id === ed.dataset.edit));
  });
  $('#areaChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-area]');
    if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    $('#areaChips').querySelectorAll('[data-area]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', on);
    renderList(on ? b.dataset.area : null);
  });

  await render();
}

function resetForm(setFiles) {
  editing = null;
  $('#placeForm').reset();
  $('#placeDate').value = dateKey();
  $('#placeFormTitle').textContent = '함께 다녀온 곳 남기기';
  $('#placeSave').textContent = '📍 추억 장소 저장';
  $('#placeCancel').hidden = true;
  setFiles([]);
}

function startEdit(p) {
  if (!p) return;
  editing = p;
  $('#placeDate').value = p.date;
  $('#placeName').value = p.name;
  $('#placeArea').value = p.area || '';
  $('#placeMemo').value = p.memo || '';
  category = p.category || 'etc';
  $('#placeCats').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x.dataset.cat === category));
  $('#placeFormTitle').textContent = `“${p.name}” 고치기`;
  $('#placeSave').textContent = '수정 저장';
  $('#placeCancel').hidden = false;
  $('#placeForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// “서울 성동구 성수동” → “성수동”처럼 마지막 동네 이름으로 묶어요
const areaKey = (a = '') => a.trim().split(/\s+/).filter(Boolean).pop() || '';

export async function render() {
  [places, photos] = await Promise.all([store.getPlaces(), store.listPhotos()]);
  const groups = {};
  for (const p of places) {
    const k = areaKey(p.area);
    if (k) groups[k] = (groups[k] || 0) + 1;
  }
  const areas = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  $('#mapSummary').textContent = places.length
    ? `지금까지 ${places.length}곳을 함께 다녀왔어요${areas.length ? ` · ${areas.length}개 동네` : ''}. 동네를 누르면 그곳만 모아 봐요.`
    : '아직 남긴 곳이 없어요. 위에서 첫 추억 장소를 남겨 볼까요?';
  $('#areaChips').innerHTML = areas.map(([k, n]) => `<button type="button" class="chip" data-area="${escapeHtml(k)}" aria-pressed="false">📍 ${escapeHtml(k)} <b>${n}</b></button>`).join('');
  renderList(null);
}

function renderList(area) {
  const list = area ? places.filter((p) => areaKey(p.area) === area) : places;
  $('#placeList').innerHTML = list.length
    ? list.map((p) => placeCard(p, photos.filter((ph) => ph.placeId === p.id), { editable: true })).join('')
    : '';
}
