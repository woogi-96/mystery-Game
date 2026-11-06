// 멍뭉 성장: 출석(한 줄 일기)할수록 밥과 간식이 쌓여요
import { dateKey } from './store.js';

export const REWARDS = {
  meal: { icon: '🍚', name: '밥', pts: 10 },      // 출석 1일
  snack: { icon: '🍪', name: '간식', pts: 5 },     // 3일 연속마다
  feast: { icon: '🍗', name: '특식', pts: 20 },    // 7일 연속마다
  photo: { icon: '🦴', name: '개껌', pts: 3 },     // 사진 1장
  profile: { icon: '🎀', name: '리본', pts: 10 },  // 소개서 완성 (특징 3개 이상)
  praise: { icon: '🍬', name: '칭찬 사탕', pts: 5 }, // 참 잘했어요 도장 1개
};

export const LEVELS = [
  { at: 0, name: '아기 멍뭉', icon: '🍼', scale: 0.62 },
  { at: 50, name: '꼬마 멍뭉', icon: '🐶', scale: 0.72 },
  { at: 150, name: '씩씩한 멍뭉', icon: '🎒', scale: 0.81 },
  { at: 300, name: '든든한 멍뭉', icon: '💪', scale: 0.89 },
  { at: 500, name: '어른 멍뭉', icon: '👔', scale: 0.95 },
  { at: 800, name: '전설의 멍뭉', icon: '👑', scale: 1 },
];

const nextDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + 1));
};

export function computeGrowth({ diary = {}, photos = [], profile = {}, stamps = {} }) {
  const feed = []; // { date, type }
  const days = Object.keys(diary).sort();
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && nextDay(prev) === d ? run + 1 : 1;
    prev = d;
    feed.push({ date: d, type: 'meal' });
    if (run % 3 === 0) feed.push({ date: d, type: 'snack', run });
    if (run % 7 === 0) feed.push({ date: d, type: 'feast', run });
  }
  for (const d of Object.keys(stamps)) if (diary[d]) feed.push({ date: d, type: 'praise' });
  for (const p of photos) feed.push({ date: dateKey(new Date(p.uploadedAt)), type: 'photo' });
  if ((profile.traits || []).length >= 3) {
    feed.push({ date: profile.updatedAt ? dateKey(new Date(profile.updatedAt)) : dateKey(), type: 'profile' });
  }
  feed.sort((a, b) => b.date.localeCompare(a.date));

  const points = feed.reduce((s, f) => s + REWARDS[f.type].pts, 0);
  let li = 0;
  while (li + 1 < LEVELS.length && points >= LEVELS[li + 1].at) li++;
  const level = LEVELS[li];
  const next = LEVELS[li + 1] || null;
  const progress = next ? (points - level.at) / (next.at - level.at) : 1;

  // 현재 연속 출석
  const today = dateKey();
  let streak = 0;
  const d = new Date();
  if (!diary[today]) d.setDate(d.getDate() - 1);
  while (diary[dateKey(d)]) { streak++; d.setDate(d.getDate() - 1); }

  const count = (type) => feed.filter((f) => f.type === type).length;
  return {
    points, level, levelIndex: li, next, progress, feed, streak,
    fedToday: !!diary[today],
    counts: { meal: count('meal'), snack: count('snack'), feast: count('feast'), photo: count('photo'), praise: count('praise') },
    toNext: next ? next.at - points : 0,
  };
}

export const TIPS = [
  { icon: '🍚', title: '매일 출석하기', text: '“오늘의 멍뭉”에 한 줄 일기를 쓰면 밥 한 그릇(+10)! 가장 기본이 되는 성장 비결이에요.' },
  { icon: '🍪', title: '3일 연속 출석', text: '3일 연속으로 출석하면 간식(+5)을 보너스로 받아요. 6일, 9일… 3일마다 계속 받아요.' },
  { icon: '🍗', title: '7일 연속 출석', text: '일주일을 빠짐없이 채우면 특식(+20)! 연속 기록이 끊기지 않게 자기 전에 한 줄 남겨요.' },
  { icon: '🦴', title: '함께 찍은 사진 올리기', text: '“멍뭉이와 함께”에 사진을 올릴 때마다 개껌(+3)을 줘요. 추억도 쌓고 멍뭉이도 크고!' },
  { icon: '🎀', title: '소개서 완성하기', text: '소개 메뉴에서 특징을 3개 이상 골라 저장하면 리본(+10)을 달아 줘요.' },
  { icon: '💮', title: '참 잘했어요 도장 받기', text: '정성껏 쓴 일기에는 관리자가 “참 잘했어요” 도장을 찍어 줘요. 도장 하나마다 칭찬 사탕(+5)!' },
  { icon: '💤', title: '저녁엔 푹 쉬기', text: '멍뭉이는 잘 자야 커요. 저녁 인사를 들었다면 오늘의 기록을 남기고 푹 쉬어요.' },
];
