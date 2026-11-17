// Arranque y navegación. Cada pantalla es un módulo de `ui/` que exporta `view(params)` y devuelve
// { html, tab?, bare?, mount?(root), unmount?(), actions? }. Los toques llegan por `data-act`.
import { S, boot, setting, openSession } from './state.js';
import { onRest, addRest, skipRest, keepAwake } from './timer.js';
import { fmtClock } from './logic.js';
import { esc, go, toast } from './ui/kit.js';
import { setPaint } from './nav.js';
import { SKIN } from './skin.js';

const ROUTES = {
  hoy: () => import('./ui/hoy.js'), sesion: () => import('./ui/sesion.js'), ej: () => import('./ui/ejercicio.js'), pasos: () => import('./ui/pasos.js'),
  cardio: () => import('./ui/cardio.js'), fin: () => import('./ui/fin.js'), rutina: () => import('./ui/rutina.js'), elegir: () => import('./ui/elegir.js'),
  ficha: () => import('./ui/ficha.js'), progreso: () => import('./ui/progreso.js'), tu: () => import('./ui/tu.js'), partida: () => import('./ui/partida.js'), hoja: () => import('./ui/hoja.js'),
};
const TABS = [['hoy', 'Hoy'], ['rutina', 'Rutina'], ['progreso', 'Progreso'], ['tu', 'Tú']];
const root = document.getElementById('app');
let current = null, seq = 0;

async function render() {
  const my = ++seq;
  let [name, ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (!setting('profile') && name !== 'partida') return go('#/partida');
  if (!ROUTES[name]) name = 'hoy';
  const mod = await ROUTES[name](), v = await mod.view(...params);
  if (my !== seq) return;                       // llegó otra navegación mientras cargaba
  if (v?.redirect) return go(v.redirect);
  current?.unmount?.();
  current = v;
  root.className = v.bare ? 'bare' : '';
  root.innerHTML = (v.tab && SKIN.brand ? `<div class="brand"><b>${SKIN.brand[0]}</b><span>${SKIN.brand[1]}</span></div>` : '') + v.html + (v.tab ? `<nav class="tab" aria-label="Secciones">${TABS.map(([id, label]) => `<a href="#/${id}" class="${id === v.tab ? 'on' : ''}"${id === v.tab ? ' aria-current="page"' : ''}><span>${label}</span></a>`).join('')}</nav>` : '');
  if (!v.keepScroll) scrollTo(0, 0);
  v.mount?.(root);
  keepAwake(!!openSession());
}
setPaint(render);

root.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || !current?.actions?.[el.dataset.act]) return;
  e.preventDefault();
  try { await current.actions[el.dataset.act](el, e); } catch (err) { console.error(err); toast('Algo ha fallado: ' + err.message); }
});
addEventListener('hashchange', () => render().catch(fail));
// Si una pantalla falla al pintarse, se dice en pantalla en vez de dejarla en negro. Los datos no se tocan.
function fail(err) { console.error(err); root.className = 'bare'; root.innerHTML = `<h1 class="big">Algo ha<br><em>fallado</em></h1><p class="lede">Esta pantalla no se ha podido abrir (${esc(err.message)}). Tus datos están a salvo.</p><a class="cta" href="#/hoy">Volver a Hoy</a>`; }

// ---------- barra de descanso, común a todas las pantallas ----------
const bar = document.createElement('div'); bar.className = 'rest'; bar.hidden = true; bar.setAttribute('role', 'timer');
bar.innerHTML = '<div><span class="d"></span><p></p><button data-r="add">+30 s</button><button data-r="skip">Saltar</button></div><s><i></i></s>';
document.body.append(bar);
bar.addEventListener('click', e => { const r = e.target.closest('[data-r]')?.dataset.r; if (r === 'add') addRest(30); if (r === 'skip') skipRest(); });
onRest(r => {
  bar.hidden = !r; document.body.classList.toggle('resting', !!r); if (!r) return;
  bar.classList.toggle('over', r.over);
  bar.querySelector('.d').textContent = fmtClock(Math.max(r.left, 0));
  bar.querySelector('p').innerHTML = r.over ? 'A por la siguiente' : `Descanso de ${fmtClock(r.total)}${r.label ? `<br>${esc(r.label)}` : ''}`;
  bar.querySelector('[data-r="skip"]').textContent = r.over ? 'Cerrar' : 'Saltar';
  bar.querySelector('i').style.width = Math.max(0, Math.min(100, r.left / r.total * 100)) + '%';
});

// ---------- arranque ----------
try {
  await boot();
  await render().catch(fail);
  const flush = () => { import('./sheets.js').then(m => m.flushSheet()); };
  flush();                                                     // la hoja de Google, si quedó pendiente
  addEventListener('online', flush);
} catch (err) {
  console.error(err);
  root.innerHTML = `<h1 class="big">No se puede<br><em>abrir</em></h1><p class="lede">La app no ha podido leer sus datos (${esc(err.message)}). No se ha borrado nada. Cierra la app del todo y vuelve a abrirla.</p>`;
}
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.S = S;                                                  // para mirar el estado desde la consola
