/*
 * 문제마다 바뀌는 배경 그림.
 * ART[id][round] = 그 판 문제를 나타내는 그림 소재(이모지). 장면의 배경판(슬라이드·화이트보드·벽화·사무실 화면)에 그려진다.
 * 정답을 알려 주지 않도록, 문제 "상황"만 그린다.
 */
export const ART = {
  school1: ['🏞️🚤🚤🐟', '🏭🌊🐟', '🏭💰📜⚖️', '🏘️🗑️🔥', '🏭🏚️🏙️', '🧴🌿🎭', '🥤📄🌍', '🌳💨👥', '👶🌍⏳🌱', '🗑️💰♻️', '🍾💰🛒', '🏙️🌡️☀️', '🌲🚜🦋🐸', '🏭✈️🌏', '🌳🏘️💸'],
  school2: ['🚗⛽🛣️', '⚡☑️🌞', '🏭☠️🧹', '🧪⚠️🐟', '🐄⛰️🤝', '🌲📜🌳', '🚗🚫🌫️', '🐄💧🚢', '🍓✈️🌏', '👕👗🗑️', '🚙⚡🏭', '👣🌍🌍', '💰⏳🌍', '📈🏭🌿', '🌡️🌍🤝'],
  school3: ['🍑🔥🌡️', '👑😵', '🍌😆', '👑💸', '🐄😂', '🦆🥶', '😵🤔', '🔢😎', '🥜💀', '🍎😆', '📝😔', '🐟🔄', '😊🔄', '🐔💨', '👃📏'],
  cave1: ['🕯️💨🦇', '🔘🔘🔘💡', '🚪💂💂🚪', '🛶🐺🐐🥬', '⚖️🔮🔮🔮', '🧵🔥⏱️', '🔥🌉👥', '🐌🕳️📏', '🗿🗿🗿', '🕒📐', '🍃🌊📅', '🏭⚙️⏱️', '🤝👥👥', '🧊🟥', '🦁🌅🚶🌙'],
  cave2: ['🏺🏺⚖️💧', '⏳⏳⏱️', '🧦🧦🌑', '🔢❓', '🌻🐚🔢', '👨👦🎂', '⚾🏏💰', '📅➡️❓', '🌳📏🌳', '🎲🎲', '🎂👥🎉', '🕛🕐🕑', '🖌️🧱👥', '🦇🕳️', '👦👧🏠'],
  cave3: ['🚪🚪🚪🚪', '🚪🚪🚪🐐', '🚂↔️🚂', '🎂🔪', '📅👥', '🌍🧵📏', '🏨💵❓', '🗿🗿❓', '🏺🏺💧', '🛤️🏃⏱️', '🔐🔢', '⚖️⚫⚫', '✏️🧽💰', '🕑🔄', '🏢🏃⏱️'],
  office1: ['🔥📝🍖📬', '📧👥🙈', '🗣️⏱️📊', '📅⚠️💬', '📝✅👤', '🎣📧⚠️', '💻🔒☕', '📊💲🔒', '📅🚚', '🚨💳⏪', '🚀🧩📱', '💾☁️🏠', '💻💬👀', '🍅⏱️', '📊🔝'],
  office2: ['🌎🕘📞', '🎯📈🔑', '🗓️👥⏰', '📋👤✅', '🔁💭📌', '🅰️🅱️📊', '💻💳⏳', '💡💡🗣️', '📧👥💥', '🏖️📅✈️', '👥⏱️💸', '📊🎯✅', '🤝📋🗓️', '📧🏝️', '🖥️📽️⌨️'],
};

/* 이모지 소재를 하나의 그림으로: 하늘/바닥 띠 위에 크고 작게 배치 */
export function drawArt(g, x, y, w, h, emojis, style = {}) {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(emojis || '')].map(s => s.segment) : Array.from(emojis || '');
  const items = seg.filter(s => s.trim() && !/^[\u200d\ufe0f]$/.test(s));
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, style.top || '#bfe3ff'); sky.addColorStop(1, style.bottom || '#fff2f7');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  // 바닥 언덕
  g.fillStyle = style.ground || 'rgba(140, 200, 140, 0.55)';
  g.beginPath(); g.moveTo(x, y + h * 0.78);
  g.quadraticCurveTo(x + w * 0.3, y + h * 0.66, x + w * 0.55, y + h * 0.76);
  g.quadraticCurveTo(x + w * 0.8, y + h * 0.86, x + w, y + h * 0.72);
  g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
  // 이모지: 첫 번째를 가장 크게, 나머지는 주변에
  const n = items.length;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  items.forEach((e, i) => {
    const big = i === 0;
    const size = Math.min(w, h) * (big ? 0.42 : n > 3 ? 0.24 : 0.28);
    const cx = n === 1 ? 0.5 : big ? 0.32 : 0.62 + ((i - 1) % 2) * 0.2;
    const cy = big ? 0.5 : 0.3 + Math.floor((i - 1) / 2) * 0.36 + ((i - 1) % 2) * 0.1;
    g.font = `${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.fillText(e, x + w * cx, y + h * cy);
  });
  g.restore();
}
