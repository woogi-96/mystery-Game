import { THREE, box, rbox, cyl, sph, group, mat, emissive, textSprite, anim, wait, ease, sparkles } from '../util.js';

/* 씬 공용 도우미 */
export function place(scene, ch, pos, rotY = 0, pose = 'idle', expr = 'open') {
  scene.add(ch.root);
  ch.root.visible = true;
  ch.root.position.set(...pos);
  ch.root.rotation.set(0, rotY, 0);
  ch.walking = 0;
  ch.setPose(pose);
  ch.setExpr(expr);
  return ch;
}

export function talker(ui) {
  return (ch, name, text, o = {}) => ui.say(name, text, { ...o, onTalk: () => { if (ch) ch.talk = Math.min(3, text.length * 0.06); } });
}

/* 걷기: 목표 지점까지 이동 + 방향 전환 */
export async function walkTo(ch, x, z, speed = 2.2, finalRot) {
  const p0 = ch.root.position.clone();
  const p1 = new THREE.Vector3(x, p0.y, z);
  const dist = p0.distanceTo(p1);
  if (dist < 0.01) return;
  ch.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  ch.walking = 1;
  const prev = ch.pose;
  if (['sitChair', 'type', 'slump', 'sitFloor', 'drive'].includes(prev)) ch.setPose('idle');
  await anim(dist / speed, k => ch.root.position.lerpVectors(p0, p1, k), ease.linear);
  ch.walking = 0;
  if (finalRot != null) await turnTo(ch, finalRot, 0.3);
}
export function turnTo(ch, rot, dur = 0.4) {
  const r0 = ch.root.rotation.y;
  let d = rot - r0;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return anim(dur, k => (ch.root.rotation.y = r0 + d * k));
}

/* 머리 위 말풍선 아이콘 (! ? 💢 등) */
export function emote(scene, ch, text, dur = 1.8, o = {}) {
  const s = textSprite(text, { size: 80, scale: o.scale || 0.6, ...o });
  scene.add(s);
  const hp = new THREE.Vector3();
  const upd = () => {
    ch.head.getWorldPosition(hp);
    s.position.set(hp.x, hp.y + (ch.human ? 1.0 : 1.35), hp.z);
  };
  upd();
  s.material.opacity = 0;
  anim(0.25, k => { s.material.opacity = k; s.position.y += 0.01; upd(); s.position.y += (1 - k) * -0.3; }, ease.back);
  if (dur > 0) wait(dur).then(() => anim(0.3, k => (s.material.opacity = 1 - k)).then(() => scene.remove(s)));
  return s;
}

/* 교실/사무실 의자 */
export function chair(parent, x, z, rotY = 0, color = '#6f8fb8') {
  const g = group(parent, [x, 0, z], [0, rotY, 0]);
  const leg = mat('#9aa3ad', { metalness: 0.5, roughness: 0.4 });
  for (const [a, b] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(0.035, 0.035, 0.78, leg, { pos: [a, 0.39, b], parent: g });
  rbox(0.85, 0.08, 0.85, 0.03, color, { pos: [0, 0.8, 0], parent: g });
  rbox(0.85, 0.7, 0.07, 0.03, color, { pos: [0, 1.25, -0.42], parent: g });
  return g;
}
export function desk(parent, x, z, rotY = 0, top = '#e8cfa6', w = 1.6, d = 1.0, h = 1.25) {
  const g = group(parent, [x, 0, z], [0, rotY, 0]);
  rbox(w, 0.08, d, 0.02, top, { pos: [0, h, 0], parent: g });
  const leg = mat('#8a939c', { metalness: 0.5, roughness: 0.4 });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.035, 0.035, h, leg, { pos: [a * (w / 2 - 0.08), h / 2, b * (d / 2 - 0.08)], parent: g });
  box(w - 0.15, 0.25, d - 0.2, '#c9b08a', { pos: [0, h - 0.18, 0], parent: g });
  return g;
}

/* 하이라이트 링 (단서 표시) */
export function marker(scene) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: '#ff8fb1', transparent: true, opacity: 0, depthTest: false }));
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 20;
  scene.add(ring);
  return {
    ring,
    show(pos, r = 0.5) {
      ring.position.copy(pos);
      ring.userData.r = r / 0.5;
      ring.material.opacity = 1;
    },
    hide() { ring.material.opacity = 0; },
    update(t) {
      ring.rotation.z = t;
      ring.material.opacity = Math.max(0, ring.material.opacity - 0.002);
      ring.scale.setScalar((ring.userData.r || 1) * (1 + Math.sin(t * 5) * 0.08));
    },
  };
}

/* 꿈 분위기: 반짝이 + 몽환 안개 */
export function dreamy(scene, area, color) {
  const sp = sparkles(160, area, color || 0xffe0ff, 0.14);
  scene.add(sp);
  return sp;
}

/* 깜빡이는 감정 표현 숫자 */
export function sweat(scene, ch) {
  const d = sph(0.06, emissive('#9fd8ff', 0.6, { transparent: true, opacity: 0.85 }), { parent: scene, cast: false });
  d.scale.set(0.8, 1.3, 0.8);
  return {
    mesh: d,
    update(t) {
      const p = ((t * 0.8) % 1);
      const hp = new THREE.Vector3();
      ch.head.getWorldPosition(hp);
      d.position.set(hp.x + 0.45, hp.y + 0.2 - p * 0.5, hp.z + 0.2);
      d.material.opacity = 1 - p;
    },
  };
}
