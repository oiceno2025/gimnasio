// Recuperar la app desde la hoja de Google: con el enlace de la hoja o pegando su pestaña «Copia».
import { S, setting, reload } from '../state.js';
import { esc, $, toast, sheet } from './kit.js';

// Devuelve cuántas series nuevas han entrado, o null si no se ha recuperado nada.
export async function recoverFromSheet() {
  let v = setting('sheet', {}).url ?? '';
  const asked = sheet('Recuperar desde tu hoja', `<p class="lede">Pega el enlace de tu hoja (acaba en /exec). Si no lo tienes, abre la hoja en Google, pestaña «Copia», copia la columna A entera y pégala aquí.</p>
    <div class="pad"><textarea id="src" rows="4" autocapitalize="off" autocomplete="off" spellcheck="false" aria-label="Enlace o copia">${esc(v)}</textarea></div>
    <p class="note">Añade lo que falte. No pisa las series que ya hay en este móvil.</p>
    <div class="pair"><button class="cta" data-pick="ok">Recuperar</button></div>`);
  $('#src').addEventListener('input', e => { v = e.target.value; });
  if ((await asked) !== 'ok') return null;
  v = v.trim(); if (!v) { toast('Pega el enlace o la copia'); return null; }
  toast('Buscando tu copia…', { ms: 8000 });
  try {
    const { fetchCopy, unpackCopy } = await import('../sheets.js');
    const dump = /^https:\/\/\S+$/.test(v) ? await fetchCopy(v) : await unpackCopy(v);
    const r = await S.db.restore(dump); await reload();
    toast(`Copia recuperada: ${r.added} series nuevas`, { ms: 4000 }); return r.added;
  } catch (err) { toast(err instanceof TypeError ? 'Sin conexión con la hoja' : err.message, { ms: 6000 }); return null; }
}
