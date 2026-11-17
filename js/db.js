// Base de datos del móvil (IndexedDB).
// Regla de oro: las series (`sets`) solo se añaden. Corregir o borrar una serie es añadir
// otro registro que la sustituye (`supersedes`); el original sigue ahí para siempre.

export const DB_NAME = 'gym';
export const MUTABLE = ['sessions', 'body', 'settings', 'exercises', 'routines'];
export const STORES = ['sets', ...MUTABLE];

// Una función por versión del esquema. Nunca se edita una ya publicada: se añade otra al final.
export const MIGRATIONS = [
  db => {
    const sets = db.createObjectStore('sets', { keyPath: 'id' });
    sets.createIndex('exerciseId', 'exerciseId');
    sets.createIndex('sessionId', 'sessionId');
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('date', 'date');
    db.createObjectStore('body', { keyPath: 'id' }).createIndex('date', 'date');
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('exercises', { keyPath: 'id' });
    db.createObjectStore('routines', { keyPath: 'id' });
  },
];

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const wrap = req => new Promise((ok, ko) => { req.onsuccess = () => ok(req.result); req.onerror = () => ko(req.error); });
const done = tx => new Promise((ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error || new Error('Transacción cancelada')); });

export async function openDB({ idb = globalThis.indexedDB, name = DB_NAME, migrations = MIGRATIONS } = {}) {
  const req = idb.open(name, migrations.length);
  req.onupgradeneeded = e => { for (let v = e.oldVersion; v < migrations.length; v++) migrations[v](req.result, req.transaction); };
  const raw = await wrap(req);
  raw.onversionchange = () => raw.close();   // otra pestaña trae una versión nueva: soltar para no bloquearla

  const store = (n, mode = 'readonly') => raw.transaction(n, mode).objectStore(n);
  const all = n => wrap(store(n).getAll());

  const api = {
    raw, version: raw.version,
    close: () => raw.close(),

    // --- series: solo añadir ---
    async addSet(set) {
      const rec = { id: uid(), at: Date.now(), ...set };
      if (!rec.exerciseId || !rec.sessionId || !rec.date) throw new Error('Serie incompleta');
      const tx = raw.transaction('sets', 'readwrite');
      tx.objectStore('sets').add(rec);       // add, nunca put: si el id existe, falla y no pisa nada
      await done(tx); return rec;
    },
    async fixSet(oldId, patch) {
      const old = await wrap(store('sets').get(oldId)); if (!old) throw new Error('No existe la serie');
      return api.addSet({ ...old, ...patch, id: uid(), at: patch.at ?? Date.now(), supersedes: oldId });       // `at` propio solo al corregir sesiones pasadas
    },
    async voidSet(oldId) { return api.fixSet(oldId, { void: true }); },
    rawSets: () => all('sets'),
    // Series vigentes: sin las sustituidas ni las anuladas.
    async sets() { return liveSets(await all('sets')); },

    // --- resto: registros que sí se editan ---
    all(n) { return all(n); },
    get(n, key) { return wrap(store(n).get(key)); },
    async put(n, rec) { if (!MUTABLE.includes(n)) throw new Error('Las series no se sobrescriben'); const tx = raw.transaction(n, 'readwrite'); tx.objectStore(n).put(rec); await done(tx); return rec; },
    async del(n, key) { if (!MUTABLE.includes(n)) throw new Error('Las series no se borran'); const tx = raw.transaction(n, 'readwrite'); tx.objectStore(n).delete(key); await done(tx); },
    async setting(key, fallback) { return (await api.get('settings', key))?.value ?? fallback; },
    saveSetting(key, value) { return api.put('settings', { key, value }); },

    // --- copias ---
    async dump() {
      const stores = {}; for (const n of STORES) stores[n] = await all(n);
      return { app: 'gym-app', schema: raw.version, exportedAt: new Date().toISOString(), stores };
    },
    // Restaurar mezcla: las series que faltan se añaden y las que ya están no se tocan.
    // En el resto gana la copia, salvo los ajustes del propio móvil (hoja conectada, fecha de la última copia).
    async restore(dump, { keepSettings = ['sheet', 'lastShare'] } = {}) {
      if (dump?.app !== 'gym-app' || !dump.stores) throw new Error('El archivo no es una copia de esta app');
      if (dump.schema > raw.version) throw new Error('La copia es de una versión más nueva de la app. Actualiza primero.');
      const tx = raw.transaction(STORES, 'readwrite'); let added = 0;
      const have = new Set(await wrap(tx.objectStore('sets').getAllKeys()));
      for (const s of dump.stores.sets || []) if (!have.has(s.id)) { tx.objectStore('sets').add(s); added++; }
      for (const n of MUTABLE) for (const r of dump.stores[n] || []) { if (n === 'settings' && keepSettings.includes(r.key)) continue; tx.objectStore(n).put(r); }
      await done(tx); return { added };
    },
  };
  return api;
}

export function liveSets(raw) {
  const gone = new Set(raw.filter(s => s.supersedes).map(s => s.supersedes));
  return raw.filter(s => !gone.has(s.id) && !s.void).sort((a, b) => a.at - b.at);
}

// Pide al navegador que no borre los datos por falta de espacio. En iPhone solo se concede a apps instaladas.
export async function persist() {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
