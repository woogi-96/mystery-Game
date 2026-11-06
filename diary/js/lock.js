// 입장 잠금 화면
// - 처음 들어오면 비밀번호 4자리를 정해요 (두 번 입력해서 확인)
// - 정한 뒤로는 이 기기(브라우저)를 기억해서 비밀번호 없이 바로 들어와요
// - 다른 기기에서 처음 열면 정해 둔 비밀번호 4자리를 입력해요
import { store, askConfirm, toast } from './store.js';

const KEY = 'mm-pass';
const $ = (s) => document.querySelector(s);

const remembered = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const remember = (t) => { try { localStorage.setItem(KEY, t); } catch { /* 기억 못 하면 다음에 다시 물어봐요 */ } };

let gatePromise = null;
export const isUnlocked = () => unlocked;
let unlocked = false;

export function gate() {
  if (!gatePromise) gatePromise = run().then(() => { unlocked = true; });
  return gatePromise;
}

async function run() {
  let st;
  try { st = await store.lockState(remembered()); } catch { st = { set: false, unsupported: true }; }
  if (st.unsupported || st.remembered) return;

  return new Promise((resolve) => {
    const lock = $('#lock');
    const dots = [...document.querySelectorAll('#pinDots i')];
    let mode = st.set ? 'unlock' : 'setup';
    let first = '';
    let pin = '';
    let busy = false;

    const say = (title, sub, msg = '') => {
      $('#lockTitle').textContent = title;
      $('#lockSub').textContent = sub;
      $('#lockMsg').textContent = msg;
    };
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const shake = () => {
      const pd = $('#pinDots');
      pd.classList.remove('shake');
      void pd.offsetWidth;
      pd.classList.add('shake');
    };
    const screen = () => {
      pin = '';
      paint();
      $('#lockForgot').hidden = !(mode === 'unlock' && store.canResetOwnPin);
      if (mode === 'setup') say('반가워요! 🐾', '멍뭉일지에 들어올 때 쓸 비밀번호 숫자 4자리를 정해 주세요. 이 기기에서는 다음부터 바로 들어와요.');
      else if (mode === 'confirm') say('한 번 더 눌러 주세요', '방금 정한 비밀번호 4자리를 다시 눌러 확인해요.');
      else say('다시 만나서 반가워요!', '이 기기에서는 처음이에요. 정해 둔 비밀번호 4자리를 눌러 주세요.');
    };
    const open = (token) => {
      if (token) remember(token);
      lock.classList.add('out');
      document.body.classList.remove('locked');
      setTimeout(() => { lock.hidden = true; lock.classList.remove('out'); }, 450);
      document.removeEventListener('keydown', onKey);
      resolve();
    };

    async function complete() {
      busy = true;
      try {
        if (mode === 'setup') {
          first = pin;
          mode = 'confirm';
          screen();
        } else if (mode === 'confirm') {
          if (pin !== first) {
            shake();
            mode = 'setup';
            screen();
            $('#lockMsg').textContent = '두 번 누른 숫자가 달라요. 처음부터 다시 정해 주세요.';
          } else {
            try {
              open(await store.setPin(pin));
              toast('비밀번호를 정했어요. 다음부터는 바로 들어와요 🔓');
            } catch (e) {
              // 보기 전용으로 공유받은 사람처럼 저장할 수 없으면 비밀번호 없이 들어가요
              toast(e.message || '비밀번호를 저장하지 못했어요', 'err');
              open('');
            }
          }
        } else {
          const token = await store.unlock(pin).catch((e) => { $('#lockMsg').textContent = e.message; return undefined; });
          if (token) open(token);
          else {
            shake();
            if (token === null) $('#lockMsg').textContent = '비밀번호가 달라요. 다시 눌러 주세요.';
            pin = '';
            paint();
          }
        }
      } finally { busy = false; }
    }

    function press(k) {
      if (busy) return;
      if (k === 'del') { pin = pin.slice(0, -1); paint(); return; }
      if (pin.length >= 4) return;
      pin += k;
      paint();
      if (pin.length === 4) setTimeout(complete, 120);
    }
    function onKey(e) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    }

    $('#keypad').onclick = (e) => {
      const b = e.target.closest('button');
      if (b) press(b.dataset.k || b.textContent.trim());
    };
    $('#lockForgot').onclick = async () => {
      if (!(await askConfirm('비밀번호를 지우고 새로 정할까요? 일기와 사진은 그대로 있어요.', '새로 정하기'))) return;
      try { await store.resetPin(); mode = 'setup'; screen(); } catch (e) { toast(e.message, 'err'); }
    };
    document.addEventListener('keydown', onKey);

    screen();
    document.body.classList.add('locked');
    lock.hidden = false;
  });
}
