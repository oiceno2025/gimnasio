// Sesión: los tres bloques (Calentar, Entrenar, Soltar), el cardio y terminar.
import { S, openSession, setsOf, planFor, saveSession, setting, saveSetting } from '../state.js';
import { WARMUP, COOLDOWN, blockMinutes } from '../data/routines.js';
import { esc, go, top, back, confirmSheet } from './kit.js';
import { itemLine, kgText } from './hoy.js';
import { refresh } from '../nav.js';

export const doneOf = (s, item) => setsOf(s.id, item.exerciseId).length;

export function view() {
  const s = openSession(); if (!s) return { redirect: '#/hoy' };
  const warm = WARMUP[s.kind] || WARMUP.full, cool = COOLDOWN[s.kind] || COOLDOWN.full;
  const total = s.items.reduce((t, i) => t + i.sets, 0), made = s.items.reduce((t, i) => t + Math.min(doneOf(s, i), i.sets), 0);
  const state = (flag, href) => (flag === 'done' ? '<span class="pill line">Hecho</span>' : flag === 'skip' ? `<a class="pill line" href="${href}">Saltado</a>` : `<button class="pill line" data-act="skip" data-b="${href.endsWith('warm') ? 'warm' : 'cool'}">Saltar</button><a class="pill" href="${href}">Empezar</a>`);
  const firstNote = !setting('seenWarmNote') ? '<div class="banner"><span>Calentar y soltar es movilidad general, no un tratamiento. Mejora las primeras series y la sensación de tensión.</span><button data-act="seen">Vale</button></div>' : '';
  const nextK = s.items.findIndex(i => doneOf(s, i) < i.sets);

  const html = top(back('#/hoy', 'Hoy'), `${made} de ${total} series`) + `
    <h1 class="big">${s.title.map((l, i) => (i ? `<em>${esc(l)}</em>` : esc(l))).join('<br>')}</h1>
    ${firstNote}
    <section class="block ${s.warm ? 'ok' : ''}"><header><h3>Calentar<small>${blockMinutes(warm)} min · movilidad y activación</small></h3>${state(s.warm, '#/pasos/warm')}</header></section>
    <section class="block"><header><h3>Entrenar<small>${s.items.length} ejercicios</small></h3>${nextK >= 0 ? `<a class="pill hotbg" href="#/ej/${nextK}">${made ? 'Seguir' : 'Empezar'}</a>` : '<span class="pill line">Hecho</span>'}</header>
      <div class="next">${s.items.map((i, k) => { const ex = S.ex[i.exerciseId], d = doneOf(s, i), p = planFor(i, s); return `<a class="row ${d >= i.sets ? 'ok' : ''}" href="#/ej/${k}"><span class="n">${k + 1}</span><p>${esc(ex?.name ?? i.exerciseId)}<small>${itemLine(i)}${d ? ` · ${d} de ${i.sets}` : ''}${i.later ? ' · dejado para después' : ''}</small></p><b>${kgText(p.sets[0].kg, ex)}</b></a>`; }).join('')}</div>
      <div class="linkrow" style="padding:2px 14px 6px"><a class="link" href="#/elegir/hoy" style="display:inline-flex;align-items:center">Añadir ejercicio o cardio</a></div>
    </section>
    ${s.cardioGoal || s.cardio ? `<section class="block ${s.cardio ? 'ok' : ''}"><header><h3>Cardio<small>${s.cardio ? `${s.cardio.minutes} min · unas ${s.cardio.kcal} kcal` : `Cinta en rampa, ${s.cardioGoal} min. O elíptica.`}</small></h3><a class="pill ${s.cardio ? 'line' : ''}" href="#/cardio">${s.cardio ? 'Cambiar' : 'Apuntar'}</a></header></section>` : '<div class="linkrow"><a class="link" href="#/cardio" style="display:inline-flex;align-items:center">Apuntar cardio</a></div>'}
    <section class="block ${s.cool ? 'ok' : ''}"><header><h3>Soltar<small>${blockMinutes(cool)} min · estiramientos y respiración</small></h3>${state(s.cool, '#/pasos/cool')}</header></section>
    <button class="cta" data-act="finish">Terminar <i>${made} de ${total} series</i></button>
    ${made ? '' : '<div class="linkrow"><button class="link" data-act="cancel">Cancelar esta sesión</button></div>'}`;

  return {
    bare: true, html,
    actions: {
      async skip(el) { await saveSession({ ...s, [el.dataset.b]: 'skip' }); refresh(); },
      async seen() { await saveSetting('seenWarmNote', true); refresh(); },
      async finish() { if (made < total && !(await confirmSheet('¿Terminar ya?', `Te quedan ${total - made} series. Lo hecho se guarda igual.`, 'Terminar'))) return; go('#/fin'); },
      async cancel() { if (!(await confirmSheet('¿Cancelar la sesión?', 'No has apuntado ninguna serie. No se pierde nada.', 'Cancelar sesión'))) return; await S.db.del('sessions', s.id); S.sessions = S.sessions.filter(x => x.id !== s.id); go('#/hoy'); },
    },
  };
}
