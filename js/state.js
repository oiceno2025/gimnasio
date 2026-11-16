// Estado en memoria. Todo se lee una vez al arrancar; cada cambio se escribe en la base de datos y aquí.
import { openDB, persist, uid } from './db.js';
import { EXERCISES } from './data/exercises.js';
import { TEMPLATES, KB_LADDER } from './data/routines.js';
import { ymd, weekKey, dow, planWeek, itemsFor, dayOf, lastTime, prefill, daysBetween } from './logic.js';

export const S = { db: null, sets: [], sessions: [], body: [], settings: {}, routines: [], custom: [], ex: {}, persisted: false, viewDay: null };

export async function boot() {
  S.db = await openDB();
  persist().then(ok => { S.persisted = ok; });     // sin esperar: algunos navegadores no contestan nunca
  await reload();
  // Sesiones de otros días que se quedaron abiertas: se cierran solas si tienen series; si no, se descartan.
  for (const s of S.sessions.filter(x => !x.endedAt && x.date !== ymd())) {
    if (S.sets.some(x => x.sessionId === s.id)) await saveSession({ ...s, endedAt: s.startedAt, auto: true });
    else { await S.db.del('sessions', s.id); S.sessions = S.sessions.filter(x => x.id !== s.id); }
  }
}
export async function reload() {
  const db = S.db;
  [S.sets, S.sessions, S.body, S.routines, S.custom] = await Promise.all([db.sets(), db.all('sessions'), db.all('body'), db.all('routines'), db.all('exercises')]);
  S.settings = Object.fromEntries((await db.all('settings')).map(r => [r.key, r.value]));
  S.body.sort((a, b) => (a.date < b.date ? -1 : 1));
  indexExercises();
}
function indexExercises() { S.ex = Object.fromEntries([...EXERCISES, ...S.custom].map(e => [e.id, e])); }

export const setting = (k, fallback) => S.settings[k] ?? fallback;
export async function saveSetting(k, v) { S.settings[k] = v; await S.db.saveSetting(k, v); }

// ---------- planes ----------
export const plans = () => S.routines.filter(r => !r.archived);
// Se pueden llevar varios planes a la vez (fuerza y kettlebell, por ejemplo). Los días en que coinciden,
// se elige en Hoy cuál toca, y la app recuerda la elección para ese día de la semana.
export function activePlans() {
  const ids = setting('active') ?? [setting('routine')], on = ids.map(id => plans().find(r => r.id === id)).filter(Boolean);
  return on.length ? on : plans().slice(0, 1);
}
export const plansOn = n => activePlans().filter(r => r.days?.[n]);
export function routineFor(date = new Date(), n = dow(date)) {
  const on = plansOn(n), pick = setting('dayPlan', {})[n];
  return on.find(r => r.id === pick) ?? on[0] ?? activePlans()[0] ?? null;
}
// La semana tal como queda al combinar los planes activos.
export const weekPlan = () => ({ days: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].filter(n => plansOn(n).length).map(n => [n, routineFor(undefined, n).days[n]])) });
export async function choosePlan(id) { await saveSetting('active', [id]); }
export async function togglePlan(id) {
  const ids = activePlans().map(r => r.id), next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  if (next.length) await saveSetting('active', next);
  return next.length > 0;
}
export async function setDayPlan(n, id) { await saveSetting('dayPlan', { ...setting('dayPlan', {}), [n]: id }); }
export async function addPlanFromTemplate(templateId, name) {
  const t = TEMPLATES.find(x => x.id === templateId), r = { ...structuredClone(t), id: uid(), template: t.id, name: name || t.name, createdAt: Date.now() };
  delete r.about; await saveRoutine(r); return r;
}
export async function saveRoutine(r) { const i = S.routines.findIndex(x => x.id === r.id); if (i < 0) S.routines.push(r); else S.routines[i] = r; await S.db.put('routines', r); }
export async function saveExercise(e) { const i = S.custom.findIndex(x => x.id === e.id); if (i < 0) S.custom.push(e); else S.custom[i] = e; await S.db.put('exercises', e); indexExercises(); }

// ---------- sesión ----------
export const openSession = () => S.sessions.find(s => !s.endedAt && s.date === ymd()) || null;
export const sessionOn = date => S.sessions.filter(s => s.date === date && s.endedAt).at(-1) || null;
export const setsOf = (sessionId, exerciseId) => S.sets.filter(s => s.sessionId === sessionId && (!exerciseId || s.exerciseId === exerciseId));
export async function saveSession(s) { const i = S.sessions.findIndex(x => x.id === s.id); if (i < 0) S.sessions.push(s); else S.sessions[i] = s; await S.db.put('sessions', s); return s; }
export async function startSession(dayN) {
  const routine = routineFor(undefined, dayN), day = dayOf(routine, dayN), week = planWeek(S.sessions, routine.id);
  return saveSession({ id: uid(), date: ymd(), routineId: routine.id, mode: routine.mode, dayN, kind: day.kind, title: day.title, week,
    items: structuredClone(dayN === dow() ? withSwaps(itemsFor(day, week)) : itemsFor(day, week)), cardioGoal: day.cardio ?? (routine.mode === 'fuerza' ? 25 : 0), startedAt: Date.now(), endedAt: null });
}
// Cambios de ejercicio solo para hoy (máquina ocupada o que no hay): no tocan el plan.
export const swapsToday = () => setting('swap:' + ymd(), {});
export async function swapToday(from, to) { const m = { ...swapsToday() }; if (to === from) delete m[from]; else m[from] = to; await saveSetting('swap:' + ymd(), m); }
export const withSwaps = items => { const m = swapsToday(); return items.map(i => (m[i.exerciseId] && S.ex[m[i.exerciseId]] ? { ...i, was: i.exerciseId, exerciseId: m[i.exerciseId] } : i)); };
// Cambiar un ejercicio por otro dentro de un día del plan, conservando series y repeticiones.
export async function replaceInPlan(routine, n, from, to) {
  const item = routine.days[n]?.items.find(i => i.exerciseId === from); if (!item) return;
  item.exerciseId = to; delete item.startKg; if (S.ex[to]?.unit === 'secs' && !item.secs) { item.secs = 30; delete item.repsMin; delete item.repsMax; }
  if (S.ex[to]?.unit !== 'secs' && item.secs) { delete item.secs; item.repsMin = 10; item.repsMax = 12; }
  await saveRoutine(routine);
}
export async function addSet(set) { const rec = await S.db.addSet(set); S.sets.push(rec); return rec; }
export async function fixSet(id, patch) { const rec = await S.db.fixSet(id, patch); S.sets = S.sets.filter(s => s.id !== id); if (!rec.void) S.sets.push(rec); S.sets.sort((a, b) => a.at - b.at); return rec; }

// Series de hoy ya rellenadas para un ejercicio: lo de la última vez, con la subida o la bajada que toque.
export function planFor(item, session) {
  const ex = S.ex[item.exerciseId], last = lastTime(S.sets, item.exerciseId, { notSession: session?.id, mode: session?.mode ?? routineFor()?.mode });
  const daysSince = last.length ? daysBetween(last[0].date, ymd()) : 0;
  const step = ex?.equip === 'mancuernas' ? 2 : 2.5;
  if (ex?.group === 'cardio' && item.secs) item = { ...item, secs: Math.round(item.secs / 60) };     // el cardio se apunta en minutos
  return { last, daysSince, ...prefill(last, item, { step, daysSince, ladder: ex?.equip === 'kettlebell' ? setting('kbLadder', KB_LADDER) : null }) };
}

// Minutos de cardio en unas fechas: el bloque de cardio de la sesión más los ejercicios de cardio apuntados.
export const cardioMin = dates => S.sessions.filter(s => dates.includes(s.date)).reduce((t, s) => t + (s.cardio?.minutes || 0), 0) + S.sets.filter(s => s.unit === 'min' && dates.includes(s.date)).reduce((t, s) => t + s.reps, 0);

// ---------- cuerpo ----------
export const bodyKg = () => S.body.at(-1)?.kg ?? setting('profile')?.kg ?? null;
export async function addBody(kg, date = ymd()) {
  const rec = { id: S.body.find(b => b.date === date)?.id ?? uid(), date, kg };
  S.body = [...S.body.filter(b => b.id !== rec.id), rec].sort((a, b) => (a.date < b.date ? -1 : 1)); await S.db.put('body', rec);
}
export const todayN = () => dow();
