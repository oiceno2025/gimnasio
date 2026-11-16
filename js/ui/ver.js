// Ver un ejercicio: el muñeco haciéndolo, las claves y qué hacer si no se puede (máquina ocupada o que no existe).
// Sale al tocar un ejercicio en Hoy, en el editor de rutina y en el buscador.
import { S } from '../state.js';
import { alternatives } from '../logic.js';
import { EQUIP, MUSCLES } from '../data/labels.js';
import { esc, sheet } from './kit.js';

// Devuelve el id del ejercicio elegido con el botón, o null si solo se miró.
// `pickLabel`: texto del botón para el propio ejercicio (en el buscador, «Añadir»). Las alternativas siempre lo llevan.
export async function exerciseSheet(id, { pickLabel = null, altLabel = 'Usar este', taken = [] } = {}) {
  let cur = id;
  for (;;) {
    const ex = S.ex[cur]; if (!ex) return null;
    const alts = alternatives(ex, Object.values(S.ex)).filter(a => a.id !== id && !taken.includes(a.id)), label = cur === id ? pickLabel : altLabel;
    const asked = sheet(ex.name, `
      <p class="note" style="padding-top:0">${ex.muscles.map(m => MUSCLES[m]).join(', ')} · ${esc(EQUIP[ex.equip] ?? '')}</p>
      <div class="stage glow see"><canvas aria-label="Muñeco haciendo ${esc(ex.name)}"></canvas>
        <div class="views"><button data-yaw="0">Frente</button><button data-yaw="1.5708">Lado</button><button data-yaw="3.1416">Detrás</button></div></div>
      ${ex.cues?.length ? `<ul class="tips">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="note">Ejercicio tuyo: el muñeco hace el movimiento que elegiste al crearlo.</p>'}
      ${label ? `<button class="cta" data-pick="__use">${esc(label)}</button>` : ''}
      ${cur !== id ? `<div class="linkrow"><button class="link" data-pick="__back">‹ Volver a ${esc(S.ex[id]?.name ?? '')}</button></div>` : ''}
      ${alts.length ? `<h3 style="font-size:20px;padding-top:22px">${cur === id ? 'Si no puedes hacerlo' : 'Otras opciones'}</h3><p class="note" style="padding-top:0">Trabajan lo mismo. Toca una para ver cómo es.</p>
        <div class="rows">${alts.map(a => `<button data-pick="see:${esc(a.id)}" class="chev"><p>${esc(a.name)}<small>${esc(EQUIP[a.equip] ?? '')}</small></p></button>`).join('')}</div>` : ''}`);
    const box = document.querySelector('.sheet'), cv = box.querySelector('canvas'); let man = null, gone = false;
    import('../man.js').then(m => { if (!gone) man = m.mountMan(cv, { ex }); }).catch(e => console.warn('Sin muñeco:', e));
    box.querySelectorAll('[data-yaw]').forEach(b => b.addEventListener('click', () => { man?.view(+b.dataset.yaw); box.querySelectorAll('[data-yaw]').forEach(x => x.classList.toggle('on', x === b)); }));
    const r = await asked; gone = true; man?.destroy();
    if (!r) return null;
    if (r === '__use') return cur;
    cur = r === '__back' ? id : r.slice(4);
  }
}
