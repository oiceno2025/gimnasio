// Lógica pura: fechas, qué toca hoy, última vez, récords, progresión, cardio. Sin DOM ni base de datos.

// ---------- fechas (siempre en hora local, como 'AAAA-MM-DD') ----------
const pad = n => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const dow = (d = new Date()) => (d.getDay() + 6) % 7 + 1;                       // lunes = 1 … domingo = 7
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
export const weekDates = (d = new Date()) => { const mon = addDays(d, 1 - dow(d)); return Array.from({ length: 7 }, (_, i) => ymd(addDays(mon, i))); };
export function weekKey(d = new Date()) {                                             // semana ISO: 'AAAA-Www'
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate() + 4 - dow(t));
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return `${t.getFullYear()}-W${pad(Math.ceil(((t - jan1) / 864e5 + 1) / 7))}`;
}
export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_LETTERS = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const niceDate = s => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

// ---------- números ----------
export const roundTo = (v, step) => Math.round(v / step) * step;
export const fmtKg = v => (v == null || v === '' ? '' : String(Math.round(v * 100) / 100).replace('.', ','));
export const fmtClock = secs => { const s = Math.max(0, Math.ceil(secs)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
export const epley = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30));           // fuerza máxima estimada (1RM)

// ---------- plan ----------
// Semana dentro de un plan: cuántas semanas distintas se ha entrenado con él, contando esta.
export function planWeek(sessions, routineId, date = new Date()) {
  const wk = weekKey(date), weeks = new Set(sessions.filter(s => s.routineId === routineId).map(s => weekKey(parseYmd(s.date))));
  weeks.add(wk); return [...weeks].filter(w => w <= wk).length;
}
// Ejercicios del día para esa semana del plan (algunos entran o salen según `fromWeek` y `untilWeek`).
export const itemsFor = (day, week = 1) => (day?.items || []).filter(i => (i.fromWeek || 1) <= week && week <= (i.untilWeek || Infinity));
export const dayOf = (routine, n) => routine?.days?.[n] || null;
export function estimateMinutes(day, week, exById, warm = 9, cool = 6) {
  const secs = itemsFor(day, week).reduce((t, i) => t + i.sets * ((i.secs || 40) * (exById[i.exerciseId]?.uni ? 2 : 1) + restFor(exById[i.exerciseId])), 0);
  return Math.round((secs / 60 + warm + cool) / 5) * 5;
}

// ---------- descanso ----------
export const REST_DEFAULT = { big: 120, small: 90, core: 60, kb: 60 };
export function restFor(ex, custom = {}) {
  if (!ex) return 90;
  if (ex.rest) return ex.rest;
  if (ex.id === 'veintiuno') return custom.big ?? REST_DEFAULT.big;
  return custom[ex.kind] ?? REST_DEFAULT[ex.kind] ?? 90;
}

// ---------- historial ----------
const work = s => s.type !== 'warmup' && s.type !== 'cardio';
// Series de la última sesión en que se hizo el ejercicio (sin contar la sesión en curso).
export function lastTime(sets, exerciseId, { notSession, mode } = {}) {
  const mine = sets.filter(s => s.exerciseId === exerciseId && s.sessionId !== notSession && work(s) && (!mode || !s.mode || s.mode === mode));
  if (!mine.length) return [];
  const last = mine.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.at > a.at) ? b : a));
  return mine.filter(s => s.sessionId === last.sessionId).sort((a, b) => a.at - b.at);
}
export function records(sets, exerciseId) {
  const mine = sets.filter(s => s.exerciseId === exerciseId && work(s));
  if (!mine.length) return null;
  const top = (f) => mine.reduce((a, b) => (f(b) > f(a) ? b : a));
  const kg = top(s => s.kg * 1000 + s.reps), orm = top(s => epley(s.kg, s.reps)), reps = top(s => s.reps);
  return { kg, orm: { ...orm, value: epley(orm.kg, orm.reps) }, reps };
}
// Qué récords bate una serie nueva frente a las anteriores. La primera vez no cuenta como récord.
export function recordsBroken(set, prior) {
  const old = prior.filter(s => s.exerciseId === set.exerciseId && work(s));
  if (!old.length || !work(set) || !(set.reps > 0)) return [];
  const out = [], maxKg = Math.max(...old.map(s => s.kg));
  if (set.kg > maxKg) out.push('kg');
  else {
    const same = old.filter(s => s.kg >= set.kg);
    if (same.length && set.reps > Math.max(...same.map(s => s.reps))) out.push('reps');
  }
  if (set.kg > 0 && epley(set.kg, set.reps) > Math.max(...old.map(s => epley(s.kg, s.reps))) + 1e-9 && !out.includes('kg')) out.push('orm');
  return out;
}
export const RECORD_TEXT = { kg: 'Récord de peso', reps: 'Récord de repeticiones', orm: 'Récord de fuerza estimada' };

// ---------- progresión ----------
// Doble progresión: primero se llega al tope de repeticiones en todas las series; entonces sube el peso
// un escalón y se vuelve al suelo del rango. Tras 2 semanas o más sin hacerlo, se vuelve un 7,5 % por debajo.
// Con `ladder` (pesas sueltas: 8, 12, 16, 22) se sube o se baja al peso siguiente que exista.
export function prefill(last, item, { step = 2.5, daysSince = 0, ladder } = {}) {
  const up = kg => (ladder ? ladder.find(w => w > kg) ?? kg : kg + step), down = kg => (ladder ? [...ladder].reverse().find(w => w < kg) ?? kg : roundTo(kg * 0.925, step));
  const n = item.sets, lo = item.repsMin ?? item.secs ?? 10, hi = item.repsMax ?? lo;
  if (!last.length) return { why: 'new', sets: Array.from({ length: n }, () => ({ kg: item.startKg ?? null, reps: lo })) };
  const at = i => last[Math.min(i, last.length - 1)], clamp = r => Math.min(hi, Math.max(lo, r));
  const topKg = Math.max(...last.map(s => s.kg));
  if (daysSince >= 14 && topKg > 0)
    return { why: 'back', sets: Array.from({ length: n }, (_, i) => ({ kg: down(at(i).kg), reps: lo })) };
  const full = last.length >= n && last.every(s => s.reps >= hi), easy = !last.some(s => s.rir === 0);
  if (full && easy && topKg > 0)
    return { why: 'up', sets: Array.from({ length: n }, (_, i) => ({ kg: up(at(i).kg), reps: lo })) };
  if (full && easy && topKg === 0 && item.secs == null)
    return { why: 'up', sets: Array.from({ length: n }, () => ({ kg: 0, reps: hi + 1 })) };
  return { why: 'same', sets: Array.from({ length: n }, (_, i) => ({ kg: at(i).kg, reps: clamp(at(i).reps) })) };
}
export const WHY_TEXT = {
  new: 'Primera vez: apunta lo que levantes hoy.',
  up: 'La última vez llegaste al tope en todas. Hoy, un escalón más.',
  back: 'Vuelves tras una pausa: hoy un poco por debajo.',
  same: '',
};

// ---------- cardio ----------
// Fórmula de caminar del ACSM: VO2 (ml/kg/min) = 3,5 + 0,1·v + 1,8·v·pendiente, con v en m/min.
// Es una estimación, y se agarra peor cuanto más rápido se va o si te sujetas a las barras.
export function acsmWalkKcal({ bodyKg, kmh, inclinePct, minutes }) {
  if (!(bodyKg > 0) || !(kmh > 0) || !(minutes > 0)) return 0;
  const v = kmh * 1000 / 60, vo2 = 3.5 + 0.1 * v + 1.8 * v * ((inclinePct || 0) / 100);
  return Math.round(vo2 * bodyKg / 1000 * 5 * minutes);
}
// Elíptica a ritmo medio: unos 5 MET (estimación gruesa).
export const ellipticalKcal = ({ bodyKg, minutes }) => (bodyKg > 0 && minutes > 0 ? Math.round(5 * 3.5 * bodyKg / 200 * minutes) : 0);

// ---------- progreso ----------
// Fuerza frente al punto de partida: media del cambio de 1RM estimado en los ejercicios que tienen marca inicial.
export function strengthChange(baseline, sets) {
  const rows = [];
  for (const b of baseline || []) {
    if (!(b.kg > 0) || !(b.reps > 0)) continue;
    const last = lastTime(sets, b.exerciseId); if (!last.length) continue;
    const start = epley(b.kg, b.reps), now = Math.max(...last.map(s => epley(s.kg, s.reps))), best = last.reduce((a, s) => (s.kg > a.kg ? s : a));
    rows.push({ exerciseId: b.exerciseId, startKg: b.kg, nowKg: best.kg, pct: (now / start - 1) * 100 });
  }
  return { rows, pct: rows.length ? rows.reduce((t, r) => t + r.pct, 0) / rows.length : null };
}
// Marcas iniciales que faltan: se toman de la primera sesión en que aparezca el ejercicio.
export function fillBaseline(baseline, sets) {
  return (baseline || []).map(b => {
    if (b.kg > 0 && b.reps > 0) return b;
    const mine = sets.filter(s => s.exerciseId === b.exerciseId && work(s) && s.kg > 0).sort((x, y) => x.at - y.at);
    if (!mine.length) return b;
    const first = mine.filter(s => s.sessionId === mine[0].sessionId).reduce((a, s) => (epley(s.kg, s.reps) > epley(a.kg, a.reps) ? s : a));
    return { ...b, kg: first.kg, reps: first.reps, auto: first.date };
  });
}
export function attendance(sessions, routine, from, to = ymd()) {
  const done = new Set(sessions.filter(s => s.endedAt).map(s => s.date)); let possible = 0, made = 0;
  for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) if (dayOf(routine, dow(d))) { possible++; if (done.has(ymd(d))) made++; }
  return { made: Math.max(made, [...done].filter(x => x >= from && x <= to).length), possible };
}
export function weeksInARow(sessions, routine, today = new Date()) {
  const done = new Set(sessions.filter(s => s.endedAt).map(s => s.date)); let n = 0;
  for (let w = 0; w < 520; w++) {
    const days = weekDates(addDays(today, -7 * w)), planned = days.filter((d, i) => dayOf(routine, i + 1) && d <= ymd(today));
    if (!planned.length) continue;
    const ok = planned.every(d => done.has(d));
    if (ok) n++; else if (w === 0) continue; else break;       // la semana en curso no rompe la racha
  }
  return n;
}
export const cardioMinutes = (sessions, dates) => sessions.filter(s => dates.includes(s.date)).reduce((t, s) => t + (s.cardio?.minutes || 0), 0);

// ---------- alternativas ----------
// Ejercicios que trabajan lo mismo, para cuando la máquina está ocupada o no existe en ese gimnasio.
// Mismo músculo principal y mismo tipo; primero la alternativa señalada en el catálogo, luego el mismo
// movimiento con otro material, y al final otros movimientos para ese músculo.
export function alternatives(ex, all, max = 6) {
  if (!ex?.muscles?.length) return [];
  const score = e => (e.id === ex.alt ? 8 : 0) + (e.move === ex.move ? 4 : 0) + (e.equip !== ex.equip ? 2 : 0) + (e.group === ex.group ? 1 : 0) + (ex.muscles.includes(e.muscles[1]) || e.muscles.includes(ex.muscles[1]) ? 1 : 0);
  return all.filter(e => e.id !== ex.id && !e.archived && e.group !== 'cardio' && e.muscles?.[0] === ex.muscles[0] && e.kind === ex.kind)
    .map(e => [score(e), e]).sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name, 'es')).slice(0, max).map(x => x[1]);
}
