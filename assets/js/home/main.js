// Entry point: wires data to each section.
import { ZONES, POSTS, TOOLS, RESOURCES } from './data.js';
import { readTheme, resolveZones, pad2 } from './lib/theme.js';
import { initCityMap } from './city-map.js';
import { initBlog } from './blog.js';
import { initMetro } from './metro.js';
import { initResources } from './resources.js';
import { initBoard } from './board.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const theme = readTheme();
const zones = resolveZones(ZONES, theme);

initCityMap({
  canvas: $('#city'), pane: $('#mapPane'), tip: $('#tip'), legend: $('#legend'),
  readout: { x: $('#cx'), y: $('#cy'), layer: $('#cl') },
  zones, posts: POSTS, theme,
  onCalloutClick: (post) => { if (post.url) location.href = post.url; else $('#blog').scrollIntoView({ behavior: 'smooth' }); },
});

initBlog({ grid: $('#parcels'), chips: $$('.chip'), search: $('#q'), posts: POSTS, zones, theme });
initMetro({ svg: $('#metro'), card: $('#toolCard'), count: $('#stationCount'), tools: TOOLS, zones, theme });
initResources({ tbody: $('#sched'), summary: $('#schedCount'), items: RESOURCES });

initBoard({
  canvas: $('#pcb'), theme,
  // components in reading order; the layer tags (no ref) are connector blocks the bundles pass through
  parts: [
    ['#mapPane', 'U1', 'CPU · ZONING MAP'],
    ['#blog .folio span:last-child'],
    ['#parcels', 'J1', 'DIMM · ARTICLES'],
    ['#tools .folio span:last-child'],
    ['#tools .transit', 'J2', 'PCIe · TOOLS'],
    ['#resources .folio span:last-child'],
    ['#resources .schedule', 'U3', 'NVMe · RESOURCES'],
    ['footer .tblock', 'J9', 'PWR · TITLE BLOCK'],
  ].map(([sel, ref, name]) => ({ el: $(sel), ref, name })).filter((p) => p.el),
  keepClear: $$('.cover-title, .cover-text, .cover-meta, .aside-in, .folio span:not(:last-child), .foot-note'),
});

// counters on the cover
function countUp(el, n) {
  let v = 0;
  const id = setInterval(() => { el.textContent = pad2(++v); if (v >= n) clearInterval(id); }, 40);
}
countUp($('#n1'), POSTS.length);
countUp($('#n2'), TOOLS.length);
countUp($('#n3'), RESOURCES.length);

$('#today').textContent = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

// reveal on scroll
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
$$('.rv').forEach((el) => io.observe(el));
