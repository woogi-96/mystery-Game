// 멍뭉 시그니처 캐릭터 (일러스트 이미지)

const FULL = 'assets/meongmung.jpg';
const SMALL = 'assets/meongmung-sm.jpg';

/** 전신 캐릭터 */
export function meongmungImg(cls = '') {
  return `<img class="mm-char ${cls}" src="${FULL}" alt="곰발바닥 장갑을 낀 멍뭉 캐릭터" />`;
}

/** 작은 전신 (아바타, 퀴즈 반응용) */
export function meongmungSmall(cls = '') {
  return `<img class="mm-small ${cls}" src="${SMALL}" alt="멍뭉" />`;
}

/** 작은 발바닥 도장 (달력 출석용) */
export function pawStampSVG(cls = '') {
  return `<svg class="paw-stamp ${cls}" viewBox="0 0 64 64" aria-hidden="true">
    <g fill="#93d6c4" stroke="#5fae9a" stroke-width="3">
      <ellipse cx="32" cy="42" rx="17" ry="14"/>
      <ellipse cx="13" cy="26" rx="7" ry="8.5"/><ellipse cx="25" cy="15" rx="7" ry="9"/>
      <ellipse cx="39" cy="15" rx="7" ry="9"/><ellipse cx="51" cy="26" rx="7" ry="8.5"/>
    </g>
    <path d="M22 44 C21 36 28 34 32 37 C36 34 43 36 42 44 C41 52 23 52 22 44 Z" fill="#f3dc86"/>
  </svg>`;
}

/** “참 잘했어요” 발바닥 칭찬 도장 */
export function praiseStampSVG(cls = '') {
  const scallop = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return `<circle cx="${(50 + Math.cos(a) * 43).toFixed(1)}" cy="${(50 + Math.sin(a) * 43).toFixed(1)}" r="6.5"/>`;
  }).join('');
  return `<svg class="praise-stamp ${cls}" viewBox="0 0 100 100" role="img" aria-label="참 잘했어요 도장">
    <g fill="#ff6f8e" opacity=".9">${scallop}<circle cx="50" cy="50" r="43"/></g>
    <circle cx="50" cy="50" r="36" fill="#fff6f8"/>
    <circle cx="50" cy="50" r="33" fill="none" stroke="#ff6f8e" stroke-width="2.2" stroke-dasharray="3 3"/>
    <g fill="#ff6f8e">
      <ellipse cx="50" cy="44" rx="10" ry="8"/>
      <ellipse cx="38" cy="34" rx="4" ry="5"/><ellipse cx="45.5" cy="28" rx="4" ry="5.2"/>
      <ellipse cx="54.5" cy="28" rx="4" ry="5.2"/><ellipse cx="62" cy="34" rx="4" ry="5"/>
    </g>
    <text x="50" y="70" text-anchor="middle" font-family="Jua, sans-serif" font-size="13" fill="#e2456b">참 잘했어요</text>
  </svg>`;
}
