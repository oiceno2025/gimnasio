// Copias: archivo completo (JSON), hoja de cálculo (CSV) y compartir a iCloud. La hoja de Google va en sheets.js.
import { S, setting, saveSetting, reload } from './state.js';
import { ymd } from './logic.js';

// ---------- archivos ----------
export async function dumpText() { return JSON.stringify(await S.db.dump()); }
export const jsonName = (d = new Date()) => `gimnasio-copia-${ymd(d)}.json`;

// Hoja de cálculo que abre cualquier programa: separador «;» y coma decimal, como espera Excel en español.
export function toCSV(sets, exById, sessions = []) {
  const ses = Object.fromEntries(sessions.map(s => [s.id, s])), q = v => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }, dec = v => (v == null ? '' : String(v).replace('.', ','));
  const count = {}, lines = [['fecha', 'sesion', 'ejercicio', 'serie', 'kg', 'repeticiones', 'unidad', 'quedaban', 'modo', 'record'].join(';')];
  for (const s of [...sets].sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1))) {
    const key = s.sessionId + s.exerciseId; count[key] = (count[key] || 0) + 1;
    lines.push([s.date, (ses[s.sessionId]?.title || []).join(' '), exById[s.exerciseId]?.name ?? s.exerciseId, count[key], dec(s.kg), s.reps, s.unit === 'secs' ? 'segundos' : s.unit === 'min' ? 'minutos' : 'repeticiones', s.rir ?? '', s.mode ?? '', (s.rec || []).join(' ')].map(q).join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// En iPhone abre la hoja de compartir: «Guardar en Archivos» la deja en iCloud. Si no se puede, se descarga.
export async function shareCopy() {
  const text = await dumpText(), name = jsonName(), file = new File([text], name, { type: 'application/json' });
  let how = 'download';
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Copia de mi gimnasio' }); how = 'share'; } catch (e) { if (e.name === 'AbortError') return null; download(name, text); } }
  else download(name, text);
  await saveSetting('lastShare', Date.now()); return how;
}
export async function importFile(file) {
  let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('Ese archivo no se puede leer'); }
  const r = await S.db.restore(data); await reload(); return r;
}
