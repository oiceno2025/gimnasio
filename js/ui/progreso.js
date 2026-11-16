// Progreso: asistencia, fuerza frente al punto de partida, récords, cardio, peso y molestias.
import { S, setting, weekPlan, addBody, cardioMin } from '../state.js';
import { strengthChange, fillBaseline, attendance, weeksInARow, weekDates, records, fmtKg, niceDate, ymd, daysBetween } from '../logic.js';
import { esc, $, num, top, toast, sheet } from './kit.js';
import { refresh } from '../nav.js';

export function view() {
  const profile = setting('profile'), routine = weekPlan(), from = profile?.startedAt ?? ymd();
  const base = fillBaseline(setting('baseline', []), S.sets), ch = strengthChange(base, S.sets);
  const att = routine ? attendance(S.sessions, routine, from) : { made: 0, possible: 0 }, weeks = Math.max(1, Math.round(daysBetween(from, ymd()) / 7));
  const startKg = S.body[0]?.kg ?? profile?.kg, nowKg = S.body.at(-1)?.kg ?? startKg, dKg = startKg && nowKg ? nowKg - startKg : null;
  const cardio = cardioMin(weekDates()), frac = att.possible ? Math.min(1, att.made / att.possible) : 0;
  const pct = ch.pct == null ? null : Math.round(ch.pct);
  const done = S.sessions.filter(s => s.endedAt).sort((a, b) => (a.date < b.date ? -1 : 1));
  const pain = done.filter(s => s.neck != null || s.back != null).slice(-14);
  const recs = [...new Set(S.sets.map(s => s.exerciseId))].map(id => ({ id, r: records(S.sets, id) })).filter(x => x.r).sort((a, b) => (a.r.kg.date < b.r.kg.date ? 1 : -1));

  const html = top(`Desde el ${niceDate(from)}`, startKg ? `<button data-act="weigh" aria-label="Apuntar peso">Peso: ${fmtKg(startKg)} a <b>${fmtKg(nowKg)}</b></button>` : '<button data-act="weigh"><b>Apuntar peso</b></button>') + `
    <div class="dial">
      <h2><em>${pct == null ? '—' : (pct >= 0 ? '+' : '') + pct + '%'}</em></h2>
      <p>${pct == null ? 'Aquí verás cuánto más fuerte estás que el primer día.' : `${pct >= 0 ? 'más' : 'menos'} fuerte que hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}, en tu punto de partida`}</p>
      <svg viewBox="0 0 214 214" aria-hidden="true"><circle cx="107" cy="107" r="94" stroke="#29292D"/>${frac > 0 ? `<circle cx="107" cy="107" r="94" stroke="#FF4A1C" stroke-dasharray="${(591 * frac).toFixed(0)} 591"/>` : ''}</svg>
      <div class="in"><b class="d">${att.made}</b>${att.made === 1 ? 'entreno' : 'entrenos'} de ${att.possible}</div>
    </div>
    <div class="meta"><div><b>${cardio}</b>min de cardio, de 150</div><div><b>${routine ? weeksInARow(S.sessions, routine) : 0}</b>semanas sin fallar</div><button data-act="weigh"><b>${dKg == null ? '—' : (dKg > 0 ? '+' : dKg < 0 ? '−' : '') + fmtKg(Math.abs(Math.round(dKg * 10) / 10))}</b>kg de peso</button></div>
    ${ch.rows.length ? `<h2 class="h">Tus marcas</h2><ul class="marks">${ch.rows.map(r => { const hi = Math.max(r.startKg, r.nowKg) * 1.15; return `<li><a href="#/ficha/${encodeURIComponent(r.exerciseId)}"><div>${esc(S.ex[r.exerciseId]?.name ?? r.exerciseId)} <span>${fmtKg(r.startKg)} a <b>${fmtKg(r.nowKg)}</b> kg</span></div><div class="track"><u style="width:${(r.nowKg / hi * 100).toFixed(0)}%"></u><s style="left:${(r.startKg / hi * 100).toFixed(0)}%"></s></div></a></li>`; }).join('')}</ul><p class="note">La raya blanca es donde empezaste.</p>` : base.length ? '<p class="empty">Tus marcas aparecerán aquí cuando hagas los ejercicios de tu punto de partida.</p>' : ''}
    ${pain.length ? `<h2 class="h">Cuello y espalda</h2><div class="bars" role="img" aria-label="Molestia de cuello y espalda en las últimas sesiones">${pain.map(s => `<i class="b" style="height:${(s.neck ?? 0) * 10}%"></i><i class="n" style="height:${(s.back ?? 0) * 10}%;margin-right:6px"></i>`).join('')}</div><p class="note"><span style="color:#4C8DFF">■</span> cuello · <span class="hot">■</span> espalda. De 0 a 10, últimas ${pain.length} sesiones.</p>` : ''}
    <h2 class="h">Récords</h2>
    ${recs.length ? `<div class="rows">${recs.slice(0, 40).map(({ id, r }) => `<a href="#/ficha/${encodeURIComponent(id)}" class="chev"><p>${esc(S.ex[id]?.name ?? id)}<small>${niceDate(r.kg.date)}${r.kg.kg > 0 ? ` · máximo estimado ${fmtKg(Math.round(r.orm.value))} kg` : ''}</small></p><b>${r.kg.kg > 0 ? `${fmtKg(r.kg.kg)} <i class="x">×</i> ${r.kg.reps}` : r.reps.reps}</b></a>`).join('')}</div>` : '<p class="empty">Cuando apuntes tu primera serie, tus mejores marcas saldrán aquí.</p>'}`;
  return {
    tab: 'progreso', html,
    actions: {
      async weigh() {
        let v = '';
        const asked = sheet('Tu peso de hoy', `<div class="pad"><label class="field"><span>Peso</span><input id="w" inputmode="decimal" placeholder="${fmtKg(nowKg) || '78'}"><u>kg</u></label></div><div class="pair"><button class="cta" data-pick="ok">Guardar</button></div>`);
        const inp = $('#w'); inp.focus(); inp.addEventListener('input', e => { v = e.target.value; });
        if ((await asked) !== 'ok') return; const kg = num(v);
        if (!(kg > 20 && kg < 300)) return toast('Ese peso no parece correcto');
        await addBody(kg); refresh();
      },
    },
  };
}
