// Revit tools drawn as stations on a metro line, with a detail card for the active station.
import { pad2 } from './lib/theme.js';

const NS = 'http://www.w3.org/2000/svg';
const LOOP_MS = 12000;

export function initMetro({ svg, card, count, tools, zones, theme }) {
  if (count) count.textContent = `${tools.length} STATIONS`;
  const blue = zones.bim.color;
  // spread the stations evenly along the line, whatever their number
  const step = tools.length > 1 ? 980 / (tools.length - 1) : 0;
  const pts = tools.map((_, i) => ({ x: 110 + i * step, y: i % 2 ? 150 : 90 }));

  let d = `M40 ${pts[0].y}`;
  pts.forEach((p, i) => {
    if (i) { const q = pts[i - 1], mx = (q.x + p.x) / 2; d += ` L${mx - 30} ${q.y} L${mx + 30} ${p.y}`; }
    d += ` L${p.x} ${p.y}`;
  });
  d += ` L1160 ${pts.at(-1).y}`;

  svg.innerHTML = `
    <g stroke="${theme.ink}" stroke-opacity=".07">${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="230"/>`).join('')}</g>
    <path d="${d}" fill="none" stroke="${blue}" stroke-width="14" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${theme.ink}" stroke-width="3" class="line-anim"/>
    <circle class="train" r="7" fill="${theme.accent}" stroke="${theme.chip}" stroke-width="2"/>`;

  const stations = pts.map((p, i) => {
    const t = tools[i], up = i % 2 === 0, g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'station');
    g.innerHTML = `
      <circle class="ring" cx="${p.x}" cy="${p.y}" r="11"/><circle cx="${p.x}" cy="${p.y}" r="4" fill="${theme.ink}"/>
      <text x="${p.x}" y="${up ? p.y - 30 : p.y + 42}" text-anchor="middle">${t.name}</text>
      <text class="code" x="${p.x}" y="${up ? p.y - 48 : p.y + 58}" text-anchor="middle">K${pad2(i + 1)} · ${t.code}</text>`;
    g.addEventListener('mouseenter', () => show(i));
    g.addEventListener('click', () => (current === i && t.url ? (location.href = t.url) : show(i)));
    svg.appendChild(g);
    return g;
  });

  let current = -1;
  function show(i) {
    const t = tools[i];
    current = i;
    stations.forEach((s, k) => s.classList.toggle('on', k === i));
    card.innerHTML = `
      <div class="ic">${t.code}</div>
      <div><h4>${t.name}</h4><p>${t.desc}</p>${t.url ? `<a class="open" href="${t.url}">OPEN TOOL →</a>` : ''}</div>
      <div class="spec">FOR <b>${t.platform}</b><br>TYPE <b>${t.type}</b><br>STATUS <b>${t.status}</b></div>`;
  }
  show(0);

  const track = svg.querySelector('path[stroke-width="14"]'), train = svg.querySelector('.train'), L = track.getTotalLength();
  (function run(now) {
    const p = track.getPointAtLength(((now / LOOP_MS) % 1) * L);
    train.setAttribute('cx', p.x); train.setAttribute('cy', p.y);
    requestAnimationFrame(run);
  })(0);
}
