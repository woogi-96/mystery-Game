// 아주 가벼운 WebAudio 효과음 (외부 파일 없음)
let ctx = null;
let muted = false;
let musicNodes = null;
let musicWanted = false;

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
  /* 배경음악: 밝고 잔잔한 오르골 + 패드 (F장조, I–V–vi–IV–ii–V 진행, 80bpm) — 외부 파일 없이 합성 */
  startMusic() {
    musicWanted = true;
    if (muted || musicNodes) return;
    const a = ac();
    const master = a.createGain(); master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.055, a.currentTime + 3);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    master.connect(lp).connect(a.destination);
    // 은은한 잔향 (짧은 딜레이 피드백)
    const dl = a.createDelay(); dl.delayTime.value = 0.28;
    const fb = a.createGain(); fb.gain.value = 0.28;
    const wet = a.createGain(); wet.gain.value = 0.35;
    dl.connect(fb).connect(dl); dl.connect(wet).connect(lp);
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    // 코드(미디 번호): F, C/E, Dm, Bb, Gm7, C
    const prog = [[53, 57, 60, 65], [52, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62], [43, 55, 58, 65], [48, 55, 58, 64]];
    const melody = [
      [77, null, 76, 74, 72, null, 69, null], [72, null, 74, 76, 79, null, 76, null],
      [74, null, 72, 69, 77, null, 74, null], [74, 72, 70, null, 69, null, null, null],
      [70, null, 72, 74, 77, null, 74, null], [72, null, null, 76, 79, null, null, null],
    ];
    const BEAT = 0.75, BAR = BEAT * 4;
    const voice = (freq, t, dur, vol, type, attack, dest) => {
      const o = a.createOscillator(); const g = a.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); if (dest) g.connect(dest);
      o.start(t); o.stop(t + dur + 0.1);
    };
    let bar = 0, next = a.currentTime + 0.3;
    const schedule = () => {
      while (next < a.currentTime + 1.2) {
        const ch = prog[bar % prog.length];
        // 패드 (부드러운 삼각파, 느린 어택)
        ch.forEach(m => voice(N(m), next, BAR + 0.6, 0.11, 'triangle', 0.9, null));
        // 베이스
        voice(N(ch[0] - 12), next, BEAT * 1.8, 0.22, 'sine', 0.03, null);
        voice(N(ch[0] - 12), next + BEAT * 2, BEAT * 1.8, 0.16, 'sine', 0.03, null);
        // 오르골 아르페지오 (8분음표)
        const arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12];
        arp.forEach((m, i) => {
          const t = next + i * BEAT / 2;
          voice(N(m), t, 1.1, 0.07, 'sine', 0.008, dl);
          voice(N(m) * 2, t, 0.5, 0.012, 'sine', 0.005, null);
        });
        // 멜로디 (두 바퀴 중 한 바퀴만 — 잔잔하게)
        if (Math.floor(bar / prog.length) % 2 === 1) {
          melody[bar % prog.length].forEach((m, i) => { if (m) voice(N(m), next + i * BEAT / 2, 1.4, 0.09, 'sine', 0.01, dl); });
        }
        next += BAR; bar++;
      }
    };
    schedule();
    const id = setInterval(schedule, 250);
    musicNodes = { master, id, a };
  },
  stopMusic(fade = 0.8) {
    if (!musicNodes) return;
    const { master, id, a } = musicNodes;
    clearInterval(id);
    master.gain.cancelScheduledValues(a.currentTime);
    master.gain.setValueAtTime(master.gain.value, a.currentTime);
    master.gain.linearRampToValueAtTime(0, a.currentTime + fade);
    setTimeout(() => master.disconnect(), fade * 1000 + 3000);
    musicNodes = null;
  },
  toggle() { muted = !muted; if (muted) { const w = musicWanted; this.stopMusic(0.2); musicWanted = w; } else if (musicWanted) this.startMusic(); return muted; },
  get muted() { return muted; },
};
