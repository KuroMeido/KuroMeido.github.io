// Blog "parcels": cards on a 6-column grid, zone filters and search.
import { pad2, pad3 } from './lib/theme.js';

// card size by position: one featured, two medium, then rows of three
const SIZES = ['s-xl', 's-m', 's-m'];
const sizeOf = (i) => SIZES[i] || 's-s';

const featureArt = (blue, accent) => `
  <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="${blue}" stroke-width="2">
      <rect x="30" y="110" width="70" height="150"/><rect x="115" y="50" width="70" height="210"/><rect x="200" y="140" width="70" height="120"/>
    </g>
    <g stroke="${blue}" opacity=".5">${Array.from({ length: 18 }, (_, k) => `<line x1="115" y1="${62 + k * 11}" x2="185" y2="${62 + k * 11}"/>`).join('')}</g>
    <line x1="10" y1="260" x2="290" y2="260" stroke="${accent}" stroke-width="2"/>
  </svg>`;

export function initBlog({ grid, chips, search, posts, zones, theme }) {
  const cards = posts.map((p, i) => {
    const Z = zones[p.zone], featured = i === 0;
    const a = document.createElement('a');
    a.href = p.url || '#';
    a.className = `parcel ${sizeOf(i)}${featured ? ' feature' : ''}`;
    a.style.setProperty('--c', Z.color);
    const meta = [p.category && `<span>${p.category.toUpperCase()}</span>`, p.date && `<span>DATE <b>${p.date}</b></span>`, p.read && `<span>READ <b>${p.read}'</b></span>`]
      .filter(Boolean).join('') + '<span class="go">READ →</span>';
    const inner = `
      <div class="pid">LOT ${pad3(i + 1)} · ${Z.tag}</div>
      <h3>${p.title}</h3>${p.desc ? `<p>${p.desc}</p>` : ''}
      <div class="meta">${meta}</div>`;
    const art = p.image ? `<img src="${p.image}" alt="" loading="lazy">` : featureArt(zones.bim.color, theme.accent);
    a.innerHTML = featured
      ? `<div class="ftxt">${inner}</div><div class="feature-art">${art}</div>`
      : `<div class="zone"></div>${inner}`;
    if (a.getAttribute('href') === '#') a.addEventListener('click', (e) => e.preventDefault());
    grid.appendChild(a);
    return { el: a, post: p };
  });

  let zone = 'all';
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    for (const c of cards) c.el.classList.toggle('hide', !((zone === 'all' || c.post.zone === zone) && c.post.title.toLowerCase().includes(q)));
  };

  for (const chip of chips) {
    const f = chip.dataset.f, n = f === 'all' ? posts.length : posts.filter((p) => p.zone === f).length;
    chip.querySelector('em').textContent = pad2(n);
    chip.hidden = n === 0; // only show zones that have posts
    chip.addEventListener('click', () => {
      chips.forEach((x) => x.classList.toggle('on', x === chip));
      zone = f; apply();
    });
  }
  search.addEventListener('input', apply);
}
