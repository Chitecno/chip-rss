/**
 * Íconos en pixel art, dibujados con cuadraditos sobre una grilla de 12 × 12.
 * Toman el color del texto que los rodea, así funcionan en cualquier tema.
 * (El sistema de diseño de Chip Tecno no usa emoji: el guiño es ASCII o pixel.)
 */

type Pixels = string[];

// El disquete: la esquina cortada arriba a la derecha, la ventanita metálica y la etiqueta.
const DISQUETE: Pixels = [
  '##########..',
  '#.#######.#.',
  '#.#####.#.##',
  '#.#####.#..#',
  '#.#######..#',
  '#..........#',
  '#.########.#',
  '#.#......#.#',
  '#.#......#.#',
  '#.#......#.#',
  '#.########.#',
  '############',
];

// Compartir: una flecha que sale hacia arriba de una bandeja.
const COMPARTIR: Pixels = [
  '.....##.....',
  '....####....',
  '...######...',
  '..##.##.##..',
  '.....##.....',
  '.....##.....',
  '.....##.....',
  '##...##...##',
  '##........##',
  '##........##',
  '############',
  '############',
];

function svg(pixels: Pixels): string {
  const rects = pixels
    .flatMap((row, y) => [...row.slice(0, 12)].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')))
    .join('');
  return `<svg class="icono" viewBox="0 0 12 12" width="12" height="12" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

// Son decorativos: el botón que los lleva ya dice qué hace.
export const ICONO_GUARDAR = svg(DISQUETE);
export const ICONO_COMPARTIR = svg(COMPARTIR);
