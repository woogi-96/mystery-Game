import { THREE, box, rbox, cyl, sph, plane, torus, group, mat, emissive, texPlane, canvasTex, woodTex, textSprite, heartMesh, anim, wait, ease, shot, FONT, roundRect, capsule } from '../util.js';
import { sfx } from '../audio.js';

/* 하루 시간대별 하늘/빛 키프레임 */
const KEYS = [
  { h: 0, top: '#0b1030', bot: '#1d2550', sun: '#4a5aa8', si: 0.25, amb: 0.25, star: 1 },
  { h: 5, top: '#0f1436', bot: '#2a2a5a', sun: '#4a5aa8', si: 0.25, amb: 0.25, star: 0.9 },
  { h: 6.5, top: '#6d7fd0', bot: '#ffb8a8', sun: '#ffb38a', si: 0.9, amb: 0.5, star: 0.1 },
  { h: 8, top: '#7fc3ff', bot: '#e4f4ff', sun: '#fff1d6', si: 2.2, amb: 0.8, star: 0 },
  { h: 16, top: '#79b8f5', bot: '#dff1ff', sun: '#fff0d0', si: 2.0, amb: 0.8, star: 0 },
  { h: 18.5, top: '#6a7fd6', bot: '#ffa36b', sun: '#ff9a5a', si: 1.6, amb: 0.6, star: 0 },
  { h: 19.5, top: '#3b3a86', bot: '#d9708a', sun: '#c86a9a', si: 0.7, amb: 0.4, star: 0.4 },
  { h: 20.5, top: '#121842', bot: '#2c2f6a', sun: '#5060b0', si: 0.3, amb: 0.28, star: 1 },
  { h: 24, top: '#0b1030', bot: '#1d2550', sun: '#4a5aa8', si: 0.25, amb: 0.25, star: 1 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpHex(a, b, k) { return '#' + cA.set(a).lerp(cB.set(b), k).getHexString(); }
function sample(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const k = (h - a.h) / (b.h - a.h);
  return {
    top: lerpHex(a.top, b.top, k), bot: lerpHex(a.bot, b.bot, k), sun: lerpHex(a.sun, b.sun, k),
    si: a.si + (b.si - a.si) * k, amb: a.amb + (b.amb - a.amb) * k, star: a.star + (b.star - a.star) * k,
  };
}

export function fmtTime(h) {
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function build(env) {
  const { mung } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1e1630');
  scene.fog = new THREE.Fog('#1e1630', 18, 40);

  const W = 6, D = 5, H = 5;
  const wallMat = mat('#f6ebe1');
  const wallMat2 = mat('#efd9cc');

  /* 바닥 */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: woodTex('#d6aa7c', '#b48459', 10, [2, 2]), roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // 바닥 테두리 (디오라마 단면)
  box(W * 2 + 0.3, 0.5, D * 2 + 0.3, '#8b6a52', { pos: [0, -0.28, 0], parent: scene });

  /* 벽 – 뒷벽 (창문 구멍) */
  const back = group(scene, [0, 0, -D]);
  const winX = -0.4, winW = 3.0, winY0 = 1.7, winY1 = 4.0;
  box(winX - winW / 2 + W, H, 0.3, wallMat, { pos: [(-W + winX - winW / 2) / 2, H / 2, 0], parent: back });
  box(W - (winX + winW / 2), H, 0.3, wallMat, { pos: [(W + winX + winW / 2) / 2, H / 2, 0], parent: back });
  box(winW, winY0, 0.3, wallMat, { pos: [winX, winY0 / 2, 0], parent: back });
  box(winW, H - winY1, 0.3, wallMat, { pos: [winX, (H + winY1) / 2, 0], parent: back });
  // 걸레받이
  box(W * 2, 0.2, 0.05, '#e2cdbd', { pos: [0, 0.1, 0.17], parent: back });
  // 창틀
  const frameM = mat('#ffffff');
  box(winW + 0.2, 0.14, 0.45, frameM, { pos: [winX, winY0, 0.05], parent: back });
  box(winW + 0.2, 0.12, 0.35, frameM, { pos: [winX, winY1, 0.05], parent: back });
  box(0.12, winY1 - winY0, 0.35, frameM, { pos: [winX - winW / 2, (winY0 + winY1) / 2, 0.05], parent: back });
  box(0.12, winY1 - winY0, 0.35, frameM, { pos: [winX + winW / 2, (winY0 + winY1) / 2, 0.05], parent: back });
  box(0.08, winY1 - winY0, 0.3, frameM, { pos: [winX, (winY0 + winY1) / 2, 0.05], parent: back });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winY1 - winY0), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.05 }));
  glass.position.set(winX, (winY0 + winY1) / 2, 0.02); back.add(glass);
  // 커튼
  const curtainM = mat('#ffd6e2', { side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cg = group(back, [winX + s * (winW / 2 + 0.35), 0, 0.35]);
    for (let i = 0; i < 4; i++) cyl(0.12, 0.16, 3.4, curtainM, { pos: [s * (i * 0.14 - 0.2), 2.75, Math.sin(i * 2) * 0.05], parent: cg });
  }
  cyl(0.04, 0.04, winW + 1.8, '#c9a98a', { pos: [winX, 4.45, 0.35], rot: [0, 0, Math.PI / 2], parent: back });

  // 창밖 하늘 (시간에 따라 다시 그림)
  let skyState = { top: '#000', bot: '#000', star: 0, h: 18 };
  const stars = Array.from({ length: 60 }, () => [Math.random(), Math.random() * 0.6, Math.random() * 1.5 + 0.5]);
  const bld = Array.from({ length: 14 }, (_, i) => ({ x: i / 14, w: 0.05 + Math.random() * 0.05, h: 0.15 + Math.random() * 0.3, lit: Array.from({ length: 12 }, () => Math.random()) }));
  const skyTex = canvasTex(512, 384, () => {});
  function drawSky() {
    skyTex.redraw((g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, skyState.top); gr.addColorStop(1, skyState.bot);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = `rgba(255,255,255,${skyState.star})`;
      stars.forEach(([x, y, r]) => { g.beginPath(); g.arc(x * w, y * h, r, 0, 7); g.fill(); });
      // 해/달
      const hh = skyState.h;
      if (hh > 5.5 && hh < 19.6) {
        const k = (hh - 6) / 13.5;
        g.fillStyle = hh > 17.5 ? '#ffcf8a' : '#fff6d0';
        g.beginPath(); g.arc(w * (0.15 + 0.7 * k), h * (0.75 - Math.sin(k * Math.PI) * 0.55), 26, 0, 7); g.fill();
      } else {
        g.fillStyle = '#fff8dc';
        g.beginPath(); g.arc(w * 0.72, h * 0.22, 22, 0, 7); g.fill();
        g.fillStyle = skyState.top;
        g.beginPath(); g.arc(w * 0.72 + 10, h * 0.22 - 6, 20, 0, 7); g.fill();
      }
      // 도시 실루엣
      const night = skyState.star;
      bld.forEach(b => {
        const bx = b.x * w, bw = b.w * w, bh = b.h * h;
        g.fillStyle = lerpHex('#8a95b8', '#1a1d36', Math.min(1, night + 0.3));
        g.fillRect(bx, h - bh, bw, bh);
        b.lit.forEach((v, i) => {
          if (v < 0.55 * night + 0.05) {
            g.fillStyle = '#ffe9a6';
            g.fillRect(bx + 4 + (i % 3) * (bw / 3.2), h - bh + 8 + Math.floor(i / 3) * 14, 5, 7);
          }
        });
      });
    });
  }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.2), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(winX, 2.85, -D - 1.2); scene.add(sky);

  /* 왼쪽 벽 (문) */
  const left = group(scene, [-W, 0, 0]);
  const doorZ0 = 0.8, doorZ1 = 2.6, doorH = 3.7;
  box(0.3, H, doorZ0 + D, wallMat2, { pos: [0, H / 2, (-D + doorZ0) / 2], parent: left });
  box(0.3, H, D - doorZ1, wallMat2, { pos: [0, H / 2, (D + doorZ1) / 2], parent: left });
  box(0.3, H - doorH, doorZ1 - doorZ0, wallMat2, { pos: [0, (H + doorH) / 2, (doorZ0 + doorZ1) / 2], parent: left });
  box(0.05, 0.2, D * 2, '#e2cdbd', { pos: [0.17, 0.1, 0], parent: left });
  // 문틀 + 문
  box(0.4, 0.15, doorZ1 - doorZ0 + 0.3, '#ffffff', { pos: [0.05, doorH, (doorZ0 + doorZ1) / 2], parent: left });
  for (const z of [doorZ0, doorZ1]) box(0.4, doorH, 0.15, '#ffffff', { pos: [0.05, doorH / 2, z], parent: left });
  const hallway = plane(3, doorH, emissive('#ffcf96', 0.5), { pos: [-0.8, doorH / 2, (doorZ0 + doorZ1) / 2], rot: [0, Math.PI / 2, 0], parent: left });
  const doorPivot = group(left, [0.12, 0, doorZ0 + 0.05]);
  const doorPanel = box(0.1, doorH - 0.05, doorZ1 - doorZ0 - 0.1, '#f2e2d2', { pos: [0, doorH / 2, (doorZ1 - doorZ0) / 2 - 0.05], parent: doorPivot });
  sph(0.07, '#c9a043', { pos: [0.1, 1.8, doorZ1 - doorZ0 - 0.35], parent: doorPivot });
  box(0.02, 0.9, 0.7, '#e8d4c2', { pos: [0.06, 2.6, (doorZ1 - doorZ0) / 2 - 0.05], parent: doorPivot });
  box(0.02, 0.9, 0.7, '#e8d4c2', { pos: [0.06, 1.1, (doorZ1 - doorZ0) / 2 - 0.05], parent: doorPivot });
  // 스위치
  rbox(0.05, 0.3, 0.2, 0.02, '#ffffff', { pos: [0.18, 1.9, doorZ1 + 0.4], parent: left });
  // 옷걸이 + 가방
  box(0.1, 0.1, 1.2, '#a07850', { pos: [0.2, 3.0, -1.5], parent: left });
  const bagHook = rbox(0.3, 0.7, 0.6, 0.1, '#3f4a5c', { pos: [0.3, 2.4, -1.2], parent: left });
  const hoodie = capsule(0.25, 0.6, '#ccd6e0', { pos: [0.3, 2.4, -1.85], parent: left });

  /* 천장 조명 */
  const ceilLamp = group(scene, [0, H, 0]);
  cyl(0.02, 0.02, 0.6, '#ddd', { pos: [0, -0.3, 0], parent: ceilLamp });
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffdca0', emissiveIntensity: 0, side: THREE.DoubleSide }));
  shade.rotation.x = Math.PI; shade.position.y = -0.6; ceilLamp.add(shade);
  const ceilLight = new THREE.PointLight('#ffdcae', 0, 18, 1.4);
  ceilLight.position.set(0, H - 1.0, 0.5); ceilLight.castShadow = true; ceilLight.shadow.mapSize.set(1024, 1024);
  scene.add(ceilLight);

  /* ───── 토퍼 (바닥 매트리스) ───── */
  const bed = group(scene, [-3.6, 0, -2.9]);
  rbox(2.5, 0.32, 3.8, 0.12, '#f7f3ee', { pos: [0, 0.16, 0], parent: bed });
  rbox(2.52, 0.08, 3.82, 0.04, '#cfd9e8', { pos: [0, 0.3, 0], parent: bed }); // 패드
  // 퀼팅 줄
  for (let i = -1; i <= 1; i++) box(2.4, 0.01, 0.03, '#b9c6d9', { pos: [0, 0.345, i * 1.1], parent: bed, cast: false });
  const pillow = rbox(1.5, 0.32, 0.8, 0.15, '#ffffff', { pos: [0, 0.48, -1.35], parent: bed });
  rbox(0.9, 0.22, 0.5, 0.1, '#ffd6e2', { pos: [0.85, 0.42, -1.1], rot: [0, 0.4, 0.1], parent: bed }); // 쿠션
  // 접힌 이불
  const blanketFold = rbox(2.3, 0.3, 1.0, 0.13, '#a9d7f5', { pos: [0, 0.5, 1.2], parent: bed });
  // 덮는 이불 (잘 때)
  const blanket = rbox(2.2, 0.95, 2.3, 0.4, '#a9d7f5', { pos: [0, 0.82, 0.4], parent: bed });
  blanket.visible = false;
  // 인형
  const plush = group(bed, [-1.0, 0.36, -1.5]);
  sph(0.25, '#f1d3a6', { pos: [0, 0.25, 0], parent: plush });
  sph(0.2, '#f1d3a6', { pos: [0, 0.6, 0], parent: plush });
  for (const s of [-1, 1]) sph(0.08, '#c9945e', { pos: [s * 0.15, 0.78, 0], parent: plush });
  for (const s of [-1, 1]) sph(0.025, '#222', { pos: [s * 0.07, 0.63, 0.18], parent: plush });
  // 협탁 + 스탠드
  const side = group(scene, [-1.6, 0, -4.3]);
  rbox(0.8, 0.7, 0.7, 0.05, '#e8d3bd', { pos: [0, 0.35, 0], parent: side });
  cyl(0.1, 0.15, 0.06, '#ffffff', { pos: [0, 0.73, 0], parent: side });
  cyl(0.02, 0.02, 0.5, '#ffffff', { pos: [0, 0.98, 0], parent: side });
  const lampShade = cyl(0.18, 0.28, 0.32, new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffc77a', emissiveIntensity: 0.6 }), { pos: [0, 1.3, 0], parent: side });
  const sideLight = new THREE.PointLight('#ffc27a', 1.5, 6, 1.6);
  sideLight.position.set(-1.6, 1.4, -4.0); scene.add(sideLight);
  const alarm = rbox(0.3, 0.2, 0.12, 0.04, '#9ad0c2', { pos: [0.22, 0.8, 0.1], parent: side });

  // 사진 액자 (멍뭉♥우기)
  const photo = texPlane(1.4, 1.0, 280, 200, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd6e6'); gr.addColorStop(1, '#d6e8ff');
    g.fillStyle = gr; g.fillRect(12, 12, w - 24, h - 24);
    // 두 얼굴
    const face = (x, hair, hat) => {
      g.fillStyle = hair; g.beginPath(); g.arc(x, 92, 44, 0, 7); g.fill();
      g.fillStyle = '#ffe2cc'; g.beginPath(); g.arc(x, 100, 34, 0, 7); g.fill();
      g.fillStyle = '#3a2216'; g.beginPath(); g.arc(x - 12, 100, 5, 0, 7); g.arc(x + 12, 100, 5, 0, 7); g.fill();
      g.fillStyle = '#ff9eb5'; g.beginPath(); g.arc(x - 20, 112, 6, 0, 7); g.arc(x + 20, 112, 6, 0, 7); g.fill();
      if (hat) { g.fillStyle = '#d4f0e2'; g.beginPath(); g.ellipse(x, 62, 46, 18, -0.15, 0, 7); g.fill(); }
      else { g.fillStyle = hair; g.beginPath(); g.arc(x + 4, 46, 14, 0, 7); g.fill(); }
    };
    face(95, '#5a321b', true); face(185, '#6b3c1f', false);
    g.fillStyle = '#ff6f98'; g.font = `30px ${FONT}`; g.textAlign = 'center'; g.fillText('♥', 140, 60);
    g.fillStyle = '#7a5a80'; g.font = `20px ${FONT}`; g.fillText('우기 ♥ 멍뭉', 140, 178);
  });
  photo.position.set(-3.6, 3.0, -D + 0.2); scene.add(photo);
  box(1.55, 1.15, 0.06, '#c79b6d', { pos: [-3.6, 3.0, -D + 0.14], parent: scene });

  /* ───── 책상 + 맥미니 + 모니터 ───── */
  const desk = group(scene, [3.4, 0, -4.0]);
  rbox(3.4, 0.1, 1.5, 0.03, '#e9d2b4', { pos: [0, 1.4, 0], parent: desk });
  for (const [x, z] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 0.6], [1.6, 0.6]]) cyl(0.04, 0.04, 1.4, '#fafafa', { pos: [x, 0.7, z], parent: desk });
  // 모니터
  const mon = group(desk, [-0.2, 1.45, -0.3]);
  rbox(0.5, 0.04, 0.35, 0.02, '#c9ccd2', { pos: [0, 0.02, 0], parent: mon });
  box(0.08, 0.7, 0.05, '#c9ccd2', { pos: [0, 0.4, -0.08], parent: mon });
  rbox(2.1, 1.25, 0.08, 0.03, '#2a2b30', { pos: [0, 1.1, 0], parent: mon });
  const codeLines = Array.from({ length: 22 }, () => ({ ind: Math.floor(Math.random() * 4), parts: Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => [Math.random() * 90 + 20, ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9', '#f8f8f2'][Math.floor(Math.random() * 6)]]) }));
  let scroll = 0, codeT = 0;
  const screen = texPlane(2.0, 1.15, 512, 296, () => {}, { glow: 0.9, pos: [0, 1.1, 0.045], parent: mon });
  function drawCode() {
    screen.tex.redraw((g, w, h) => {
      g.fillStyle = '#1e1f29'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b2d3a'; g.fillRect(0, 0, 90, h);
      g.fillStyle = '#383a4a'; g.fillRect(0, 0, w, 18);
      ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(12 + i * 14, 9, 4, 0, 7); g.fill(); });
      for (let i = 0; i < 8; i++) { g.fillStyle = '#5a5d73'; g.fillRect(10, 30 + i * 18, 60, 6); }
      codeLines.forEach((l, i) => {
        const y = 30 + ((i * 13 - scroll) % (22 * 13) + 22 * 13) % (22 * 13);
        let x = 104 + l.ind * 18;
        g.fillStyle = '#5a5d73'; g.fillRect(94, y, 6, 6);
        l.parts.forEach(([pw, c]) => { g.fillStyle = c; g.fillRect(x, y, pw, 6); x += pw + 8; });
      });
    });
  }
  drawCode();
  const monLight = new THREE.PointLight('#8fb8ff', 0.8, 4, 2);
  monLight.position.set(3.2, 2.6, -3.3); scene.add(monLight);
  // 맥미니 (은색 소형 데스크톱)
  const mini = group(desk, [1.15, 1.45, -0.15]);
  rbox(0.62, 0.15, 0.62, 0.06, mat('#d5d8dd', { metalness: 0.7, roughness: 0.3 }), { pos: [0, 0.075, 0], parent: mini });
  box(0.5, 0.005, 0.5, mat('#e8eaee', { metalness: 0.5, roughness: 0.25 }), { pos: [0, 0.152, 0], parent: mini, cast: false });
  const led = sph(0.012, emissive('#ffffff', 2), { pos: [-0.25, 0.04, 0.311], parent: mini, cast: false });
  // 키보드 / 마우스 / 머그컵
  rbox(1.1, 0.04, 0.38, 0.02, '#f2f2f4', { pos: [-0.2, 1.47, 0.35], parent: desk });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) box(0.065, 0.02, 0.065, '#ffffff', { pos: [-0.2 - 0.48 + c * 0.08, 1.5, 0.22 + r * 0.085], parent: desk, cast: false });
  rbox(0.14, 0.05, 0.22, 0.05, '#f2f2f4', { pos: [0.6, 1.47, 0.35], parent: desk });
  const mug = group(desk, [-1.3, 1.45, 0.2]);
  cyl(0.11, 0.1, 0.25, '#ffc4d4', { pos: [0, 0.125, 0], parent: mug });
  torus(0.07, 0.02, '#ffc4d4', { pos: [0.12, 0.13, 0], rot: [0, 0, Math.PI / 2], parent: mug });
  // 의자
  const chair = group(scene, [3.0, 0, -2.6]);
  cyl(0.05, 0.05, 0.6, '#555', { pos: [0, 0.4, 0], parent: chair });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; box(0.5, 0.05, 0.08, '#555', { pos: [Math.cos(a) * 0.25, 0.08, Math.sin(a) * 0.25], rot: [0, -a, 0], parent: chair }); }
  rbox(0.9, 0.14, 0.85, 0.06, '#f4c9d6', { pos: [0, 0.75, 0], parent: chair });
  rbox(0.85, 1.0, 0.12, 0.06, '#f4c9d6', { pos: [0, 1.35, 0.42], rot: [0.1, 0, 0], parent: chair });

  /* 벽시계 */
  const clockG = group(scene, [3.4, 3.8, -D + 0.18]);
  cyl(0.55, 0.55, 0.08, '#ffffff', { rot: [Math.PI / 2, 0, 0], parent: clockG, seg: 40 });
  torus(0.55, 0.05, '#ff9eb5', { parent: clockG });
  const face = texPlane(1.0, 1.0, 256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6b4f72'; g.font = `30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(i, 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
  }, { pos: [0, 0, 0.045], parent: clockG });
  face.material.transparent = false;
  const hourHand = group(clockG, [0, 0, 0.06]);
  box(0.05, 0.28, 0.02, '#4b3550', { pos: [0, 0.12, 0], parent: hourHand });
  const minHand = group(clockG, [0, 0, 0.07]);
  box(0.035, 0.42, 0.02, '#e0457b', { pos: [0, 0.19, 0], parent: minHand });
  sph(0.04, '#4b3550', { pos: [0, 0, 0.08], parent: clockG });

  /* ───── 철봉 (치닝디핑 스탠드) ───── */
  const bar = group(scene, [5.0, 0, 0.2], [0, -Math.PI / 2 + 0.15, 0]);
  const metal = mat('#2d2f36', { metalness: 0.6, roughness: 0.35 });
  for (const s of [-1, 1]) {
    cyl(0.07, 0.07, 4.2, metal, { pos: [s * 0.85, 2.1, 0], parent: bar });
    box(0.14, 0.1, 1.9, metal, { pos: [s * 0.85, 0.05, 0.1], parent: bar });
    cyl(0.05, 0.05, 1.2, metal, { pos: [s * 0.85, 1.0, -0.35], rot: [0.6, 0, 0], parent: bar });
    // 딥스 손잡이
    cyl(0.045, 0.045, 0.9, metal, { pos: [s * 0.85, 2.15, 0.45], rot: [Math.PI / 2, 0, 0], parent: bar });
    capsule(0.07, 0.35, '#111', { pos: [s * 0.85, 2.15, 0.75], rot: [Math.PI / 2, 0, 0], parent: bar });
    for (const z of [-0.85, 1.05]) rbox(0.18, 0.08, 0.18, 0.03, '#111', { pos: [s * 0.85, 0.04, z], parent: bar });
  }
  cyl(0.055, 0.055, 2.3, metal, { pos: [0, 4.15, 0.1], rot: [0, 0, Math.PI / 2], parent: bar });
  for (const s of [-1, 1]) capsule(0.075, 0.35, '#111', { pos: [s * 0.65, 4.15, 0.1], rot: [0, 0, Math.PI / 2], parent: bar });
  box(1.7, 0.08, 0.08, metal, { pos: [0, 0.5, -0.3], parent: bar });
  rbox(0.9, 0.6, 0.15, 0.06, '#111', { pos: [0, 2.7, -0.05], parent: bar });
  // 매달린 수건
  box(0.4, 0.9, 0.04, '#9ed6c4', { pos: [-0.5, 3.6, 0.2], rot: [0, 0, 0.05], parent: bar });

  // 러그
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), mat('#fbe3ea'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.012, 0.6); rug.receiveShadow = true; scene.add(rug);
  torus(1.9, 0.04, '#ffffff', { pos: [0.2, 0.02, 0.6], rot: [Math.PI / 2, 0, 0], parent: scene, cast: false });
  // 화분
  const plant = group(scene, [-5.2, 0, 4.0]);
  cyl(0.35, 0.28, 0.6, '#f0e6dc', { pos: [0, 0.3, 0], parent: plant });
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; sph(0.32, '#7cc48a', { pos: [Math.cos(a) * 0.25, 1.0 + (i % 3) * 0.25, Math.sin(a) * 0.25], scale: [0.6, 1.2, 0.6], parent: plant }); }

  /* ───── 조명 ───── */
  const hemi = new THREE.HemisphereLight('#ffffff', '#c2a090', 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.position.set(-1.5, 7, -14); sun.target.position.set(-1, 0, 1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#b8c4ff', 0.25);
  fill.position.set(6, 6, 10); scene.add(fill);

  /* Zzz 스프라이트 */
  const zzz = [0, 1, 2].map(i => { const s = textSprite('Z', { bg: false, color: '#c9b8ff', size: 90, scale: 0.5 + i * 0.12 }); s.visible = false; scene.add(s); return s; });

  /* ───── 상태 ───── */
  const st = { time: 18.5, light: false, sleeping: false, zzz: false, phone: false };
  function setTime(h) {
    st.time = h;
    const s = sample(h);
    skyState = { ...s, h: ((h % 24) + 24) % 24 };
    drawSky();
    sun.color.set(s.sun); sun.intensity = s.si;
    hemi.intensity = s.amb * (st.light ? 1.2 : 1);
    hemi.color.set(s.top).lerp(new THREE.Color('#ffffff'), 0.6);
    const mins = ((h % 12) / 12) * Math.PI * 2;
    hourHand.rotation.z = -mins;
    minHand.rotation.z = -((h % 1) * Math.PI * 2);
    scene.background.set(s.top).lerp(new THREE.Color('#1e1630'), 0.7);
    scene.fog.color.copy(scene.background);
  }
  function setLight(on, dur = 0.15) {
    st.light = on;
    return anim(dur, k => {
      const v = on ? k : 1 - k;
      ceilLight.intensity = v * 26;
      shade.material.emissiveIntensity = v * 1.2;
      hemi.intensity = sample(st.time).amb * (1 + v * 0.5);
    });
  }

  function placeLying() {
    mung.root.position.set(-3.6, 0.92, -2.35);
    mung.root.rotation.set(-Math.PI / 2, 0, 0);
    mung.setPose('lie');
  }
  function placeSitting() {
    mung.root.position.set(-3.6, 0.36, -3.4);
    mung.root.rotation.set(0, 0.25, 0);
  }

  const shots = {
    title: shot([-1.0, 4.4, 9.5], [1.6, 1.6, -2], 48),
    wide: shot([0.5, 4.6, 9.5], [0, 1.6, -1.5], 50),
    window: shot([0.2, 2.6, 2.0], [-0.4, 2.9, -5], 50),
    clock: shot([2.4, 3.4, -1.4], [3.4, 3.7, -5], 45),
    door: shot([-1.2, 2.8, 6.0], [-5.2, 1.8, 1.4], 50),
    room: shot([1.5, 3.4, 5.5], [-2.0, 1.2, -1.8], 50),
    bed: shot([-0.8, 2.6, 1.6], [-3.6, 0.9, -3.2], 48),
    face: shot([-2.4, 2.6, -1.9], [-3.6, 0.9, -3.9], 40),
    faceClose: shot([-3.1, 2.1, -3.0], [-3.6, 0.9, -4.0], 34),
    desk: shot([1.5, 2.8, -0.8], [3.2, 2.2, -4.2], 46),
  };

  const sc = {
    scene, shots, setTime, setLight, placeLying, placeSitting, blanket, doorPivot, st, zzz, bagHook,
    focus: {},
    actors: [],
    reset() {
      scene.add(mung.root);
      mung.root.visible = false;
      mung.root.rotation.set(0, 0, 0);
      mung.setPose('idle'); mung.setExpr('open'); mung.walking = 0;
      blanket.visible = false; blanketFold.visible = true;
      doorPivot.rotation.y = 0;
      zzz.forEach(z => (z.visible = false));
      st.zzz = false;
      setTime(18.5);
      setLight(false, 0);
      bagHook.visible = false;
    },
    onEnter() { scene.add(mung.root); },
    update(dt, t) {
      scroll += dt * 20;
      codeT += dt;
      if (codeT > 0.1) { codeT = 0; drawCode(); }
      led.material.emissiveIntensity = 1 + Math.sin(t * 2) * 0.8;
      if (st.zzz) {
        zzz.forEach((z, i) => {
          const p = ((t * 0.35 + i / 3) % 1);
          z.visible = true;
          z.position.set(-3.3 + p * 0.8 + Math.sin(p * 6) * 0.2, 1.4 + p * 1.8, -3.9);
          z.material.opacity = Math.sin(p * Math.PI);
        });
      } else zzz.forEach(z => (z.visible = false));
    },

    /* 시간을 빠르게 흘린다 */
    async flowTime(from, to, dur, label) {
      env.ui.clock(true, fmtTime(from), label);
      await anim(dur, k => {
        const h = from + (to - from) * k;
        setTime(h);
        env.ui.clock(true, fmtTime(h), label);
      }, ease.inOut);
      env.ui.clock(true, fmtTime(to), '');
    },

    /* ───────── 인트로 ───────── */
    async intro(env) {
      const { ui } = env;
      env.cameraSet(shots.title);
      env.cameraTo(shots.window, 4);
      ui.captionOn('째깍… 째깍…  시간이 흐른다');
      await sc.flowTime(18.5, 19.6, 4.5, '⏩ ×900');
      ui.captionOff();
      env.cameraTo(shots.clock, 2.2);
      await sc.flowTime(19.6, 19.85, 2.2, '⏩ ×300');
      await wait(0.3);
      // 퇴근
      env.cameraTo(shots.door, 1.6);
      await wait(1.0);
      sfx.door();
      await anim(0.9, k => (doorPivot.rotation.y = -k * 1.6), ease.out);
      mung.root.visible = true;
      mung.root.position.set(-6.8, 0, 1.7);
      mung.root.rotation.set(0, Math.PI / 2, 0);
      mung.setPose('tired'); mung.setExpr('sleepy');
      mung.walking = 0.6;
      await anim(1.8, k => mung.root.position.x = -6.8 + k * 3.3, ease.linear);
      mung.walking = 0;
      sfx.click();
      await setLight(true);
      mung.root.rotation.y = 0.3;
      anim(0.9, k => (doorPivot.rotation.y = -1.6 * (1 - k)));
      await env.cameraTo(shots.room, 1.4);
      await ui.say('멍뭉', '하아…… 드디어 퇴근……', { onTalk: () => (mung.talk = 1.5) });
      mung.setExpr('sad');
      await ui.say('멍뭉', '회의 네 개에 코드 리뷰까지… 오늘 진짜 길었다…', { onTalk: () => (mung.talk = 2) });
      // 가방 내려놓고 토퍼로
      mung.walking = 0.6;
      mung.root.rotation.y = -2.3;
      const p0 = mung.root.position.clone();
      const p1 = new THREE.Vector3(-3.6, 0.36, -2.1);
      env.cameraTo(shots.bed, 2.2);
      await anim(2.0, k => {
        mung.root.position.lerpVectors(p0, p1, k);
        mung.root.position.y = 0.36 * Math.max(0, k * 3 - 2);
      }, ease.linear);
      mung.walking = 0;
      bagHook.visible = true;
      await anim(0.5, k => {
        mung.root.position.z = -2.1 - k * 1.3;
        mung.root.rotation.y = -2.3 + k * (2.3 + 0.25);
      });
      placeSitting();
      mung.setPose('sitTired'); mung.setExpr('sleepy');
      await wait(0.5);
      ui.captionOn('씻고… 밥 먹고… 멍하니 있다 보니…');
      env.cameraTo(shots.wide, 4);
      await sc.flowTime(19.85, 23.67, 4.5, '⏩ ×3000');
      ui.captionOff();
      await env.cameraTo(shots.bed, 1.5);
      mung.setExpr('open');
      await ui.say('멍뭉', '벌써 11시 40분……? 눈꺼풀이 너무 무거워…', { onTalk: () => (mung.talk = 2) });
      mung.setExpr('sleepy');

      const pick = await ui.choose([
        { label: '😴 누워서 잔다', sub: '그대로 바로 꿈나라로…' },
        { label: '📞 누군가에게 전화한다', sub: '목소리 듣고 자고 싶어…' },
      ]);
      env.state.path = pick ? 'phone' : 'sleep';
      if (pick === 0) await sc.sleepPath(env);
      else await sc.phonePath(env);
    },

    async lieDown() {
      const p0 = mung.root.position.clone();
      mung.setPose('lie');
      await anim(1.2, k => {
        mung.root.position.lerpVectors(p0, new THREE.Vector3(-3.6, 0.92, -2.35), k);
        mung.root.rotation.x = -Math.PI / 2 * k;
        mung.root.rotation.y = 0.25 * (1 - k);
      });
      blanketFold.visible = false;
      blanket.visible = true;
      blanket.scale.set(1, 0.01, 1);
      await anim(0.6, k => blanket.scale.set(1, k, 1), ease.back);
    },

    async sleepPath(env) {
      const { ui } = env;
      await ui.say('멍뭉', '오늘은 그냥… 바로 잘래……', { onTalk: () => (mung.talk = 1.5) });
      await sc.lieDown();
      sfx.click();
      await setLight(false, 0.2);
      mung.setExpr('closed');
      env.cameraTo(shots.face, 2.5);
      await wait(1.2);
      st.zzz = true;
      sfx.snore();
      ui.captionOn('스르륵……');
      await wait(2.2);
      ui.captionOff();
      await env.cameraTo(shots.faceClose, 2);
    },

    async phonePath(env) {
      const { ui } = env;
      mung.setPose('phoneLook'); mung.setExpr('open');
      await wait(0.8);
      sfx.ring();
      env.cameraTo(shot([-2.0, 2.1, -1.2], [-3.6, 1.2, -3.4], 42), 1.5);
      await ui.say('', '📱 "우기 💗" 에게 전화를 건다…  뚜르르…');
      mung.setPose('phone');
      const talk = () => (mung.talk = 1.8);
      await ui.say('우기', '여보세요~? 멍뭉아! 퇴근했어?');
      await ui.say('멍뭉', '응… 방금… 오늘 진짜 힘들었어……', { onTalk: talk });
      await ui.say('우기', '고생했어 ㅠㅠ 밥은 먹었고? 오늘 무슨 일 있었어?');
      await ui.say('멍뭉', '회의가… 네 개나… 그리고… 리뷰가……', { onTalk: talk, speed: 60 });
      mung.setExpr('sleepy');
      await ui.say('우기', '응응, 그래서~?');
      await ui.say('멍뭉', '응……  응………', { onTalk: talk, speed: 110 });
      setLight(false, 1.5);
      await sc.lieDown();
      mung.setPose('phoneLie');
      mung.setExpr('closed');
      await wait(0.6);
      await ui.say('우기', '……멍뭉아? 자……? 후후, 잘 자 💗 좋은 꿈 꿔!');
      mung.setPose('lie');
      st.zzz = true;
      sfx.snore();
      env.cameraTo(shots.face, 2);
      ui.captionOn('통화하다 스르륵……');
      await wait(2.2);
      ui.captionOff();
      await env.cameraTo(shots.faceClose, 2);
    },

    async fallAsleepAgain(env) {
      setTime(23.7);
      setLight(false, 0);
      mung.root.visible = true;
      placeLying(); mung.setExpr('closed');
      blanketFold.visible = false; blanket.visible = true; blanket.scale.set(1, 1, 1);
      st.zzz = true;
      env.cameraSet(shots.face);
      await env.ui.caption('다시… 꿈속으로……', 2);
      await env.cameraTo(shots.faceClose, 1.5);
    },
  };
  return sc;
}
