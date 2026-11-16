// Hoy: qué toca, la semana en anillos y el botón de empezar.
import { S, routineFor, plans, activePlans, plansOn, weekPlan, togglePlan, setDayPlan, withSwaps, swapToday, replaceInPlan, cardioMin, openSession, sessionOn, startSession, setsOf, planFor, setting } from '../state.js';
import { ymd, dow, weekDates, dayOf, itemsFor, planWeek, estimateMinutes, DAY_NAMES, DAY_LETTERS, niceDate, fmtKg } from '../logic.js';
import { esc, $, go, top, title2, sheet, pickRows, ringSvg, toast } from './kit.js';
import { refresh } from '../nav.js';

export const hotOf = items => {                     // los músculos que más trabajan ese día
  const c = {}; for (const i of items) (S.ex[i.exerciseId]?.muscles || []).forEach((m, k) => { c[m] = (c[m] || 0) + (k ? 1 : 3) * i.sets; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
};
export const itemLine = i => (i.secs >= 300 ? `${i.sets > 1 ? i.sets + '×' : ''}${Math.round(i.secs / 60)} min` : i.secs ? `${i.sets}×${i.secs} s` : `${i.sets}×${i.repsMin}${i.repsMax > i.repsMin ? '–' + i.repsMax : ''}`);
export const kgText = (kg, ex) => (kg > 0 ? `${fmtKg(kg)} kg` : ex?.equip === 'cuerpo' || ex?.kind === 'core' ? '' : '—');

let man = null;

export function view() {
  const today = dow(), n = S.viewDay ?? today, dates = weekDates(), open = openSession();
  const routine = routineFor(undefined, n); if (!routine) return { redirect: '#/rutina' };
  const active = activePlans(), week7 = weekPlan(), choices = plansOn(n);
  const week = planWeek(S.sessions, routine.id), day = dayOf(routine, n), planned = itemsFor(day, week), items = n === today ? withSwaps(planned) : planned;
  const used = Object.keys(week7.days).map(Number), span = used.some(d => d > 5) || today > 5 ? 7 : 5;
  const profile = setting('profile');

  const rings = Array.from({ length: span }, (_, i) => {
    const d = i + 1, has = !!week7.days[d], done = sessionOn(dates[i]);
    let frac = done ? 1 : 0;
    if (open && d === today) { const total = open.items.reduce((t, x) => t + x.sets, 0); frac = total ? setsOf(open.id).length / total : 0; }
    return `<button class="ring ${d === today ? 'now' : ''} ${d === n && n !== today ? 'sel' : ''} ${has || done ? '' : 'off'}" data-act="day" data-d="${d}" aria-label="${DAY_NAMES[d]}${done ? ', hecho' : has ? '' : ', descanso'}"${d === n ? ' aria-current="true"' : ''}>${ringSvg(frac)}${DAY_LETTERS[d]}</button>`;
  }).join('');

  const head = top(`${DAY_NAMES[today]} ${niceDate(ymd())}`, `<button data-act="plan" aria-label="Elegir planes"><b>${active.length > 1 ? `${active.length} planes` : esc(routine.name)}</b>&nbsp;▾</button>`);
  const banners = [];
  const lastOk = setting('lastShare') || 0;
  if (S.sets.length && (!lastOk || Date.now() - lastOk > 7 * 864e5)) banners.push(`<div class="banner"><span>${lastOk ? `Llevas ${Math.floor((Date.now() - lastOk) / 864e5)} días sin copia fuera del móvil.` : 'Aún no tienes ninguna copia fuera del móvil.'}</span><button data-act="goto" data-to="#/tu">Guardar</button></div>`);

  let body;
  if (!day) {
    const wk = S.sessions.filter(s => dates.includes(s.date) && s.endedAt);
    body = `<div class="hero glow"><canvas aria-hidden="true"></canvas><h2>Día de<br><em>descanso</em></h2></div>
      <div class="meta"><div><b>${wk.length}</b>entrenos esta semana</div><div><b>${cardioMin(dates)}</b>min de cardio</div><div><b>${S.sets.filter(s => dates.includes(s.date)).length}</b>series</div></div>
      <div class="rings">${rings}</div>
      ${open ? `<button class="cta" data-act="goto" data-to="#/sesion">Seguir <i>${esc(open.title.join(' '))}</i></button>` : ''}
      <button class="cta ${open ? 'ghost' : ''}" data-act="goto" data-to="#/pasos/neck">Cuello y hombros <i>5 min</i></button>
      <p class="note">${n === today ? 'Hoy no toca entrenar. Toca un día de arriba si quieres adelantar o recuperar uno.' : `El ${DAY_NAMES[n].toLowerCase()} es de descanso en este plan.`}</p>`;
  } else {
    const first = items[0], firstEx = S.ex[first?.exerciseId], p0 = first && planFor(first, open), done = sessionOn(dates[n - 1]);
    const anyBack = items.some(i => planFor(i, open).why === 'back');
    if (anyBack && !open) banners.push('<div class="banner"><span>Vuelves tras una pausa. Hoy los pesos van un poco por debajo.</span></div>');
    if (routine.mode === 'kettlebell') banners.push(`<div class="banner"><span>Semana ${Math.min(week, 12)} de 12${week < 3 ? '. El swing es de cadera, no de espalda: llega en la semana 3.' : ''}</span></div>`);
    let cta;
    if (open) cta = `<button class="cta" data-act="goto" data-to="#/sesion">Seguir <i>${esc(open.title.join(' '))}</i></button>`;
    else if (done) cta = `<button class="cta done" data-act="goto" data-to="#/progreso">Hecho <i>${setsOf(done.id).length} series</i></button>`;
    else if (!items.length) cta = `<button class="cta ghost" data-act="goto" data-to="#/rutina/${n}">Añadir ejercicios</button>`;
    else cta = `<button class="cta" data-act="start" data-d="${n}">${n === today ? 'Empezar' : 'Hacer hoy'} <i>${esc(firstEx?.name ?? '')}${p0?.sets[0].kg > 0 ? `, ${fmtKg(p0.sets[0].kg)} kg` : ''}</i></button>`;
    const long = day.title.join(' ').length > 22;
    body = `<div class="hero glow"><canvas aria-hidden="true"></canvas><h2 class="${long ? 'long' : ''}">${title2(day.title)}</h2></div>
      <div class="meta"><div><b>${items.length}</b>ejercicios</div><div><b>${estimateMinutes(day, week, S.ex)}</b>minutos</div><div><b>${items.reduce((t, i) => t + i.sets, 0)}</b>series</div></div>
      <div class="rings">${rings}</div>
      ${choices.length > 1 && !open && !done ? `<div class="chips scroll" role="group" aria-label="Plan de este día">${choices.map(r => `<button class="chip ${r.id === routine.id ? 'on' : ''}" data-act="pick" data-id="${r.id}" aria-pressed="${r.id === routine.id}">${esc(r.name)}</button>`).join('')}</div>` : ''}
      ${cta}
      <ol class="next">${items.map((i, k) => { const ex = S.ex[i.exerciseId], p = planFor(i, open); return `<li><button class="see" data-act="see" data-k="${k}" aria-label="Ver cómo se hace: ${esc(ex?.name ?? '')}"><span>${k + 1}</span><p>${esc(ex?.name ?? i.exerciseId)}<small>${itemLine(i)}${i.was ? ' · cambiado solo hoy' : p.last.length ? ` · últ. ${niceDate(p.last[0].date)}` : ''}</small></p><b>${kgText(p.sets[0].kg, ex)}</b><i class="how">Ver</i></button></li>`; }).join('')}</ol>
      ${items.length ? '<p class="note">Toca un ejercicio para ver cómo se hace y qué hacer si no hay máquina.</p>' : ''}`;
  }
  const hot = day ? hotOf(items) : [];
  return {
    tab: 'hoy', html: head + banners.join('') + body,
    mount(root) { const cv = $('canvas', root); if (cv) import('../man.js').then(m => { man = m.mountMan(cv, { move: 'stand', hot, spin: true }); }).catch(e => console.warn('Sin muñeco:', e)); },
    unmount() { man?.destroy(); man = null; },
    actions: {
      day(el) { const d = +el.dataset.d; S.viewDay = d === today ? null : d; refresh(); },
      goto(el) { go(el.dataset.to); },
      async see(el) {
        const item = items[+el.dataset.k], orig = item.was ?? item.exerciseId, { exerciseSheet } = await import('./ver.js');
        const pick = await exerciseSheet(item.exerciseId, { taken: items.map(i => i.exerciseId) }); if (!pick) return;
        if (open) return toast('Ya has empezado: cámbialo dentro del ejercicio, en «Más opciones»');
        const scope = n !== today ? 'plan' : await sheet(`Cambiar por ${S.ex[pick].name}`, pickRows([{ id: 'today', name: 'Solo hoy', sub: 'El plan no cambia' }, { id: 'plan', name: 'Siempre', sub: `Cambia el ${DAY_NAMES[n].toLowerCase()} de tu plan` }]));
        if (scope === 'today') await swapToday(orig, pick);
        if (scope === 'plan') { await swapToday(orig, orig); await replaceInPlan(routine, n, orig, pick); }
        if (scope) { toast(`Cambiado por ${S.ex[pick].name}`); refresh(); }
      },
      async pick(el) { await setDayPlan(n, el.dataset.id); refresh(); },
      async start(el) { await startSession(+el.dataset.d); S.viewDay = null; go('#/sesion'); },
      async plan() {
        for (;;) {                                  // se pueden marcar varios: la hoja se reabre hasta cerrarla
          const on = activePlans().map(r => r.id);
          const id = await sheet('Tus planes activos', '<p class="lede">Marca uno o varios. Si coinciden en un día, eliges en Hoy cuál toca.</p>' + pickRows(plans().map(r => ({ id: r.id, name: r.name, sub: `${Object.keys(r.days).length} días`, on: on.includes(r.id) }))) + '<div class="pair"><button class="cta ghost" data-pick="__edit">Editar planes</button><button class="cta" data-pick="__ok">Listo</button></div>');
          if (id === '__edit') return go('#/rutina');
          if (!id || id === '__ok') break;
          if (!(await togglePlan(id))) toast('Deja al menos un plan activo');
        }
        refresh();
      },
    },
  };
}
