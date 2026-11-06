// Supabase 연결 정보 (로그인 없이 웹브라우저로 여는 공개 사이트용)
// Supabase → Project Settings → API 에서 복사해 넣어요.
// anonKey 는 “anon public” 키예요 (원래 공개용이라 여기에 써도 괜찮아요).
// ⚠️ “service_role” 키는 절대 넣지 마세요.
// 비워 두면 server.js(서버 방식) 또는 이 브라우저 저장 방식으로 동작해요.
export const SUPABASE = {
  url: '',
  anonKey: '',
};
