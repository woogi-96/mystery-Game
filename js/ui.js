import { anim, wait, ease } from './util.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);

const NAME_CLASS = { '멍뭉': '', '우기': 'woogi', '': 'sys' };

export const ui = {
  skipTyping: false,

  /* 대사 – 클릭하면 다음 */
  say(name, text, o = {}) {
    const dlg = $('dialog'), nm = $('dlgName'), tx = $('dlgText');
    dlg.classList.remove('hidden');
    nm.textContent = name || '';
    nm.className = name in NAME_CLASS ? NAME_CLASS[name] : 'npc';
    if (o.onTalk) o.onTalk();
    return new Promise(resolve => {
      let i = 0, done = false;
      tx.textContent = '';
      const full = text;
      const iv = setInterval(() => {
        i += 1;
        tx.textContent = full.slice(0, i);
        if (i % 3 === 0) sfx.blip();
        if (i >= full.length) { clearInterval(iv); done = true; }
      }, o.speed || 28);
      const finish = () => {
        if (!done) { clearInterval(iv); tx.textContent = full; done = true; return; }
        dlg.removeEventListener('click', finish);
        window.removeEventListener('keydown', key);
        sfx.click();
        if (!o.keep) dlg.classList.add('hidden');
        resolve();
      };
      const key = e => { if (e.key === ' ' || e.key === 'Enter') finish(); };
      dlg.addEventListener('click', finish);
      window.addEventListener('keydown', key);
      if (o.auto) setTimeout(() => { if (!done) { clearInterval(iv); tx.textContent = full; done = true; } finish(); }, o.auto * 1000);
    });
  },
  /* 프롤로그 내레이션: 한 글자씩 → 잠시 머문 뒤 사라짐 (클릭하면 빨리 넘김) */
  narrate(text, hold) {
    const el = $('narr');
    ui.narrateCancel();
    hold = hold ?? Math.max(1.8, text.length * 0.07);
    return new Promise(resolve => {
      let i = 0, done = false, ended = false;
      el.textContent = ''; el.classList.add('on');
      const end = () => {
        if (ended) return; ended = true;
        clearInterval(iv); clearTimeout(tm);
        window.removeEventListener('pointerdown', tap); window.removeEventListener('keydown', tap);
        el.classList.remove('on');
        setTimeout(resolve, 450);
      };
      const full = () => { clearInterval(iv); el.textContent = text; done = true; tm = setTimeout(end, hold * 1000); };
      const iv = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i >= text.length) full(); }, 55);
      let tm = 0;
      const tap = e => { if (e.target && e.target.id === 'skipBtn') return; if (!done) full(); else end(); };
      window.addEventListener('pointerdown', tap); window.addEventListener('keydown', tap);
      ui._narrEnd = end;
    });
  },
  narrateCancel() { if (ui._narrEnd) { const f = ui._narrEnd; ui._narrEnd = null; f(); } $('narr').classList.remove('on'); },
  nameTag(name, sub = '', cls = '') {
    const el = $('nameTag');
    if (!name) { el.classList.add('hidden'); return; }
    el.className = cls;
    el.querySelector('.nt-name').textContent = name;
    el.querySelector('.nt-sub').textContent = sub;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  },
  letterbox(on) { $('letterbox').classList.toggle('on', on); },
  /* 대사창에 한 줄 띄워 두기 (클릭 대기 없이) — 선택지와 함께 쓴다 */
  showLine(name, text) {
    const dlg = $('dialog');
    dlg.classList.remove('hidden');
    $('dlgName').textContent = name || '';
    $('dlgName').className = (name || '') in NAME_CLASS ? NAME_CLASS[name || ''] : 'npc';
    $('dlgText').textContent = text;
    $('dlgNext').style.visibility = 'hidden';
  },
  hideDialog() { $('dlgNext').style.visibility = ''; $('dialog').classList.add('hidden'); },

  choose(opts) {
    const box = $('choices');
    box.innerHTML = '';
    box.classList.remove('hidden');
    return new Promise(resolve => {
      opts.forEach((op, i) => {
        const b = document.createElement('button');
        b.innerHTML = `${op.label}${op.sub ? `<small>${op.sub}</small>` : ''}`;
        b.onclick = () => { sfx.click(); box.classList.add('hidden'); resolve(i); };
        box.appendChild(b);
      });
    });
  },

  async caption(text, dur = 2.2) {
    const c = $('caption');
    c.textContent = text;
    c.classList.add('on');
    await wait(dur);
    c.classList.remove('on');
    await wait(0.6);
  },
  captionOn(text) { const c = $('caption'); c.textContent = text; c.classList.add('on'); },
  captionOff() { $('caption').classList.remove('on'); },

  async titleCard(no, title, sub = '') {
    const c = $('card');
    c.querySelector('.card-no').textContent = no;
    c.querySelector('.card-title').textContent = title;
    c.querySelector('.card-sub').textContent = sub;
    await anim(0.7, k => { c.style.opacity = k; c.style.transform = `scale(${0.9 + 0.1 * k})`; }, ease.out);
    await wait(1.8);
    await anim(0.7, k => { c.style.opacity = 1 - k; });
  },

  fadeTo(color, to, dur = 0.8) {
    const f = $('fade');
    f.style.background = color;
    const from = parseFloat(f.style.opacity || 0);
    return anim(dur, k => (f.style.opacity = from + (to - from) * k));
  },
  fadeOut(dur = 1) {
    const f = $('fade');
    const from = parseFloat(f.style.opacity || 0);
    if (from <= 0) return Promise.resolve();
    return anim(dur, k => (f.style.opacity = from * (1 - k)));
  },
  dreamFx(to, dur = 1.2) {
    const d = $('dreamfx');
    const from = parseFloat(d.style.opacity || 0);
    d.style.display = 'block';
    return anim(dur, k => (d.style.opacity = from + (to - from) * k)).then(() => { if (to === 0) d.style.display = 'none'; });
  },
  vignette(on) { $('vignette').classList.toggle('on', on); },

  hud(show) { $('hud').classList.toggle('hidden', !show); },
  setEpisode(label, stage, total) {
    $('epLabel').textContent = label || '';
    const d = $('stageDots');
    d.innerHTML = '';
    if (total) for (let i = 0; i < total; i++) {
      const s = document.createElement('span');
      if (i < stage) s.className = 'done'; else if (i === stage) s.className = 'now';
      d.appendChild(s);
    }
  },
  setHearts(n, max = 3) {
    const h = $('hearts');
    if (n == null) { h.innerHTML = ''; return; }
    h.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? '' : 'lost'}">💗</span>`).join('');
  },
  shakeHearts() { const h = $('hearts'); h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); },
  clock(show, text, speed) {
    $('clockHud').classList.toggle('hidden', !show);
    if (text) $('clockTime').textContent = text;
    $('clockSpeed').textContent = speed || '';
  },

  /* 퀴즈 */
  quiz(q, hooks) {
    const box = $('quiz');
    box.classList.remove('hidden', 'collapsed');
    $('qToggle').textContent = '장면 보기 ▾';
    const lv = $('qLevel');
    lv.textContent = `난이도 ${q.level}`;
    lv.className = 'lvl ' + ({ '하': 'l1', '중': 'l2', '상': 'l3' }[q.level]);
    $('qTitle').textContent = q.title;
    $('qSituation').textContent = q.situation;
    $('qQuestion').textContent = 'Q. ' + q.question;
    box.querySelector('.q-body').scrollTop = 0;

    const clues = $('qClues');
    clues.innerHTML = '';
    q.clues.forEach(c => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="ic">${c.icon}</span><span>${c.text}</span>`;
      b.onclick = () => {
        sfx.click();
        clues.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        hooks.focus && hooks.focus(c.focus);
        if (window.innerWidth < 720) { box.classList.add('collapsed'); $('qToggle').textContent = '퀴즈 보기 ▴'; }
      };
      clues.appendChild(b);
    });

    return new Promise(resolve => {
      const opts = $('qOptions');
      opts.innerHTML = '';
      q.options.forEach((text, i) => {
        const b = document.createElement('button');
        b.innerHTML = `<b>${'ABCD'[i]}</b><span>${text}</span>`;
        b.onclick = async () => {
          if (i === q.answer) {
            sfx.correct();
            box.classList.add('hidden');
            await ui.feedback(true, q);
            resolve('ok');
          } else {
            sfx.wrong();
            b.disabled = true;
            const left = hooks.wrong ? hooks.wrong() : 1;
            ui.shakeHearts();
            if (left <= 0) {
              box.classList.add('hidden');
              await ui.feedback(false, q, true);
              resolve('fail');
            } else {
              await ui.feedback(false, q, false, left);
            }
          }
        };
        opts.appendChild(b);
      });
    });
  },
  /* 대화 중 질문: 대사창에는 질문, 그 위에 선택지 팝업 */
  /* o.pop = 돌발 퀴즈(제한 시간 o.time초, 시간 초과면 -1) */
  ask(name, question, q, disabled = new Set(), o = {}) {
    const box = $('ask');
    box.classList.toggle('pop', !!o.pop);
    $('askLevel').textContent = o.pop ? '⚡ 돌발 퀴즈' : '';
    $('askLevel').className = o.pop ? 'lvl l3' : 'lvl hidden';
    $('askTitle').textContent = q.title;
    const memo = $('askMemo');
    const clues = q.clues || [];
    memo.innerHTML = clues.map(c => `<li>${c.text}</li>`).join('');
    memo.classList.add('hidden');
    $('askMemoBtn').style.display = clues.length ? '' : 'none';
    $('askMemoBtn').onclick = () => { sfx.click(); memo.classList.toggle('hidden'); };
    const bar = $('askTimer');
    bar.style.display = o.pop ? '' : 'none';
    // 대사창에 질문 표시 (클릭으로 넘어가지 않음)
    const dlg = $('dialog');
    dlg.classList.remove('hidden');
    $('dlgName').textContent = name;
    $('dlgName').className = name in NAME_CLASS ? NAME_CLASS[name] : 'npc';
    $('dlgText').textContent = question;
    $('dlgNext').style.visibility = 'hidden';
    return new Promise(resolve => {
      const opts = $('askOptions');
      opts.innerHTML = '';
      let timer = 0;
      const close = i => {
        clearInterval(timer);
        box.classList.add('hidden');
        dlg.classList.add('hidden');
        $('dlgNext').style.visibility = '';
        resolve(i);
      };
      if (o.pop) {
        const t0 = performance.now(), T = (o.time || 10) * 1000;
        const fill = bar.firstElementChild;
        timer = setInterval(() => {
          const left = Math.max(0, T - (performance.now() - t0));
          fill.style.width = (left / T * 100) + '%';
          fill.textContent = Math.ceil(left / 1000) + '초';
          if (left <= 0) close(-1);
        }, 100);
      }
      q.options.forEach((text, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<b>${'ABCD'[i]}</b><span>${text}</span>`;
        b.disabled = disabled.has(i);
        b.onclick = () => close(i);
        opts.appendChild(b);
      });
      box.classList.remove('hidden');
    });
  },
  async toast(text, color = '#fff') {
    const t = $('toast');
    t.textContent = text; t.style.color = color;
    await anim(0.3, k => { t.style.opacity = k; t.style.transform = `translate(-50%, ${(1 - k) * 20}px)`; }, ease.out);
    await wait(1.0);
    await anim(0.4, k => (t.style.opacity = 1 - k));
  },
  hideQuiz() { $('quiz').classList.add('hidden'); $('ask').classList.add('hidden'); },

  feedback(ok, q, dead = false, left = 0) {
    const fb = $('feedback');
    fb.classList.remove('hidden');
    $('fbIcon').textContent = ok ? '🎉' : dead ? '💤' : '💔';
    $('fbTitle').textContent = ok ? '정답! 인과관계를 풀어냈어요' : dead ? '꿈이 일그러진다…' : `오답… (남은 하트 ${left})`;
    const chain = $('fbChain');
    chain.innerHTML = '';
    if (ok) {
      q.chain.forEach((s, i) => {
        if (i) { const a = document.createElement('i'); a.textContent = '→'; chain.appendChild(a); }
        const sp = document.createElement('span'); sp.textContent = s; chain.appendChild(sp);
      });
      $('fbText').textContent = q.explain;
    } else {
      $('fbText').textContent = dead ? '하트를 모두 잃었다. 꿈이 점점 어두워지고, 멍뭉이는 깨어날 수 없게 되었다…' : '💡 힌트: ' + q.hint;
    }
    $('fbBtn').textContent = ok ? '다음으로' : dead ? '……' : '다시 생각해보기';
    return new Promise(res => {
      $('fbBtn').onclick = () => { sfx.click(); fb.classList.add('hidden'); res(); };
    });
  },

  ending(title, text, buttons) {
    const e = $('ending');
    e.classList.remove('hidden');
    $('endTitle').textContent = title;
    $('endText').innerHTML = text;
    const bb = $('endBtns');
    bb.innerHTML = '';
    return new Promise(res => {
      buttons.forEach((b, i) => {
        const el = document.createElement('button');
        el.textContent = b.label;
        if (b.sub) el.className = 'sub';
        el.onclick = () => { sfx.click(); e.classList.add('hidden'); res(i); };
        bb.appendChild(el);
      });
    });
  },
};

$('qToggle').onclick = () => {
  const q = $('quiz');
  q.classList.toggle('collapsed');
  $('qToggle').textContent = q.classList.contains('collapsed') ? '퀴즈 보기 ▴' : '장면 보기 ▾';
};
