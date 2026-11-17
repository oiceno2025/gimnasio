// Ejercicio: muñeco, claves, series rellenadas con la última vez y un toque para confirmarlas.
import { S, openSession, setsOf, planFor, saveSession, addSet, fixSet, setting, saveSetting } from '../state.js';
import { restFor, recordsBroken, RECORD_TEXT, WHY_TEXT, fmtKg, niceDate } from '../logic.js';
import { JAW_CUE, WEAK_SIDE_CUE } from '../data/routines.js';
import { startRest, unlockSound } from '../timer.js';
import { esc, $, num, go, top, back, toast, sheet, pickRows, fit } from './kit.js';
import { refresh } from '../nav.js';
import { itemLine } from './hoy.js';

let man = null, editing = null;                      // editing: { i, f } = serie y campo abiertos para escribir
export const noKg = ex => ex?.group === 'cardio' || ex?.equip === 'cuerpo' || (ex?.kind === 'core' && !['maquina', 'polea'].includes(ex?.equip));

export function view(kStr) {
  const s = openSession(); if (!s) return { redirect: '#/hoy' };
  const k = +kStr, item = s.items[k]; if (!item) return { redirect: '#/sesion' };
  const ex = S.ex[item.exerciseId] ?? { id: item.exerciseId, name: item.exerciseId, cues: [], muscles: [], move: 'stand', kind: 'small' };
  const plan = planFor(item, s), done = setsOf(s.id, item.exerciseId), bare = noKg(ex), cardio = ex.group === 'cardio', unit = cardio ? 'min' : item.secs ? 's' : 'rep';
  const rows = Math.max(item.sets, done.length);
  // Valores de una serie pendiente: lo que se haya tocado a mano; si no, el peso de la serie anterior de hoy; si no, el plan.
  const pending = i => { const base = plan.sets[Math.min(i, plan.sets.length - 1)], mine = item.vals?.[i] || {}; return { kg: mine.kg ?? (done.length ? done.at(-1).kg : base.kg) ?? (bare ? 0 : null), reps: mine.reps ?? base.reps }; };
  const val = (i, f, v, label) => (editing?.i === i && editing.f === f
    ? `<input id="edit" inputmode="${f === 'kg' ? 'decimal' : 'numeric'}" value="${v ?? ''}" aria-label="${label}" enterkeyhint="done">`
    : `<button class="val" data-act="edit" data-i="${i}" data-f="${f}" aria-label="${label}: ${v ?? 'sin poner'}. Tocar para cambiar">${v == null ? '–' : fmtKg(v)}</button>`);
  const line = i => {
    const d = done[i], v = d ?? pending(i), cls = d ? 'ok' : i === done.length ? '' : 'todo';
    return `<li class="${cls}"><span>${i + 1}</span>${bare && !(v.kg > 0) ? '' : `${val(i, 'kg', v.kg, 'Kilos')}<u>kg</u>`}${val(i, 'reps', v.reps, unit === 's' ? 'Segundos' : unit === 'min' ? 'Minutos' : 'Repeticiones')}<u>${unit}</u>
      ${d?.rec?.length ? `<b class="rec">${d.rec.includes('kg') ? 'Récord' : 'Marca'}</b>` : ''}${d ? '<em>Hecha</em>' : i === done.length ? `<button class="tap" data-act="done" data-i="${i}">Hecha</button>` : ''}</li>`;
  };
  const allDone = done.length >= item.sets, nextK = s.items.findIndex((x, j) => j !== k && setsOf(s.id, x.exerciseId).length < x.sets), lastDone = done.at(-1);
  const tips = [...ex.cues.map(c => `<li>${esc(c)}</li>`), item.note ? `<li>${esc(item.note)}</li>` : '', ex.uni ? `<li class="fix">${WEAK_SIDE_CUE}</li>` : '', ex.kind === 'big' ? `<li class="fix">${JAW_CUE}</li>` : ''].join('');
  const note = setting('note:' + ex.id, '');

  const html = top(back('#/sesion', s.title.join(' ')), `${k + 1} de ${s.items.length}`) + `
    <div class="stage glow ${done.length ? 'mini' : ''}"><canvas aria-label="Muñeco haciendo ${esc(ex.name)}"></canvas><h3 ${fit(ex.name, 150, done.length ? 26 : 36)}>${esc(ex.name)}<span>${itemLine(item)}</span></h3>
      <div class="views"><button data-act="yaw" data-yaw="0">Frente</button><button data-act="yaw" data-yaw="1.5708">Lado</button><button data-act="yaw" data-yaw="3.1416">Detrás</button>${done.length ? '' : '<small>Arrastra para girar</small>'}</div></div>
    ${done.length ? `<details class="fold"><summary>Claves del ejercicio</summary><ul class="tips">${tips}</ul></details>` : `<ul class="tips">${tips}</ul>`}
    ${!done.length && WHY_TEXT[plan.why] ? `<p class="why">${WHY_TEXT[plan.why]}</p>` : ''}
    ${plan.last.length ? `<p class="note">Última vez, ${niceDate(plan.last[0].date)}: ${plan.last.map(x => `${x.kg > 0 ? fmtKg(x.kg) + '×' : ''}${x.reps}`).join(' · ')}</p>` : ''}
    <ol class="sets">${Array.from({ length: rows }, (_, i) => line(i)).join('')}</ol>
    ${lastDone ? `<div class="effort">¿Cuántas más te quedaban en la última? <span class="mut">(opcional)</span><div class="chips">${[[0, 'Ninguna'], [1, '1'], [2, '2'], [3, '3 o más']].map(([v, t]) => `<button class="chip ${lastDone.rir === v ? 'on' : ''}" data-act="rir" data-v="${v}" aria-pressed="${lastDone.rir === v}">${t}</button>`).join('')}</div></div>` : ''}
    ${allDone ? `<button class="cta" data-act="goto" data-to="${nextK >= 0 ? '#/ej/' + nextK : '#/sesion'}">${nextK >= 0 ? 'Siguiente' : 'Hecho'} <i>${nextK >= 0 ? esc(S.ex[s.items[nextK].exerciseId]?.name ?? '') : 'volver a la sesión'}</i></button>` : ''}
    <div class="pad" style="margin-top:14px"><label class="mut" style="font-size:12.5px" for="exnote">Nota del ejercicio: asiento, agarre, molestias</label><textarea id="exnote" rows="2">${esc(note)}</textarea></div>
    <div class="linkrow"><button class="link" data-act="more">Más opciones</button><a class="link" href="#/ficha/${encodeURIComponent(ex.id)}" style="display:inline-flex;align-items:center">Historial</a></div>`;

  const commit = async input => {
    if (!editing) return; const { i, f } = editing, v = num(input.value); editing = null;
    if (v != null && v > (f === 'kg' ? 600 : 999)) toast('Ese número no parece correcto');
    else if (v != null && v >= 0) {
      if (done[i]) await fixSet(done[i].id, { [f]: v });
      else { const vals = [...(item.vals || [])]; for (let j = i; j < rows; j++) if (!done[j] && (j === i || f === 'kg')) vals[j] = { ...vals[j], [f]: v }; item.vals = vals; await saveSession(s); }   // el peso se arrastra a las series siguientes
    }
    refresh();
  };

  return {
    bare: true, html, keepScroll: true,
    mount(root) {
      const cv = $('canvas', root);
      import('../man.js').then(m => { man = m.mountMan(cv, { ex }); }).catch(e => console.warn('Sin muñeco:', e));
      const input = $('#edit', root);
      if (input) { input.focus(); input.select(); input.addEventListener('blur', () => commit(input)); input.addEventListener('change', () => commit(input)); input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); }); }
      $('#exnote', root).addEventListener('change', e => saveSetting('note:' + ex.id, e.target.value.trim()));
    },
    unmount() { man?.destroy(); man = null; },
    actions: {
      yaw(el) { man?.view(+el.dataset.yaw); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
      edit(el) { editing = { i: +el.dataset.i, f: el.dataset.f }; refresh(); },
      goto(el) { go(el.dataset.to); },
      async done(el) {
        unlockSound();
        const i = +el.dataset.i, v = pending(i);
        if (v.kg == null) { editing = { i, f: 'kg' }; toast('Pon el peso de hoy'); return refresh(); }
        const set = { exerciseId: item.exerciseId, sessionId: s.id, date: s.date, mode: s.mode, kg: v.kg, reps: v.reps, type: 'normal', ...(cardio ? { unit: 'min' } : item.secs ? { unit: 'secs' } : {}) };
        const rec = recordsBroken(set, S.sets);
        await addSet({ ...set, ...(rec.length ? { rec } : {}) });
        if (rec.length) toast(RECORD_TEXT[rec[0]], { hot: true, ms: 3200 });
        const last = i + 1 >= item.sets && nextK < 0;
        if (!last && !cardio) startRest(restFor(ex, setting('rest', {})), i + 1 < item.sets ? `Serie ${i + 2} de ${item.sets}` : `Luego: ${S.ex[s.items[nextK]?.exerciseId]?.name ?? ''}`);
        refresh();
      },
      async rir(el) { const v = +el.dataset.v; await fixSet(lastDone.id, { rir: lastDone.rir === v ? null : v }); refresh(); },
      async more() {
        const opts = [{ id: 'add', name: 'Añadir una serie' }];
        if (item.sets > Math.max(done.length, 1)) opts.push({ id: 'less', name: 'Quitar una serie' });
        if (!allDone && s.items.length > 1) opts.push({ id: 'later', name: 'Dejar para después', sub: 'Máquina ocupada: pasa al final de la sesión' });
        if (!done.length) opts.push({ id: 'alt', name: 'Cambiar por otro ejercicio', sub: 'Solo hoy. Verás cómo es cada uno' });
        if (lastDone) opts.push({ id: 'undo', name: 'Borrar la última serie', sub: 'Si la marcaste sin querer' });
        const pick = await sheet(ex.name, pickRows(opts)); if (!pick) return;
        if (pick === 'add') item.sets = rows + 1;
        if (pick === 'less') item.sets--;
        if (pick === 'undo') await fixSet(lastDone.id, { void: true });
        if (pick === 'alt') { const { exerciseSheet } = await import('./ver.js'), to = await exerciseSheet(item.exerciseId, { taken: s.items.map(i => i.exerciseId) }); if (!to) return; item.was ??= item.exerciseId; item.exerciseId = to; delete item.vals; }
        if (pick === 'later') { s.items.splice(k, 1); s.items.push({ ...item, later: true }); await saveSession(s); return go('#/sesion'); }
        await saveSession(s); refresh();
      },
    },
  };
}
