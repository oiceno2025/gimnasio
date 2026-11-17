// Hoja de Google con el progreso. La app monta la hoja entera en cada envío (no hay plantilla que copiar ni que romper):
//   Resumen  · de dónde partes, dónde estás y cuánto has cambiado, ejercicio por ejercicio
//   Progreso · la mejor serie de cada ejercicio en cada sesión, con el cambio frente a tu primera vez
//   Semanas  · entrenos, series, kilos movidos, cardio, peso y molestias, semana a semana
//   Cuerpo   · tu peso
//   Series   · todo lo apuntado, una fila por serie
// Dos maneras de enviarla, con el mismo contenido:
//   · 'script': la persona pega en su hoja un pequeño Apps Script y nos da su enlace. No hace falta nada más.
//   · 'google': botón «Conectar con Google». Necesita un identificador de cliente en js/config.js.
// Las cinco pestañas son para leer. Además va una sexta, «Copia», con la app entera (planes, ajustes y series)
// comprimida en texto: con ella se recupera todo en un móvil nuevo sin haber guardado ningún archivo.
import { S, setting, saveSetting } from './state.js';
import { epley, weekDates, parseYmd } from './logic.js';
import { GOOGLE_CLIENT_ID } from './config.js';

const r1 = v => Math.round(v * 10) / 10, pct = (now, start) => (start > 0 ? r1((now / start - 1) * 100) : ''), avg = a => (a.length ? r1(a.reduce((t, v) => t + v, 0) / a.length) : '');
const weighted = s => s.kg > 0 && !s.unit, orm = s => epley(s.kg || 0, s.reps), bestOf = g => g.reduce((a, s) => ((s.kg || 0) * 1000 + s.reps > (a.kg || 0) * 1000 + a.reps ? s : a));
const unitName = s => (s.unit === 'secs' ? 'segundos' : s.unit === 'min' ? 'minutos' : 'repeticiones');
const rect = rows => { const n = Math.max(...rows.map(r => r.length)); return rows.map(r => [...r, ...Array(n - r.length).fill('')]); };

// Las pestañas, tal cual van a la hoja. Los números van como números (sin «kg» ni «%») para poder hacer gráficas.
// `heads`: filas que son cabecera de tabla; `title`: filas de título. El script les da formato.
export function build({ sets, ex, sessions = [], body = [], profile = {}, baseline = [] }) {
  const name = id => ex[id]?.name ?? id, ses = Object.fromEntries(sessions.map(s => [s.id, s]));
  const ordered = [...sets].sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1));
  const done = sessions.filter(s => s.endedAt).sort((a, b) => (a.date < b.date ? -1 : 1)), weights = [...body].sort((a, b) => (a.date < b.date ? -1 : 1));

  // ----- Series -----
  const count = {}, groups = new Map();
  const series = [['Fecha', 'Sesión', 'Ejercicio', 'Serie', 'Kg', 'Repeticiones', 'Unidad', 'Te quedaban', 'Récord']];
  for (const s of ordered) {
    const key = s.sessionId + '|' + s.exerciseId; count[key] = (count[key] || 0) + 1;
    series.push([s.date, (ses[s.sessionId]?.title || []).join(' '), name(s.exerciseId), count[key], s.kg ?? 0, s.reps, unitName(s), s.rir ?? '', s.rec?.length ? 'sí' : '']);
    (groups.get(key) ?? groups.set(key, { id: s.exerciseId, ex: name(s.exerciseId), date: s.date, sets: [] }).get(key)).sets.push(s);
  }

  // ----- Progreso y marcas por ejercicio -----
  const byEx = new Map(); for (const g of groups.values()) (byEx.get(g.id) ?? byEx.set(g.id, []).get(g.id)).push(g);
  const progreso = [['Ejercicio', 'Fecha', 'Mejor serie (kg)', 'Repeticiones', 'Máximo estimado (kg)', 'Cambio frente a tu primera vez (%)', 'Series', 'Kg movidos']];
  const marks = [];
  for (const list of [...byEx.values()].sort((a, b) => a[0].ex.localeCompare(b[0].ex, 'es'))) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    const w = list.some(g => g.sets.some(weighted)), top = g => (w ? Math.max(...g.sets.map(orm)) : Math.max(...g.sets.map(s => s.reps))), first = top(list[0]);
    for (const g of list) { const b = bestOf(g.sets); progreso.push([g.ex, g.date, b.kg ?? 0, b.reps, w ? r1(top(g)) : '', pct(top(g), first), g.sets.length, w ? Math.round(g.sets.reduce((t, s) => t + (s.kg || 0) * s.reps, 0)) : '']); }
    // Punto de partida: lo que la persona dijo al empezar; si no lo dijo, su primera sesión.
    const said = baseline.find(b => b.exerciseId === list[0].id && b.kg > 0 && b.reps > 0), b0 = said ?? bestOf(list[0].sets), bN = bestOf(list.at(-1).sets), all = list.flatMap(g => g.sets), rec = bestOf(all);
    const start = said ? epley(said.kg, said.reps) : first, now = top(list.at(-1));
    marks.push({ n: list.length, counts: w && (list.length > 1 || !!said), row: [list[0].ex, said ? 'al darte de alta' : list[0].date, b0.kg ?? 0, b0.reps, list.at(-1).date, bN.kg ?? 0, bN.reps, w ? r1(start) : '', w ? r1(now) : '', pct(now, start), rec.kg ?? 0, rec.reps, rec.date, list.length] });
  }
  marks.sort((a, b) => b.n - a.n);

  // ----- Semanas -----
  const weeks = new Map(), wk = date => weekDates(parseYmd(date))[0], W = d => weeks.get(wk(d)) ?? weeks.set(wk(d), { n: 0, sets: 0, kg: 0, cardio: 0, body: [], neck: [], back: [] }).get(wk(d));
  for (const s of done) { const w = W(s.date); w.n++; w.cardio += s.cardio?.minutes || 0; if (s.neck != null) w.neck.push(s.neck); if (s.back != null) w.back.push(s.back); }
  for (const s of ordered) { const w = W(s.date); w.sets++; if (weighted(s)) w.kg += s.kg * s.reps; if (s.unit === 'min') w.cardio += s.reps; }
  for (const b of weights) W(b.date).body.push(b.kg);
  const semanas = [['Semana del', 'Entrenos', 'Series', 'Kg movidos', 'Minutos de cardio', 'Peso medio (kg)', 'Molestia de cuello (0–10)', 'Molestia de espalda (0–10)'],
    ...[...weeks.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, w]) => [d, w.n, w.sets, Math.round(w.kg), w.cardio, avg(w.body), avg(w.neck), avg(w.back)])];

  // ----- Cuerpo -----
  const cuerpo = [['Fecha', 'Peso (kg)', 'Cambio desde el inicio (kg)'], ...weights.map(b => [b.date, b.kg, r1(b.kg - weights[0].kg)])];

  // ----- Resumen -----
  const since = profile.startedAt || done[0]?.date || ordered[0]?.date || '', kgAll = Math.round(ordered.filter(weighted).reduce((t, s) => t + s.kg * s.reps, 0));
  const cardio = done.reduce((t, s) => t + (s.cardio?.minutes || 0), 0) + ordered.filter(s => s.unit === 'min').reduce((t, s) => t + s.reps, 0);
  const changes = marks.filter(m => m.counts).map(m => m.row[9]).filter(v => v !== ''),      // la media solo cuenta ejercicios con peso y más de una sesión
   w0 = weights[0]?.kg ?? profile.kg ?? '', wN = weights.at(-1)?.kg ?? w0;
  const kpis = [['Desde', since], ['Entrenos hechos', done.length], ['Semanas con entreno', [...weeks.values()].filter(w => w.n).length], ['Series apuntadas', ordered.length], ['Kilos movidos en total', kgAll], ['Minutos de cardio', cardio],
    ['Peso al empezar (kg)', w0], ['Peso ahora (kg)', wN], ['Cambio de peso (kg)', w0 !== '' && wN !== '' ? r1(wN - w0) : ''], ['Fuerza frente al inicio, de media (%)', avg(changes)], ['Última sesión', done.at(-1)?.date ?? '']];
  const resumen = rect([[`Progreso de ${profile.name || 'tu entreno'}`], ['Lo monta la app al acabar cada sesión. No escribas aquí: se sobrescribe.'], [], ...kpis, [],
    ['Tus marcas: de dónde partiste y dónde estás'],
    ['Ejercicio', 'Inicio', 'Kg', 'Rep.', 'Última vez', 'Kg', 'Rep.', 'Máximo estimado al inicio (kg)', 'Máximo estimado ahora (kg)', 'Cambio (%)', 'Récord (kg)', 'Rep.', 'Fecha del récord', 'Sesiones'],
    ...marks.map(m => m.row)]);
  const table = kpis.length + 6;       // fila de la cabecera de «Tus marcas» (1 = primera)

  return { tabs: [
    { name: 'Resumen', rows: resumen, title: [1, table - 1], heads: [table], note: [2] },
    { name: 'Progreso', rows: progreso, heads: [1] }, { name: 'Semanas', rows: semanas, heads: [1], chart: semanas.length > 2 },
    { name: 'Cuerpo', rows: cuerpo, heads: [1] }, { name: 'Series', rows: series, heads: [1] }] };
}
export const fromState = () => build({ sets: S.sets, ex: S.ex, sessions: S.sessions, body: S.body, profile: setting('profile', {}), baseline: setting('baseline', []) });
const seriesCount = t => t.tabs.find(x => x.name === 'Series').rows.length - 1;

// ---------- copia completa dentro de la hoja ----------
// La copia de la app (la misma de backup.js) va comprimida y en base64, troceada en celdas de la columna A:
// una celda de Google admite 50.000 caracteres. Base64 no lleva comillas ni saltos, así que copiar y pegar la columna no la rompe.
const MARK = 'gymcopia1', CHUNK = 40000;
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const pipe = async (bytes, through) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(through)).arrayBuffer());
export async function packCopy(dump) {
  let bytes = new TextEncoder().encode(JSON.stringify(dump)), how = 'raw';
  if (globalThis.CompressionStream) try { bytes = await pipe(bytes, new CompressionStream('gzip')); how = 'gz'; } catch { /* sin comprimir */ }
  const text = b64(bytes), rows = [['Copia completa de la app. No la toques: sirve para recuperar tus datos en otro móvil.'], [`${MARK}:${how}`]];
  for (let i = 0; i < text.length; i += CHUNK) rows.push([text.slice(i, i + CHUNK)]);
  return { name: 'Copia', rows, note: [1] };
}
// Acepta la columna entera tal como sale de la hoja (con su aviso y saltos de línea).
export async function unpackCopy(text) {
  text = String(text ?? '');
  const m = /gymcopia1:(gz|raw)/.exec(text); if (!m) throw new Error('Ahí no hay ninguna copia de la app');
  try {
    let bytes = Uint8Array.from(atob(text.slice(m.index + m[0].length).replace(/[^A-Za-z0-9+/=]/g, '')), c => c.charCodeAt(0));
    if (m[1] === 'gz') bytes = await pipe(bytes, new DecompressionStream('gzip'));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new Error('La copia está incompleta. Copia la columna A entera de la pestaña «Copia».'); }
}
const SCRIPT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
// Pide la copia a la hoja por su enlace. Solo contesta el código nuevo (el que lleva `copia` en doGet).
export async function fetchCopy(url, fetchFn = fetch) {
  if (!SCRIPT_URL.test(url)) throw new Error('Ese enlace no es de una hoja preparada. Tiene que acabar en /exec.');
  const res = await fetchFn(url + '?copia=1', { redirect: 'follow' });
  if (!res.ok) throw new Error('La hoja responde ' + res.status);
  let out; try { out = await res.json(); } catch { throw new Error('La hoja no contesta como se esperaba.'); }
  if (!out.copia) throw new Error(out.error || 'Esa hoja tiene el código antiguo. Abre la hoja, pestaña «Copia», copia la columna A entera y pégala aquí.');
  return unpackCopy(out.copia);
}

// ---------- camino 1: Apps Script pegado en la hoja ----------
// Se envía como texto plano para que el navegador no haga la consulta previa (CORS), que Apps Script no contesta.
export async function pushScript(url, t, fetchFn = fetch) {
  if (!SCRIPT_URL.test(url)) throw new Error('Ese enlace no es de una hoja preparada. Tiene que acabar en /exec.');
  const res = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ app: 'gimnasio', v: 2, ...t }), redirect: 'follow' });
  if (!res.ok) throw new Error('La hoja responde ' + res.status);
  let out; try { out = await res.json(); } catch { throw new Error('La hoja no contesta como se esperaba. Revisa que el acceso sea «Cualquier usuario».'); }
  if (!out.ok) throw new Error(out.error || 'La hoja ha rechazado los datos');
  return out;
}

// ---------- camino 2: Conectar con Google ----------
// Permiso «drive.file»: la app solo ve las hojas que ella misma crea, nada más del Drive de la persona.
const SCOPE = 'https://www.googleapis.com/auth/drive.file', API = 'https://sheets.googleapis.com/v4/spreadsheets';
export const googleReady = () => !!GOOGLE_CLIENT_ID;
let token = null, tokenUntil = 0;
function loadGsi() {
  return new Promise((ok, ko) => { if (window.google?.accounts?.oauth2) return ok(); const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = ok; s.onerror = () => ko(new Error('Sin conexión con Google')); document.head.append(s); });
}
// Pide el permiso. Tiene que salir de un toque del usuario: el navegador bloquea la ventana si no.
export async function googleToken({ ask = true } = {}) {
  if (token && Date.now() < tokenUntil - 60000) return token;
  if (!googleReady()) throw new Error('Falta configurar la conexión con Google');
  await loadGsi();
  return new Promise((ok, ko) => {
    const client = window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SCOPE,
      callback: r => { if (r.error) return ko(new Error('Google no ha dado permiso')); token = r.access_token; tokenUntil = Date.now() + (r.expires_in || 3600) * 1000; ok(token); },
      error_callback: () => ko(new Error('Hay que volver a conectar con Google')) });
    client.requestAccessToken({ prompt: ask ? '' : 'none' });
  });
}
const DARK = { red: .07, green: .07, blue: .08 }, WHITE = { red: 1, green: 1, blue: 1 };
export async function pushGoogle(tok, t, sheetId, fetchFn = fetch) {
  const call = async (url, body) => {
    const res = await fetchFn(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 401) { token = null; throw new Error('Hay que volver a conectar con Google'); }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Google responde ' + res.status);
    return res.json();
  };
  // La hoja se crea ya con sus cinco pestañas y las cabeceras fijadas. sheetId = posición, para poder dar formato después.
  const create = async () => { const made = await call(API, { properties: { title: 'Gimnasio · mi progreso' }, sheets: t.tabs.map((x, i) => ({ properties: { sheetId: i, title: x.name, gridProperties: { frozenRowCount: x.name === 'Resumen' ? 0 : 1 } } })) }); if (!made) throw new Error('No se ha podido crear la hoja'); return made.spreadsheetId; };
  let id = sheetId || await create();
  // Hoja creada antes de que existiera la pestaña «Copia»: se añade. Si ya está, Google contesta con error y no pasa nada.
  if (sheetId && t.tabs.some(x => x.name === 'Copia')) try { await call(`${API}/${id}:batchUpdate`, { requests: [{ addSheet: { properties: { title: 'Copia' } } }] }); } catch { /* ya existe */ }
  if (!(await call(`${API}/${id}/values:batchClear`, { ranges: t.tabs.map(x => x.name) }))) id = await create();     // la borraron del Drive: se hace otra
  const out = await call(`${API}/${id}/values:batchUpdate`, { valueInputOption: 'RAW', data: t.tabs.map(x => ({ range: `${x.name}!A1`, values: x.rows })) });
  if (!out) throw new Error('No se ha podido escribir en la hoja');
  // Formato: cabeceras en negro con letra blanca. Si falla, los datos ya están escritos: no se da por error.
  const fmt = (i, row, cols, cell) => ({ repeatCell: { range: { sheetId: i, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 0, endColumnIndex: cols }, cell: { userEnteredFormat: cell }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } });
  const requests = t.tabs.flatMap((x, i) => [...(x.heads || []).map(r => fmt(i, r, x.rows[0].length, { backgroundColor: DARK, textFormat: { bold: true, foregroundColor: WHITE } })), ...(x.title || []).map(r => fmt(i, r, 1, { textFormat: { bold: true, fontSize: 14 } }))]);
  try { await call(`${API}/${id}:batchUpdate`, { requests }); } catch { /* sin formato, pero con datos */ }
  return { ok: true, id, url: `https://docs.google.com/spreadsheets/d/${id}/edit` };
}

// ---------- envío y cola ----------
// Si falla (sin cobertura, permiso caducado), queda pendiente y se reintenta al abrir la app o al volver la conexión.
let busy = false;
export async function syncSheet({ ask = false, fetchFn = fetch } = {}) {
  const cfg = setting('sheet'); if (!cfg?.mode || busy) return { skipped: true };
  busy = true;
  try {
    const t = fromState(); t.tabs.push(await packCopy(await S.db.dump()));
    const out = cfg.mode === 'script' ? await pushScript(cfg.url, t, fetchFn) : await pushGoogle(await googleToken({ ask }), t, cfg.sheetId, fetchFn);
    await saveSetting('sheet', { ...setting('sheet'), pending: false, lastOk: Date.now(), lastError: null, copy: true, rows: seriesCount(t), ...(out.url ? { open: out.url } : {}), ...(out.id ? { sheetId: out.id } : {}) });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof TypeError ? 'Sin conexión' : e.message;
    await saveSetting('sheet', { ...setting('sheet'), pending: true, lastError: msg }); return { error: msg };
  } finally { busy = false; }
}
export async function queueSheet(opt) { const cfg = setting('sheet'); if (!cfg?.mode) return { skipped: true }; await saveSetting('sheet', { ...cfg, pending: true }); return syncSheet(opt); }
export const flushSheet = () => (setting('sheet')?.pending ? syncSheet() : Promise.resolve({ skipped: true }));

// El código que la persona pega en su hoja (Extensiones → Apps Script). Monta y da formato a las pestañas en cada envío.
export const SCRIPT = `// Gimnasio: recibe tu progreso y monta esta hoja. No hace falta tocar nada aquí.
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.app !== 'gimnasio' || !data.tabs) throw new Error('Datos que no son de la app');
    var ss = SpreadsheetApp.getActiveSpreadsheet(), series = 0;
    data.tabs.forEach(function (tab, i) {
      var hoja = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
      montar(hoja, tab);
      ss.setActiveSheet(hoja); ss.moveActiveSheet(i + 1);
      if (tab.name === 'Series') series = tab.rows.length - 1;
    });
    // La hoja vacía que crea Google al empezar ya no hace falta.
    ss.getSheets().forEach(function (h) { if (data.tabs.every(function (t) { return t.name !== h.getName(); }) && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h); });
    ss.setActiveSheet(ss.getSheetByName('Resumen'));
    return responder({ ok: true, rows: series, url: ss.getUrl() });
  } catch (err) {
    return responder({ ok: false, error: String(err.message || err) });
  }
}
// Con ?copia=1 devuelve la copia completa, para recuperar tus datos en un móvil nuevo.
function doGet(e) {
  if (e && e.parameter && e.parameter.copia) {
    var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Copia');
    if (!h || h.getLastRow() < 3) return responder({ ok: false, error: 'Esta hoja aún no tiene copia' });
    return responder({ ok: true, copia: h.getRange(1, 1, h.getLastRow(), 1).getValues().map(function (r) { return r[0]; }).join('\\n') });
  }
  return responder({ ok: true, app: 'gimnasio' });
}
function montar(hoja, tab) {
  var filas = tab.rows, cols = filas[0].length;
  hoja.clear();
  hoja.getRange(1, 1, filas.length, cols).setValues(filas);
  (tab.heads || []).forEach(function (f) {
    hoja.getRange(f, 1, 1, cols).setBackground('#111114').setFontColor('#ffffff').setFontWeight('bold').setWrap(true).setVerticalAlignment('middle');
  });
  (tab.title || []).forEach(function (f) { hoja.getRange(f, 1).setFontSize(14).setFontWeight('bold').setFontColor('#ff4a1c'); });
  (tab.note || []).forEach(function (f) { hoja.getRange(f, 1).setFontColor('#888888').setFontStyle('italic'); });
  hoja.setFrozenRows(tab.name === 'Resumen' ? 0 : 1);
  hoja.setColumnWidth(1, tab.name === 'Resumen' || tab.name === 'Progreso' ? 280 : 120);
  if (cols > 1) hoja.setColumnWidths(2, cols - 1, 120);
  if (tab.chart) grafica(hoja, filas.length);
}
// Kilos movidos por semana, en la pestaña Semanas. Si algo falla, la hoja se queda sin gráfica pero con datos.
function grafica(hoja, n) {
  try {
    hoja.getCharts().forEach(function (c) { hoja.removeChart(c); });
    var chart = hoja.newChart().asColumnChart()
      .addRange(hoja.getRange(1, 1, n, 1)).addRange(hoja.getRange(1, 4, n, 1))
      .setNumHeaders(1).setOption('title', 'Kilos movidos por semana').setOption('legend', { position: 'none' }).setOption('colors', ['#ff4a1c'])
      .setPosition(2, 10, 0, 0).build();
    hoja.insertChart(chart);
  } catch (err) {}
}
function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;
