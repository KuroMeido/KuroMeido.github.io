// Single source of colour: canvases read the same custom properties the CSS uses (main.css :root).
export function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return {
    v,
    ink: v('--ink'), ink2: v('--ink-2'), chip: v('--chip'), paper: v('--paper'), accent: v('--accent'),
    map: { bg: v('--map-bg'), road: v('--map-road'), lane: v('--map-lane'), block: v('--map-block'), edge: v('--map-edge'), car: v('--map-car') },
    pcb: { gold: v('--gold'), goldDark: v('--gold-dark'), goldText: v('--gold-text'), glow: v('--glow'), glowCore: v('--glow-core') },
  };
}

/** Attach a resolved `color` to every zone from its css variable. */
export function resolveZones(zones, theme) {
  for (const z of Object.values(zones)) z.color = theme.v(z.cssVar);
  return zones;
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const pad3 = (n) => String(n).padStart(3, '0');
