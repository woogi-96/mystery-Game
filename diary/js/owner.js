// 이 휴대폰(기기)은 누구 거예요? — 멍뭉이 / 우기
// 댓글·사진 올린 사람 표시와, 알림을 누구에게 보낼지 정할 때 써요
import { store, askConfirm } from './store.js';

const KEY = 'mm-device-owner';
export const NAMES = { meongmung: '멍뭉이', woogi: '우기' };
export const ICONS = { meongmung: '🐶', woogi: '🐰' };

export function getOwner() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setOwner(o) {
  try { localStorage.setItem(KEY, o); } catch { /* 무시 */ }
  try { window.MeongmungApp?.setOwner?.(o); } catch { /* 예전 앱 */ }
}

/** 아직 모르면 한 번 물어봐요 (관리자로 로그인한 기기는 우기 것) */
export async function ensureOwner() {
  let o = getOwner();
  if (o) return o;
  if (await store.isAdmin().catch(() => false)) {
    setOwner('woogi');
    window.dispatchEvent(new Event('storage'));
    return 'woogi';
  }
  const isMeong = await askConfirm('이 휴대폰은 누구 거예요? 댓글과 알림에 쓰여요.', '🐶 멍뭉이 휴대폰', '🐰 우기 휴대폰', 'primary');
  o = isMeong ? 'meongmung' : 'woogi';
  setOwner(o);
  window.dispatchEvent(new Event('storage'));
  return o;
}
