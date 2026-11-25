// Library rendered as a Revit-style schedule table.
import { pad3 } from './lib/theme.js';

export function initResources({ tbody, summary, items }) {
  tbody.innerHTML = items.map((r, i) => `
    <tr>
      <td class="mono">R-${pad3(i + 1)}</td>
      <td class="mono">${r.type}</td>
      <td><b>${r.title}</b></td>
      <td class="hide-sm muted">${r.desc}</td>
      <td class="mono">${r.file ? `<a class="dl" href="${r.file}" target="_blank" rel="noopener">OPEN ↗</a>` : '—'}</td>
    </tr>`).join('');
  summary.textContent = `${items.length} ITEMS · READ ALL OF THEM: NOT YET`;
}
