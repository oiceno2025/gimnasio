// Piezas comunes de las pantallas.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const go = hash => { if (location.hash === hash) dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; };

export const top = (left, right = '') => `<div class="top"><span>${left}</span><span>${right}</span></div>`;
export const back = (href, label) => `<a href="${href}">‹ ${esc(label)}</a>`;
// Tamaño de un título en Anton para que su palabra más larga quepa en `w` px (cada letra ocupa unos 0,47 em).
export const fit = (name, w = 150, max = 36, min = 17) => `style="font-size:${Math.max(min, Math.min(max, Math.floor(w / (Math.max(...String(name).split(/[\s-]+/).map(x => x.length), 1) * .47))))}px"`;
export const title2 = t => (t || []).map((l, i) => (i ? `<em>${esc(l)}</em>` : esc(l))).join('<br>');

let toastTimer;
export function toast(text, { hot = false, ms = 2600 } = {}) {
  $('.toast')?.remove(); clearTimeout(toastTimer);
  const el = document.createElement('div'); el.className = 'toast' + (hot ? ' hotbg' : ''); el.setAttribute('role', 'status'); el.textContent = text;
  document.body.append(el); toastTimer = setTimeout(() => el.remove(), ms);
}

// Hoja que sube desde abajo. Devuelve el valor de `data-pick` tocado, o null si se cierra.
export function sheet(title, inner) {
  return new Promise(done => {
    const el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
    el.innerHTML = `<div><h3>${esc(title)}</h3>${inner}</div>`;
    const close = v => { el.remove(); removeEventListener('keydown', key); done(v); }, key = e => e.key === 'Escape' && close(null);
    el.addEventListener('click', e => { if (e.target === el) return close(null); const b = e.target.closest('[data-pick]'); if (b) close(b.dataset.pick); });
    addEventListener('keydown', key); document.body.append(el);
  });
}
export const pickRows = rows => `<div class="rows">${rows.map(r => `<button data-pick="${esc(r.id)}"><p>${esc(r.name)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</p>${r.on ? '<i class="hot">Activo</i>' : ''}</button>`).join('')}</div>`;
export async function confirmSheet(title, text, yes = 'Sí') {
  return (await sheet(title, `<p class="lede">${esc(text)}</p><div class="pair"><button class="cta ghost" data-pick="no">No</button><button class="cta" data-pick="yes">${esc(yes)}</button></div>`)) === 'yes';
}

export const ringSvg = frac => `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/>${frac > 0 ? `<circle class="p" cx="24" cy="24" r="21" stroke-dasharray="${(132 * Math.min(frac, 1)).toFixed(1)} 132"/>` : ''}</svg>`;
export const scale = (name, value) => `<div class="scale" data-scale="${name}">${Array.from({ length: 11 }, (_, i) => `<button type="button" data-v="${i}" class="${value === i ? 'on' : ''}" aria-label="${i} de 10">${i}</button>`).join('')}</div>`;
