// Polyline helpers shared by the canvas layers.

/** Points + cumulative length, so a distance along the line can be looked up. */
export function measure(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum.at(-1) };
}

/** Parallel offset with mitred joints: lanes keep spacing `o` through every bend. */
export function offset(P, o) {
  const n = [];
  for (let i = 1; i < P.length; i++) {
    const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], l = Math.hypot(dx, dy) || 1;
    n.push([-dy / l, dx / l]);
  }
  const out = [[P[0][0] + n[0][0] * o, P[0][1] + n[0][1] * o]];
  for (let j = 1; j < P.length - 1; j++) {
    const a = n[j - 1], b = n[j], k = o / (1 + a[0] * b[0] + a[1] * b[1]);
    out.push([P[j][0] + (a[0] + b[0]) * k, P[j][1] + (a[1] + b[1]) * k]);
  }
  const z = n.at(-1);
  out.push([P.at(-1)[0] + z[0] * o, P.at(-1)[1] + z[1] * o]);
  return out;
}

/** Stroke a plain point list. */
export function strokePoints(ctx, P) {
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (const p of P) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
}

/** Add the stretch of a measured line between distances a..b to the current path. */
export function subPath(ctx, t, a, b) {
  const P = t.pts, C = t.cum;
  let started = false;
  for (let i = 1; i < P.length; i++) {
    if (C[i] < a) continue;
    if (C[i - 1] > b) break;
    const L = C[i] - C[i - 1] || 1, f0 = Math.max(0, (a - C[i - 1]) / L), f1 = Math.min(1, (b - C[i - 1]) / L);
    const x0 = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f0, y0 = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f0;
    const x1 = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f1, y1 = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f1;
    if (!started) { ctx.moveTo(x0, y0); started = true; }
    ctx.lineTo(x1, y1);
  }
}
