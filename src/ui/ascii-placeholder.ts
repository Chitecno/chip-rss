// Rampa del halftone ASCII del sistema de diseño: se densifica hacia los bordes y deja el centro vacío.
const RAMP = ' .:-=+*#%@';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Placeholder para artículos sin foto. La misma semilla da siempre el mismo dibujo. */
export function asciiPlaceholder(seedText: string, cols = 48, rows = 14): HTMLElement {
  let seed = hash(seedText);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const dx = Math.abs((x / (cols - 1)) * 2 - 1);
      const dy = Math.abs((y / (rows - 1)) * 2 - 1);
      const edge = Math.max(0, (Math.max(dx, dy) - 0.4) / 0.6);
      const level = Math.round(edge * (RAMP.length - 1) + (rand() - 0.5) * 2.5);
      line += RAMP[Math.min(RAMP.length - 1, Math.max(0, level))];
    }
    lines.push(line);
  }

  const pre = document.createElement('pre');
  pre.className = 'ascii-placeholder';
  pre.setAttribute('aria-hidden', 'true');
  pre.textContent = lines.join('\n');
  return pre;
}
