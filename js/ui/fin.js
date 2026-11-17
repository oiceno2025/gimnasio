// Fin de sesión: resumen, récords, molestia de cuello y espalda, y confirmación de la copia.
import { S, openSession, saveSession, setsOf, setting, lastCopy } from '../state.js';
import { RECORD_TEXT, fmtKg } from '../logic.js';
import { skipRest, keepAwake } from '../timer.js';
import { esc, $, go, top, back, scale } from './kit.js';
import { refresh } from '../nav.js';

let draft = null, saved = null;       // saved: resultado de la copia, para la pantalla de «guardado»

export function view() {
  if (saved) {
    const days = saved.lastShare ? Math.floor((Date.now() - saved.lastShare) / 864e5) : null, due = days == null || days >= 7;
    return { bare: true, html: `<h1 class="big" style="padding-top:60px">Sesión<br><em>guardada</em></h1>
      <p class="lede">Guardada en este móvil.${saved.sheet ? ' Tu hoja de Google y su copia se actualizan solas.' : ''}${due ? (days == null ? ' Aún no tienes ninguna copia fuera del móvil.' : ` Llevas ${days} días sin guardar una copia fuera del móvil.`) : ''}</p>
      <button class="cta" data-act="home">Listo</button>${due ? '<div class="linkrow"><button class="link" data-act="tu">Guardar una copia ahora</button></div>' : ''}`,
      actions: { home() { saved = null; go('#/hoy'); }, tu() { saved = null; go('#/tu'); } } };
  }
  const s = openSession(); if (!s) return { redirect: '#/hoy' };
  draft ??= { neck: s.neck ?? null, back: s.back ?? null, note: s.note ?? '' };
  const sets = setsOf(s.id), kgTotal = sets.reduce((t, x) => t + (x.unit ? 0 : x.kg * x.reps), 0), mins = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
  const recs = sets.filter(x => x.rec?.length);
  const html = top(back('#/sesion', 'Sesión'), 'Resumen') + `
    <h1 class="big">Buen<br><em>trabajo</em></h1>
    <div class="meta" style="margin-top:16px"><div><b>${sets.length}</b>series</div><div><b>${mins}</b>${mins === 1 ? 'minuto' : 'minutos'}</div><div><b>${fmtKg(Math.round(kgTotal))}</b>kg movidos</div></div>
    ${recs.length ? `<h2 class="h">Récords de hoy</h2><ul class="rows">${recs.map(x => `<li><p>${esc(S.ex[x.exerciseId]?.name ?? x.exerciseId)}<small>${RECORD_TEXT[x.rec[0]]}</small></p><b>${x.kg > 0 ? fmtKg(x.kg) + ' <i class="x">×</i> ' : ''}${x.reps}</b></li>`).join('')}</ul>` : ''}
    <h2 class="h">¿Cómo acabas?</h2>
    <div class="pad"><p class="mut" style="font-size:13px">Molestia de cuello, de 0 (nada) a 10</p>${scale('neck', draft.neck)}
      <p class="mut" style="font-size:13px;margin-top:14px">Molestia de espalda, de 0 a 10</p>${scale('back', draft.back)}
      <label class="mut" style="font-size:13px;display:block;margin:14px 0 6px" for="snote">Nota de la sesión</label><textarea id="snote" rows="2">${esc(draft.note)}</textarea></div>
    <button class="cta" data-act="save">Guardar <i>y cerrar</i></button>`;
  return {
    bare: true, html, keepScroll: true,
    mount(root) {
      root.querySelectorAll('[data-scale]').forEach(box => box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.note = $('#snote', root).value; const v = +b.dataset.v, f = box.dataset.scale; draft[f] = draft[f] === v ? null : v; refresh(); }));
    },
    actions: {
      async save() {
        draft.note = $('#snote').value.trim();
        await saveSession({ ...s, neck: draft.neck, back: draft.back, note: draft.note, endedAt: Date.now() });
        draft = null; skipRest(); keepAwake(false);
        saved = { lastShare: lastCopy(), sheet: !!setting('sheet')?.mode };
        import('../sheets.js').then(m => m.queueSheet());       // la hoja de Google, si está conectada; no frena el cierre
        refresh();
      },
    },
  };
}
