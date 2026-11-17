// Sesiones pasadas: verlas, corregir una serie, añadir la que faltó y apuntar un entreno olvidado.
// Las series siguen siendo de solo añadir: corregir o borrar es otro registro que sustituye al anterior.
import { S, setsOf, addSet, fixSet, saveSession, activePlans } from '../state.js';
import { ymd, parseYmd, addDays, dow, niceDate, DAY_NAMES, fmtKg, itemsFor, planWeek } from '../logic.js';
import { uid } from '../db.js';
import { esc, $, $$, num, go, top, back, toast, sheet, pickRows, confirmSheet } from './kit.js';
import { refresh } from '../nav.js';

const UNIT = { secs: ['s', 'Segundos'], min: ['min', 'Minutos'] }, unitOf = u => UNIT[u] ?? ['rep', 'Repeticiones'];
const setText = s => `${s.kg > 0 ? `${fmtKg(s.kg)} kg <i class="x">×</i> ` : ''}${s.reps} ${unitOf(s.unit)[0]}`;
const dayText = date => `${DAY_NAMES[dow(parseYmd(date))]} ${niceDate(date)} ${date.slice(0, 4)}`;
const sync = () => { import('../sheets.js').then(m => m.queueSheet()); };       // la hoja de Google y su copia, si están conectadas

export function view(id) { return id ? detail(id) : list(); }

function list() {
  const done = S.sessions.filter(s => s.endedAt).sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1));
  const html = top(back('#/progreso', 'Progreso'), `${done.length} ${done.length === 1 ? 'sesión' : 'sesiones'}`) + `
    <h1 class="big">Tus<br><em>sesiones</em></h1>
    <p class="lede">Toca una para ver lo que hiciste o corregir algo que apuntaste mal.</p>
    <button class="cta ghost" data-act="add">Añadir un entreno <i>que no apuntaste</i></button>
    ${done.length ? `<div class="rows" style="margin-top:14px">${done.slice(0, 300).map(s => `<a class="chev" href="#/historial/${encodeURIComponent(s.id)}"><p>${dayText(s.date)}<small>${esc((s.title || []).join(' '))} · ${setsOf(s.id).length} series${s.manual ? ' · añadida después' : ''}</small></p></a>`).join('')}</div>` : '<p class="empty">Cuando acabes tu primera sesión, aparecerá aquí.</p>'}`;
  return {
    bare: true, html,
    actions: {
      async add() {
        let date = ymd(addDays(new Date(), -1));
        const asked = sheet('Añadir un entreno', `<p class="lede">Para un día que entrenaste y no lo apuntaste. Luego pones las series.</p>
          <div class="pad"><label class="field"><span>Qué día fue</span><input class="wide" type="date" id="when" max="${ymd()}" value="${date}"></label></div>
          <div class="pair"><button class="cta" data-pick="ok">Seguir</button></div>`);
        $('#when').addEventListener('input', e => { date = e.target.value; });
        if ((await asked) !== 'ok') return;
        if (!/^\d{4}-\d\d-\d\d$/.test(date) || date > ymd()) return toast('Elige un día que ya haya pasado');
        const d = parseYmd(date), today = dow(d), opts = [];
        for (const r of activePlans()) for (const n of Object.keys(r.days).map(Number)) opts.push({ id: r.id + '|' + n, n, name: r.days[n].title.join(' '), sub: `${DAY_NAMES[n]} · ${r.name}` });
        if (!opts.length) return toast('Primero monta un plan en Rutina');
        opts.sort((a, b) => (b.n === today) - (a.n === today) || a.n - b.n);        // primero lo que tocaba ese día de la semana
        const pick = await sheet(`¿Qué hiciste el ${niceDate(date)}?`, pickRows(opts)); if (!pick) return;
        const [rid, n] = pick.split('|'), r = activePlans().find(x => x.id === rid), day = r.days[n], week = planWeek(S.sessions, r.id, d), at = d.setHours(12);
        const s = await saveSession({ id: uid(), date, routineId: r.id, mode: r.mode, dayN: +n, kind: day.kind, title: day.title, week, items: structuredClone(itemsFor(day, week)), cardioGoal: 0, startedAt: at, endedAt: at, manual: true });
        go('#/historial/' + s.id);
      },
    },
  };
}

function detail(id) {
  const s = S.sessions.find(x => x.id === id && x.endedAt); if (!s) return { redirect: '#/historial' };
  const sets = setsOf(s.id), ids = [...new Set([...(s.items || []).map(i => i.exerciseId), ...sets.map(x => x.exerciseId)])];
  const item = exId => (s.items || []).find(i => i.exerciseId === exId);
  const unit = exId => { const had = sets.find(x => x.exerciseId === exId); return had ? had.unit : S.ex[exId]?.group === 'cardio' ? 'min' : item(exId)?.secs ? 'secs' : undefined; };
  const extra = [s.cardio ? `${s.cardio.minutes} min de cardio` : '', s.note ? esc(s.note) : ''].filter(Boolean).join(' · ');

  const html = top(back('#/historial', 'Sesiones'), `${sets.length} series`) + `
    <h1 class="big">${esc(DAY_NAMES[dow(parseYmd(s.date))])}<br><em>${niceDate(s.date)}</em></h1>
    <p class="lede">${esc((s.title || []).join(' '))}${extra ? ' · ' + extra : ''}. Toca una serie para corregirla.</p>
    ${ids.map(exId => { const mine = sets.filter(x => x.exerciseId === exId); return `<section class="block"><header><h3>${esc(S.ex[exId]?.name ?? exId)}<small>${mine.length ? `${mine.length} series` : 'Sin apuntar'}</small></h3><button class="pill line" data-act="add" data-ex="${esc(exId)}">Añadir serie</button></header>
      ${mine.length ? `<ol class="next">${mine.map((x, i) => `<li><button class="see" data-act="edit" data-id="${esc(x.id)}" aria-label="Serie ${i + 1}. Tocar para corregir"><span>${i + 1}</span><p>${setText(x)}</p><i class="how">Corregir</i></button></li>`).join('')}</ol>` : ''}</section>`; }).join('')}
    ${sets.length ? '' : '<div class="linkrow"><button class="link" data-act="drop">Borrar este entreno</button></div>'}`;

  // Pide kilos y repeticiones. Devuelve { pick: 'ok' | 'del', kg, reps } o null.
  async function ask(title, v, u, del) {
    const vals = { kg: v.kg ?? 0, reps: v.reps ?? null }, [short, label] = unitOf(u);
    const asked = sheet(title, `<div class="pad">${u ? '' : `<label class="field"><span>Peso</span><input data-f="kg" inputmode="decimal" value="${fmtKg(vals.kg)}"><u>kg</u></label>`}
      <label class="field"><span>${label}</span><input data-f="reps" inputmode="numeric" value="${vals.reps ?? ''}"><u>${short}</u></label></div>
      <div class="pair">${del ? '<button class="cta ghost" data-pick="del">Borrar</button>' : ''}<button class="cta" data-pick="ok">Guardar</button></div>`);
    $$('.sheet [data-f]').forEach(i => i.addEventListener('input', () => { vals[i.dataset.f] = num(i.value); }));
    const pick = await asked; if (!pick) return null;
    if (pick === 'ok' && !(vals.reps > 0 && vals.reps <= 999 && vals.kg >= 0 && vals.kg <= 600)) { toast('Esos números no parecen correctos'); return null; }
    return { pick, ...vals };
  }

  return {
    bare: true, html, keepScroll: true,
    actions: {
      async edit(el) {
        const old = sets.find(x => x.id === el.dataset.id); if (!old) return;
        const r = await ask(S.ex[old.exerciseId]?.name ?? 'Serie', old, old.unit, true); if (!r) return;
        // `at` se conserva: la serie corregida sigue en su sitio en el tiempo.
        await fixSet(old.id, r.pick === 'del' ? { void: true, at: old.at } : { kg: r.kg, reps: r.reps, at: old.at });
        toast(r.pick === 'del' ? 'Serie borrada' : 'Serie corregida'); sync(); refresh();
      },
      async add(el) {
        const exId = el.dataset.ex, mine = sets.filter(x => x.exerciseId === exId), it = item(exId), u = unit(exId);
        const start = mine.at(-1) ?? { kg: it?.startKg ?? 0, reps: u === 'min' ? Math.round((it?.secs || 600) / 60) : it?.secs ?? it?.repsMin ?? null };
        const r = await ask(S.ex[exId]?.name ?? 'Serie', start, u, false); if (!r) return;
        await addSet({ exerciseId: exId, sessionId: s.id, date: s.date, mode: s.mode, kg: r.kg, reps: r.reps, type: 'normal', ...(u ? { unit: u } : {}), late: true,
          at: Math.max(s.startedAt, ...sets.map(x => x.at)) + 1000 });          // dentro de su sesión, no en el día de hoy
        S.sets.sort((a, b) => a.at - b.at);
        sync(); refresh();
      },
      async drop() {
        if (!(await confirmSheet('¿Borrar este entreno?', 'No tiene ninguna serie apuntada.', 'Borrar'))) return;
        await S.db.del('sessions', s.id); S.sessions = S.sessions.filter(x => x.id !== s.id); go('#/historial');
      },
    },
  };
}
