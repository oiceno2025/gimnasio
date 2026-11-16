// Cardio de la sesión: cinta en rampa o elíptica. Las kcal son una estimación y así se dice.
import { openSession, saveSession, bodyKg, setting, saveSetting } from '../state.js';
import { acsmWalkKcal, ellipticalKcal } from '../logic.js';
import { $, $$, num, go, top, back } from './kit.js';
import { refresh } from '../nav.js';

let draft = null;

export function view() {
  const s = openSession(); if (!s) return { redirect: '#/hoy' };
  draft ??= { machine: 'cinta', minutes: s.cardioGoal || 25, incline: 10, kmh: 5, ...setting('cardioLast', {}), ...(s.cardio || {}) };
  const kg = bodyKg(), kcal = d => (d.machine === 'cinta' ? acsmWalkKcal({ bodyKg: kg, kmh: d.kmh, inclinePct: d.incline, minutes: d.minutes }) : ellipticalKcal({ bodyKg: kg, minutes: d.minutes }));
  const read = root => { $$('[data-f]', root).forEach(i => { draft[i.dataset.f] = num(i.value) ?? 0; }); };
  const html = top(back('#/sesion', 'Sesión'), 'Cardio') + `
    <h1 class="big">Cardio<br><em>${draft.machine === 'cinta' ? 'en rampa' : 'elíptica'}</em></h1>
    <div class="pick"><button class="${draft.machine === 'cinta' ? 'on' : ''}" data-act="m" data-m="cinta" aria-pressed="${draft.machine === 'cinta'}">Cinta</button><button class="${draft.machine === 'eliptica' ? 'on' : ''}" data-act="m" data-m="eliptica" aria-pressed="${draft.machine === 'eliptica'}">Elíptica</button></div>
    <div class="pad" style="margin-top:8px">
      <label class="field"><span>Minutos</span><input data-f="minutes" inputmode="numeric" value="${draft.minutes}"><u>min</u></label>
      ${draft.machine === 'cinta' ? `<label class="field"><span>Rampa<small>Entre 10 y 12 %</small></span><input data-f="incline" inputmode="decimal" value="${String(draft.incline).replace('.', ',')}"><u>%</u></label>
      <label class="field"><span>Velocidad<small>Entre 4,5 y 5,5. Sin agarrarte</small></span><input data-f="kmh" inputmode="decimal" value="${String(draft.kmh).replace('.', ',')}"><u>km/h</u></label>` : ''}
    </div>
    <div class="meta" style="margin-top:14px"><div><b id="kcal">${kg ? kcal(draft) : '—'}</b>kcal, más o menos</div><div><b>${draft.minutes}</b>minutos</div></div>
    <p class="note">${kg ? 'Es una estimación con tu peso, la velocidad y la rampa.' : 'Apunta tu peso en Tú para estimar las kcal.'} El cardio ayuda, pero perder peso depende sobre todo de lo que comes.</p>
    <button class="cta" data-act="save">Guardar <i>${draft.minutes} min</i></button>`;
  return {
    bare: true, html,
    mount(root) { root.addEventListener('input', onInput); function onInput(e) { if (!e.target.dataset?.f) return; read(root); const k = $('#kcal', root); if (k && kg) k.textContent = kcal(draft); } this._off = () => root.removeEventListener('input', onInput); },
    unmount() { this._off?.(); if (!location.hash.startsWith('#/cardio')) draft = null; },
    actions: {
      m(el) { read(document); draft.machine = el.dataset.m; refresh(); },
      async save() { read(document); const c = { machine: draft.machine, minutes: draft.minutes, incline: draft.incline, kmh: draft.kmh, kcal: kcal(draft) }; await saveSession({ ...s, cardio: c }); await saveSetting('cardioLast', { machine: c.machine, incline: c.incline, kmh: c.kmh }); go('#/sesion'); },
    },
  };
}
