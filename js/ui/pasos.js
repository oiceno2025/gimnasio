// Pasos con cronómetro: Calentar, Soltar y «Cuello y hombros, 5 min».
import { S, openSession, saveSession, planFor } from '../state.js';
import { WARMUP, COOLDOWN, NECK_ROUTINE } from '../data/routines.js';
import { fmtClock, fmtKg, roundTo } from '../logic.js';
import { beep, unlockSound, keepAwake } from '../timer.js';
import { esc, $, go, top, back, fit } from './kit.js';
import { refresh } from '../nav.js';

const run = { key: null, i: 0, side: 1, endsAt: null, left: null };   // `left` (ms) cuando está en pausa
let tick = null, man = null, shown = 0;

function stepsFor(kind, s) {
  if (kind === 'neck') return NECK_ROUTINE;
  if (kind === 'cool') return COOLDOWN[s.kind] || COOLDOWN.full;
  const steps = [...(WARMUP[s.kind] || WARMUP.full)], first = s.items[0], kg = first && planFor(first, s).sets[0].kg;
  // Series de aproximación del primer ejercicio: 8 al 50 %, 5 al 70 %, 2–3 al 85 %.
  if (kg >= 10) { const ex = S.ex[first.exerciseId], st = ex?.equip === 'mancuernas' ? 2 : 2.5; steps.push({ name: 'Series de aproximación', exerciseId: first.exerciseId, ramp: [[8, .5], [5, .7], [3, .85]].map(([r, f]) => `${r} <i class="x">×</i> ${fmtKg(roundTo(kg * f, st))} kg`), cue: `${ex.name}. Sin llegar a cansarte: es para entrar en calor.` }); }
  return steps;
}

export function view(kind = 'warm') {
  const s = openSession(); if (kind !== 'neck' && !s) return { redirect: '#/hoy' };
  const steps = stepsFor(kind, s), key = kind + (s?.id ?? '');
  if (run.key !== key) Object.assign(run, { key, i: 0, side: 1, endsAt: null, left: null });
  const home = kind === 'neck' ? '#/hoy' : '#/sesion', name = { warm: 'Calentar', cool: 'Soltar', neck: 'Cuello y hombros' }[kind];
  const step = steps[run.i], secsLeft = () => (run.endsAt ? (run.endsAt - Date.now()) / 1000 : (run.left ?? step.secs * 1000) / 1000);
  const running = !!run.endsAt;

  const finish = async () => { Object.assign(run, { key: null }); if (s && kind !== 'neck') await saveSession({ ...openSession(), [kind]: 'done' }); go(home); };
  const advance = async () => {
    if (step.sides && run.side < step.sides) { run.side++; run.endsAt = Date.now() + step.secs * 1000; run.left = null; return refresh(); }
    if (run.i >= steps.length - 1) return finish();
    run.i++; run.side = 1; run.left = null; run.endsAt = steps[run.i].ramp ? null : Date.now() + steps[run.i].secs * 1000; refresh();
  };

  const html = top(back(home, kind === 'neck' ? 'Hoy' : 'Sesión'), `${name} · ${run.i + 1} de ${steps.length}`) + `
    <div class="mins" aria-hidden="true">${steps.map((_, k) => `<i class="${k < run.i ? 'on' : k === run.i ? 'now' : ''}"></i>`).join('')}</div>
    <div class="stage glow demo"><canvas aria-label="Muñeco haciendo ${esc(step.name)}"></canvas><h3 ${fit(step.name, 160)}>${esc(step.name)}</h3>
      <div class="views"><button data-act="yaw" data-yaw="0">Frente</button><button data-act="yaw" data-yaw="1.5708">Lado</button><button data-act="yaw" data-yaw="3.1416">Detrás</button></div></div>
    <p class="lede">${esc(step.cue)}</p>
    ${step.ramp ? `<ul class="rows">${step.ramp.map((r, k) => `<li><p>Serie ${k + 1}</p><b>${r}</b></li>`).join('')}</ul><button class="cta" data-act="next">Hecho <i>a entrenar</i></button>` : `
    <div class="clock"><span class="d" id="clk" role="timer">${fmtClock(secsLeft())}</span><p><b>${step.sides ? `Lado ${run.side} de ${step.sides}` : `${step.secs} segundos`}</b>${step.sides ? 'Cambia de lado al pitido' : 'Sin prisa'}</p></div>
    <div class="pair"><button class="cta ${running ? 'ghost' : ''}" data-act="toggle">${running ? 'Pausa' : run.left != null ? 'Seguir' : 'Empezar'}</button><button class="cta ghost" data-act="next">${run.i >= steps.length - 1 ? 'Acabar' : 'Siguiente'}</button></div>`}
    <ol class="next" style="margin-top:14px">${steps.slice(run.i + 1, run.i + 5).map((x, k) => `<li><span>${run.i + 2 + k}</span><p>${esc(x.name)}</p><b>${x.ramp ? '' : fmtClock(x.secs * (x.sides || 1))}</b></li>`).join('')}</ol>
    <div class="linkrow"><button class="link" data-act="skipall">${kind === 'neck' ? 'Salir' : `Saltar ${name.toLowerCase()}`}</button></div>`;

  return {
    bare: true, html,
    mount(root) {
      keepAwake(true);
      const my = ++shown, cv = $('canvas', root), flip = !!step.sides && run.side === 2;       // el segundo lado, en espejo
      import('../man.js').then(m => { if (my === shown) man = m.mountMan(cv, step.exerciseId ? { ex: S.ex[step.exerciseId] } : { move: step.move, flip }); }).catch(e => console.warn('Sin muñeco:', e));
      tick = setInterval(() => {
        if (!run.endsAt) return;
        const left = secsLeft(), el = $('#clk', root); if (el) el.textContent = fmtClock(left);
        if (left <= 0) { beep(2); advance(); }
      }, 200);
    },
    unmount() { shown++; man?.destroy(); man = null; clearInterval(tick); if (run.endsAt && !location.hash.startsWith('#/pasos')) {   // al salir de la pantalla, pausa
      run.left = Math.max(0, run.endsAt - Date.now()); run.endsAt = null; } if (!openSession()) keepAwake(false); },
    actions: {
      yaw(el) { man?.view(+el.dataset.yaw); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
      toggle() { unlockSound(); if (run.endsAt) { run.left = Math.max(0, run.endsAt - Date.now()); run.endsAt = null; } else { run.endsAt = Date.now() + (run.left ?? step.secs * 1000); run.left = null; } refresh(); },
      next() { unlockSound(); advance(); },
      async skipall() { run.key = null; if (s && kind !== 'neck') await saveSession({ ...s, [kind]: 'skip' }); go(home); },
    },
  };
}
