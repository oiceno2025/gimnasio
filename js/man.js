// Muñeco 3D: chico de gimnasio modelado a mano (aprobado en docs/hombre.html), sin modelos descargados.
// El movimiento sale de `data/moves.js`: cada familia son posturas clave por articulaciones, en cm.
// Brazos y piernas tienen longitud fija. Dos maneras de moverlos:
//   · 'fk': gira cada hueso de una postura a la siguiente (curl, elevaciones, presses: arcos naturales).
//   · 'ik': la mano o el pie siguen una línea y el codo o la rodilla se calculan (barra guiada, pies en el suelo).
import * as THREE from 'three';
import { MOVES, moveFor, moveOf } from './data/moves.js';
import { SKIN } from './skin.js';

const C = SKIN.man;                                        // colores del muñeco según la piel

const V = THREE.Vector3;
export const LEN = { arm: [31, 28], leg: [44, 44], spine: 55, neck: 15.5 };
const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const v3 = a => new V(a[0], a[1], a[2]);
const lerp = (a, b, t) => v3(a).lerp(v3(b), t);
function slerp(a, b, t) {                                  // gira la dirección a hacia b
  const d = Math.min(1, Math.max(-1, a.dot(b))), w = Math.acos(d);
  if (w < 1e-4) return a.clone();
  const s = Math.sin(w); return a.clone().multiplyScalar(Math.sin((1 - t) * w) / s).addScaledVector(b, Math.sin(t * w) / s).normalize();
}
function ik(R, T, [l1, l2], pole) {                         // devuelve [articulación media, extremo]
  const dv = T.clone().sub(R), dir = dv.clone().normalize(); let d = dv.length();
  const max = (l1 + l2) * .995, end = T.clone(); if (d > max) { d = max; end.copy(R).addScaledVector(dir, d); }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - a * a, 0)), p = pole.clone();
  p.addScaledVector(dir, -p.dot(dir)); if (p.lengthSq() < 1e-6) p.set(0, 0, -1); p.normalize();
  return [R.clone().addScaledVector(dir, a).addScaledVector(p, h), end];
}

// Postura en el instante k (0 = inicio, 1 = final). Pura: sirve también para probarla sin pantalla.
export function solve(mv, k) {
  const keys = mv.keys, n = keys.length - 1, x = n ? Math.min(k * n, n - 1e-9) : 0, i = Math.floor(x), t = x - i, A = keys[i], B = keys[Math.min(i + 1, n)];
  const J = { hip: lerp(A.hip, B.hip, t) };
  J.neck = J.hip.clone().addScaledVector(lerp(A.neck, B.neck, t).sub(J.hip).normalize(), LEN.spine);
  J.head = J.neck.clone().addScaledVector(lerp(A.head, B.head, t).sub(lerp(A.neck, B.neck, t)).normalize(), LEN.neck);
  const dir = (P, a, b) => v3(P[b]).sub(v3(P[a])).normalize(), poles = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1, pole = (p, d) => { const q = (p && (p[s] || p)) || d; return new V(q[0] * (p && p[s] ? 1 : sx), q[1], q[2]); };
    const S = J[s + 'S'] = lerp(A[s + 'S'], B[s + 'S'], t), P = J[s + 'P'] = lerp(A[s + 'P'], B[s + 'P'], t);
    const arm = mv.arm?.[s] || mv.arm || 'fk', leg = mv.leg?.[s] || mv.leg || 'ik';
    if (arm === 'fk') { J[s + 'E'] = S.clone().addScaledVector(slerp(dir(A, s + 'S', s + 'E'), dir(B, s + 'S', s + 'E'), t), LEN.arm[0]); J[s + 'H'] = J[s + 'E'].clone().addScaledVector(slerp(dir(A, s + 'E', s + 'H'), dir(B, s + 'E', s + 'H'), t), LEN.arm[1]); }
    else if (arm === 'straight') {                         // brazo recto: gira solo adelante y atrás, la mano no cruza
      const T = lerp(A[s + 'H'], B[s + 'H'], t), full = LEN.arm[0] + LEN.arm[1], dx = T.x - S.x;
      const u = new V(0, T.y - S.y, T.z - S.z).normalize().multiplyScalar(Math.sqrt(Math.max(full * full - dx * dx, 1)));
      J[s + 'H'] = new V(T.x, S.y + u.y, S.z + u.z); J[s + 'E'] = S.clone().lerp(J[s + 'H'], LEN.arm[0] / full);
    } else [J[s + 'E'], J[s + 'H']] = ik(S, lerp(A[s + 'H'], B[s + 'H'], t), LEN.arm, pole(mv.elbow, [.4, 0, -1]));
    const kp = poles[s] = pole(mv.knee, [.2, 0, 1]);
    if (leg === 'fk') { J[s + 'K'] = P.clone().addScaledVector(slerp(dir(A, s + 'P', s + 'K'), dir(B, s + 'P', s + 'K'), t), LEN.leg[0]); J[s + 'F'] = J[s + 'K'].clone().addScaledVector(slerp(dir(A, s + 'K', s + 'F'), dir(B, s + 'K', s + 'F'), t), LEN.leg[1]); }
    else [J[s + 'K'], J[s + 'F']] = ik(P, lerp(A[s + 'F'], B[s + 'F'], t), LEN.leg, kp);
  }
  return { J, poles };
}
// Ritmo de una repetición: ida rápida, pausa corta, vuelta lenta.
export function phase(ph, tempo = [.32, .10]) {
  const ease = t => .5 - .5 * Math.cos(Math.PI * t), [up, hold] = tempo;
  return ph < up ? ease(ph / up) : ph < up + hold ? 1 : 1 - ease((ph - up - hold) / (1 - up - hold));
}

// `ex`: el ejercicio del catálogo (elige postura y material). Sin él, `move` es el nombre de una familia.
// `flip`: el muñeco en espejo, para el segundo lado de un estiramiento.
export function mountMan(canvas, { ex = null, move = 'stand', hot = null, spin = false, yaw, k = null, flip = false } = {}) {
  const mv = ex ? moveOf(ex) : MOVES[moveFor(move)], cmv = v => v.clone().multiplyScalar(.01);
  hot ??= ex?.muscles ?? mv.hot ?? [];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 50), rig = new THREE.Group(), world = new THREE.Group(); scene.add(rig, world); rig.add(camera); if (flip) world.scale.x = -1;
  for (const [color, power, pos] of C.lights) { const l = new THREE.DirectionalLight(color, power); l.position.set(...pos); rig.add(l); }
  scene.add(new THREE.HemisphereLight(...C.hemi));
  const R = mv.floor ?? .62, flat = (g, o) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: C.ring, transparent: true, opacity: o })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; };
  flat(new THREE.RingGeometry(R, R + .02, 96), .8); flat(new THREE.CircleGeometry(R, 96), .12).position.y = -.001;

  const std = (color, roughness = .7) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const MAT = { skin: std(C.skin, .6), top: std(C.top, .85), shorts: std(C.shorts, .9), hair: std(C.hair, .9), shoe: std(C.shoe, .7), sole: std(C.sole, .6),
    hot: new THREE.MeshStandardMaterial({ color: C.hot, emissive: C.hotGlow[0], emissiveIntensity: C.hotGlow[1], roughness: .55, side: THREE.DoubleSide }) };
  const steel = new THREE.MeshStandardMaterial({ color: C.steel, roughness: .35, metalness: .6 }), dark = std(C.dark, .7);

  // ----- cuerpo: piezas que van de un punto a otro; `key` es el músculo que las enciende -----
  const man = new THREE.Group(), parts = [], mix = (a, b, t) => a.clone().lerp(b, t); world.add(man);
  function limb(from, to, rA, rB, mat, { half, key, depth = 1, ref } = {}) {
    const th = half === 'front' ? [-Math.PI / 2, Math.PI] : half === 'back' ? [Math.PI / 2, Math.PI] : [0, Math.PI * 2];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rB * .01, rA * .01, 1, 28, 1, false, th[0], th[1]), mat);
    if (half) { m.material = mat.clone(); m.material.side = THREE.DoubleSide; }
    man.add(m); parts.push({ m, from, to, key, base: m.material, depth, ref });
  }
  function ball(at, r, mat, { key, scale = [1, 1, 1], ref, side } = {}) { const m = new THREE.Mesh(new THREE.SphereGeometry(r * .01, 28, 20), mat); man.add(m); parts.push({ m, at, key, base: mat, ball: scale, ref, side }); return m; }
  const sp = (J, t) => mix(J.hip, J.neck, t);
  limb(J => sp(J, -.06), J => sp(J, .26), 17.6, 14.6, MAT.shorts, { depth: .6, ref: 'torso' });
  ball(J => sp(J, -.06), 17.6, MAT.shorts, { scale: [1, .45, .6], ref: 'torso' });
  for (const [h, k1, k2] of [['front', 'abs', 'chest'], ['back', 'lowback', 'back']]) {
    limb(J => sp(J, .26), J => sp(J, .56), 14.6, 16.8, MAT.top, { half: h, key: k1, depth: .6, ref: 'torso' });
    limb(J => sp(J, .56), J => sp(J, .93), 16.8, 20.4, MAT.top, { half: h, key: k2, depth: .6, ref: 'torso' });
  }
  ball(J => sp(J, .93), 20.4, MAT.top, { scale: [1, .36, .6], ref: 'torso' });
  limb(J => sp(J, .93), J => mix(J.neck, J.head, .6), 6.2, 5.6, MAT.skin, { ref: 'torso' });
  ball(J => J.head, 10, MAT.skin, { scale: [.9, 1.1, 1], ref: 'head' });
  ball(J => J.head, 10.5, MAT.hair, { scale: [.92, 1.08, 1.02], ref: 'hair' }).geometry = new THREE.SphereGeometry(.105, 28, 20, 0, Math.PI * 2, 0, Math.PI * .52).rotateX(-.42);   // media esfera
  for (const s of ['L', 'R']) {
    ball(J => J[s + 'S'], 8.4, MAT.skin, { key: 'delts' });
    limb(J => J[s + 'S'], J => J[s + 'E'], 7.2, 5.6, MAT.skin, { half: 'front', key: 'biceps' });
    limb(J => J[s + 'S'], J => J[s + 'E'], 7.2, 5.6, MAT.skin, { half: 'back', key: 'triceps' });
    ball(J => J[s + 'E'], 5.6, MAT.skin);
    limb(J => J[s + 'E'], J => J[s + 'H'], 5.5, 3.9, MAT.skin, { key: 'forearm' });
    ball(J => J[s + 'H'], 4.9, MAT.skin, { scale: [.85, 1.05, 1] });
    ball(J => J[s + 'P'], 9.6, MAT.shorts, { key: 'glutes', ref: 'glute', scale: [1, 1, .9] });
    limb(J => J[s + 'P'], J => mix(J[s + 'P'], J[s + 'K'], .46), 9.6, 8.9, MAT.shorts);
    limb(J => mix(J[s + 'P'], J[s + 'K'], .3), J => J[s + 'K'], 9, 6.4, MAT.skin, { half: 'front', key: 'quads', ref: 'leg', side: s });
    limb(J => mix(J[s + 'P'], J[s + 'K'], .3), J => J[s + 'K'], 9, 6.4, MAT.skin, { half: 'back', key: 'hams', ref: 'leg', side: s });
    ball(J => J[s + 'K'], 6.4, MAT.skin);
    limb(J => J[s + 'K'], J => J[s + 'F'], 6.4, 4.3, MAT.skin, { key: 'calves' });
    ball(J => J[s + 'F'], 4.6, MAT.shoe, { scale: [1.02, 1, 2.3], ref: 'shoe', side: s });
    ball(J => J[s + 'F'], 4.7, MAT.sole, { scale: [1.1, .34, 2.4], ref: 'sole', side: s });
  }
  parts.forEach(p => { p.side ??= null; });

  const mat4 = new THREE.Matrix4(), up = new V(0, 1, 0);
  function basis(y, fwd) { let z = fwd.clone().addScaledVector(y, -fwd.dot(y)); if (z.lengthSq() < 1e-4) z = new V(0, 1, 0).addScaledVector(y, -y.y); z.normalize(); return mat4.makeBasis(new V().crossVectors(y, z), y, z); }
  function apply(Jc, poles) {
    const J = {}; for (const n in Jc) J[n] = cmv(Jc[n]);
    const spine = J.neck.clone().sub(J.hip).normalize(), fwd = new V().crossVectors(J.LS.clone().sub(J.RS).normalize(), spine).normalize();
    const hB = basis(J.head.clone().sub(J.neck).normalize(), fwd).clone(), hx = new V(), hy = new V(), hz = new V(); hB.extractBasis(hx, hy, hz);
    const foot = {}; for (const s of ['L', 'R']) {            // el pie apunta hacia donde dobla la rodilla
      const shin = J[s + 'K'].clone().sub(J[s + 'F']).normalize(), d = poles[s].clone().normalize(); d.addScaledVector(shin, -d.dot(shin));
      if (d.lengthSq() < 1e-4) d.copy(fwd).addScaledVector(shin, -fwd.dot(shin));
      if (d.lengthSq() < 1e-4) d.set(0, 1, 0).addScaledVector(shin, -shin.y);
      d.normalize();
      foot[s] = { d, shin, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V().crossVectors(shin, d), shin, d)) };
    }
    for (const p of parts) {
      p.m.material = p.key && hot.includes(p.key) ? MAT.hot : p.base;
      if (p.ball) {
        const c = p.at(J); p.m.scale.set(...p.ball); p.m.quaternion.identity();
        if (p.ref === 'torso') p.m.quaternion.setFromRotationMatrix(basis(spine, fwd));
        else if (p.ref === 'glute') c.addScaledVector(fwd, -.034).addScaledVector(spine, -.03);
        else if (p.ref === 'head') p.m.quaternion.setFromRotationMatrix(hB);
        else if (p.ref === 'hair') { p.m.quaternion.setFromRotationMatrix(hB); c.addScaledVector(hy, .012).addScaledVector(hz, -.012); }
        else if (p.ref === 'shoe') { const f = foot[p.side]; p.m.quaternion.copy(f.q); c.addScaledVector(f.d, .045).addScaledVector(f.shin, -.002); }
        else if (p.ref === 'sole') { const f = foot[p.side]; p.m.quaternion.copy(f.q); c.addScaledVector(f.d, .045).addScaledVector(f.shin, -.034); }
        p.m.position.copy(c);
      } else {
        const a = p.from(J), b = p.to(J), y = b.clone().sub(a), len = y.length(); y.normalize();
        p.m.quaternion.setFromRotationMatrix(basis(y, fwd)); p.m.position.copy(a).add(b).multiplyScalar(.5); p.m.scale.set(1, len, p.depth);
      }
    }
    return { J, spine, fwd };
  }

  // ----- material: sale del ejercicio (barra, mancuernas, polea, máquina, kettlebell), no solo del movimiento -----
  // Todo son piezas simples hechas aquí mismo: no se descarga nada y no pesa.
  const gear = new THREE.Group(); world.add(gear);
  const orange = new THREE.MeshStandardMaterial({ color: C.accent, roughness: .6 }), ropeMat = std(0xd9cfb8, .9), frame = std(C.frame, .6), wire = std(C.wire, .5);
  const cyl = (r, mat = steel, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat); gear.add(m); return m; };
  const box = (w, h, d, mat = dark) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * .01, h * .01, d * .01), mat); gear.add(m); return m; };
  const between = (m, a, b) => { const d = b.clone().sub(a), len = d.length() || 1e-4; m.scale.set(1, len, 1); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  const P = mv.props || {}, g = {}, pt = a => new V(a[0], a[1], a[2]).multiplyScalar(.01), sides = v => ['L', 'R'].filter(s => v === true || v === 'both' || v === s);
  const mkBell = () => { const o = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(.095, 32, 20), steel), h = new THREE.Mesh(new THREE.TorusGeometry(.055, .014, 12, 32), steel); b.position.y = -.15; h.position.y = -.05; o.add(b, h); gear.add(o); return o; };
  const mkDb = () => { const o = new THREE.Group(), h = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .2, 12), steel); h.rotation.z = Math.PI / 2; o.add(h); for (const x of [-.085, .085]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .05, 20), dark); d.rotation.z = Math.PI / 2; d.position.x = x; o.add(d); } gear.add(o); return o; };
  if (P.bar) { g.bar = cyl(.014); if (P.plates) g.plates = [cyl(P.plates * .01, dark, 28), cyl(P.plates * .01, dark, 28)]; }
  if (P.smith) g.smith = [cyl(.02, frame, 12), cyl(.02, frame, 12)];
  if (P.cable) g.cable = cyl(.0065, wire, 8);
  if (P.rope) g.rope = [cyl(.009, ropeMat, 8), cyl(.009, ropeMat, 8)];
  if (P.cables) g.cables = sides(P.only || true).map(s => ({ s, m: cyl(.0065, wire, 8) }));
  if (P.arms) g.arms = ['L', 'R'].map(s => ({ s, m: cyl(.02, frame, 12), h: cyl(.016, steel, 12) }));
  if (P.db) g.db = (P.db === 'mid' ? ['M'] : sides(P.db)).map(s => ({ o: mkDb(), s }));
  if (P.bell) g.bell = (P.bell === true ? ['M'] : sides(P.bell)).map(s => ({ o: mkBell(), s }));
  if (P.seat) { g.seat = box(36, 6, 38); g.post = cyl(.03, dark, 12); }
  if (P.bench) g.bench = box(34, 115, 7);
  if (P.pad) g.pad = box(34, 62, 6);
  if (P.plate) g.plate = box(50, 50, 4, frame);
  if (P.roller) { g.roller = cyl(.045, dark, 20); g.rarm = [cyl(.014, frame, 10), cyl(.014, frame, 10)]; }
  if (P.hipbar) { g.hipbar = cyl(.014); g.hplates = [cyl(.2, dark, 28), cyl(.2, dark, 28)]; }
  g.attach = (P.attach || []).map(a => ({ ...a, m: box(...a.box, a.metal ? frame : dark) }));
  g.band = (P.band || []).map(b => ({ ...b, m: cyl(.009, orange, 8) }));
  if (P.mat) { const m = box(66, 1.2, 190, std(C.mat, .95)); m.position.set(0, .006, P.mat === true ? 0 : P.mat * .01); }
  for (const [w, h, d, x, y, z, rx] of P.boxes || []) { const m = box(w, h, d, h > 100 || w < 9 ? frame : dark); m.position.set(x * .01, y * .01, z * .01); if (rx) m.rotation.x = rx; }
  function place({ J, spine, fwd }) {
    const mid = J.LH.clone().add(J.RH).multiplyScalar(.5), at = n => (n === 'M' ? mid : n === 'hip' || n === 'neck' || n === 'head' ? J[n] : n === 'shoulders' ? J.LS.clone().add(J.RS).multiplyScalar(.5) : n === 'feet' ? J.LF.clone().add(J.RF).multiplyScalar(.5) : n === 'knees' ? J.LK.clone().add(J.RK).multiplyScalar(.5) : J[n]);
    const elbow = s => (s === 'M' ? J.LE.clone().add(J.RE).multiplyScalar(.5) : J[s + 'E']), hand = s => (s === 'M' ? mid : J[s + 'H']);
    if (g.bar) {
      const d = J.LH.clone().sub(J.RH).normalize(), half = (P.bar === true ? 1.15 : P.bar * .01) / 2, a = mid.clone().addScaledVector(d, -half), b = mid.clone().addScaledVector(d, half);
      between(g.bar, a, b); g.plates?.forEach((m, i) => { const e = i ? b : a; between(m, e.clone().addScaledVector(d, i ? -.07 : .03), e.clone().addScaledVector(d, i ? -.03 : .07)); });
      g.smith?.forEach((m, i) => { const e = i ? b : a; between(m, new V(e.x * .9, 0, e.z), new V(e.x * .9, 2.2, e.z)); });
    }
    if (g.cable) between(g.cable, mid, pt(P.cable));
    if (g.rope) ['L', 'R'].forEach((s, i) => between(g.rope[i], mid.clone().lerp(pt(P.cable || [0, 0, 0]), P.cable ? .06 : 0), J[s + 'H']));
    if (g.cables) for (const { s, m } of g.cables) between(m, J[s + (P.joint || 'H')], new V(P.cables[0] * (s === 'R' ? -1 : 1), P.cables[1], P.cables[2]).multiplyScalar(.01));
    if (g.arms) for (const { s, m, h } of g.arms) { const piv = new V(P.arms[0] * (s === 'R' ? -1 : 1), P.arms[1], P.arms[2]).multiplyScalar(.01), H = J[s + 'H'], ax = v3(P.grip || [1, 0, 0]).normalize(); between(m, piv, H); between(h, H.clone().addScaledVector(ax, -.07), H.clone().addScaledVector(ax, .07)); }
    if (g.db) for (const { o, s } of g.db) { o.position.copy(hand(s)); const fore = hand(s).clone().sub(elbow(s)).normalize(), ax = v3(P.dbAxis || [1, 0, 0]); ax.addScaledVector(fore, -ax.dot(fore)); if (ax.lengthSq() < 1e-4) ax.set(0, 0, 1); o.quaternion.setFromUnitVectors(new V(1, 0, 0), ax.normalize()); }
    if (g.bell) for (const { o, s } of g.bell) { o.position.copy(hand(s)); o.quaternion.setFromUnitVectors(new V(0, -1, 0), P.bellDown ? new V(0, -1, 0) : hand(s).clone().sub(elbow(s)).normalize()); }
    if (g.seat) { g.seat.position.set(0, J.hip.y - .15, J.hip.z + .08); between(g.post, new V(0, 0, J.hip.z + .08), new V(0, g.seat.position.y, J.hip.z + .08)); }
    for (const [mesh, t, off] of [[g.bench, .5, -.135], [g.pad, .62, P.pad === 'front' ? .15 : -.125]]) if (mesh) { mesh.position.copy(J.hip.clone().lerp(J.neck, t)).addScaledVector(fwd, off); mesh.quaternion.setFromRotationMatrix(basis(spine, fwd)); }
    if (g.plate) { const d = v3(P.plate).normalize(); g.plate.position.copy(at('feet')).addScaledVector(d, .07); g.plate.quaternion.setFromUnitVectors(new V(0, 0, 1), d); }
    if (g.roller) {                                           // rodillo de la máquina de extensión o de curl de pierna
      const shin = at('feet').clone().sub(at('knees')).normalize(), side = v3(P.roller).normalize(); side.addScaledVector(shin, -side.dot(shin)).normalize();
      const c = at('feet').clone().addScaledVector(side, .085).addScaledVector(shin, -.06), x = new V(.24, 0, 0);
      between(g.roller, c.clone().sub(x), c.clone().add(x)); g.rarm.forEach((m, i) => between(m, at('knees').clone().add(x.clone().multiplyScalar(i ? 1 : -1)), c.clone().add(x.clone().multiplyScalar(i ? 1 : -1))));
    }
    if (g.hipbar) { const c = J.hip.clone().addScaledVector(fwd, .12), x = new V(.8, 0, 0); between(g.hipbar, c.clone().sub(x), c.clone().add(x)); g.hplates.forEach((m, i) => between(m, c.clone().add(x.clone().multiplyScalar(i ? .92 : -.92)), c.clone().add(x.clone().multiplyScalar(i ? .98 : -.98)))); }
    for (const a of g.attach) { a.m.position.copy(at(a.at)).add(pt(a.off || [0, 0, 0])); if (a.body) { a.m.position.copy(at(a.at)).addScaledVector(fwd, (a.off?.[2] || 0) * .01).addScaledVector(spine, (a.off?.[1] || 0) * .01); a.m.quaternion.setFromRotationMatrix(basis(spine, fwd)); } }
    for (const b of g.band) between(b.m, at(b.a), at(b.b));
  }

  // ----- giro y bucle -----
  let ang = yaw ?? mv.yaw ?? .6, goal = null, drag = null, turning = spin && !still, dead = false;
  const down = e => { drag = e.clientX; goal = null; turning = false; canvas.setPointerCapture(e.pointerId); }, moveP = e => { if (drag !== null) { ang -= (e.clientX - drag) * .01; drag = e.clientX; } }, upP = () => { drag = null; };
  const lost = e => e.preventDefault();
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', moveP); canvas.addEventListener('pointerup', upP); canvas.addEventListener('pointercancel', upP);
  canvas.addEventListener('webglcontextlost', lost);       // al volver de segundo plano el iPhone puede soltar el contexto; three lo recupera solo
  function draw(kk, a) {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height, pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const { J, poles } = solve(mv, kk); place(apply(J, poles));
    const look = mv.look ?? .95; rig.rotation.y = a; camera.position.set(0, look + .25, mv.dist ?? 5.4); camera.lookAt(0, look, 0);
    renderer.render(scene, camera);
  }
  const fixed = k ?? (still ? 1 : null);
  renderer.setAnimationLoop(now => {
    if (dead) return;
    if (turning) ang += .006;
    if (goal !== null) { const d = ((goal - ang + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; ang += d * .14; if (Math.abs(d) < .003) { ang = goal; goal = null; } }
    const ph = (now % mv.dur) / mv.dur;
    draw(fixed ?? (mv.keys.length < 2 ? 0 : mv.loop ? ph : phase(ph, mv.tempo)), ang);     // `loop`: gira siempre en el mismo sentido (pedales)
  });
  return {
    view(a) { goal = a; turning = false; },
    frame(kk, a) { draw(kk, a); },                           // un fotograma suelto, para las tiras de revisión
    destroy() { dead = true; renderer.setAnimationLoop(null); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', moveP); canvas.removeEventListener('pointerup', upP); canvas.removeEventListener('pointercancel', upP); canvas.removeEventListener('webglcontextlost', lost);
      scene.traverse(o => { o.geometry?.dispose(); }); renderer.dispose(); },
  };
}
