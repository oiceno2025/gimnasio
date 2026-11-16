// Descanso entre series. Se guía por la hora de fin, no por contar segundos: si el iPhone
// congela la app en segundo plano, al volver el reloj sigue siendo correcto.
// En iPhone una app web no puede vibrar ni avisar con la pantalla bloqueada: por eso la pantalla
// se mantiene encendida (Wake Lock) y el aviso es un sonido.

const KEY = 'gym.rest';
let state = null, subs = new Set(), interval = null, audio = null, lock = null, wantAwake = false;
try { state = JSON.parse(localStorage.getItem(KEY)); } catch { /* sin acceso: empieza vacío */ }
if (state && state.endsAt < Date.now() - 20000) state = null;

const emit = () => subs.forEach(f => f(rest()));
const save = () => { try { state ? localStorage.setItem(KEY, JSON.stringify(state)) : localStorage.removeItem(KEY); } catch { /* da igual */ } };

export function rest() {
  if (!state) return null;
  const left = (state.endsAt - Date.now()) / 1000;
  return { left, total: state.total, label: state.label, over: left <= 0 };
}
export function onRest(fn) { subs.add(fn); loop(); fn(rest()); return () => subs.delete(fn); }
export function startRest(secs, label = '') { state = { endsAt: Date.now() + secs * 1000, total: secs, label, rung: false }; save(); loop(); emit(); }
export function addRest(secs = 30) { if (!state) return; state.endsAt = Math.max(state.endsAt, Date.now()) + secs * 1000; state.total += secs; state.rung = false; save(); emit(); }
export function skipRest() { state = null; save(); emit(); }

function loop() {
  if (interval) return;
  interval = setInterval(() => {
    if (!state) { if (!subs.size) { clearInterval(interval); interval = null; } return; }
    const left = state.endsAt - Date.now();
    if (left <= 0 && !state.rung) { state.rung = true; save(); beep(3); }
    if (left < -20000) { state = null; save(); }        // 20 s después de acabar, se quita solo
    emit();
  }, 250);
}

// ---------- sonido ----------
// El audio solo arranca tras un toque del usuario: se llama a `unlockSound` en el primer «Hecha».
export function unlockSound() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { /* sin sonido */ }
}
export function beep(times = 1, freq = 880) {
  if (!audio) return;
  try {
    for (let i = 0; i < times; i++) {
      const t = audio.currentTime + i * 0.28, osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = i === times - 1 && times > 1 ? freq * 1.5 : freq;
      gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + 0.24);
    }
  } catch { /* sin sonido */ }
}

// ---------- pantalla encendida ----------
export async function keepAwake(on) {
  wantAwake = on;
  try {
    if (on && !lock && document.visibilityState === 'visible') { lock = await navigator.wakeLock?.request('screen'); lock?.addEventListener('release', () => { lock = null; }); }
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}
// El sistema suelta el bloqueo al salir de la app: se vuelve a pedir al volver.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (wantAwake) keepAwake(true); emit(); } });
