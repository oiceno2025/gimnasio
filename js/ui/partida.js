// Punto de partida: solo la primera vez. Datos, plan y lo que levantas hoy.
import { S, saveSetting, addBody, addPlanFromTemplate, reload } from '../state.js';
import { TEMPLATES } from '../data/routines.js';
import { ymd } from '../logic.js';
import { esc, $, $$, num, go, toast } from './kit.js';
import { refresh } from '../nav.js';

const draft = { step: 0, name: '', kg: '', height: '', age: '', years: '', templates: ['fuerza-5'], lifts: {} };
const KEY6 = ['jalon-pecho', 'remo-sentado-polea', 'press-inclinado-mancuernas', 'curl-barra-z', 'triceps-cuerda', 'prensa'];

// Ejercicios clave del plan elegido: los seis de siempre si están; si no, los grandes del plan.
function keyLifts(ts) {
  const seen = [], days = ts.flatMap(t => Object.entries(t.days));
  for (const [n, d] of days) for (const i of d.items) if (!seen.some(x => x.id === i.exerciseId)) seen.push({ id: i.exerciseId, day: +n });
  const six = KEY6.map(id => seen.find(x => x.id === id)).filter(Boolean);
  return (six.length >= 4 ? six : seen.filter(x => ['big', 'kb'].includes(S.ex[x.id]?.kind))).slice(0, 6);
}
const keep = root => $$('[data-f]', root).forEach(i => { if (i.dataset.lift) (draft.lifts[i.dataset.lift] ??= {})[i.dataset.f] = i.value; else draft[i.dataset.f] = i.value; });

export function view() {
  const t = draft.templates.map(id => TEMPLATES.find(x => x.id === id)), steps = `<div class="steps">${[0, 1, 2].map(i => `<i class="${i <= draft.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body;
  if (draft.step === 0) body = `
    <h1 class="big">Tu punto<br><em>de partida</em></h1>
    <p class="lede">Cuatro datos. Todo lo demás se mide contra esto. Se quedan en tu móvil.</p>
    <div class="pad">
      <label class="field"><span>Cómo te llamas</span><input class="wide" data-f="name" value="${esc(draft.name)}" autocomplete="given-name" enterkeyhint="next"></label>
      <label class="field"><span>Peso</span><input data-f="kg" inputmode="decimal" value="${esc(draft.kg)}" placeholder="78"><u>kg</u></label>
      <label class="field"><span>Altura</span><input data-f="height" inputmode="numeric" value="${esc(draft.height)}" placeholder="180"><u>cm</u></label>
      <label class="field"><span>Edad</span><input data-f="age" inputmode="numeric" value="${esc(draft.age)}"><u>años</u></label>
      <label class="field"><span>Tiempo entrenando<small>Si empiezas ahora, pon 0</small></span><input data-f="years" inputmode="decimal" value="${esc(draft.years)}" placeholder="0"><u>años</u></label>
    </div>
    <button class="cta" data-act="next">Seguir <i>elegir plan</i></button>
    <div class="linkrow"><label class="link" style="display:inline-flex;align-items:center">¿Ya la usabas? Restaurar una copia<input type="file" accept=".json,application/json" hidden data-restore></label></div>`;
  else if (draft.step === 1) body = `
    <h1 class="big">Elige<br><em>tu plan</em></h1>
    <p class="lede">Puedes marcar varios y combinarlos: cada día eliges cuál toca. Luego cambias lo que quieras.</p>
    ${TEMPLATES.map(x => `<button class="card ${draft.templates.includes(x.id) ? 'on' : ''}" data-act="tpl" data-id="${x.id}" aria-pressed="${draft.templates.includes(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.about)}</small></button>`).join('')}
    <div class="pair"><button class="cta ghost" data-act="prev">Atrás</button><button class="cta" data-act="next">Seguir</button></div>`;
  else {
    const lifts = keyLifts(t);
    body = `
    <h1 class="big">Lo que<br><em>levantas hoy</em></h1>
    <p class="lede">${lifts.length ? 'Peso y repeticiones de una serie normal. Sin probar máximos.' : 'Tu plan está en blanco. Lo montas ahora en Rutina.'}</p>
    <div class="pad">${lifts.map(l => `<div class="field"><span>${esc(S.ex[l.id].name)}<small>Si no, lo mido el ${['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][l.day]}</small></span>
      <input data-f="kg" data-lift="${l.id}" inputmode="decimal" value="${esc(draft.lifts[l.id]?.kg ?? '')}" aria-label="Kilos, ${esc(S.ex[l.id].name)}"><u>kg</u>
      <input data-f="reps" data-lift="${l.id}" inputmode="numeric" value="${esc(draft.lifts[l.id]?.reps ?? '')}" aria-label="Repeticiones, ${esc(S.ex[l.id].name)}" style="width:62px"><u>rep</u></div>`).join('')}</div>
    ${lifts.length ? '<p class="note">¿No te acuerdas de alguno? Déjalo. La app lo apunta sola la primera semana.</p>' : ''}
    <div class="pair"><button class="cta ghost" data-act="prev">Atrás</button><button class="cta" data-act="save">Guardar <i>y ver mi semana</i></button></div>`;
  }
  return {
    bare: true, html: steps + body,
    mount(root) {
      $('[data-restore]', root)?.addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        try { const { importFile } = await import('../backup.js'); const r = await importFile(file); await reload(); toast(`Copia restaurada: ${r.added} series`); go('#/hoy'); }
        catch (err) { toast(err.message); }
      });
    },
    actions: {
      next() { keep(root()); if (draft.step === 0 && !draft.name.trim()) return toast('Pon tu nombre'); draft.step++; refresh(); },
      prev() { keep(root()); draft.step--; refresh(); },
      tpl(el) { const id = el.dataset.id, has = draft.templates.includes(id); draft.templates = has ? draft.templates.filter(x => x !== id) : [...draft.templates, id]; if (!draft.templates.length) draft.templates = [id]; refresh(); },
      async save() {
        keep(root());
        const kg = num(draft.kg), today = ymd();
        await saveSetting('profile', { name: draft.name.trim(), kg, heightCm: num(draft.height), age: num(draft.age), years: num(draft.years), startedAt: today });
        if (kg) await addBody(kg, today);
        const made = []; for (const id of draft.templates) made.push(await addPlanFromTemplate(id));
        await saveSetting('active', made.map(p => p.id)); const plan = made.find(p => Object.keys(p.days).length) ?? made[0];
        await saveSetting('baseline', keyLifts(t).map(l => ({ exerciseId: l.id, kg: num(draft.lifts[l.id]?.kg), reps: num(draft.lifts[l.id]?.reps) })));
        go(Object.keys(plan.days).length ? '#/hoy' : '#/rutina');
      },
    },
  };
}
const root = () => document.getElementById('app');
