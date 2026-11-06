// 휴대폰(기기) 시간으로 아침 / 점심 / 저녁 인사
//   아침 05:00~10:59 · 점심 11:00~16:59 · 저녁 17:00~04:59
// 테스트용: 주소 뒤에 ?time=morning | noon | evening

export const GREETINGS = {
  morning: { label: '아침', icon: '☀️', line: '굿모닝!', sub: '멍뭉이의 하루를 기분 좋게 시작해 봐요' },
  noon: { label: '점심', icon: '🍚', line: '밥을 먹고 산책을 나가봐요', sub: '맛있게 먹고 햇살 맞으며 한 바퀴!' },
  evening: { label: '저녁', icon: '🌙', line: '멍뭉 오늘 하루도 수고했어요', sub: '푹 쉬고 오늘의 한 줄 일기도 남겨 봐요' },
};

export function timePhase(date = new Date()) {
  const forced = new URLSearchParams(location.search).get('time');
  if (forced && GREETINGS[forced]) return forced;
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'noon';
  return 'evening';
}
