// Tú: copias, restaurar, tiempos de descanso, datos personales y versión.
import { S, setting, saveSetting, reload } from '../state.js';
import { REST_DEFAULT, fmtClock } from '../logic.js';
import { esc, $, top, toast, sheet, confirmSheet } from './kit.js';
import { refresh } from '../nav.js';
import { VERSION } from '../version.js';

const ago = t => { if (!t) return 'nunca'; const d = Math.floor((Date.now() - t) / 864e5); return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; };

export function view() {
  const p = setting('profile'), sheet = setting('sheet', {}), rest = { ...REST_DEFAULT, ...setting('rest', {}) }, lastShare = setting('lastShare');
  const html = top('Tú', `Versión ${VERSION}`) + `
    <h1 class="big">${esc(p?.name || 'Tú')}</h1>
    <p class="lede">${S.sets.length} series y ${S.sessions.filter(s => s.endedAt).length} sesiones guardadas en este móvil.</p>

    <h2 class="h">Copias</h2>
    <p class="note" style="padding-top:0">Si borras el icono de la app, el iPhone borra sus datos. Por eso las copias van fuera del móvil.</p>
    <div class="rows">
      <button data-act="share" class="chev"><p>Guardar copia en iCloud<small>Última: ${ago(lastShare)}. Elige «Guardar en Archivos»</small></p></button>
      <a href="#/hoja" class="chev"><p>Hoja de Google con tu progreso<small>${sheet.mode ? (sheet.pending ? 'Pendiente de enviar' : `Conectada. Último envío: ${ago(sheet.lastOk)}`) : 'Ejercicio, kilos y repeticiones en tu Drive'}</small></p></a>
      <label class="chev" style="cursor:pointer"><p>Restaurar una copia<small>Añade lo que falte. No pisa lo que ya hay</small></p><input type="file" accept=".json,application/json" hidden id="restore"></label>
      <button data-act="csv" class="chev"><p>Exportar hoja de cálculo<small>Todas tus series en un archivo CSV</small></p></button>
    </div>
    <p class="note">${S.persisted ? 'El móvil ha confirmado que no borrará estos datos por falta de espacio.' : 'Instala la app en la pantalla de inicio para que el iPhone proteja mejor sus datos.'}</p>

    <h2 class="h">Descanso entre series</h2>
    <div class="pad">${[['big', 'Ejercicios grandes', 'Jalones, remos, presses, prensa'], ['small', 'Ejercicios pequeños', 'Curls, elevaciones, tríceps'], ['core', 'Abdomen y plancha', ''], ['kb', 'Kettlebell', '']].map(([k, name, sub]) => `<div class="field"><span>${name}${sub ? `<small>${sub}</small>` : ''}</span><span class="step" role="group" aria-label="Descanso, ${name}"><button data-act="rest" data-k="${k}" data-d="-15" aria-label="15 segundos menos">−</button><b style="min-width:52px">${fmtClock(rest[k])}</b><button data-act="rest" data-k="${k}" data-d="15" aria-label="15 segundos más">+</button></span></div>`).join('')}</div>

    <h2 class="h">Tus datos</h2>
    <div class="pad">
      <label class="field"><span>Nombre</span><input class="wide" data-p="name" value="${esc(p?.name ?? '')}"></label>
      <label class="field"><span>Altura</span><input data-p="heightCm" inputmode="numeric" value="${p?.heightCm ?? ''}"><u>cm</u></label>
      <label class="field"><span>Edad</span><input data-p="age" inputmode="numeric" value="${p?.age ?? ''}"><u>años</u></label>
    </div>

    <h2 class="h">La app</h2>
    <div class="rows">
      <a href="#/pasos/neck" class="chev"><p>Cuello y hombros, 5 min<small>Para cualquier día, también en casa</small></p></a>
      <button data-act="update" class="chev"><p>Buscar actualización<small>Versión ${VERSION}. Tus datos no se tocan</small></p></button>
      <button data-act="send" class="chev"><p>Pasársela a alguien<small>Cada persona tiene su plan y sus datos en su móvil</small></p></button>
    </div>`;
  return {
    tab: 'tu', html, keepScroll: true,
    mount(root) {
      $('#restore', root).addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        try { const { importFile } = await import('../backup.js'); const r = await importFile(file); toast(`Copia restaurada: ${r.added} series nuevas`); refresh(); } catch (err) { toast(err.message, { ms: 4000 }); }
      });
      root.querySelectorAll('[data-p]').forEach(inp => inp.addEventListener('change', async () => { const v = inp.dataset.p === 'name' ? inp.value.trim() : parseFloat(inp.value) || null; await saveSetting('profile', { ...setting('profile'), [inp.dataset.p]: v }); }));
    },
    actions: {
      async share() { const { shareCopy } = await import('../backup.js'); const how = await shareCopy(); if (how) { toast(how === 'share' ? 'Copia compartida' : 'Copia descargada'); refresh(); } },
      async csv() { const { toCSV, download } = await import('../backup.js'); download(`gimnasio-series-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(S.sets, S.ex, S.sessions), 'text/csv'); },
      async rest(el) { const k = el.dataset.k, v = Math.min(300, Math.max(15, rest[k] + +el.dataset.d)); await saveSetting('rest', { ...setting('rest', {}), [k]: v }); refresh(); },
      async update() {
        try { const reg = await navigator.serviceWorker?.getRegistration(); if (!reg) return toast('La app aún no está instalada en este navegador'); await reg.update(); if (reg.waiting) reg.waiting.postMessage('skipWaiting'); toast(reg.waiting || reg.installing ? 'Actualizando…' : 'Ya tienes la última versión'); if (reg.waiting || reg.installing) setTimeout(() => location.reload(), 1500); }
        catch { toast('Sin conexión: no se puede comprobar'); }
      },
      async send() { const url = location.href.split('#')[0]; if (navigator.share) { try { await navigator.share({ title: 'App de gimnasio', text: 'Ábrela en Safari y pulsa Compartir → Añadir a pantalla de inicio.', url }); } catch { /* cancelado */ } } else { await navigator.clipboard?.writeText(url); toast('Enlace copiado'); } },
    },
  };
}

