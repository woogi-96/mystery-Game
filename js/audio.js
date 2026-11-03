// 아주 가벼운 WebAudio 효과음 (외부 파일 없음)
let ctx = null;
let muted = false;
let musicNodes = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
  if (muted) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  const t0 = a.currentTime + delay;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(dur, { vol = 0.1, delay = 0, freq = 800 } = {}) {
  if (muted) return;
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + delay);
}

export const sfx = {
  unlock() { ac(); },
  click() { tone(880, 0.06, { type: 'triangle', vol: 0.08 }); },
  blip() { tone(1200, 0.03, { type: 'square', vol: 0.02 }); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.08 })); },
  wrong() { tone(220, 0.35, { type: 'sawtooth', vol: 0.08, slide: -120 }); tone(180, 0.4, { type: 'square', vol: 0.04, delay: 0.1, slide: -80 }); },
  dream() { [392, 494, 587, 740, 880, 988].forEach((f, i) => tone(f, 0.9, { type: 'sine', vol: 0.06, delay: i * 0.12 })); },
  bell() { [659, 523, 587, 392, 392, 587, 659, 523].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.1, delay: i * 0.38 })); },
  ring() { for (let i = 0; i < 4; i++) { tone(1320, 0.08, { vol: 0.07, delay: i * 0.16 }); tone(1660, 0.08, { vol: 0.05, delay: i * 0.16 + 0.04 }); } },
  power() { tone(440, 0.8, { type: 'sawtooth', vol: 0.1, slide: -400 }); noise(0.3, { vol: 0.2, freq: 200 }); },
  alarm() { for (let i = 0; i < 3; i++) { tone(880, 0.25, { type: 'square', vol: 0.04, delay: i * 0.5 }); tone(660, 0.25, { type: 'square', vol: 0.04, delay: i * 0.5 + 0.25 }); } },
  door() { noise(0.4, { vol: 0.15, freq: 300 }); tone(120, 0.3, { type: 'triangle', vol: 0.08 }); },
  rumble() { noise(1.2, { vol: 0.3, freq: 90 }); },
  water() { noise(0.6, { vol: 0.12, freq: 1500 }); },
  siren() { for (let i = 0; i < 4; i++) { tone(700, 0.3, { vol: 0.05, delay: i * 0.6, slide: 300 }); tone(1000, 0.3, { vol: 0.05, delay: i * 0.6 + 0.3, slide: -300 }); } },
  heart() { tone(660, 0.12, { type: 'triangle', vol: 0.1 }); tone(990, 0.2, { type: 'triangle', vol: 0.08, delay: 0.1 }); },
  snore() { tone(110, 0.9, { type: 'sine', vol: 0.05, slide: 40 }); },
  startMusic() {
    if (muted || musicNodes) return;
    const a = ac();
    const g = a.createGain(); g.gain.value = 0.025; g.connect(a.destination);
    const notes = [261.6, 329.6, 392, 493.9, 440, 392, 329.6, 293.7];
    let i = 0;
    const id = setInterval(() => {
      if (muted) return;
      const o = a.createOscillator(); const gg = a.createGain();
      o.type = 'sine'; o.frequency.value = notes[i % notes.length] * (i % 16 < 8 ? 1 : 0.75);
      gg.gain.setValueAtTime(0.0001, a.currentTime);
      gg.gain.exponentialRampToValueAtTime(1, a.currentTime + 0.05);
      gg.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.4);
      o.connect(gg).connect(g); o.start(); o.stop(a.currentTime + 1.5);
      i++;
    }, 600);
    musicNodes = { g, id };
  },
  stopMusic() { if (musicNodes) { clearInterval(musicNodes.id); musicNodes = null; } },
  toggle() { muted = !muted; if (muted) this.stopMusic(); return muted; },
  get muted() { return muted; },
};
