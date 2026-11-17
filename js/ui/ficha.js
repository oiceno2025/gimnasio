// Ficha de un ejercicio: récords e historial completo.
import { S, setting } from '../state.js';
import { records, exerciseSeries, fmtKg, niceDate } from '../logic.js';
import { GROUPS, EQUIP, MUSCLES } from '../data/labels.js';
import { esc, $, top } from './kit.js';
import { lineChart, bindCharts } from './chart.js';

let man = null;

export function view(id) {
  const ex = S.ex[id]; if (!ex) return { redirect: '#/progreso' };
  const mine = S.sets.filter(s => s.exerciseId === id), rec = records(S.sets, id), note = setting('note:' + id, '');
  const bySession = new Map(); for (const s of mine) (bySession.get(s.sessionId) ?? bySession.set(s.sessionId, []).get(s.sessionId)).push(s);
  const sessions = [...bySession.values()].sort((a, b) => (a[0].date < b[0].date ? 1 : -1));
  const line = exerciseSeries(S.sets, id).slice(-80), kg = rec?.kg.kg > 0, unit = kg ? ' kg' : mine.some(s => s.unit === 'secs') ? ' s' : mine.some(s => s.unit === 'min') ? ' min' : ' rep', n0 = v => fmtKg(Math.round(v));
  const d = line.length > 1 ? line.at(-1).v - line[0].v : 0;
  const html = top('<button data-act="back">‹ Volver</button>', esc(GROUPS[ex.group] ?? '')) + `
    <h1 class="big">${esc(ex.name)}</h1>
    <p class="lede">${ex.muscles.map(m => MUSCLES[m]).join(', ')} · ${esc(EQUIP[ex.equip] ?? '')}</p>
    ${rec ? `<div class="meta"><div><b>${rec.kg.kg > 0 ? fmtKg(rec.kg.kg) : rec.reps.reps}</b>${rec.kg.kg > 0 ? `kg × ${rec.kg.reps}, ${niceDate(rec.kg.date)}` : `máximo, ${niceDate(rec.reps.date)}`}</div>${rec.kg.kg > 0 ? `<div><b>${fmtKg(Math.round(rec.orm.value))}</b>kg de máximo estimado</div>` : ''}<div><b>${sessions.length}</b>sesiones</div></div>` : ''}
    <div class="stage glow see"><canvas aria-label="Muñeco haciendo ${esc(ex.name)}"></canvas></div>
    ${line.length > 1 ? `<h2 class="h">Tu progreso</h2><div class="trend"><b>${Math.round(d) ? `<em>${d > 0 ? '+' : '−'}${n0(Math.abs(d))}</em>` : '='}</b>${unit.trim()} desde el ${niceDate(line[0].date)}</div>${lineChart(line, { ref: line[0].v, fmt: v => n0(v) + unit, ax: n0, label: 'Progreso en ' + ex.name })}<p class="note">${kg ? 'Tu fuerza en cada sesión: lo que levantarías a una sola repetición, calculado con tu mejor serie.' : 'Tu mejor serie de cada sesión.'} La raya discontinua es donde empezaste. Pasa el dedo para ver cada día.</p>` : ''}
    ${note ? `<h2 class="h">Nota</h2><p class="lede">${esc(note)}</p>` : ''}
    <h2 class="h">Historial</h2>
    ${sessions.length ? `<ul class="rows">${sessions.slice(0, 60).map(g => `<li><p>${niceDate(g[0].date)} ${g[0].date.slice(0, 4)}<small>${g.map(s => `${s.kg > 0 ? fmtKg(s.kg) + '×' : ''}${s.reps}${s.unit === 'secs' ? ' s' : s.unit === 'min' ? ' min' : ''}`).join(' · ')}</small></p>${g.some(s => s.rec?.length) ? '<i class="hot">Récord</i>' : ''}</li>`).join('')}</ul>` : '<p class="empty">Aún no lo has hecho. Cuando apuntes la primera serie, aparecerá aquí.</p>'}
    ${ex.cues?.length ? `<h2 class="h">Claves</h2><ul class="tips">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}`;
  return { bare: true, html,
    mount(root) { bindCharts(root); import('../man.js').then(m => { man = m.mountMan($('canvas', root), { ex }); }).catch(e => console.warn('Sin muñeco:', e)); },
    unmount() { man?.destroy(); man = null; },
    actions: { back() { history.length > 1 ? history.back() : (location.hash = '#/progreso'); } } };
}
