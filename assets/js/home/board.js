// Mainboard layer: each section is a component; gold trace bundles route between them
// (down → 45° → across → 45° → down) with glowing light packets as traffic.
import { measure, offset, strokePoints, subPath } from './lib/polyline.js';

const LANES = 8;       // traces per bundle
const SPACING = 6;     // px between traces
const TRACE_W = 2;
const INSET = 28;      // bundle distance from a component's right edge

export function initBoard({ canvas, parts, keepClear, theme }) {
  const g = canvas.getContext('2d');
  const P = theme.pcb;
  let VW, VH, dpr;

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    VW = innerWidth; VH = innerHeight;
    canvas.width = VW * dpr; canvas.height = VH * dpr;
  }

  function route(A, B) {
    const span = (LANES - 1) * SPACING;
    const xa = A.right - INSET - span / 2, xb = B.right - INSET - span / 2;
    const gap = B.top - A.bottom, ym = A.bottom + gap * .42, D = xb - xa, sg = Math.sign(D) || 1;
    const h = Math.min(46, Math.abs(D) / 2, gap * .38); // 45° legs must fit inside the gap
    const straight = Math.abs(D) < 1;
    const centre = straight
      ? [[xa, A.bottom], [xa, ym], [xb, B.top]]
      : [[xa, A.bottom], [xa, ym - h], [xa + sg * h, ym], [xb - sg * h, ym], [xb, ym + h], [xb, B.top]];
    const lanes = Array.from({ length: LANES }, (_, i) => measure(offset(centre, (i - (LANES - 1) / 2) * SPACING * sg)));

    // a few short branches peel off the outer traces of the horizontal run and end in vias
    const branches = [];
    if (!straight && gap > 140) {
      const a = lanes[0].pts, b = lanes[LANES - 1].pts;
      const top = a[2][1] < b[2][1] ? a : b, bot = top === a ? b : a;
      const at = (L, f) => [L[2][0] + (L[3][0] - L[2][0]) * f, L[2][1]];
      const add = (p, dx, dy, leg) => { const q = [p[0] + dx * 16, p[1] + dy * 16]; branches.push([p, q, [q[0], q[1] + leg]]); };
      add(at(top, .3), sg, -1, -14); add(at(top, .62), -sg, -1, -10);
      add(at(bot, .45), sg, 1, 14); add(at(bot, .8), -sg, 1, 10);
    }
    return { lanes, branches };
  }

  function via(x, y) {
    g.fillStyle = theme.paper; g.strokeStyle = P.gold; g.lineWidth = 2.2;
    g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.stroke();
  }

  function drawBundle(k, A, B, now) {
    const { lanes, branches } = route(A, B);
    g.lineCap = 'butt';
    // dark edge under a lighter core reads as a raised copper trace
    for (const [col, w] of [[P.goldDark, TRACE_W + 1.2], [P.gold, TRACE_W]]) {
      g.strokeStyle = col; g.lineWidth = w;
      for (const t of lanes) strokePoints(g, t.pts);
      for (const b of branches) strokePoints(g, b);
    }
    for (const b of branches) via(...b.at(-1));
    g.fillStyle = P.gold;
    for (const t of lanes) { const a = t.pts[0], b = t.pts.at(-1); g.fillRect(a[0] - 2.5, a[1], 5, 5); g.fillRect(b[0] - 2.5, b[1] - 5, 5, 5); }

    // traffic: odd traces run down, even run up, each at its own pace
    g.lineCap = 'round'; g.shadowColor = P.glow;
    lanes.forEach((t, i) => {
      const dir = i % 2 ? 1 : -1, speed = .05 + ((i * 7) % 4) * .012, count = Math.max(2, Math.round(t.len / 170)), step = t.len / count;
      for (let j = 0; j < count; j++) {
        let s = (now * speed + j * step + i * 53 + k * 131) % t.len;
        if (dir < 0) s = t.len - s;
        const a = dir > 0 ? s - 22 : s, b = dir > 0 ? s : s + 22;
        g.shadowBlur = 12; g.strokeStyle = P.glow + '8C'; g.lineWidth = 5; g.beginPath(); subPath(g, t, a, b); g.stroke();
        g.shadowBlur = 0; g.strokeStyle = P.glowCore; g.lineWidth = 1.6; g.beginPath(); subPath(g, t, a + (dir > 0 ? 10 : 0), b - (dir > 0 ? 0 : 10)); g.stroke();
      }
    });
    g.shadowBlur = 0;
  }

  function frame(now) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, VW, VH);
    const R = parts.map((p) => p.el.getBoundingClientRect());

    // clip text blocks out so traces never run under copy
    g.save(); g.beginPath(); g.rect(0, 0, VW, VH);
    for (const el of keepClear) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > VH || !r.width) continue;
      g.rect(r.right + 12, r.top - 12, -(r.width + 24), r.height + 24);
    }
    g.clip('evenodd');
    g.lineJoin = 'miter'; g.miterLimit = 6;
    for (let k = 0; k < R.length - 1; k++) {
      const A = R[k], B = R[k + 1];
      if (B.top < -200 || A.bottom > VH + 200) continue;
      drawBundle(k, A, B, now);
    }
    g.restore();

    // silkscreen designators above each component
    g.font = '600 10px JetBrains Mono, monospace'; g.textBaseline = 'bottom'; g.textAlign = 'right';
    parts.forEach((p, k) => {
      const r = R[k];
      if (!p.ref || r.bottom < 0 || r.top > VH) return;
      const x = r.right - INSET - (LANES - 1) * SPACING - 12, y = r.top - 6, name = ' ' + p.name;
      g.fillStyle = theme.ink; g.fillText(p.ref, x - g.measureText(name).width, y);
      g.fillStyle = P.goldText; g.fillText(name, x, y);
    });
    g.textAlign = 'left';
    requestAnimationFrame(frame);
  }

  addEventListener('resize', size);
  size();
  requestAnimationFrame(frame);
}
