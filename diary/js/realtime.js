// 사진·댓글을 올리면 상대방 앱에 “새 소식” 신호를 바로 보내요 (Supabase Realtime broadcast)
// 신호에는 내용이 없어요. 신호를 받은 앱이 입장 비밀번호 토큰으로 새 댓글·사진을 가져와서 알림을 띄워요.
import { SUPABASE } from './config.js';

export const SOCIAL_TOPIC = 'mm-social';

export function pingOthers(kind, by) {
  if (!SUPABASE?.url || !SUPABASE?.anonKey) return;
  const headers = { apikey: SUPABASE.anonKey, 'content-type': 'application/json' };
  if (!SUPABASE.anonKey.startsWith('sb_')) headers.Authorization = `Bearer ${SUPABASE.anonKey}`;
  fetch(`${SUPABASE.url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    keepalive: true,
    headers,
    body: JSON.stringify({ messages: [{ topic: SOCIAL_TOPIC, event: 'social', payload: { kind, by, at: Date.now() } }] }),
  }).catch(() => { /* 신호를 못 보내도 상대방 앱이 15분마다 확인해요 */ });
}
