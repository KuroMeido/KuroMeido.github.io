// Generative zoning map: BSP-split city blocks, parcels coloured by zone, traffic, and numbered callouts for recent posts.
import { pad2 } from './lib/theme.js';

const SEED = 7;
const CALLOUTS = 6;

export function initCityMap({ canvas, pane, tip, legend, readout, zones, posts, theme, onCalloutClick }) {
  const ctx = canvas.getContext('2d');
  const C = theme.map;
  const zoneOff = {};
  let W, H, parcels = [], roads = [], cars = [], callouts = [];
  let t0 = performance.now(), hover = null, hoverC = null;
  const mouse = { x: -1, y: -1 };

  let seed = SEED;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function build() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = pane.clientWidth; H = pane.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed = SEED; parcels = []; roads = []; cars = [];
    const cx = W * .55, cy = H * .5;

    const mk = (x, y, w, h, z, d) => ({
      x, y, w, h, z,
      id: 'P-' + String(parcels.length + 101).padStart(4, '0'),
      far: (z === 'urban' ? 0.1 : 1 + (.5 - d) * 8 + rnd() * 2).toFixed(1),
      born: d * 2600 + rnd() * 500,
    });

    function blockToParcels(x, y, w, h) {
      const pad = 4; x += pad; y += pad; w -= pad * 2; h -= pad * 2;
      if (w < 10 || h < 10) return;
      const d = Math.hypot(x + w / 2 - cx, y + h / 2 - cy) / Math.hypot(W, H), r = rnd();
      // denser, more "commercial" zones towards the centre
      const z = r < .14 ? 'urban' : d < .18 ? (r < .6 ? 'code' : 'bim') : d < .32 ? (r < .45 ? 'bim' : r < .75 ? 'arch' : 'code') : (r < .8 ? 'arch' : 'misc');
      if (z === 'urban' && w * h > 3000) { parcels.push(mk(x, y, w, h, z, d)); return; }
      const cols = Math.max(1, Math.round(w / (40 + rnd() * 30))), rows = Math.max(1, Math.round(h / (40 + rnd() * 30)));
      const pw = w / cols, ph = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (i > 0 && j > 0 && i < cols - 1 && j < rows - 1 && rnd() < .6) continue; // courtyard
        const mixed = rnd() < .15 ? ['code', 'bim', 'arch', 'misc'][Math.floor(rnd() * 4)] : z;
        parcels.push(mk(x + i * pw + 1.5, y + j * ph + 1.5, pw - 3, ph - 3, mixed, d));
      }
    }

    (function split(x, y, w, h, depth) {
      if (depth > 5 || (w < 154 && h < 154) || (depth > 2 && rnd() < .12)) { blockToParcels(x, y, w, h); return; }
      const vert = w > h ? rnd() < .8 : rnd() < .2;
      const rw = depth < 2 ? 14 : depth < 3 ? 9 : 6;
      if (vert) {
        const s = x + w * (.35 + rnd() * .3);
        roads.push({ x1: s, y1: y, x2: s, y2: y + h, w: rw });
        split(x, y, s - x - rw / 2, h, depth + 1); split(s + rw / 2, y, x + w - s - rw / 2, h, depth + 1);
      } else {
        const s = y + h * (.35 + rnd() * .3);
        roads.push({ x1: x, y1: s, x2: x + w, y2: s, w: rw });
        split(x, y, w, s - y - rw / 2, depth + 1); split(x, s + rw / 2, w, y + h - s - rw / 2, depth + 1);
      }
    })(-20, -20, W + 40, H + 40, 0);

    for (let i = 0; i < 60; i++) {
      const r = roads[Math.floor(rnd() * Math.min(roads.length, 24))];
      cars.push({ r, t: rnd(), v: (.0006 + rnd() * .0012) * (rnd() < .5 ? 1 : -1), c: rnd() < .2 ? theme.accent : C.car });
    }

    // one callout per recent post, pinned to the nearest parcel of the same zone
    callouts = [];
    const n = Math.min(CALLOUTS, posts.length);
    for (let i = 0; i < n; i++) {
      const P = posts[i], tx = W * (n > 1 ? .1 + i * (.8 / (n - 1)) : .5), ty = H * (.42 + (i % 3) * .14);
      let best = null, bd = 1e9;
      for (const p of parcels) {
        if (p.w < 14 || p.h < 14) continue;
        const px = p.x + p.w / 2, py = p.y + p.h / 2, d = Math.hypot(px - tx, py - ty) + (p.z === P.zone ? 0 : 120);
        if (d < bd && py > 110 && py < H - 60) { bd = d; best = p; }
      }
      if (!best) continue;
      let lbl = P.title.split(':')[0].toUpperCase();
      if (lbl.length > 24) lbl = lbl.slice(0, 23) + '…';
      callouts.push({ n: pad2(i + 1), x: best.x + best.w / 2, y: best.y + best.h / 2, ly: 52 + (i % 2) * 24, lbl, post: P });
    }
  }

  function hatch(x, y, w, h, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = -h; k < w; k += 6) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); }
    ctx.stroke(); ctx.restore();
  }

  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function drawCallouts(T) {
    if (T < 2400) return;
    const k = Math.min(1, (T - 2400) / 500);
    ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textBaseline = 'middle';
    for (const c of callouts) {
      const col = zones[c.post.zone].color, on = c === hoverC;
      ctx.globalAlpha = k;
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(c.x, c.y - 12); ctx.lineTo(c.x, c.ly); ctx.lineTo(c.x + 8, c.ly); ctx.stroke(); ctx.setLineDash([]);
      const tw = ctx.measureText(c.lbl).width + 12, lx = Math.min(c.x + 8, W - tw - 8);
      ctx.fillStyle = on ? theme.ink : theme.chip; ctx.fillRect(lx, c.ly - 9, tw, 18);
      ctx.strokeStyle = theme.ink; ctx.strokeRect(lx + .5, c.ly - 8.5, tw - 1, 17);
      ctx.fillStyle = on ? theme.chip : theme.ink; ctx.fillText(c.lbl, lx + 6, c.ly + .5);
      const r = (on ? 14 : 11) * k;
      ctx.fillStyle = theme.chip; ctx.beginPath(); ctx.arc(c.x, c.y, r + 3, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = theme.ink; ctx.beginPath(); ctx.arc(c.x, c.y, r + 3, 0, 7); ctx.stroke();
      ctx.fillStyle = c.post.zone === 'arch' ? theme.chip : '#fff';
      ctx.textAlign = 'center'; ctx.fillText(c.n, c.x, c.y + .5); ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    const T = now - t0;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    for (const r of roads) {
      ctx.strokeStyle = C.road; ctx.lineWidth = r.w; line(r.x1, r.y1, r.x2, r.y2);
      if (r.w >= 6) { ctx.strokeStyle = C.lane; ctx.lineWidth = 1; ctx.setLineDash([6, 6]); line(r.x1, r.y1, r.x2, r.y2); ctx.setLineDash([]); }
    }

    for (const p of parcels) {
      const k = Math.max(0, Math.min(1, (T - p.born) / 500));
      if (k <= 0) continue;
      const col = zones[p.z].color, s = .6 + .4 * k;
      const w = p.w * s, h = p.h * s, x = p.x + p.w / 2 - w / 2, y = p.y + p.h / 2 - h / 2;
      ctx.globalAlpha = k * (zoneOff[p.z] ? .12 : 1);
      if (p.z === 'urban') {
        ctx.fillStyle = col + '55'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = col;
        for (let i = 0; i < w * h / 500; i++) { ctx.beginPath(); ctx.arc(x + ((i * 37) % w), y + ((i * 53) % h), 2.2, 0, 7); ctx.fill(); }
      } else if (p.z === 'bim') { ctx.fillStyle = C.block; ctx.fillRect(x, y, w, h); hatch(x, y, w, h, col); }
      else { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
      ctx.strokeStyle = p === hover ? theme.ink : C.edge; ctx.lineWidth = p === hover ? 2 : 1;
      ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
      if (p === hover) { ctx.fillStyle = '#FFFFFF22'; ctx.fillRect(x, y, w, h); }
    }
    ctx.globalAlpha = 1;

    if (T > 1500) for (const c of cars) {
      c.t = (c.t + c.v * 16 + 1) % 1;
      const r = c.r, x = r.x1 + (r.x2 - r.x1) * c.t, y = r.y1 + (r.y2 - r.y1) * c.t, o = c.v > 0 ? 2 : -2, hz = r.y1 === r.y2;
      ctx.fillStyle = c.c;
      ctx.fillRect(x - (hz ? 3 : 1.5) + (hz ? 0 : o), y - (hz ? 1.5 : 3) + (hz ? o : 0), hz ? 6 : 3, hz ? 3 : 6);
    }

    // scan line
    const sx = (T * .12) % (W + 200) - 100, gr = ctx.createLinearGradient(sx - 80, 0, sx, 0);
    gr.addColorStop(0, theme.accent + '00'); gr.addColorStop(1, theme.accent + '22');
    ctx.fillStyle = gr; ctx.fillRect(sx - 80, 0, 80, H);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 1; line(sx, 0, sx, H);

    drawCallouts(T);

    if (mouse.x >= 0) {
      ctx.strokeStyle = theme.ink + '99'; ctx.setLineDash([3, 4]);
      line(mouse.x, 0, mouse.x, H); line(0, mouse.y, W, mouse.y); ctx.setLineDash([]);
    }
    requestAnimationFrame(draw);
  }

  function showTip(html, maxW) {
    tip.innerHTML = html;
    tip.style.maxWidth = maxW ? maxW + 'px' : '';
    tip.style.left = Math.min(mouse.x + 16, W - (maxW || 180) - 10) + 'px';
    tip.style.top = Math.min(mouse.y + 16, H - 90) + 'px';
    tip.classList.add('on');
  }

  canvas.addEventListener('mousemove', (e) => {
    const b = canvas.getBoundingClientRect();
    mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top;
    hover = parcels.find((p) => mouse.x >= p.x && mouse.x <= p.x + p.w && mouse.y >= p.y && mouse.y <= p.y + p.h && !zoneOff[p.z]) || null;
    hoverC = callouts.find((c) => Math.hypot(c.x - mouse.x, c.y - mouse.y) < 16) || null;
    canvas.style.cursor = hoverC ? 'pointer' : 'crosshair';
    readout.x.textContent = (mouse.x * 1.25).toFixed(2).padStart(6, '0');
    readout.y.textContent = ((H - mouse.y) * 1.25).toFixed(2).padStart(6, '0');
    readout.layer.textContent = hover ? zones[hover.z].tag : '—';
    if (hoverC) {
      const p = hoverC.post;
      showTip(`<b>${hoverC.n} · ${zones[p.zone].tag}</b><br>${p.title}<br>${(p.category || zones[p.zone].name).toUpperCase()} · CLICK TO OPEN`, 240);
    } else if (hover) {
      const Z = zones[hover.z], area = Math.round(hover.w * hover.h * 1.56);
      showTip(`<b>${hover.id}</b><br><span class="sw" style="background:${Z.color}"></span>${Z.name}<br>AREA ${area.toLocaleString()} m²<br>FAR ${hover.far} · H ${Math.max(1, Math.round(hover.far * 3))}F`);
    } else tip.classList.remove('on');
  });
  canvas.addEventListener('mouseleave', () => { mouse.x = -1; hover = hoverC = null; tip.classList.remove('on'); });
  canvas.addEventListener('click', () => { if (hoverC) onCalloutClick(hoverC.post); });

  for (const [k, z] of Object.entries(zones)) {
    const b = document.createElement('button');
    const sw = k === 'bim' ? `repeating-linear-gradient(135deg,${z.color} 0 1px,${C.block} 1px 4px)` : z.color;
    b.innerHTML = `<i style="background:${sw}"></i>${z.tag} · ${z.name}`;
    b.onclick = () => { zoneOff[k] = !zoneOff[k]; b.classList.toggle('off', zoneOff[k]); };
    legend.appendChild(b);
  }

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); t0 = performance.now() - 2500; }, 150); });
  build();
  requestAnimationFrame(draw);
}
