// Gráficas de línea en SVG. El eje horizontal es el tiempo de verdad (por fechas, no por número de sesión),
// así un parón se ve como un hueco. Un solo color: el naranja es el dato, el blanco discontinuo es el inicio.
import { daysBetween, niceDate, fmtKg } from '../logic.js';
import { esc } from './kit.js';

const W = 390, X0 = 24, X1 = 338;                 // ancho del dibujo y tramo que ocupa la línea (a la derecha van los números)
let uid = 0;

function ticks(lo, hi) {                          // 3 o 4 rayas en números redondos
  const raw = (hi - lo || Math.abs(hi) || 1) / 3, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw - 1e-12);
  const out = []; for (let v = Math.floor(lo / step + 1e-9) * step; out.length < 2 || out.at(-1) < hi - 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

// pts: [{ date, v }] ordenados. `ref`: valor de partida (raya discontinua). `fmt`: cómo se escribe un valor.
export function lineChart(pts, { h = 200, ref = null, fmt = v => fmtKg(Math.round(v * 10) / 10), ax = fmt, label = 'Evolución' } = {}) {
  const vals = pts.map(p => p.v).concat(ref ?? []), tk = ticks(Math.min(...vals), Math.max(...vals)), lo = tk[0], hi = tk.at(-1);
  const days = Math.max(1, daysBetween(pts[0].date, pts.at(-1).date)), y0 = 16, y1 = h - 28, id = 'cg' + ++uid;
  const X = d => X0 + daysBetween(pts[0].date, d) / days * (X1 - X0), Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
  const xy = pts.map(p => [+X(p.date).toFixed(1), +Y(p.v).toFixed(1)]), path = xy.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '), last = xy.at(-1);
  const data = xy.map((p, i) => [p[0], p[1], niceDate(pts[i].date), fmt(pts[i].v)]);
  const mid = pts[Math.floor(pts.length / 2)], showMid = pts.length > 4 && X(mid.date) > X0 + 70 && X(mid.date) < X1 - 70;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}: de ${esc(fmt(pts[0].v))} el ${niceDate(pts[0].date)} a ${esc(fmt(pts.at(-1).v))} el ${niceDate(pts.at(-1).date)}" data-pts="${esc(JSON.stringify(data))}" data-y1="${y1}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hot)" stop-opacity=".42"/><stop offset="1" style="stop-color:var(--hot)" stop-opacity="0"/></linearGradient></defs>
    ${tk.map(v => `<line class="grid" x1="20" x2="${X1 + 8}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${X1 + 14}" y="${(Y(v) + 4).toFixed(1)}">${esc(ax(v))}</text>`).join('')}
    ${ref == null ? '' : `<line class="ref" x1="20" x2="${X1 + 8}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}"/>`}
    <path d="${path} L${last[0]} ${y1} L${xy[0][0]} ${y1} Z" fill="url(#${id})"/>
    <path class="ln" d="${path}"/>
    ${pts.length <= 40 ? xy.slice(0, -1).map(p => `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="2.5"/>`).join('') : ''}
    <circle class="end" cx="${last[0]}" cy="${last[1]}" r="5.5"/>
    <text class="ax" x="${X0}" y="${h - 8}">${niceDate(pts[0].date)}</text>${showMid ? `<text class="ax" x="${X(mid.date).toFixed(1)}" y="${h - 8}" text-anchor="middle">${niceDate(mid.date)}</text>` : ''}<text class="ax" x="${X1}" y="${h - 8}" text-anchor="end">${niceDate(pts.at(-1).date)}</text>
    <g class="tip" hidden><line y1="${y0 - 4}" y2="${y1}"/><circle r="5.5"/><rect y="0" height="22" rx="3"/><text y="15"></text></g>
  </svg></div>`;
}

// Línea pequeña sin ejes, para una fila de lista.
export function spark(pts, { ref = null, h = 44 } = {}) {
  const vals = pts.map(p => p.v).concat(ref ?? []), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1, days = Math.max(1, daysBetween(pts[0].date, pts.at(-1).date));
  const xy = pts.map(p => [(6 + daysBetween(pts[0].date, p.date) / days * 338).toFixed(1), (h - 7 - (p.v - lo) / span * (h - 14)).toFixed(1)]), last = xy.at(-1);
  const yr = ref == null ? null : (h - 7 - (ref - lo) / span * (h - 14)).toFixed(1);
  return `<svg class="spark" viewBox="0 0 350 ${h}" aria-hidden="true">${yr == null ? '' : `<line class="ref" x1="0" x2="350" y1="${yr}" y2="${yr}"/>`}<path class="ln" d="${xy.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')}"/><circle class="end" cx="${last[0]}" cy="${last[1]}" r="4.5"/></svg>`;
}

// Al pasar el dedo por una gráfica, enseña la fecha y el valor del punto más cercano.
export function bindCharts(root) {
  for (const svg of root.querySelectorAll('.chart svg')) {
    const pts = JSON.parse(svg.dataset.pts), tip = svg.querySelector('.tip'), [line, dot, box, text] = tip.children;
    const show = e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, p = pts.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
      text.textContent = `${p[2]} · ${p[3]}`; tip.hidden = false;
      const w = text.getComputedTextLength() + 16, bx = Math.min(W - w - 2, Math.max(2, p[0] - w / 2));
      line.setAttribute('x1', p[0]); line.setAttribute('x2', p[0]); dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]);
      box.setAttribute('x', bx); box.setAttribute('width', w); text.setAttribute('x', bx + 8);
    };
    svg.addEventListener('pointerdown', show); svg.addEventListener('pointermove', show); svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
}
