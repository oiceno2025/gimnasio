// Ficha de un ejercicio: récords e historial completo.
import { S, setting } from '../state.js';
import { records, epley, fmtKg, niceDate } from '../logic.js';
import { GROUPS, EQUIP, MUSCLES } from '../data/labels.js';
import { esc, top } from './kit.js';

export function view(id) {
  const ex = S.ex[id]; if (!ex) return { redirect: '#/progreso' };
  const mine = S.sets.filter(s => s.exerciseId === id), rec = records(S.sets, id), note = setting('note:' + id, '');
  const bySession = new Map(); for (const s of mine) (bySession.get(s.sessionId) ?? bySession.set(s.sessionId, []).get(s.sessionId)).push(s);
  const sessions = [...bySession.values()].sort((a, b) => (a[0].date < b[0].date ? 1 : -1));
  const best = sessions.map(g => Math.max(...g.map(s => (s.kg > 0 ? epley(s.kg, s.reps) : s.reps)))).reverse().slice(-24), hi = Math.max(...best, 1);
  const html = top('<button data-act="back">‹ Volver</button>', esc(GROUPS[ex.group] ?? '')) + `
    <h1 class="big">${esc(ex.name)}</h1>
    <p class="lede">${ex.muscles.map(m => MUSCLES[m]).join(', ')} · ${esc(EQUIP[ex.equip] ?? '')}</p>
    ${rec ? `<div class="meta"><div><b>${rec.kg.kg > 0 ? fmtKg(rec.kg.kg) : rec.reps.reps}</b>${rec.kg.kg > 0 ? `kg × ${rec.kg.reps}, ${niceDate(rec.kg.date)}` : `máximo, ${niceDate(rec.reps.date)}`}</div>${rec.kg.kg > 0 ? `<div><b>${fmtKg(Math.round(rec.orm.value))}</b>kg de máximo estimado</div>` : ''}<div><b>${sessions.length}</b>sesiones</div></div>` : ''}
    ${best.length > 1 ? `<h2 class="h">Evolución</h2><div class="bars" role="img" aria-label="Mejor serie de cada sesión">${best.map((v, i) => `<i class="${i === best.length - 1 ? 'n' : ''}" style="height:${Math.max(4, v / hi * 100)}%"></i>`).join('')}</div><p class="note">Mejor serie de cada sesión. La última, en naranja.</p>` : ''}
    ${note ? `<h2 class="h">Nota</h2><p class="lede">${esc(note)}</p>` : ''}
    <h2 class="h">Historial</h2>
    ${sessions.length ? `<ul class="rows">${sessions.slice(0, 60).map(g => `<li><p>${niceDate(g[0].date)} ${g[0].date.slice(0, 4)}<small>${g.map(s => `${s.kg > 0 ? fmtKg(s.kg) + '×' : ''}${s.reps}${s.unit === 'secs' ? ' s' : s.unit === 'min' ? ' min' : ''}`).join(' · ')}</small></p>${g.some(s => s.rec?.length) ? '<i class="hot">Récord</i>' : ''}</li>`).join('')}</ul>` : '<p class="empty">Aún no lo has hecho. Cuando apuntes la primera serie, aparecerá aquí.</p>'}
    ${ex.cues?.length ? `<h2 class="h">Claves</h2><ul class="tips">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}`;
  return { bare: true, html, actions: { back() { history.length > 1 ? history.back() : (location.hash = '#/progreso'); } } };
}
