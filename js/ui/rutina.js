// Rutina: la semana entera y el editor. Cada persona monta su plan: qué va cada día, en qué orden y cuánto.
import { S, plans, routineFor, activePlans, togglePlan, saveRoutine, choosePlan, addPlanFromTemplate, replaceInPlan } from '../state.js';
import { TEMPLATES, KINDS } from '../data/routines.js';
import { GROUPS } from '../data/labels.js';
import { DAY_NAMES, DAY_LETTERS, dayOf } from '../logic.js';
import { uid } from '../db.js';
import { esc, $, go, top, back, toast, sheet, pickRows, confirmSheet } from './kit.js';
import { itemLine } from './hoy.js';
import { refresh } from '../nav.js';

const editing = () => plans().find(r => r.id === S.editPlan) ?? routineFor();
const stepper = (k, f, v, label) => `<span class="step" role="group" aria-label="${label}"><button data-act="st" data-k="${k}" data-f="${f}" data-d="-1" aria-label="Menos ${label}">−</button><b>${v}</b><button data-act="st" data-k="${k}" data-f="${f}" data-d="1" aria-label="Más ${label}">+</button></span>`;

async function newPlan() {
  const id = await sheet('Nuevo plan', pickRows(TEMPLATES.map(t => ({ id: t.id, name: t.name, sub: t.about }))));
  if (!id) return null;
  const t = TEMPLATES.find(x => x.id === id), same = plans().filter(r => r.template === id).length;
  const plan = await addPlanFromTemplate(id, t.id === 'vacio' ? 'Mi plan' : same ? `${t.name} (${same + 1})` : t.name);
  S.editPlan = plan.id; return plan;
}

export function view(dayStr) {
  const plan = editing();
  if (!plan) return { tab: 'rutina', html: '<h1 class="big">Sin<br><em>plan</em></h1><p class="lede">Crea tu primer plan.</p><button class="cta" data-act="new">Nuevo plan</button>', actions: { async new() { const p = await newPlan(); if (p) { await choosePlan(p.id); refresh(); } } } };
  return dayStr ? dayView(plan, +dayStr) : weekView(plan);
}

function weekView(plan) {
  const actives = activePlans(), current = actives.some(r => r.id === plan.id);
  const html = top('Rutina', `<button data-act="switch" aria-label="Ver otro plan"><b>${plans().length} ${plans().length === 1 ? 'plan' : 'planes'}</b>&nbsp;▾</button>`) + `
    <h1 class="big">${esc(plan.name)}</h1>
    <p class="lede">${current ? (actives.length > 1 ? `Activo, junto a ${actives.length - 1} más.` : 'Es tu plan activo.') : 'No está activo.'} Toca un día para cambiarlo.</p>
    <div class="rows">${[1, 2, 3, 4, 5, 6, 7].map(n => { const d = dayOf(plan, n); return `<a href="#/rutina/${n}" class="chev"><span class="ring" style="width:40px;height:40px;font-size:17px;color:${d ? 'var(--ink)' : 'var(--dim)'}">${DAY_LETTERS[n]}</span><p>${d ? esc(d.title.join(' ')) : '<span class="mut">Descanso</span>'}<small>${d ? `${d.items.length} ejercicios · ${d.items.reduce((t, i) => t + i.sets, 0)} series` : 'Tocar para añadir un entreno'}</small></p>${d ? `<span class="dot" style="background:${KINDS[d.kind]?.color}"></span>` : ''}</a>`; }).join('')}</div>
    ${current ? '' : '<button class="cta" data-act="use">Activar <i>y combinar con los demás</i></button><div class="linkrow"><button class="link" data-act="only">Usar solo este</button></div>'}
    <div class="linkrow"><button class="link" data-act="rename">Cambiar nombre</button><button class="link" data-act="dup">Duplicar</button><button class="link" data-act="new">Nuevo plan</button>${current && actives.length > 1 ? '<button class="link" data-act="off">Desactivar</button>' : ''}${plans().length > 1 ? '<button class="link" data-act="archive">Archivar</button>' : ''}</div>
    <p class="note">Cambiar o quitar ejercicios no borra su historial: las marcas siguen en Progreso.</p>`;
  return {
    tab: 'rutina', html,
    actions: {
      async switch() { const id = await sheet('Tus planes', pickRows(plans().map(r => ({ id: r.id, name: r.name, sub: `${Object.keys(r.days).length} días`, on: activePlans().some(a => a.id === r.id) })))); if (id) { S.editPlan = id; refresh(); } },
      async use() { await togglePlan(plan.id); toast('Activado: ' + plan.name); refresh(); },
      async only() { await choosePlan(plan.id); toast('Solo este plan: ' + plan.name); refresh(); },
      async off() { await togglePlan(plan.id); refresh(); },
      async rename() {
        let name = plan.name;
        const asked = sheet('Nombre del plan', `<div class="pad"><input class="inp" id="pname" style="width:100%" value="${esc(plan.name)}" maxlength="40" aria-label="Nombre del plan"></div><div class="pair"><button class="cta" data-pick="ok">Guardar</button></div>`);
        $('#pname').addEventListener('input', e => { name = e.target.value; });
        if ((await asked) === 'ok' && name.trim()) { plan.name = name.trim(); await saveRoutine(plan); refresh(); }
      },
      async dup() { const copy = { ...structuredClone(plan), id: uid(), name: plan.name + ' (copia)', createdAt: Date.now() }; await saveRoutine(copy); S.editPlan = copy.id; toast('Plan duplicado'); refresh(); },
      async new() { if (await newPlan()) refresh(); },
      async archive() { if (!(await confirmSheet('¿Archivar este plan?', 'Deja de salir en la lista. Su historial no se borra.', 'Archivar'))) return; if (current && actives.length > 1) await togglePlan(plan.id); await saveRoutine({ ...plan, archived: true }); S.editPlan = null; refresh(); },
    },
  };
}

function dayView(plan, n) {
  const day = dayOf(plan, n), save = async () => { await saveRoutine(plan); refresh(); };
  if (!day) return {
    tab: 'rutina', html: top(back('#/rutina', plan.name), DAY_NAMES[n]) + `<h1 class="big">${DAY_NAMES[n]}<br><em>descanso</em></h1><p class="lede">Este día no hay entreno en el plan.</p><button class="cta" data-act="add">Añadir entreno <i>este día</i></button>${Object.keys(plan.days).length ? '<div class="linkrow"><button class="link" data-act="copy">Copiar de otro día</button></div>' : ''}`,
    actions: {
      async add() { plan.days[n] = { title: ['Entreno'], kind: 'full', items: [] }; await save(); },
      async copy() { const from = await pickDay(plan, n); if (from) { plan.days[n] = structuredClone(plan.days[from]); await save(); } },
    },
  };
  const html = top(back('#/rutina', plan.name), DAY_NAMES[n]) + `
    <div class="pad" style="padding-top:14px">
      <label class="field"><span>Título</span><input class="wide" data-t="0" value="${esc(day.title[0] ?? '')}" maxlength="18" aria-label="Título, primera línea"></label>
      <label class="field"><span>Segunda línea<small>En naranja. Opcional</small></span><input class="wide" data-t="1" value="${esc(day.title[1] ?? '')}" maxlength="22" aria-label="Título, segunda línea"></label>
    </div>
    <p class="note">Tipo de día: decide el calentamiento y los estiramientos.</p>
    <div class="chips">${Object.entries(KINDS).map(([k, v]) => `<button class="chip ${day.kind === k ? 'on' : ''}" data-act="kind" data-k="${k}" aria-pressed="${day.kind === k}">${v.name}</button>`).join('')}</div>
    <h2 class="h">Ejercicios</h2>
    <div class="pad">${day.items.map((i, k) => { const ex = S.ex[i.exerciseId]; return `<div class="item">
      <div><span class="hot d" style="font-size:20px;width:20px">${k + 1}</span><button class="seename" data-act="see" data-k="${k}" aria-label="Ver cómo se hace: ${esc(ex?.name ?? '')}"><p>${esc(ex?.name ?? i.exerciseId)} <i class="how">Ver</i><br><small>${esc(GROUPS[ex?.group] ?? '')} · ${itemLine(i)}${i.fromWeek ? ` · desde la semana ${i.fromWeek}` : ''}${i.untilWeek ? ` · hasta la semana ${i.untilWeek}` : ''}</small></p></button>
        <button class="icon" data-act="up" data-k="${k}" ${k ? '' : 'disabled'} aria-label="Subir ${esc(ex?.name)}">↑</button><button class="icon" data-act="down" data-k="${k}" ${k < day.items.length - 1 ? '' : 'disabled'} aria-label="Bajar ${esc(ex?.name)}">↓</button><button class="icon" data-act="del" data-k="${k}" aria-label="Quitar ${esc(ex?.name)}">✕</button></div>
      <div><small>Series</small>${stepper(k, 'sets', i.sets, 'series')}<span style="flex:1"></span>${i.secs >= 300 ? `<small>Min.</small>${stepper(k, 'mins', Math.round(i.secs / 60), 'minutos')}` : i.secs ? `<small>Seg.</small>${stepper(k, 'secs', i.secs, 'segundos')}` : `<small>Rep.</small>${stepper(k, 'repsMin', i.repsMin, 'repeticiones mínimas')}<small>a</small>${stepper(k, 'repsMax', i.repsMax, 'repeticiones máximas')}`}</div>
    </div>`; }).join('') || '<p class="empty" style="padding-left:0">Aún no hay ejercicios este día.</p>'}</div>
    <a class="cta" href="#/elegir/${n}">Añadir ejercicio <i>${Object.keys(S.ex).length} en el catálogo</i></a>
    <div class="linkrow">${Object.keys(plan.days).length > 1 ? '<button class="link" data-act="copy">Copiar de otro día</button>' : ''}<button class="link" data-act="rest">Dejar este día de descanso</button></div>`;
  return {
    tab: 'rutina', html, keepScroll: true,
    mount(root) { root.querySelectorAll('[data-t]').forEach(inp => inp.addEventListener('change', async () => { const t = [$('[data-t="0"]', root).value.trim() || 'Entreno', $('[data-t="1"]', root).value.trim()].filter(Boolean); day.title = t; await saveRoutine(plan); })); },
    actions: {
      async see(el) {
        const i = day.items[+el.dataset.k], { exerciseSheet } = await import('./ver.js');
        const to = await exerciseSheet(i.exerciseId, { altLabel: 'Poner este en su lugar', taken: day.items.map(x => x.exerciseId) });
        if (to) { await replaceInPlan(plan, n, i.exerciseId, to); toast(`Cambiado por ${S.ex[to].name}`); refresh(); }
      },
      async kind(el) { day.kind = el.dataset.k; await save(); },
      async up(el) { const k = +el.dataset.k; [day.items[k - 1], day.items[k]] = [day.items[k], day.items[k - 1]]; await save(); },
      async down(el) { const k = +el.dataset.k; [day.items[k + 1], day.items[k]] = [day.items[k], day.items[k + 1]]; await save(); },
      async del(el) { day.items.splice(+el.dataset.k, 1); await save(); },
      async st(el) {
        const i = day.items[+el.dataset.k]; let f = el.dataset.f;
        if (f === 'mins') { i.secs = Math.min(10800, Math.max(300, i.secs + +el.dataset.d * 300)); return save(); }     // cardio: de 5 en 5 minutos
        const d = +el.dataset.d * (f === 'secs' ? 5 : 1), lim = { sets: [1, 10], secs: [10, 300], repsMin: [1, 50], repsMax: [1, 50] }[f];
        i[f] = Math.min(lim[1], Math.max(lim[0], i[f] + d));
        if (f === 'repsMin' && i.repsMax < i.repsMin) i.repsMax = i.repsMin;
        if (f === 'repsMax' && i.repsMin > i.repsMax) i.repsMin = i.repsMax;
        await save();
      },
      async copy() { const from = await pickDay(plan, n); if (from && (!day.items.length || await confirmSheet('¿Sustituir este día?', `Se cambian los ejercicios del ${DAY_NAMES[n].toLowerCase()} por los del ${DAY_NAMES[from].toLowerCase()}.`, 'Sustituir'))) { plan.days[n] = structuredClone(plan.days[from]); await save(); } },
      async rest() { if (day.items.length && !(await confirmSheet('¿Dejarlo de descanso?', 'Se quitan los ejercicios de este día en el plan. El historial no se borra.', 'Quitar'))) return; delete plan.days[n]; await saveRoutine(plan); go('#/rutina'); },
    },
  };
}
const pickDay = async (plan, not) => { const r = await sheet('Copiar de', pickRows(Object.keys(plan.days).filter(d => +d !== not).map(d => ({ id: d, name: DAY_NAMES[d], sub: plan.days[d].title.join(' ') })))); return r ? +r : null; };
