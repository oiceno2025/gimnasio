// Movimientos del muñeco. Un ejercicio se enseña con dos cosas:
//   · la POSTURA: su familia (`move` en el catálogo) o, si se hace en otra posición, una variante (tabla SHOW).
//   · el MATERIAL: sale de su `equip` (barra, mancuernas, polea, máquina, kettlebell…) con la tabla `gear` de cada movimiento.
// Así «curl con barra», «curl con mancuernas» y «curl en polea» comparten el gesto pero no se ven iguales,
// y «curl predicador» o «curl femoral tumbado» tienen su propia postura.
//
// Ejes: x hacia la izquierda del muñeco, y arriba, z hacia delante. Unidades: cm.
// Una postura se describe con el cuerpo, no punto a punto:
//   hip   posición de la cadera            lean  inclinación del tronco en grados (+ hacia delante, −90 tumbado boca arriba, 90 boca abajo)
//   ua/fa dirección del brazo y del antebrazo (lado izquierdo; el derecho es su espejo salvo que se dé en `R`)
//   F     dónde está el pie (la rodilla se calcula)   ·   th/sh dirección de muslo y espinilla (cuando el pie va libre)
//   H     mano en un punto fijo (barra guiada, manos en el suelo), con `arm: 'ik'`
//   sx    línea de los hombros (para tumbarse de lado o girar)   hd  hacia dónde va la cabeza   R  lo que cambia en el lado derecho
// Material (`props`): bar (largo) + plates (radio de los discos) · db · bell · cable/cables (punto de la polea) · rope · arms (eje de la
// palanca de una máquina) · seat · bench · pad ('front' = apoyo de pecho) · roller · plate · hipbar · smith · attach · band · boxes · mat.
// Cada postura nueva se revisa con tools/tira.html (de frente y de lado) antes de darla por buena.

const RAD = Math.PI / 180;
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const add = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

export function pose(o = {}) {
  const lean = (o.lean ?? 0) * RAD, sp = [0, Math.cos(lean), Math.sin(lean)], hip = o.hip ?? [0, 93, 0];
  const sx = norm(o.sx ?? [1, 0, 0]), px = norm(o.px ?? o.sx ?? [1, 0, 0]);
  const neck = add(hip, sp, 55), J = { hip, neck, head: add(neck, norm(o.hd ?? sp), 15.5) }, sc = add(hip, sp, 50 + (o.shrug ?? 0));
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    const mir = v => (s === 'R' ? [-v[0], v[1], v[2]] : v), get = k => (s === 'R' && o.R?.[k]) || (o[k] && mir(o[k]));
    const S = J[s + 'S'] = add(sc, sx, 20 * sg), P = J[s + 'P'] = add(hip, px, 9 * sg);
    J[s + 'E'] = add(S, norm(get('ua') ?? mir([.15, -1, -.08])), 31);
    J[s + 'H'] = get('H') ?? add(J[s + 'E'], norm(get('fa') ?? mir([-.03, -1, .2])), 28);
    const th = s === 'R' && o.R?.F && !o.R?.th ? null : get('th');       // si el lado derecho da su pie, no hereda el muslo del izquierdo
    if (th) { J[s + 'K'] = add(P, norm(th), 44); J[s + 'F'] = add(J[s + 'K'], norm(get('sh') ?? [0, -1, 0]), 44); }
    else { J[s + 'F'] = get('F') ?? mir([11, 5, 0]); J[s + 'K'] = add(P, [0, -1, .05], 44); }
  }
  return J;
}
// Posturas antiguas, punto a punto (las dos aprobadas en docs/hombre.html).
const raw = p => { const o = { head: p.head, neck: p.neck, hip: p.hip }; for (const k of ['S', 'E', 'H', 'P', 'K', 'F']) { o['L' + k] = p[k]; o['R' + k] = [-p[k][0], p[k][1], p[k][2]]; } return o; };

// ---------- piezas que se repiten ----------
const HANG = { ua: [.15, -1, -.08], fa: [0, -1, .05] };
const SEAT = { hip: [0, 52, 0], F: [14, 5, 42] };                       // sentado, pies en el suelo
const SUP = { hip: [0, 48, 25], lean: -90, F: [18, 5, 62] };            // tumbado boca arriba en un banco
const FLOOR = { hip: [0, 12, 20], lean: -90 };                          // tumbado boca arriba en el suelo
const BAR = { bar: 170, plates: 20 }, EZ = { bar: 105, plates: 9 }, DB = { db: true }, DBN = { db: true, dbAxis: [0, 0, 1] };
const tower = (z, x = 0) => [9, 230, 9, x, 115, z];                     // columna de polea
const BENCH = [110, 42, 30, 0, 21, -64];                                // banco atravesado, para apoyar la espalda
const kneePad = s => ({ at: s + 'K', box: [5, 16, 22], off: [s === 'L' ? 9 : -9, 0, 0] }), kneePadIn = s => ({ at: s + 'K', box: [5, 16, 22], off: [s === 'L' ? -7 : 7, 0, 0] });
const SHOULDER_PADS = [{ at: 'LS', box: [13, 7, 18], off: [0, 10, 0] }, { at: 'RS', box: [13, 7, 18], off: [0, 10, 0] }];
const KNEE_STEP = { attach: [{ at: 'knees', box: [44, 6, 30], off: [0, -6, -16], metal: true }] };       // plataforma de las máquinas asistidas
const BAND = { band: [{ a: 'LK', b: 'RK' }] };
const jalon = (grip, wide) => [
  raw({ head: [0, 121, 2], neck: [0, 106, 0], hip: [0, 51, 0], S: [18, 106, 0], E: [31, 131, 4], H: [grip, 160, 6], P: [9, 51, 0], K: [12, 52, 40], F: [12, 6, 38] }),
  raw({ head: [0, 122, -3], neck: [0, 107, -5], hip: [0, 51, 0], S: [20, 101, -4], E: [35, 74, -10], H: [grip, wide ? 108 : 101, 12], P: [9, 51, 0], K: [12, 52, 40], F: [12, 6, 38] })];
const JALON_GEAR = bar => ({ seat: true, bar, cable: [0, 226, 6], boxes: [tower(74), [9, 9, 78, 0, 228, 38], [34, 8, 14, 0, 62, 30]] });
const PULLUP_GEAR = { bar: 130, boxes: [[6, 222, 6, 66, 111, 0], [6, 222, 6, -66, 111, 0]] };
const squatKeys = (low, high, stance = 17) => [
  pose({ hip: [0, 52, -24], lean: 38, F: [stance, 5, 0], hd: [0, .9, .45], ...low }),
  pose({ hip: [0, 93, 0], lean: 2, F: [stance, 5, 0], ...high })];
const hingeKeys = (low, high) => [pose({ hip: [0, 88, -20], lean: 64, hd: [0, .7, .7], ...low }), pose({ ...high })];
// Barra apoyada en el cuerpo: las manos siguen a la barra (`arm: 'ik'`), que se queda en su sitio aunque el tronco se incline.
const BACK_LOW = { H: [36, 101, 4] }, BACK_HIGH = { H: [36, 149, -8] }, FRONT_LOW = { H: [22, 87, 16] }, FRONT_HIGH = { H: [22, 145, 10] };
const supKeys = (a, b, base = SUP) => [pose({ ...base, ...a }), pose({ ...base, ...b })];
const INCL = { hip: [0, 46, 8], lean: -55, F: [17, 5, 58] };            // recostado en banco inclinado
const BENT = { hip: [0, 86, -14], lean: 58, hd: [0, .75, .65] };        // de pie, tronco inclinado
const QUAD = { hip: [0, 47, -28], lean: 87, th: [0, -1, 0], sh: [0, -.04, -1], hd: [0, .25, .97] };   // a cuatro patas
const RACK = { ua: [.3, -.9, .32], fa: [-.4, .72, .55] };               // pesa cogida delante del pecho

export const MOVES = {
  stand: { keys: [pose()], dur: 1, look: .95 },
  walk: { dur: 1100, tempo: [.5, 0], look: .95, props: { boxes: [[70, 8, 150, 0, -1, 0], [6, 110, 6, 30, 55, 62], [6, 110, 6, -30, 55, 62], [66, 5, 5, 0, 110, 62]] }, keys: [
    pose({ hip: [0, 92, 0], F: [11, 5, 22], ua: [.12, -1, -.3], fa: [0, -.8, .4], R: { F: [-11, 11, -18], ua: [-.12, -1, .3], fa: [0, -.5, .85] } }),
    pose({ hip: [0, 92, 0], F: [11, 11, -18], ua: [.12, -1, .3], fa: [0, -.5, .85], R: { F: [-11, 5, 22], ua: [-.12, -1, -.3], fa: [0, -.8, .4] } })] },

  // ---------- tirón ----------
  'pull-down': { dur: 3200, look: .95, arm: 'ik', elbow: [1, -1, -.2], props: JALON_GEAR(115), keys: jalon(42) },
  'pull-down-wide': { dur: 3200, look: .95, arm: 'ik', elbow: [1, -.6, -.3], props: JALON_GEAR(135), keys: jalon(58, true) },
  'pull-down-close': { dur: 3200, look: .95, arm: 'ik', elbow: [.25, -1, .7], props: JALON_GEAR(44), keys: jalon(16) },
  'pull-up': { dur: 3200, look: 1.3, dist: 6.4, arm: 'ik', leg: 'fk', elbow: [1, -1, -.25], props: PULLUP_GEAR, keys: [
    pose({ hip: [0, 108, 0], H: [30, 215, 0], th: [0, -1, .12], sh: [0, -.8, -.6] }),
    pose({ hip: [0, 151, 4], lean: -6, H: [30, 215, 0], th: [0, -1, .2], sh: [0, -.8, -.6] })] },
  'pull-up-close': { dur: 3200, look: 1.3, dist: 6.4, arm: 'ik', leg: 'fk', elbow: [.2, -1, .8], props: PULLUP_GEAR, keys: [
    pose({ hip: [0, 108, 0], H: [15, 215, 0], th: [0, -1, .12], sh: [0, -.8, -.6] }),
    pose({ hip: [0, 150, -6], lean: 4, H: [15, 215, 0], th: [0, -1, .2], sh: [0, -.8, -.6] })] },
  'row-seated': { dur: 3000, look: .75, knee: [0, 1, .1],
    props: { seat: true, cables: [5, 62, 150], boxes: [[44, 30, 6, 0, 32, 84], tower(152)] },
    gear: { maquina: { seat: true, pad: 'front', arms: [26, 34, 96], grip: [0, 1, 0], boxes: [[44, 30, 6, 0, 32, 84]] } }, keys: [
    pose({ hip: [0, 50, 0], lean: 12, F: [12, 32, 78], ua: [.05, -.35, 1], fa: [-.02, -.15, 1] }),
    pose({ hip: [0, 50, 0], lean: -6, F: [12, 32, 78], ua: [.3, -.75, -.6], fa: [-.05, .05, 1] })] },
  'row-bent': { dur: 3000, look: .8, props: BAR, gear: { mancuernas: DBN }, keys: [
    pose({ ...BENT, ua: [.02, -1, .02], fa: [0, -1, 0] }),
    pose({ ...BENT, ua: [.32, .1, -.95], fa: [0, -1, .15] })] },
  // Remo con el pecho apoyado en un banco inclinado: la espalda baja descansa.
  'row-chest': { dur: 3000, look: .8, yaw: 1.0, knee: [0, 0, 1], props: { ...DBN, pad: 'front', boxes: [[30, 60, 30, 0, 30, 24]] }, keys: [
    pose({ hip: [0, 78, -6], lean: 48, F: [12, 5, -38], ua: [.02, -1, .05], fa: [0, -1, 0], hd: [0, .8, .6] }),
    pose({ hip: [0, 78, -6], lean: 48, F: [12, 5, -38], ua: [.35, .25, -.9], fa: [0, -1, .2], hd: [0, .8, .6] })] },
  'row-inverted': { dur: 3000, look: .6, yaw: 1.15, floor: .95, arm: 'ik', elbow: [.8, -.6, -.3], knee: [0, 1, 0], props: { bar: 130, boxes: [[6, 96, 6, 66, 48, -44], [6, 96, 6, -66, 48, -44]] }, keys: [
    pose({ hip: [0, 22, 5], lean: -75, H: [28, 93, -44], F: [9, 5, 78], hd: [0, .5, -.87] }),
    pose({ hip: [0, 45, 2], lean: -72, H: [28, 93, -44], F: [9, 5, 78], hd: [0, .5, -.87] })] },
  'row-one-arm': { dur: 3000, look: .8, props: { cables: [10, 45, 150], only: 'L', boxes: [tower(152, 10)] }, keys: [
    pose({ hip: [0, 86, -6], lean: 42, F: [11, 5, -24], ua: [0, -.55, .85], fa: [0, -.5, .87], hd: [0, .85, .5], R: { F: [-11, 5, 24], ua: [-.05, -1, .35], fa: [.1, -.75, .65] } }),
    pose({ hip: [0, 86, -6], lean: 42, F: [11, 5, -24], ua: [.18, -.2, -.97], fa: [0, -.45, .9], hd: [0, .85, .5], R: { F: [-11, 5, 24], ua: [-.05, -1, .35], fa: [.1, -.75, .65] } })] },
  // Remo con mancuerna: una mano apoyada en el banco, la espalda casi paralela al suelo.
  'row-db': { dur: 3000, look: .7, arm: { L: 'fk', R: 'ik' }, elbow: [.2, .3, -1], props: { db: 'L', dbAxis: [0, 0, 1], boxes: [[30, 44, 110, -22, 22, 40]] }, gear: { kettlebell: { bell: 'L', bellDown: true, boxes: [[30, 44, 110, -22, 22, 40]] } }, keys: [
    pose({ hip: [0, 84, -16], lean: 74, F: [13, 5, -22], ua: [.05, -1, .05], fa: [0, -1, 0], hd: [0, .5, .87], R: { F: [-13, 5, 10], H: [-22, 47, 46] } }),
    pose({ hip: [0, 84, -16], lean: 74, F: [13, 5, -22], ua: [.2, .35, -.9], fa: [0, -1, .25], hd: [0, .5, .87], R: { F: [-13, 5, 10], H: [-22, 47, 46] } })] },
  'face-pull': { dur: 3000, look: 1.0, props: { cable: [0, 168, 150], rope: true, boxes: [tower(152)] }, keys: [
    pose({ lean: -3, ua: [.02, .18, 1], fa: [-.12, .15, 1] }),
    pose({ lean: -6, ua: [.95, .12, -.25], fa: [-.25, .62, .55] })] },
  pullover: { dur: 3200, look: 1.0, props: { bar: 60, cable: [0, 225, 95], boxes: [tower(97)] }, keys: [
    pose({ hip: [0, 90, -6], lean: 22, ua: [.05, .55, .85], fa: [0, .55, .85] }),
    pose({ hip: [0, 90, -6], lean: 16, ua: [.08, -1, .12], fa: [0, -1, .22] })] },
  'pullover-db': { dur: 3400, look: .6, yaw: 1.0, knee: [0, 1, .4], props: { db: 'mid', dbAxis: [0, 0, 1], bench: true }, keys: supKeys(
    { ua: [.02, .25, -1], fa: [-.12, .15, -1] }, { ua: [.02, 1, -.08], fa: [-.12, 1, 0] }) },
  shrug: { dur: 2400, look: .95, props: DBN, gear: { barra: BAR }, keys: [pose({ ...HANG }), pose({ ...HANG, shrug: 6 })] },

  // ---------- bíceps y tríceps ----------
  curl: { dur: 2800, look: .95, props: EZ, gear: { mancuernas: DB, kettlebell: { bell: true, bellDown: true }, polea: { bar: 46, cable: [0, 8, 34], boxes: [tower(40)] }, maquina: { arms: [22, 100, 30] } }, keys: [
    pose({ ua: [.1, -1, .02], fa: [0, -1, .14] }),
    pose({ ua: [.1, -1, .08], fa: [-.02, .84, .52] })] },
  // Curl predicador: sentado, los brazos apoyados en un atril inclinado.
  'curl-preacher': { dur: 2800, look: .85, yaw: .9, knee: [0, .3, 1], props: { ...EZ, seat: true, boxes: [[36, 6, 34, 0, 96, 34, -.75], [8, 80, 8, 0, 44, 46]] }, gear: { maquina: { seat: true, arms: [22, 78, 52], boxes: [[36, 6, 34, 0, 96, 34, -.75], [8, 80, 8, 0, 44, 46]] } }, keys: [
    pose({ ...SEAT, hip: [0, 54, 0], lean: 14, ua: [.06, -.62, .78], fa: [0, -.5, .87] }),
    pose({ ...SEAT, hip: [0, 54, 0], lean: 14, ua: [.06, -.62, .78], fa: [-.03, .88, -.05] })] },
  'curl-incline': { dur: 2800, look: .8, yaw: .9, knee: [0, 1, .3], props: { db: true, bench: true }, keys: [
    pose({ ...INCL, lean: -32, ua: [.12, -1, -.3], fa: [0, -1, -.05] }),
    pose({ ...INCL, lean: -32, ua: [.12, -1, -.25], fa: [-.02, .8, .58] })] },
  'curl-concentration': { dur: 2800, look: .7, knee: [.5, .3, 1], props: { db: 'L', seat: true }, keys: [
    pose({ hip: [0, 50, 0], lean: 38, F: [26, 5, 34], ua: [-.2, -1, .15], fa: [-.25, -.95, .1], hd: [0, .8, .6], R: { F: [-26, 5, 34], ua: [-.1, -.8, .6], fa: [.3, -.6, .7] } }),
    pose({ hip: [0, 50, 0], lean: 38, F: [26, 5, 34], ua: [-.2, -1, .15], fa: [-.45, .85, .25], hd: [0, .8, .6], R: { F: [-26, 5, 34], ua: [-.1, -.8, .6], fa: [.3, -.6, .7] } })] },
  'triceps-pushdown': { dur: 2600, look: .95, props: { bar: 46, cable: [0, 222, 46], boxes: [tower(48)] }, keys: [
    pose({ lean: 9, ua: [.1, -1, .04], fa: [-.08, .55, .83] }),
    pose({ lean: 9, ua: [.1, -1, .02], fa: [-.05, -1, .16] })] },
  'triceps-machine': { dur: 2800, look: .8, knee: [0, .3, 1], props: { seat: true, pad: true, arms: [26, 104, -46], grip: [0, 0, 1] }, keys: [
    pose({ ...SEAT, lean: -4, ua: [.28, -.2, -.95], fa: [.02, -.45, .9] }),
    pose({ ...SEAT, lean: -4, ua: [.2, -1, -.1], fa: [0, -1, .12] })] },
  'triceps-overhead': { dur: 2800, look: 1.05, props: { db: 'mid', dbAxis: [0, 1, 0] }, gear: { polea: { rope: true, cable: [0, 40, -90], boxes: [tower(-92)] }, barra: EZ }, keys: [
    pose({ ua: [.14, 1, .12], fa: [-.3, -.55, -.78] }),
    pose({ ua: [.14, 1, .06], fa: [-.3, 1, .02] })] },
  // Press francés: tumbado, los codos quietos apuntando al techo; solo se mueve el antebrazo.
  skullcrusher: { dur: 3000, look: .6, yaw: 1.0, knee: [0, 1, .4], props: { ...EZ, bench: true }, gear: { mancuernas: { ...DBN, bench: true } }, keys: supKeys(
    { ua: [.06, 1, -.14], fa: [-.02, -.3, -1] }, { ua: [.06, 1, -.1], fa: [-.02, 1, -.08] }) },
  'triceps-kickback': { dur: 2600, look: .8, props: { db: 'L', dbAxis: [0, 0, 1] }, gear: { polea: { cables: [10, 30, 150], only: 'L', boxes: [tower(152, 10)] } }, keys: [
    pose({ hip: [0, 86, -12], lean: 60, ua: [.06, -.42, -.9], fa: [0, -1, .1], hd: [0, .75, .65], R: { ua: [-.05, -1, .3], fa: [.05, -.7, .7] } }),
    pose({ hip: [0, 86, -12], lean: 60, ua: [.06, -.42, -.9], fa: [.02, -.36, -.93], hd: [0, .75, .65], R: { ua: [-.05, -1, .3], fa: [.05, -.7, .7] } })] },

  // ---------- empuje ----------
  'press-incline': { dur: 3000, look: .8, yaw: .9, knee: [0, 1, .3], props: { db: true, bench: true }, gear: { barra: { ...BAR, bench: true } }, keys: [
    pose({ ...INCL, ua: [.8, -.42, -.42], fa: [0, .82, .57] }),
    pose({ ...INCL, ua: [-.06, .82, .57], fa: [0, .82, .57] })] },
  'press-flat': { dur: 3000, look: .6, yaw: 1.0, knee: [0, 1, .4], props: { ...BAR, bench: true }, gear: { mancuernas: { db: true, bench: true }, kettlebell: { bell: 'L', bellDown: true, bench: true } }, keys: supKeys(
    { ua: [.9, -.32, 0], fa: [-.05, 1, 0] }, { ua: [.12, 1, 0], fa: [-.05, 1, 0] }) },
  'press-decline': { dur: 3000, look: .6, yaw: 1.0, knee: [0, 1, .2], props: { ...BAR, bench: true, boxes: [[30, 44, 30, 0, 22, 30], [34, 8, 12, 0, 48, 66]] }, keys: supKeys(
    { ua: [.9, -.25, .2], fa: [-.05, .97, .26] }, { ua: [.12, .97, .26], fa: [-.05, .97, .26] }, { hip: [0, 62, 22], lean: -105, F: [16, 40, 66] }) },
  'press-close': { dur: 3000, look: .6, yaw: 1.0, knee: [0, 1, .4], props: { ...BAR, bench: true }, gear: { mancuernas: { ...DBN, bench: true } }, keys: supKeys(
    { ua: [.25, -.3, .9], fa: [-.2, 1, -.3] }, { ua: [-.08, 1, 0], fa: [-.05, 1, 0] }) },
  'press-machine': { dur: 3000, look: .8, knee: [0, .3, 1], props: { seat: true, pad: true, arms: [30, 172, -6] }, keys: [
    pose({ ...SEAT, lean: -8, ua: [.82, -.3, -.38], fa: [-.1, .02, 1] }),
    pose({ ...SEAT, lean: -8, ua: [.22, -.08, 1], fa: [-.1, .02, 1] })] },
  // Máquina de press en diagonal: recostado, se empuja hacia delante y arriba, y las manos se acercan al final.
  'press-diagonal': { dur: 3200, look: .85, yaw: .95, knee: [0, .3, 1], props: { seat: true, pad: true, arms: [34, 182, -52], boxes: [[8, 190, 8, 0, 95, -60]] }, keys: [
    pose({ ...SEAT, hip: [0, 50, 0], lean: -24, ua: [.8, -.5, -.3], fa: [-.08, .52, .85] }),
    pose({ ...SEAT, hip: [0, 50, 0], lean: -24, ua: [.14, .5, .86], fa: [-.2, .52, .83] })] },
  'press-cable': { dur: 3000, look: .95, props: { cables: [70, 140, -130], boxes: [tower(-132, 70), tower(-132, -70)] }, keys: [
    pose({ lean: 8, hip: [0, 91, -2], F: [11, 5, -18], ua: [.82, -.3, -.4], fa: [-.1, 0, 1], R: { F: [-11, 5, 20] } }),
    pose({ lean: 8, hip: [0, 91, -2], F: [11, 5, -18], ua: [.2, -.1, 1], fa: [-.15, 0, 1], R: { F: [-11, 5, 20] } })] },
  'push-up': { dur: 2800, look: .35, yaw: 1.25, floor: 1.0, arm: 'ik', elbow: [.7, .1, -.7], knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ hip: [0, 17, -8], lean: 83, H: [24, 3, 34], F: [9, 6, -99], hd: [0, .35, .95] }),
    pose({ hip: [0, 40, -14], lean: 67, H: [24, 3, 34], F: [9, 6, -99], hd: [0, .55, .85] })] },
  'push-up-knees': { dur: 2800, look: .35, yaw: 1.25, floor: 1.0, arm: 'ik', leg: 'fk', elbow: [.7, .1, -.7], knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ hip: [0, 16, -22], lean: 84, H: [24, 3, 32], th: [0, -.3, -.95], sh: [0, .55, -.83], hd: [0, .35, .95] }),
    pose({ hip: [0, 33, -24], lean: 62, H: [24, 3, 32], th: [0, -.68, -.73], sh: [0, .55, -.83], hd: [0, .55, .85] })] },
  dip: { dur: 3000, look: 1.1, dist: 6, arm: 'ik', leg: 'fk', elbow: [.15, .1, -1], props: { boxes: [[4, 4, 70, 26, 101, 0], [4, 4, 70, -26, 101, 0], [5, 100, 5, 26, 50, -34], [5, 100, 5, -26, 50, -34]] }, keys: [
    pose({ hip: [0, 76, -4], lean: 20, H: [26, 105, 0], th: [0, -1, .25], sh: [0, -.55, -.85] }),
    pose({ hip: [0, 111, 0], lean: 6, H: [26, 105, 0], th: [0, -1, .15], sh: [0, -.55, -.85] })] },
  // Fondos en banco: manos en el banco detrás, piernas estiradas delante.
  'bench-dip': { dur: 3000, look: .6, yaw: 1.1, floor: .9, arm: 'ik', elbow: [.1, .3, -1], knee: [0, 1, 0], props: { boxes: [[110, 44, 30, 0, 22, -22]] }, keys: [
    pose({ hip: [0, 24, 8], lean: -8, H: [23, 47, -12], F: [10, 5, 88] }),
    pose({ hip: [0, 47, 6], lean: -4, H: [23, 47, -12], F: [10, 5, 88] })] },
  fly: { dur: 3200, look: .6, yaw: 1.0, knee: [0, 1, .4], props: { ...DBN, bench: true }, keys: supKeys(
    { ua: [1, -.12, 0], fa: [.88, .48, 0] }, { ua: [.16, 1, 0], fa: [-.12, 1, 0] }) },
  'fly-incline': { dur: 3200, look: .8, yaw: .9, knee: [0, 1, .3], props: { ...DBN, bench: true }, keys: [
    pose({ ...INCL, ua: [1, -.05, -.1], fa: [.85, .42, .3] }),
    pose({ ...INCL, ua: [.14, .82, .57], fa: [-.12, .82, .57] })] },
  // Contractora: sentado, brazos abiertos a la altura del hombro que se cierran delante.
  'pec-deck': { dur: 3200, look: .85, knee: [0, .3, 1], props: { seat: true, pad: true, arms: [46, 172, 8], grip: [0, 1, 0] }, keys: [
    pose({ ...SEAT, lean: -6, ua: [.96, -.08, .1], fa: [.82, .05, .57] }),
    pose({ ...SEAT, lean: -6, ua: [.4, -.08, .92], fa: [-.18, .05, .98] })] },
  'cable-cross': { dur: 3200, look: .95, props: { cables: [105, 200, -15], boxes: [tower(-15, 108), tower(-15, -108)] }, keys: [
    pose({ lean: 14, hip: [0, 91, -4], F: [11, 5, -16], ua: [.92, .12, -.3], fa: [.85, .25, .42], R: { F: [-11, 5, 18] } }),
    pose({ lean: 14, hip: [0, 91, -4], F: [11, 5, -16], ua: [.32, -.72, .6], fa: [-.52, -.5, .7], R: { F: [-11, 5, 18] } })] },
  'cable-cross-low': { dur: 3200, look: .95, props: { cables: [105, 12, -15], boxes: [tower(-15, 108), tower(-15, -108)] }, keys: [
    pose({ lean: 6, hip: [0, 92, -2], F: [11, 5, -16], ua: [.7, -.7, -.15], fa: [.6, -.78, .2], R: { F: [-11, 5, 18] } }),
    pose({ lean: 6, hip: [0, 92, -2], F: [11, 5, -16], ua: [.3, .15, .94], fa: [-.4, .4, .82], R: { F: [-11, 5, 18] } })] },
  'press-shoulder': { dur: 3000, look: .9, knee: [0, .3, 1], props: { seat: true, pad: true, db: true }, gear: { maquina: { seat: true, pad: true, arms: [34, 96, -34] }, polea: { cables: [14, 8, -6], only: 'L', boxes: [tower(-30, 14)] } }, keys: [
    pose({ ...SEAT, lean: -5, ua: [.9, -.38, .14], fa: [-.04, 1, 0] }),
    pose({ ...SEAT, lean: -5, ua: [.26, 1, 0], fa: [-.1, 1, 0] })] },
  'press-overhead': { dur: 3000, look: 1.05, props: BAR, keys: [
    pose({ lean: -2, ua: [.55, -.8, .3], fa: [-.22, .95, .2], F: [14, 5, 0] }),
    pose({ lean: 0, ua: [.2, 1, 0], fa: [-.08, 1, 0], F: [14, 5, 0] })] },
  'lateral-raise': { dur: 2800, look: .95, props: DBN, gear: { polea: { cables: [-70, 8, 0], only: 'L', boxes: [tower(0, -72)] }, maquina: { arms: [22, 146, -16], grip: [0, 0, 1] } }, keys: [
    pose({ ua: [.16, -1, 0], fa: [.1, -1, .12] }),
    pose({ ua: [1, -.04, .1], fa: [1, -.14, .16] })] },
  'front-raise': { dur: 2800, look: .95, props: DB, gear: { polea: { bar: 46, cable: [0, 8, -34], boxes: [tower(-40)] } }, keys: [
    pose({ ua: [.1, -1, .05], fa: [0, -1, .15] }),
    pose({ ua: [.06, .04, 1], fa: [0, .06, 1] })] },
  'upright-row': { dur: 2800, look: .95, props: { bar: 120, plates: 14 }, keys: [
    pose({ ua: [.05, -1, .08], fa: [-.2, -1, .12] }),
    pose({ ua: [.95, .3, .05], fa: [-.8, -.58, .15] })] },
  'rear-fly': { dur: 2800, look: .8, props: DBN, keys: [
    pose({ hip: [0, 86, -14], lean: 68, ua: [.05, -1, .1], fa: [0, -1, .05], hd: [0, .6, .8] }),
    pose({ hip: [0, 86, -14], lean: 68, ua: [1, .12, 0], fa: [1, .02, .12], hd: [0, .6, .8] })] },
  // Hombro posterior en máquina o polea: brazos al frente que se abren hacia atrás.
  'rear-fly-seated': { dur: 2800, look: .85, knee: [0, .3, 1], props: { seat: true, pad: 'front', arms: [34, 172, 30], grip: [0, 1, 0] }, keys: [
    pose({ ...SEAT, lean: 2, ua: [.2, -.05, 1], fa: [.05, .05, 1] }),
    pose({ ...SEAT, lean: 2, ua: [1, -.05, -.12], fa: [.95, .05, -.28] })] },
  'rear-fly-cable': { dur: 2800, look: .95, props: { cables: [-60, 172, 130], boxes: [tower(132, 62), tower(132, -62)] }, keys: [
    pose({ ua: [-.25, .1, 1], fa: [-.3, .1, 1] }),
    pose({ ua: [1, .02, -.15], fa: [.95, .05, -.28] })] },

  // ---------- pierna y glúteo ----------
  'leg-press': { dur: 3200, look: .75, yaw: 1.1, knee: [.3, 1, -.4], props: { pad: true, plate: [0, .6, .8], boxes: [[46, 26, 70, 0, 13, -24]] }, keys: [
    pose({ hip: [0, 45, -20], lean: -42, F: [14, 79, 26], ua: [.25, -.7, .65], fa: [0, -.75, .65] }),
    pose({ hip: [0, 45, -20], lean: -42, F: [14, 96, 48], ua: [.25, -.7, .65], fa: [0, -.75, .65] })] },
  'calf-press': { dur: 2400, look: .75, yaw: 1.1, knee: [.3, 1, -.4], props: { pad: true, plate: [0, .6, .8], boxes: [[46, 26, 70, 0, 13, -24]] }, keys: [
    pose({ hip: [0, 45, -20], lean: -42, F: [14, 93, 44], ua: [.25, -.7, .65], fa: [0, -.75, .65] }),
    pose({ hip: [0, 45, -20], lean: -42, F: [14, 97, 49], ua: [.25, -.7, .65], fa: [0, -.75, .65] })] },
  squat: { dur: 3200, look: .9, arm: 'ik', elbow: [.6, -1, -.4], knee: [.35, 0, 1], props: { bar: 180, plates: 20 }, gear: { maquina: { bar: 180, plates: 20, smith: true } }, keys: squatKeys(BACK_LOW, BACK_HIGH) },
  'squat-front': { dur: 3200, look: .9, arm: 'ik', elbow: [.3, -.5, 1], knee: [.35, 0, 1], props: { bar: 180, plates: 20 }, gear: { kettlebell: { bell: 'L', bellDown: true } }, keys: squatKeys(FRONT_LOW, FRONT_HIGH) },
  'squat-air': { dur: 3200, look: .9, knee: [.35, 0, 1], props: {}, keys: squatKeys({ ua: [.1, .25, 1], fa: [0, .35, 1] }, { ua: [.15, -1, .1], fa: [0, -1, .2] }) },
  'squat-db': { dur: 3200, look: .9, knee: [.35, 0, 1], props: DBN, keys: squatKeys({ ua: [.2, -1, -.35], fa: [0, -1, -.3] }, HANG) },
  'squat-sumo': { dur: 3200, look: .9, knee: [.8, 0, .6], props: { db: 'mid', dbAxis: [0, 1, 0] }, gear: { kettlebell: { bell: true, bellDown: true } }, keys: [
    pose({ hip: [0, 56, -12], lean: 22, F: [34, 5, 0], ua: [-.2, -1, -.1], fa: [-.3, -1, .15], hd: [0, .95, .3] }),
    pose({ hip: [0, 90, 0], lean: 2, F: [34, 5, 0], ua: [-.12, -1, .1], fa: [-.3, -1, .1] })] },
  // Sentadilla hack: espalda apoyada en el carro inclinado, hombros bajo las almohadillas.
  'hack-squat': { dur: 3200, look: .9, yaw: 1.0, knee: [.3, .2, 1], props: { pad: true, attach: SHOULDER_PADS.map(a => ({ ...a, off: [0, 9, 4] })), boxes: [[56, 5, 46, 0, 6, 16, .35]] }, keys: [
    pose({ hip: [0, 50, -14], lean: -22, F: [16, 10, 16], ua: [.55, -.6, .55], fa: [-.1, .9, .4] }),
    pose({ hip: [0, 84, -28], lean: -22, F: [16, 10, 16], ua: [.55, -.6, .55], fa: [-.1, .9, .4] })] },
  'wall-sit': { dur: 4000, tempo: [.5, 0], look: .7, yaw: .9, knee: [0, .4, 1], props: { boxes: [[120, 200, 6, 0, 100, -16]] }, keys: [49, 50.5].map(y =>
    pose({ hip: [0, y, 0], lean: 0, F: [11, 5, 44], ua: [.15, -1, .2], fa: [0, -.3, .95] })) },
  lunge: { dur: 3200, look: .9, knee: { L: [0, -.2, 1], R: [0, 0, 1] }, props: DBN, gear: { kettlebell: { bell: 'both', bellDown: true }, cuerpo: {}, banco: {}, maquina: {} }, keys: [
    pose({ ...HANG, hip: [0, 60, -22], lean: 8, F: [10, 9, -74], R: { F: [-10, 5, 12] } }),
    pose({ ...HANG })] },
  // Sentadilla búlgara: el pie de atrás apoyado en un banco.
  'split-squat': { dur: 3200, look: .9, knee: { L: [0, -.3, 1], R: [0, 0, 1] }, props: { ...DBN, boxes: [[40, 42, 110, 10, 21, -84]] }, keys: [
    pose({ ...HANG, hip: [0, 56, -8], lean: 12, F: [10, 46, -72], R: { F: [-10, 5, 30] } }),
    pose({ ...HANG, hip: [0, 86, -8], lean: 6, F: [10, 46, -72], R: { F: [-10, 5, 30] } })] },
  'lunge-side': { dur: 3200, look: .9, knee: { L: [.9, 0, .45], R: [-.3, 0, 1] }, props: { bell: true, bellDown: true }, keys: [
    pose({ hip: [20, 58, -14], lean: 26, F: [48, 5, 4], ua: [.1, -.8, .6], fa: [-.4, .5, .75], hd: [0, .92, .4], R: { F: [-26, 5, 0], ua: [-.1, -.8, .6], fa: [.4, .5, .75] } }),
    pose({ hip: [0, 92, 0], F: [12, 5, 0], ...RACK, R: { F: [-12, 5, 0] } })] },
  'step-up': { dur: 3200, look: 1.1, dist: 6, knee: [0, 0, 1], props: { ...DBN, boxes: [[60, 38, 46, 0, 19, 30]] }, keys: [
    pose({ ...HANG, hip: [0, 96, 4], lean: 14, F: [10, 43, 30], R: { F: [-10, 5, -4] } }),
    pose({ ...HANG, hip: [0, 131, 28], lean: 2, F: [10, 43, 30], R: { F: [-10, 43, 26] } })] },
  'leg-extension': { dur: 2800, look: .8, leg: 'fk', knee: [0, 1, .2], props: { seat: true, pad: true, roller: [0, 1, 1] }, keys: [
    pose({ hip: [0, 60, 0], lean: -10, th: [.05, 0, 1], sh: [0, -1, -.18], ua: [.2, -1, .1], fa: [0, -.9, .4] }),
    pose({ hip: [0, 60, 0], lean: -10, th: [.05, 0, 1], sh: [0, -.04, 1], ua: [.2, -1, .1], fa: [0, -.9, .4] })] },
  'leg-curl': { dur: 2800, look: .8, leg: 'fk', knee: [0, 1, .2], props: { seat: true, pad: true, roller: [0, -1, -1] }, keys: [
    pose({ hip: [0, 60, 0], lean: -10, th: [.05, 0, 1], sh: [0, -.08, 1], ua: [.2, -1, .1], fa: [0, -.9, .4] }),
    pose({ hip: [0, 60, 0], lean: -10, th: [.05, 0, 1], sh: [0, -.88, -.48], ua: [.2, -1, .1], fa: [0, -.9, .4] })] },
  // Curl femoral tumbado: boca abajo en el banco, los talones suben hacia el glúteo.
  'leg-curl-lying': { dur: 2800, look: .6, yaw: 1.2, floor: .95, leg: 'fk', knee: [0, -1, 0], props: { roller: [0, 1, 1], boxes: [[44, 52, 120, 0, 26, 24]] }, keys: [
    pose({ hip: [0, 62, 0], lean: 88, th: [0, -.06, -1], sh: [0, -.1, -1], ua: [.3, -.75, .6], fa: [-.1, -.5, .87], hd: [0, .35, .94] }),
    pose({ hip: [0, 62, 0], lean: 88, th: [0, -.06, -1], sh: [0, .9, .42], ua: [.3, -.75, .6], fa: [-.1, -.5, .87], hd: [0, .35, .94] })] },
  hinge: { dur: 3200, look: .9, props: BAR, gear: { mancuernas: DB, kettlebell: { bell: true, bellDown: true } }, keys: hingeKeys({ ua: [.02, -1, .02], fa: [0, -1, 0] }, { ua: [.1, -1, .06], fa: [0, -1, .1] }) },
  'hinge-sumo': { dur: 3200, look: .9, knee: [.8, 0, .6], props: BAR, keys: [
    pose({ hip: [0, 62, -16], lean: 40, F: [34, 5, 0], ua: [-.2, -1, 0], fa: [0, -1, 0], hd: [0, .85, .5] }),
    pose({ hip: [0, 90, 0], F: [34, 5, 0], ua: [-.1, -1, .05], fa: [0, -1, .1] })] },
  'good-morning': { dur: 3200, look: .9, arm: 'ik', elbow: [.6, -1, -.4], props: BAR, keys: hingeKeys({ H: [36, 120, 27] }, BACK_HIGH) },
  // Hiperextensiones: cadera apoyada en el banco a 45°, el tronco baja y vuelve a la línea de las piernas.
  hyperextension: { dur: 3200, look: .8, yaw: 1.2, knee: [0, -.6, .8], props: { boxes: [[40, 12, 26, 0, 76, 10, -.78], [8, 70, 8, 0, 36, 14], [40, 8, 16, 0, 22, -58]] }, keys: [
    pose({ hip: [0, 85, 0], lean: 122, F: [10, 26, -60], ua: [.5, .2, .85], fa: [-.9, .3, -.1], hd: [0, -.3, .95] }),
    pose({ hip: [0, 85, 0], lean: 45, F: [10, 26, -60], ua: [.5, -.5, .7], fa: [-.9, .3, .2], hd: [0, .75, .66] })] },
  'hip-thrust': { dur: 3000, look: .5, yaw: 1.2, floor: .9, knee: [0, 1, .2], props: { boxes: [BENCH], hipbar: true }, gear: { maquina: { boxes: [BENCH], attach: [{ at: 'hip', box: [64, 8, 16], off: [0, 4, 13], body: true }] }, cuerpo: { boxes: [BENCH] }, banda: { boxes: [BENCH], ...BAND } }, keys: [
    pose({ hip: [0, 28, 0], lean: -62, F: [14, 5, 48], ua: [.55, -.5, .65], fa: [-.6, -.1, .8], hd: [0, .75, -.65] }),
    pose({ hip: [0, 52, 2], lean: -88, F: [14, 5, 48], ua: [.55, -.2, .8], fa: [-.6, .1, .8], hd: [0, .55, -.83] })] },
  // Puente de glúteo en el suelo: hombros en el suelo, sube la cadera.
  'glute-bridge': { dur: 3000, look: .35, yaw: 1.25, floor: 1.0, knee: [0, 1, .1], props: { mat: 20 }, gear: { banda: { mat: 20, ...BAND } }, keys: [
    pose({ hip: [0, 12, 4], lean: -92, F: [12, 5, 52], ua: [.3, -.05, 1], fa: [0, -.05, 1], hd: [0, .1, -1] }),
    pose({ hip: [0, 38, 6], lean: -124, F: [12, 5, 52], ua: [.3, 0, 1], fa: [0, -.1, 1], hd: [0, .45, -.9] })] },
  abduction: { dur: 2800, look: .8, yaw: .25, leg: 'fk', knee: [0, 1, .2], props: { seat: true, pad: true, attach: [kneePad('L'), kneePad('R')] }, keys: [
    pose({ hip: [0, 56, 0], lean: -8, th: [.06, -.04, 1], sh: [0, -1, 0], ua: [.2, -1, .1], fa: [0, -.9, .4] }),
    pose({ hip: [0, 56, 0], lean: -8, th: [.62, -.04, .8], sh: [.08, -1, 0], ua: [.2, -1, .1], fa: [0, -.9, .4] })] },
  adduction: { dur: 2800, look: .8, yaw: .25, leg: 'fk', knee: [0, 1, .2], props: { seat: true, pad: true, attach: [kneePadIn('L'), kneePadIn('R')] }, keys: [
    pose({ hip: [0, 56, 0], lean: -8, th: [.62, -.04, .8], sh: [.08, -1, 0], ua: [.2, -1, .1], fa: [0, -.9, .4] }),
    pose({ hip: [0, 56, 0], lean: -8, th: [.06, -.04, 1], sh: [0, -1, 0], ua: [.2, -1, .1], fa: [0, -.9, .4] })] },
  // De pie en la polea, con el cable al tobillo: la pierna izquierda es la que trabaja.
  'leg-out': { dur: 2800, look: .9, leg: { L: 'fk', R: 'ik' }, props: { cables: [-90, 8, 0], only: 'L', joint: 'F', boxes: [tower(0, -92)] }, keys: [
    pose({ ua: [.3, -.6, .2], fa: [-.8, .2, .5], th: [.02, -1, 0], sh: [0, -1, 0], R: { F: [-11, 5, 0], ua: [-.6, -.5, 0], fa: [-.9, .2, 0] } }),
    pose({ ua: [.3, -.6, .2], fa: [-.8, .2, .5], th: [.62, -.78, 0], sh: [.55, -.83, 0], R: { F: [-11, 5, 0], ua: [-.6, -.5, 0], fa: [-.9, .2, 0] } })] },
  'leg-in': { dur: 2800, look: .9, leg: { L: 'fk', R: 'ik' }, props: { cables: [90, 8, 0], only: 'L', joint: 'F', boxes: [tower(0, 92)] }, keys: [
    pose({ ua: [.6, -.5, 0], fa: [.9, .2, 0], th: [.55, -.83, 0], sh: [.5, -.87, 0], R: { F: [-11, 5, 0], ua: [-.3, -.6, .2], fa: [.8, .2, .5] } }),
    pose({ ua: [.6, -.5, 0], fa: [.9, .2, 0], th: [-.25, -.95, .15], sh: [-.25, -.95, .1], R: { F: [-11, 5, 0], ua: [-.3, -.6, .2], fa: [.8, .2, .5] } })] },
  // Patada de glúteo de pie: tronco algo inclinado, la pierna sube hacia atrás sin arquear la espalda.
  kickback: { dur: 2800, look: .9, leg: { L: 'fk', R: 'ik' }, props: { cables: [10, 8, 110], only: 'L', joint: 'F', boxes: [tower(112, 10), [60, 4, 4, 0, 100, 60]] }, gear: { maquina: { boxes: [[60, 4, 4, 0, 100, 60], [5, 100, 5, 28, 50, 60], [5, 100, 5, -28, 50, 60]] } }, keys: [
    pose({ hip: [0, 90, -4], lean: 28, ua: [.2, -.35, .9], fa: [-.1, .1, 1], th: [0, -1, .12], sh: [0, -1, -.1], hd: [0, .9, .44], R: { F: [-11, 5, 2] } }),
    pose({ hip: [0, 90, -4], lean: 34, ua: [.2, -.35, .9], fa: [-.1, .1, 1], th: [0, -.72, -.7], sh: [0, -.85, -.53], hd: [0, .9, .44], R: { F: [-11, 5, 2] } })] },
  'kickback-floor': { dur: 3000, look: .45, yaw: 1.25, floor: 1.0, leg: 'fk', knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ ...QUAD, ua: [0, -1, 0], fa: [0, -1, 0] }),
    pose({ ...QUAD, ua: [0, -1, 0], fa: [0, -1, 0], th: [0, .12, -1], sh: [0, .95, -.3], R: { th: [0, -1, 0], sh: [0, -.04, -1] } })] },
  'band-walk': { dur: 1800, tempo: [.5, 0], look: .9, knee: [.3, 0, 1], props: BAND, keys: [
    pose({ hip: [0, 80, -8], lean: 16, F: [14, 5, 0], ua: [.3, -.7, .6], fa: [-.6, .5, .6], R: { F: [-14, 5, 0] } }),
    pose({ hip: [9, 80, -8], lean: 16, F: [34, 5, 0], ua: [.3, -.7, .6], fa: [-.6, .5, .6], R: { F: [-14, 5, 0] } })] },
  // Almeja: tumbado de lado, rodillas dobladas; se abre la rodilla de arriba sin separar los pies.
  clamshell: { dur: 2800, look: .25, yaw: -1.35, floor: 1.0, leg: 'fk', knee: [-1, 0, 0], props: { mat: true, ...BAND }, keys: [0, 1].map(k =>
    pose({ hip: [0, 16, -9], lean: 88, sx: [0, -1, 0], ua: [0, -.2, 1], fa: [0, .3, .95], th: [-.72, 0, -.7], sh: [.75, 0, -.66], hd: [0, .1, 1], R: { ua: [-.5, -.6, .3], fa: [-.2, -1, .2], th: k ? [-.62, .6, -.5] : [-.72, .04, -.7], sh: k ? [.6, -.55, -.58] : [.75, 0, -.66] } })) },
  'calf-raise': { dur: 2400, look: .95, knee: [.2, -.3, 1], props: {}, gear: { maquina: { attach: SHOULDER_PADS, boxes: [[50, 4, 24, 0, 2, 8], [6, 190, 6, 34, 95, -30], [6, 190, 6, -34, 95, -30]] } }, keys: [pose({ ...HANG }), pose({ ...HANG, hip: [0, 101, 1], F: [11, 13, 0] })] },
  'calf-seated': { dur: 2400, look: .7, yaw: .9, knee: [0, .4, 1], props: { seat: true, attach: [{ at: 'knees', box: [44, 8, 16], off: [0, 9, -4] }], boxes: [[50, 4, 20, 0, 2, 44]] }, keys: [
    pose({ ...SEAT, F: [12, 5, 40], ua: [.2, -.8, .55], fa: [0, -.2, .98] }),
    pose({ ...SEAT, F: [12, 12, 40], ua: [.2, -.8, .55], fa: [0, -.1, .99] })] },

  // ---------- core ----------
  plank: { dur: 4000, tempo: [.5, 0], look: .3, yaw: 1.25, floor: 1.0, knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ hip: [0, 23, -8], lean: 79, ua: [0, -1, 0], fa: [0, 0, 1], F: [9, 6, -99], hd: [0, .3, .95] }),
    pose({ hip: [0, 24.5, -8], lean: 79, ua: [0, -1, 0], fa: [0, 0, 1], F: [9, 6, -99], hd: [0, .3, .95] })] },
  // Plancha alta tocando el hombro contrario: la cadera no gira.
  'plank-high': { dur: 2600, tempo: [.4, .2], look: .35, yaw: 1.25, floor: 1.0, arm: { L: 'fk', R: 'ik' }, elbow: [.7, .1, -.7], knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ hip: [0, 40, -14], lean: 67, ua: [.08, -1, .05], fa: [0, -1, .05], F: [12, 6, -99], hd: [0, .55, .85], R: { H: [-24, 3, 34] } }),
    pose({ hip: [0, 40, -14], lean: 67, ua: [-.5, -.5, .2], fa: [-.85, .45, -.3], F: [12, 6, -99], hd: [0, .55, .85], R: { H: [-24, 3, 34] } })] },
  'mountain-climber': { dur: 900, tempo: [.5, 0], look: .35, yaw: 1.25, floor: 1.0, arm: 'ik', elbow: [.7, .1, -.7], knee: [0, -1, .3], props: { mat: true }, keys: [
    pose({ hip: [0, 44, -14], lean: 68, H: [24, 3, 34], F: [9, 6, -99], hd: [0, .55, .85], R: { F: [-9, 12, -18] } }),
    pose({ hip: [0, 44, -14], lean: 68, H: [24, 3, 34], F: [9, 12, -18], hd: [0, .55, .85], R: { F: [-9, 6, -99] } })] },
  'side-plank': { dur: 4000, tempo: [.5, 0], look: .35, yaw: -1.35, floor: 1.0, knee: [-1, 0, 0], props: { mat: true }, keys: [28, 38].map(y =>
    pose({ hip: [0, y, -9], lean: y === 28 ? 77 : 71.4, sx: [0, -1, 0], ua: [0, -1, 0], fa: [-1, 0, 0], F: [0, 6, -93], hd: [0, .32, .95], R: { F: [0, 24, -91], ua: [0, .15, -1], fa: [0, .05, -1] } })) },
  'bird-dog': { dur: 4200, tempo: [.4, .2], look: .45, yaw: 1.25, floor: 1.0, leg: 'fk', knee: [0, -1, 0], props: { mat: true }, keys: [
    pose({ ...QUAD, ua: [0, -1, 0], fa: [0, -1, 0] }),
    pose({ ...QUAD, ua: [0, .08, 1], fa: [0, .06, 1], R: { ua: [0, -1, 0], fa: [0, -1, 0], th: [0, .04, -1], sh: [0, 0, -1] } })] },
  // Bicho muerto: boca arriba, baja un brazo y la pierna contraria sin despegar la zona lumbar.
  'dead-bug': { dur: 3600, tempo: [.4, .2], look: .4, yaw: 1.3, floor: 1.0, leg: 'fk', knee: [0, 1, 0], props: { mat: 25 }, keys: [
    pose({ ...FLOOR, ua: [.05, 1, 0], fa: [0, 1, 0], th: [0, 1, .05], sh: [0, 0, 1], hd: [0, .12, -1] }),
    pose({ ...FLOOR, ua: [.05, .15, -1], fa: [0, .1, -1], th: [0, 1, .05], sh: [0, 0, 1], hd: [0, .12, -1], R: { ua: [-.05, 1, 0], fa: [0, 1, 0], th: [0, .12, 1], sh: [0, .04, 1] } })] },
  'curl-up': { dur: 3600, tempo: [.3, .3], look: .3, yaw: 1.3, floor: 1.0, knee: [0, 1, 0], props: { mat: 25 }, keys: [
    pose({ ...FLOOR, F: [10, 5, 64], ua: [.3, -.25, 1], fa: [-.55, -.25, .8], hd: [0, .12, -1], R: { F: [-10, 8, 106] } }),
    pose({ ...FLOOR, lean: -77, F: [10, 5, 64], ua: [.3, -.3, 1], fa: [-.55, -.2, .8], hd: [0, .5, -.87], R: { F: [-10, 8, 106] } })] },
  crunch: { dur: 3000, look: .3, yaw: 1.3, floor: 1.0, knee: [0, 1, 0], props: { mat: 25 }, keys: [
    pose({ ...FLOOR, F: [12, 5, 62], ua: [.7, .25, -.65], fa: [-.55, .25, -.8], hd: [0, .15, -1] }),
    pose({ ...FLOOR, lean: -60, F: [12, 5, 62], ua: [.7, .5, -.5], fa: [-.55, .5, -.65], hd: [0, .7, -.7] })] },
  'crunch-decline': { dur: 3200, look: .6, yaw: 1.2, floor: .95, knee: [0, 1, .2], props: { boxes: [[40, 8, 150, 0, 40, -30, .3], [40, 10, 14, 0, 66, 52]] }, keys: [
    pose({ hip: [0, 52, 10], lean: -107, F: [12, 60, 62], ua: [.6, .1, -.8], fa: [-.5, .5, -.7], hd: [0, -.1, -1] }),
    pose({ hip: [0, 52, 10], lean: -40, F: [12, 60, 62], ua: [.6, .5, -.3], fa: [-.5, .8, -.2], hd: [0, .85, -.5] })] },
  'crunch-machine': { dur: 3000, look: .8, yaw: .9, knee: [0, .3, 1], props: { seat: true, arms: [20, 150, -30] }, keys: [
    pose({ ...SEAT, lean: -8, ua: [.4, .75, .3], fa: [-.3, .5, .6] }),
    pose({ ...SEAT, lean: 34, ua: [.4, .4, .7], fa: [-.3, -.1, .9], hd: [0, .6, .8] })] },
  // Crunch en polea: de rodillas, cuerda a la cabeza, se enrolla el tronco hacia el suelo.
  'crunch-cable': { dur: 3000, look: .6, yaw: 1.0, leg: 'fk', knee: [0, -1, 0], props: { cable: [0, 215, 30], rope: true, boxes: [tower(34)], mat: -20 }, keys: [
    pose({ hip: [0, 47, -20], lean: 12, th: [0, -1, .1], sh: [0, -.04, -1], ua: [.3, .55, .78], fa: [-.3, .85, -.4] }),
    pose({ hip: [0, 47, -22], lean: 70, th: [0, -1, .1], sh: [0, -.04, -1], ua: [.3, -.5, .8], fa: [-.3, .2, .95], hd: [0, .1, 1] })] },
  'leg-raise': { dur: 3400, look: .45, yaw: 1.3, floor: 1.0, leg: 'fk', knee: [0, 1, 0], props: { mat: 25 }, keys: [
    pose({ ...FLOOR, th: [0, .07, 1], sh: [0, .02, 1], ua: [.25, -.1, 1], fa: [0, -.1, 1], hd: [0, .12, -1] }),
    pose({ ...FLOOR, th: [0, 1, .12], sh: [0, 1, .06], ua: [.25, -.1, 1], fa: [0, -.1, 1], hd: [0, .12, -1] })] },
  'hanging-raise': { dur: 3200, look: 1.3, dist: 6.4, arm: 'ik', leg: 'fk', elbow: [1, -1, -.25], knee: [0, 0, 1], props: PULLUP_GEAR, keys: [
    pose({ hip: [0, 108, 0], H: [30, 215, 0], th: [0, -1, .06], sh: [0, -1, 0] }),
    pose({ hip: [0, 108, -4], lean: -6, H: [30, 215, 0], th: [0, .05, 1], sh: [0, -.85, .5] })] },
  twist: { dur: 3000, tempo: [.5, 0], look: .5, yaw: .5, floor: .9, arm: 'ik', elbow: { L: [.5, -1, 0], R: [-.5, -1, 0] }, knee: [0, 1, 0], props: { mat: 25, db: 'mid', dbAxis: [0, 1, 0] }, gear: { kettlebell: { mat: 25, bell: true } }, keys: [
    pose({ hip: [0, 12, 0], lean: -38, sx: [.85, 0, .52], px: [1, 0, 0], F: [10, 8, 72], H: [-22, 34, 22], R: { H: [-34, 34, 16] } }),
    pose({ hip: [0, 12, 0], lean: -38, sx: [.85, 0, -.52], px: [1, 0, 0], F: [10, 8, 72], H: [34, 34, 16], R: { H: [22, 34, 22] } })] },
  // Leñador en polea: de arriba a un lado hasta abajo al otro, girando el tronco.
  woodchop: { dur: 3000, look: .95, arm: 'ik', elbow: { L: [.5, -1, 0], R: [-.5, -1, 0] }, props: { cable: [120, 200, 10], boxes: [tower(10, 122)] }, keys: [
    pose({ sx: [.8, 0, -.6], px: [1, 0, 0], F: [16, 5, 0], H: [50, 158, 22], R: { H: [42, 158, 30] } }),
    pose({ hip: [0, 88, 0], lean: 12, sx: [.8, 0, .6], px: [1, 0, 0], F: [16, 5, 0], H: [-30, 62, 30], R: { H: [-38, 62, 22] } })] },
  // Press Pallof: de lado a la polea, las manos salen del pecho al frente sin dejar que el cable te gire.
  pallof: { dur: 3000, tempo: [.4, .2], look: .95, arm: 'ik', elbow: { L: [.6, -1, 0], R: [-.6, -1, 0] }, props: { cable: [120, 128, 16], boxes: [tower(16, 122)] }, keys: [
    pose({ F: [16, 5, 0], H: [4, 128, 18], R: { H: [-4, 128, 18] } }),
    pose({ F: [16, 5, 0], H: [4, 128, 56], R: { H: [-4, 128, 56] } })] },
  'twist-machine': { dur: 3000, tempo: [.5, 0], look: .8, knee: [0, .3, 1], props: { seat: true, attach: [{ at: 'shoulders', box: [50, 16, 6], off: [0, -8, 14], body: true }] }, keys: [
    pose({ ...SEAT, sx: [.82, 0, .57], px: [1, 0, 0], ua: [.4, -.3, .85], fa: [-.6, .4, .7] }),
    pose({ ...SEAT, sx: [.82, 0, -.57], px: [1, 0, 0], ua: [.4, -.3, .85], fa: [-.6, .4, .7] })] },
  'ab-wheel': { dur: 3600, look: .4, yaw: 1.25, floor: 1.0, arm: 'ik', leg: 'fk', elbow: [.2, 1, 0], knee: [0, -1, 0], props: { mat: 25, bar: 30, plates: 9 }, keys: [
    pose({ hip: [0, 47, -30], lean: 80, H: [10, 9, 22], th: [0, -1, 0], sh: [0, -.04, -1], hd: [0, .3, .95] }),
    pose({ hip: [0, 30, -5], lean: 84, H: [10, 9, 95], th: [0, -.73, -.68], sh: [0, -.04, -1], hd: [0, .25, .97] })] },

  // ---------- kettlebell ----------
  swing: { dur: 2200, look: .9, arm: 'straight', props: { bell: true }, keys: [
    raw({ head: [0, 133, 40], neck: [0, 122, 29], hip: [0, 86, -18], S: [20, 119, 26], E: [13, 90, 8], H: [4, 64, -10], P: [9, 86, -18], K: [18, 47, 8], F: [19, 5, 0] }),
    raw({ head: [0, 163, 1], neck: [0, 148, 0], hip: [0, 93, 0], S: [20, 143, 0], E: [13, 128, 27], H: [4, 113, 52], P: [9, 93, 0], K: [18, 49, 2], F: [19, 5, 0] })] },
  // Clean y snatch: la pesa sale de entre las piernas y acaba en el hombro o arriba, con un brazo.
  'kb-clean': { dur: 2600, look: .95, props: { bell: 'L', bellDown: true }, keys: [
    pose({ hip: [0, 84, -18], lean: 52, F: [19, 5, 0], ua: [-.25, -.9, -.35], fa: [-.2, -.85, -.5], hd: [0, .8, .6], R: { ua: [-.4, -.6, -.7], fa: [-.2, -.5, -.85] } }),
    pose({ F: [19, 5, 0], ua: [.25, -.95, .2], fa: [-.3, .92, .25], R: { ua: [-.3, -.95, 0], fa: [-.1, -1, .15] } })] },
  'kb-snatch': { dur: 2800, look: 1.05, props: { bell: 'L', bellDown: true }, keys: [
    pose({ hip: [0, 84, -18], lean: 52, F: [19, 5, 0], ua: [-.25, -.9, -.35], fa: [-.2, -.85, -.5], hd: [0, .8, .6], R: { ua: [-.4, -.6, -.7], fa: [-.2, -.5, -.85] } }),
    pose({ F: [19, 5, 0], ua: [.12, .6, .8], fa: [0, .9, .45], R: { ua: [-.3, -.95, 0], fa: [-.1, -1, .15] } }),
    pose({ F: [19, 5, 0], ua: [.1, 1, 0], fa: [-.03, 1, 0], R: { ua: [-.3, -.95, 0], fa: [-.1, -1, .15] } })] },
  goblet: { dur: 3200, look: .9, knee: [.45, 0, 1], props: { bell: true }, keys: [
    pose({ hip: [0, 50, -22], lean: 26, F: [19, 5, 0], ...RACK, hd: [0, .95, .3] }),
    pose({ F: [19, 5, 0], ...RACK })] },
  thruster: { dur: 3200, look: 1.05, knee: [.45, 0, 1], props: { bell: true }, keys: [
    pose({ hip: [0, 50, -22], lean: 26, F: [19, 5, 0], ...RACK, hd: [0, .95, .3] }),
    pose({ F: [19, 5, 0], ...RACK }),
    pose({ F: [19, 5, 0], ua: [.1, 1, .05], fa: [-.3, 1, 0] })] },
  'kb-press': { dur: 3000, look: 1.05, props: { bell: 'L', bellDown: true }, keys: [
    pose({ ua: [.3, -.93, .22], fa: [-.18, .95, .25], R: { ua: [-.25, -1, 0], fa: [-.1, -1, .15] } }),
    pose({ ua: [.12, 1, 0], fa: [-.04, 1, 0], R: { ua: [-.25, -1, 0], fa: [-.1, -1, .15] } })] },
  // Molino: pesa arriba con el brazo recto, el tronco baja de lado y la otra mano va hacia el pie.
  windmill: { dur: 4000, tempo: [.4, .15], look: 1.0, knee: [.4, 0, 1], props: { bell: 'L', bellDown: true }, keys: [
    pose({ F: [22, 5, 0], ua: [.1, 1, 0], fa: [0, 1, 0], R: { ua: [-.2, -1, .05], fa: [0, -1, .1] } }),
    pose({ hip: [10, 84, -6], lean: 20, sx: [.35, .9, .25], px: [1, .1, 0], F: [22, 5, 0], ua: [.1, 1, 0], fa: [0, 1, 0], hd: [.5, .85, 0], R: { ua: [-.2, -1, .1], fa: [0, -1, .1] } })] },
  // Levantada turca, resumida: de tumbado con la pesa arriba a sentado apoyado en el otro brazo.
  getup: { dur: 4600, tempo: [.45, .1], look: .5, yaw: .9, floor: 1.0, knee: [0, 1, 0], props: { mat: 25, bell: 'L', bellDown: true }, keys: [
    pose({ ...FLOOR, F: [14, 5, 64], ua: [.05, 1, 0], fa: [0, 1, 0], hd: [0, .12, -1], R: { F: [-16, 8, 104], ua: [-.8, -.05, .55], fa: [-.7, -.1, .7] } }),
    pose({ ...FLOOR, lean: -28, F: [14, 5, 64], ua: [.05, .95, .3], fa: [0, 1, 0], hd: [0, .9, -.3], R: { F: [-16, 8, 104], ua: [-.5, -.75, -.45], fa: [-.1, -.95, -.2] } })] },
  halo: { dur: 4200, tempo: [.5, 0], look: 1.05, arm: 'ik', elbow: { L: [.7, -1, 0], R: [-.7, -1, 0] }, props: { bell: true }, keys: [[0, 150, 24], [-22, 162, 2], [0, 160, -17], [22, 162, 2], [0, 150, 24]].map(([x, y, z]) =>
    pose({ H: [x + 6, y, z], R: { H: [x - 6, y, z] } })) },
  carry: { dur: 1300, tempo: [.5, 0], look: .95, props: { bell: 'both', bellDown: true }, gear: { mancuernas: DBN }, keys: [
    pose({ ...HANG, hip: [0, 92, 0], F: [11, 5, 20], R: { F: [-11, 10, -16] } }),
    pose({ ...HANG, hip: [0, 92, 0], F: [11, 10, -16], R: { F: [-11, 5, 20] } })] },
  // A una pierna: la otra queda estirada, sin apoyar.
  'glute-bridge-one': { dur: 3000, look: .35, yaw: 1.25, floor: 1.0, leg: { L: 'ik', R: 'fk' }, knee: [0, 1, .1], props: { mat: 20 }, keys: [
    pose({ hip: [0, 12, 4], lean: -92, F: [12, 5, 52], ua: [.3, -.05, 1], fa: [0, -.05, 1], hd: [0, .1, -1], R: { th: [0, .42, .9], sh: [0, .42, .9] } }),
    pose({ hip: [0, 38, 6], lean: -124, F: [12, 5, 52], ua: [.3, 0, 1], fa: [0, -.1, 1], hd: [0, .45, -.9], R: { th: [0, .2, .98], sh: [0, .2, .98] } })] },
  'hinge-one-leg': { dur: 3400, look: .9, leg: { L: 'ik', R: 'fk' }, props: DB, gear: { kettlebell: { bell: true, bellDown: true } }, keys: [
    pose({ hip: [0, 90, -10], lean: 72, F: [10, 5, 0], ua: [.02, -1, .02], fa: [0, -1, 0], hd: [0, .6, .8], R: { th: [0, -.25, -.97], sh: [0, -.15, -.99] } }),
    pose({ F: [10, 5, 0], ua: [.1, -1, .06], fa: [0, -1, .1], R: { th: [0, -1, .02], sh: [0, -1, 0] } })] },
  // Press en el suelo con una pesa: el codo toca el suelo abajo; la otra mano descansa.
  'press-floor': { dur: 3000, look: .35, yaw: 1.2, floor: 1.0, knee: [0, 1, 0], props: { mat: 25, bell: 'L', bellDown: true }, keys: [
    pose({ ...FLOOR, F: [14, 5, 64], ua: [1, -.02, .1], fa: [0, 1, 0], hd: [0, .12, -1], R: { F: [-14, 5, 64], ua: [-.8, -.02, .6], fa: [0, -.02, 1] } }),
    pose({ ...FLOOR, F: [14, 5, 64], ua: [.1, 1, 0], fa: [0, 1, 0], hd: [0, .12, -1], R: { F: [-14, 5, 64], ua: [-.8, -.02, .6], fa: [0, -.02, 1] } })] },

  // ---------- cardio ----------
  // Bici: los pies dan la vuelta completa al pedal, uno frente al otro.
  bike: { dur: 1500, loop: true, look: .85, yaw: 1.0, arm: 'ik', elbow: [.5, -1, -.3], knee: [.1, 0, 1],
    props: { boxes: [[5, 62, 5, 0, 60, -6], [18, 5, 28, 0, 91, -4], [5, 84, 5, 0, 70, 52], [46, 4, 4, 0, 112, 52], [8, 6, 100, 0, 3, 22], [4, 44, 44, 0, 32, 46], [4, 10, 10, 0, 30, 12]] },
    keys: [0, 1, 2, 3, 4].map(i => { const a = i * Math.PI / 2, f = (b, x) => [x, 30 - 17 * Math.sin(b), 12 + 17 * Math.cos(b)];     // delante → abajo → detrás → arriba
      return pose({ hip: [0, 96, -4], lean: 30, H: [20, 113, 50], F: f(a, 10), hd: [0, .85, .5], R: { F: f(a + Math.PI, -10) } }); }) },
  // Elíptica: los pies dibujan un óvalo y cada mano acompaña a la pierna contraria.
  elliptical: { dur: 1700, loop: true, look: .95, yaw: 1.0, arm: 'ik', elbow: [.4, -1, -.5], knee: [.1, 0, 1],
    props: { arms: [22, 26, 50], grip: [1, 0, 0], boxes: [[60, 6, 150, 0, 3, 5], [6, 130, 6, 0, 65, 72], [30, 20, 4, 0, 132, 70]] },
    keys: [0, 1, 2, 3, 4].map(i => { const a = i * Math.PI / 2, f = (b, x) => [x, 17 - 7 * Math.sin(b), 22 * Math.cos(b)], h = (b, x) => [x, 122, 30 - 13 * Math.cos(b)];
      return pose({ hip: [0, 103 + 1.5 * Math.cos(2 * a), 0], lean: 6, F: f(a, 12), H: h(a, 22), R: { F: f(a + Math.PI, -12), H: h(a + Math.PI, -22) } }); }) },
  // Escaladora: un pie sube al peldaño mientras el otro baja; manos en las barandillas.
  stairs: { dur: 1400, tempo: [.5, 0], look: 1.05, yaw: 1.0, arm: 'ik', elbow: [.3, -1, -.6], knee: [0, 0, 1],
    props: { boxes: [[60, 16, 30, 0, 8, -4], [60, 34, 30, 0, 17, 26], [60, 52, 30, 0, 26, 56], [5, 5, 90, 30, 128, 30], [5, 5, 90, -30, 128, 30], [5, 80, 5, 30, 90, 70], [5, 80, 5, -30, 90, 70]] },
    keys: [0, 1].map(k => pose({ hip: [0, 118, 6], lean: 8, H: [30, 131, 32], F: k ? [11, 22, -2] : [11, 40, 26], R: { H: [-30, 131, 32], F: k ? [-11, 40, 26] : [-11, 22, -2] } })) },
  // Remo de ergómetro: primero empujan las piernas, luego se inclina el tronco y al final tiran los brazos.
  erg: { dur: 2800, look: .6, yaw: 1.15, floor: 1.0, knee: [0, 1, 0],
    props: { bar: 44, cable: [0, 46, 96], attach: [{ at: 'hip', box: [30, 6, 26], off: [0, -14, 0] }], boxes: [[8, 6, 210, 0, 12, -4], [6, 56, 56, 0, 38, 108], [34, 22, 6, 0, 30, 72], [6, 12, 6, 0, 6, -100], [6, 12, 6, 0, 6, 90]] },
    keys: [
      pose({ hip: [0, 32, 14], lean: 22, F: [12, 30, 64], ua: [.05, -.2, 1], fa: [-.03, -.05, 1], hd: [0, .9, .44] }),
      pose({ hip: [0, 32, -24], lean: 4, F: [12, 30, 64], ua: [.05, -.3, 1], fa: [-.03, -.05, 1] }),
      pose({ hip: [0, 32, -26], lean: -16, F: [12, 30, 64], ua: [.32, -.7, -.62], fa: [-.08, .12, 1] })] },
  // Comba: saltos cortos, codos pegados y las muñecas hacia fuera.
  rope: { dur: 520, tempo: [.5, 0], look: .95, props: {}, keys: [
    pose({ hip: [0, 92, 0], ua: [.18, -1, -.05], fa: [.75, -.6, .3] }),
    pose({ hip: [0, 100, 0], F: [11, 13, 0], ua: [.18, -1, -.05], fa: [.75, -.55, .35] })] },
  // Zancada en multipower: pies fijos, uno delante y otro detrás; la barra sube y baja guiada.
  'lunge-bar': { dur: 3200, look: .9, arm: 'ik', elbow: [.6, -1, -.4], knee: { L: [0, -.3, 1], R: [0, 0, 1] }, props: { bar: 180, plates: 20, smith: true }, keys: [
    pose({ hip: [0, 58, -10], lean: 6, H: [36, 114, -15], F: [10, 9, -50], R: { F: [-10, 5, 26] } }),
    pose({ hip: [0, 84, -10], lean: 6, H: [36, 140, -15], F: [10, 9, -50], R: { F: [-10, 5, 26] } })] },
};

// Ejercicios que no se hacen en la postura de su familia, o que llevan un material distinto del habitual.
// Valor: nombre de la variante, o { move, props (sustituye al material), add (se suma al material), patch (cambia el movimiento) }.
const P_BAR = { bar: 46, cable: [0, 222, 46], boxes: [tower(48)] };
export const SHOW = {
  // tirón
  'jalon-agarre-ancho': 'pull-down-wide', 'jalon-agarre-neutro': 'pull-down-close', 'jalon-supino': 'pull-down-close',
  'dominadas-agarre-neutro': 'pull-up-close', 'dominadas-supinas': 'pull-up-close', 'dominadas-asistidas': { add: KNEE_STEP },
  'remo-polea-alta': { props: { seat: true, cables: [5, 190, 150], boxes: [[44, 30, 6, 0, 32, 84], tower(152)] } },
  'remo-mancuerna': 'row-db', 'kb-remo': 'row-db', 'remo-pecho-apoyado-mancuernas': 'row-chest', 'remo-invertido': 'row-inverted',
  'remo-t-barra': { props: { bar: 60, plates: 20 } }, 'pullover-mancuerna': 'pullover-db',
  // bíceps y tríceps
  'curl-martillo': { props: DBN }, 'curl-polea-cuerda': { props: { rope: true, cable: [0, 8, 34], boxes: [tower(40)] } },
  'curl-predicador-barra': 'curl-preacher', 'curl-predicador-maquina': 'curl-preacher', 'curl-maquina': 'curl-preacher',
  'curl-inclinado': 'curl-incline', 'curl-concentrado': 'curl-concentration', 'curl-barra-recta': { props: { bar: 120, plates: 12 } },
  'triceps-cuerda': { props: { rope: true, cable: [0, 222, 46], boxes: [tower(48)] } }, 'triceps-barra-polea': { props: P_BAR }, 'triceps-polea-inversa': { props: P_BAR },
  'triceps-polea-una-mano': { oneArm: true, props: { cables: [10, 222, 46], only: 'L', boxes: [tower(48, 10)] } },
  'elevaciones-laterales-polea': { oneArm: true }, 'press-hombro-polea': { oneArm: true },
  'jalon-unilateral-polea': { oneArm: true, props: { seat: true, cables: [30, 226, 6], only: 'L', boxes: [tower(74), [9, 9, 78, 0, 228, 38], [34, 8, 14, 0, 62, 30]] } }, 'triceps-maquina': 'triceps-machine',
  'press-frances-barra': 'skullcrusher', 'press-frances-mancuernas': 'skullcrusher',
  // empuje
  'press-inclinado-maquina': 'press-diagonal', 'press-declinado': 'press-decline', 'press-pecho-polea': 'press-cable',
  'press-banca-agarre-cerrado': 'press-close', 'press-cerrado-mancuernas': 'press-close',
  'aperturas-maquina': 'pec-deck', 'aperturas-inclinadas-mancuernas': 'fly-incline', 'cruce-poleas-bajas': 'cable-cross-low',
  'flexiones-rodillas': 'push-up-knees', 'fondos-triceps-banco': 'bench-dip', 'fondos-asistidos': { add: KNEE_STEP },
  'press-militar': 'press-overhead', 'remo-al-menton': 'upright-row', 'pajaros-maquina': 'rear-fly-seated', 'pajaros-polea': 'rear-fly-cable',
  // pierna y glúteo
  'gemelos-prensa': 'calf-press', 'gemelos-sentado': 'calf-seated',
  'sentadilla-frontal': 'squat-front', 'kb-sentadilla-frontal': 'squat-front', 'sentadilla-cuerpo': 'squat-air', 'sentadilla-mancuernas': 'squat-db',
  'sentadilla-sumo-mancuerna': 'squat-sumo', 'sentadilla-hack': 'hack-squat', 'sentadilla-pared': 'wall-sit',
  'sentadilla-banda-gluteo': { move: 'squat-air', add: BAND },
  'zancada-gluteo-multipower': 'lunge-bar', 'sentadilla-bulgara': 'split-squat', 'subida-banco': 'step-up', 'kb-zancada-lateral': 'lunge-side',
  'curl-femoral': 'leg-curl-lying', 'hiperextensiones': 'hyperextension', 'peso-muerto-sumo': 'hinge-sumo', 'buenos-dias': 'good-morning', 'kb-windmill': 'windmill', 'peso-muerto-rumano-una-pierna': 'hinge-one-leg', 'kb-peso-muerto-una-pierna': 'hinge-one-leg', 'kb-press-suelo': 'press-floor',
  'puente-gluteo': 'glute-bridge', 'puente-gluteo-una-pierna': 'glute-bridge-one', 'puente-gluteo-banda': 'glute-bridge',
  'patada-gluteo-polea': 'kickback', 'patada-gluteo-maquina': 'kickback', 'patada-gluteo-cuadrupedia': 'kickback-floor',
  'abduccion-polea': 'leg-out', 'aductores-polea': 'leg-in', 'caminata-lateral-banda': 'band-walk', 'almeja-banda': 'clamshell',
  // core
  'escaladores': 'mountain-climber', 'plancha-toque-hombro': 'plank-high', 'dead-bug': 'dead-bug',
  'abdominales-banco-declinado': 'crunch-decline', 'crunch-maquina': 'crunch-machine', 'crunch-polea': 'crunch-cable',
  'elevacion-piernas-colgado': 'hanging-raise', 'elevacion-rodillas-silla-romana': 'hanging-raise',
  'lenador-polea': 'woodchop', 'pallof-press': 'pallof', 'rotacion-maquina': 'twist-machine',
  // kettlebell
  'kb-clean': 'kb-clean', 'kb-snatch': 'kb-snatch', 'kb-swing-una-mano': { props: { bell: 'L' } }, 'kb-thruster': 'thruster', 'kb-turkish-getup': 'getup',
  'kb-paseo-maleta': { props: { bell: 'L', bellDown: true } },
  // cardio
  'cinta-caminar': 'walk', 'cinta-correr': 'walk', 'cinta-inclinada': 'walk',
  'bici-estatica': 'bike', 'eliptica': 'elliptical', 'escaladora': 'stairs', 'remo-ergometro': 'erg', 'comba': 'rope',
};

export const moveFor = name => (MOVES[name] ? name : 'stand');
// Postura y material de un ejercicio concreto.
export function moveOf(ex) {
  const s = SHOW[ex?.id], o = typeof s === 'string' ? { move: s } : s || {};
  let mv = MOVES[o.move] ?? MOVES[ex?.move] ?? MOVES.stand;
  if (o.oneArm) {            // ejercicio a una mano: el brazo derecho cuelga quieto en vez de copiar al izquierdo
    const still = k => { const E = add(k.RS, norm([-.15, -1, -.05]), 31); return { ...k, RE: E, RH: add(E, norm([0, -1, .12]), 28) }; };
    mv = { ...mv, keys: mv.keys.map(still), arm: { L: typeof mv.arm === 'string' ? mv.arm : mv.arm?.L || 'fk', R: 'fk' } };
  }
  const props = o.props ?? mv.gear?.[ex?.equip] ?? mv.props ?? {};
  return { ...mv, ...o.patch, props: { ...props, ...o.add } };
}
