// Hoja de Google con tu progreso: conectar, ver el estado y enviar.
import { S, setting, saveSetting } from '../state.js';
import { SCRIPT, googleReady, googleToken, syncSheet } from '../sheets.js';
import { esc, $, top, back, toast, confirmSheet } from './kit.js';
import { refresh } from '../nav.js';

const ago = t => { if (!t) return 'nunca'; const d = Math.floor((Date.now() - t) / 864e5); return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; };
const STEPS = [
  'Abre <strong>sheets.new</strong> en el navegador: crea una hoja vacía en tu Google Drive. Ponle nombre.',
  'En la hoja: menú <strong>Extensiones → Apps Script</strong>.',
  'Borra lo que haya, pega el código (botón de abajo) y pulsa el disquete para guardar.',
  'Arriba a la derecha: <strong>Implementar → Nueva implementación</strong>. En la rueda dentada elige <strong>Aplicación web</strong>.',
  '«Ejecutar como»: <strong>Yo</strong>. «Quién tiene acceso»: <strong>Cualquier usuario</strong>. Pulsa Implementar y acepta los permisos (es tu propia hoja).',
  'Copia la <strong>URL de la aplicación web</strong> (acaba en /exec) y pégala aquí abajo.',
];

export function view() {
  const cfg = setting('sheet', {}), on = !!cfg.mode;
  const status = on ? `<div class="meta" style="margin-top:14px"><div><strong>${cfg.rows ?? '—'}</strong>series en la hoja</div><div><b style="font-size:22px;line-height:30px">${ago(cfg.lastOk)}</strong>último envío</div></div>
      ${cfg.pending ? `<div class="banner"><span>Pendiente de enviar${cfg.lastError ? ': ' + esc(cfg.lastError) : ''}.</span></div>` : ''}
      <button class="cta" data-act="send">Enviar ahora <i>${S.sets.length} series</i></button>
      <div class="linkrow">${cfg.open ? `<a class="link" href="${esc(cfg.open)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center">Abrir mi hoja</a>` : ''}<button class="link" data-act="off">Desconectar</button></div>
      <p class="note">Se envía sola al acabar cada sesión. La app monta la hoja entera: Resumen (de dónde partes y cuánto has cambiado), Progreso, Semanas, Cuerpo y Series. No escribas en ella: se sobrescribe.</p>
      <p class="note">${cfg.copy ? 'La pestaña «Copia» guarda la app entera. Para recuperarla en otro móvil: Tú → Recuperar desde tu hoja de Google.' : 'En el próximo envío se añade la pestaña «Copia», con la app entera.'}${cfg.mode === 'script' ? ' Si preparaste la hoja antes de la versión 1.3, vuelve a pegar el código y publica una versión nueva: así se recupera solo con el enlace.' : ''}</p>
      ${cfg.mode === 'script' ? '<div class="linkrow"><button class="link" data-act="copy">Copiar código</button></div>' : ''}` : '';
  const html = top(back('#/tu', 'Tú'), 'Hoja de Google') + `
    <h1 class="big">Tu progreso<br><em>en una hoja</em></h1>
    <p class="lede">Tu entreno en tu Google Drive: de dónde partes, lo que levantas, cuánto has mejorado en porcentaje y cada serie apuntada. Lleva además una copia completa de la app: si cambias de móvil, lo recuperas todo desde aquí.</p>
    ${status}
    ${on ? '' : `
    ${googleReady() ? `<h2 class="h">Lo más rápido</h2><button class="cta" data-act="google">Conectar con Google <i>crea la hoja sola</i></button>
      <p class="note">La app solo puede ver la hoja que ella crea, nada más de tu Drive. Google pide el permiso de nuevo cada cierto tiempo.</p>` : ''}
    <h2 class="h">${googleReady() ? 'O con tu propia hoja' : 'Prepara tu hoja'}</h2>
    <p class="note" style="padding-top:0">Dos minutos, una sola vez. Mejor desde un ordenador.</p>
    <ol class="next">${STEPS.map((t, i) => `<li><span>${i + 1}</span><p style="font-weight:500">${t}</p></li>`).join('')}</ol>
    <div class="pair"><button class="cta ghost" data-act="copy">Copiar código</button></div>
    <div class="pad" style="padding-top:14px"><input class="inp" id="url" style="width:100%" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" autocomplete="off" aria-label="Enlace de tu hoja"></div>
    <button class="cta" data-act="link">Conectar <i>y enviar una prueba</i></button>`}`;
  const finish = async res => { toast(res.ok ? 'Hoja al día' : `No ha salido: ${res.error}`, { ms: 4500 }); refresh(); };
  return {
    bare: true, html, keepScroll: true,
    actions: {
      async copy() { try { await navigator.clipboard.writeText(SCRIPT); toast('Código copiado'); } catch { toast('No se ha podido copiar. Ábrelo desde un ordenador.'); } },
      async link() {
        const url = $('#url').value.trim(); if (!url) return toast('Pega el enlace de tu hoja');
        await saveSetting('sheet', { mode: 'script', url, pending: true }); toast('Probando…');
        const res = await syncSheet(); if (!res.ok) await saveSetting('sheet', {});       // si la prueba falla, no se queda a medias
        finish(res);
      },
      async google() {
        try { await googleToken({ ask: true }); } catch (e) { return toast(e.message, { ms: 4000 }); }
        await saveSetting('sheet', { mode: 'google', pending: true }); finish(await syncSheet({ ask: true }));
      },
      async send() { toast('Enviando…'); finish(await syncSheet({ ask: true })); },
      async off() { if (await confirmSheet('¿Desconectar la hoja?', 'La app deja de enviar. Tu hoja se queda en tu Drive tal como está.', 'Desconectar')) { await saveSetting('sheet', {}); refresh(); } },
    },
  };
}
