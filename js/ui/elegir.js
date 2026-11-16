// Elegir un ejercicio del catálogo, o crear uno propio. Sirve para un día del plan (#/elegir/3)
// y para la sesión en curso (#/elegir/hoy): ahí se añade solo a hoy y el plan no cambia.
// Se filtra en dos pasos: primero el tipo (fuerza, cardio, kettlebell) y, en fuerza, el músculo.
import { S, plans, routineFor, saveRoutine, saveExercise, openSession, saveSession } from '../state.js';
import { GROUPS, EQUIP, MUSCLES, KIND, MOVES } from '../data/labels.js';
import { DAY_NAMES } from '../logic.js';
import { uid } from '../db.js';
import { esc, $, go, top, back, toast } from './kit.js';
import { refresh } from '../nav.js';

const filter = { q: '', type: '', group: '' };
const TYPES = [['', 'Todo'], ['fuerza', 'Fuerza'], ['cardio', 'Cardio'], ['kettlebell', 'Kettlebell']];
const MUSCLE_GROUPS = ['espalda', 'pecho', 'hombro', 'biceps', 'triceps', 'pierna', 'gluteo', 'core'];
const typeOf = e => (e.group === 'cardio' ? 'cardio' : e.group === 'kettlebell' ? 'kettlebell' : 'fuerza');
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Lo que se propone al añadir: el cardio va en minutos y de una vez; lo demás, en series.
export const defaults = ex => (ex.group === 'cardio' ? { sets: 1, secs: 1200 } : ex.unit === 'secs' ? { sets: 3, secs: 30 } : ex.kind === 'big' ? { sets: 3, repsMin: 8, repsMax: 10 } : ex.kind === 'kb' ? { sets: 3, repsMin: 10, repsMax: 10 } : { sets: 3, repsMin: 10, repsMax: 12 });

export function view(dayStr, sub) {
  // Dónde se añade: la sesión de hoy o un día del plan.
  let tgt;
  if (dayStr === 'hoy') { const s = openSession(); if (!s) return { redirect: '#/hoy' }; tgt = { items: s.items, save: () => saveSession(s), back: '#/sesion', label: 'Sesión', what: 'a la sesión de hoy' }; }
  else { const plan = plans().find(r => r.id === S.editPlan) ?? routineFor(), n = +dayStr, day = plan?.days?.[n]; if (!day) return { redirect: '#/rutina' }; tgt = { items: day.items, save: () => saveRoutine(plan), back: '#/rutina/' + n, label: DAY_NAMES[n], what: 'al día' }; }
  const add = async ex => { tgt.items.push({ exerciseId: ex.id, ...defaults(ex) }); await tgt.save(); toast(`Añadido: ${ex.name}`); };
  if (sub === 'nuevo') return createView(dayStr, add, tgt);

  const inDay = new Set(tgt.items.map(i => i.exerciseId));
  const found = () => { const q = plain(filter.q); return Object.values(S.ex).filter(e => !e.archived && (!filter.type || typeOf(e) === filter.type) && (filter.type !== 'fuerza' || !filter.group || e.group === filter.group) && (!q || plain(e.name).includes(q) || plain(GROUPS[e.group] || '').includes(q) || plain(EQUIP[e.equip] || '').includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'es')); };
  const list = () => {
    const all = found();
    return all.length ? `<p class="note" style="padding:0 0 4px">${all.length} ${all.length === 1 ? 'ejercicio' : 'ejercicios'}. Toca el nombre para ver cómo se hace.</p>` + all.slice(0, 80).map(e => `<div class="pickrow"><button class="seename" data-act="see" data-id="${esc(e.id)}" aria-label="Ver cómo se hace: ${esc(e.name)}"><p>${esc(e.name)} <i class="how">Ver</i><small>${esc(GROUPS[e.group] ?? '')} · ${esc(EQUIP[e.equip] ?? '')}${e.custom ? ' · tuyo' : ''}</small></p></button><button class="pill ${inDay.has(e.id) ? 'line' : ''}" data-act="add" data-id="${esc(e.id)}"${inDay.has(e.id) ? ' disabled' : ''}>${inDay.has(e.id) ? 'Ya está' : 'Añadir'}</button></div>`).join('') + (all.length > 80 ? `<p class="note" style="padding-left:0">Y ${all.length - 80} más. Escribe para afinar.</p>` : '')
      : '<p class="empty" style="padding-left:0">No hay ninguno así. Puedes crearlo abajo.</p>';
  };
  const chip = (act, key, val, name) => `<button class="chip ${filter[key] === val ? 'on' : ''}" data-act="${act}" data-v="${val}" aria-pressed="${filter[key] === val}">${name}</button>`;
  const html = top(back(tgt.back, tgt.label), `${Object.keys(S.ex).length} ejercicios`) + `
    <div class="pick" role="group" aria-label="Tipo de ejercicio" style="padding-top:14px">${TYPES.map(([v, name]) => `<button class="${filter.type === v ? 'on' : ''}" data-act="type" data-v="${v}" aria-pressed="${filter.type === v}" style="font-size:17px">${name}</button>`).join('')}</div>
    ${filter.type === 'fuerza' ? `<div class="chips" role="group" aria-label="Músculo" style="padding-top:10px">${chip('group', 'group', '', 'Todos')}${MUSCLE_GROUPS.map(g => chip('group', 'group', g, GROUPS[g])).join('')}</div>` : ''}
    <div class="pad" style="padding-top:10px"><input class="inp" id="q" type="search" style="width:100%" placeholder="Buscar: press, cinta, glúteo…" value="${esc(filter.q)}" aria-label="Buscar ejercicio" autocomplete="off" enterkeyhint="search"></div>
    <div class="pad" id="list" style="margin-top:8px">${list()}</div>
    <a class="cta ghost" href="#/elegir/${dayStr}/nuevo">Crear uno propio <i>si no está en la lista</i></a>`;
  return {
    tab: dayStr === 'hoy' ? null : 'rutina', bare: dayStr === 'hoy', html, keepScroll: true,
    mount(root) { $('#q', root).addEventListener('input', e => { filter.q = e.target.value; $('#list', root).innerHTML = list(); }); },
    actions: {
      type(el) { filter.type = el.dataset.v; filter.group = ''; refresh(); },
      group(el) { filter.group = el.dataset.v; refresh(); },
      async add(el) { const ex = S.ex[el.dataset.id]; await add(ex); inDay.add(ex.id); $('#list').innerHTML = list(); },
      async see(el) {
        const { exerciseSheet } = await import('./ver.js'), had = inDay.has(el.dataset.id);
        const id = await exerciseSheet(el.dataset.id, { pickLabel: had ? null : `Añadir ${tgt.what}`, altLabel: 'Añadir este', taken: [...inDay] });
        if (id && !inDay.has(id)) { await add(S.ex[id]); inDay.add(id); $('#list').innerHTML = list(); }
      },
    },
  };
}

function createView(dayStr, add, tgt) {
  const opt = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
  const group = filter.type === 'cardio' ? 'cardio' : filter.type === 'kettlebell' ? 'kettlebell' : filter.group || 'espalda';
  const html = top(back('#/elegir/' + dayStr, 'Catálogo'), 'Ejercicio propio') + `
    <h1 class="big">Crear<br><em>ejercicio</em></h1>
    <div class="pad" style="padding-top:10px">
      <label class="field"><span>Nombre</span><input class="wide" id="f-name" value="${esc(filter.q)}" maxlength="48"></label>
      <label class="field"><span>Grupo</span><select id="f-group">${opt(GROUPS, group)}</select></label>
      <label class="field"><span>Músculo principal<small>Se enciende en el muñeco</small></span><select id="f-muscle">${opt(MUSCLES)}</select></label>
      <label class="field"><span>Material</span><select id="f-equip">${opt(EQUIP, 'maquina')}</select></label>
      <label class="field"><span>Tipo<small>Marca el descanso</small></span><select id="f-kind">${opt(KIND, 'small')}</select></label>
      <label class="field"><span>Movimiento<small>El que hará el muñeco</small></span><select id="f-move">${opt(MOVES, 'stand')}</select></label>
      <label class="field"><span>Se mide en segundos<small>Planchas, paseos</small></span><input type="checkbox" id="f-secs" style="width:26px;height:26px"></label>
      <label class="field"><span>Por lado<small>A una mano o una pierna</small></span><input type="checkbox" id="f-uni" style="width:26px;height:26px"></label>
    </div>
    <button class="cta" data-act="save">Crear <i>y añadir ${tgt.what}</i></button>`;
  return {
    tab: dayStr === 'hoy' ? null : 'rutina', bare: dayStr === 'hoy', html,
    actions: {
      async save() {
        const name = $('#f-name').value.trim(); if (!name) return toast('Ponle nombre');
        const ex = { id: 'mio-' + uid().slice(0, 8), custom: true, name, group: $('#f-group').value, muscles: [$('#f-muscle').value], equip: $('#f-equip').value, kind: $('#f-kind').value, move: $('#f-move').value, cues: [], ...($('#f-secs').checked ? { unit: 'secs' } : {}), ...($('#f-uni').checked ? { uni: true } : {}) };
        await saveExercise(ex); await add(ex); filter.q = ''; go(tgt.back);
      },
    },
  };
}
