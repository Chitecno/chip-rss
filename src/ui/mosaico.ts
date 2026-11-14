import { el } from './dom';
import './mosaico.css';

/**
 * Mosaico, estilo Pinterest: cada tarjeta mide lo que necesita (la foto entera, sin recortar)
 * y se apilan en columnas sin dejar huecos. Las notas se reparten de izquierda a derecha,
 * así la fila de arriba sigue siendo lo más nuevo.
 */

const MIN_COLUMN = 260; // px: el ancho mínimo de una columna
const MIN_COLUMN_PHONE = 140; // en el celu, dos columnas angostas, como Pinterest
const GAP = 24; // px: el espacio entre columnas (igual que --space-3)
const GAP_PHONE = 12;

export function mosaic(cards: HTMLElement[]): HTMLElement {
  const grid = el('div', 'mosaico');
  let count = 0;

  const layout = () => {
    // Antes de estar en pantalla no tiene ancho: usamos el de la ventana y después se corrige.
    const width = grid.clientWidth || window.innerWidth;
    const phone = width < 600;
    const [min, gap] = phone ? [MIN_COLUMN_PHONE, GAP_PHONE] : [MIN_COLUMN, GAP];
    const n = Math.max(1, Math.floor((width + gap) / (min + gap)));
    if (n === count) return;
    count = n;
    const columns = Array.from({ length: n }, () => el('div', 'mosaico__col'));
    cards.forEach((card, i) => columns[i % n].append(card));
    grid.replaceChildren(...columns);
  };

  new ResizeObserver(layout).observe(grid);
  layout();
  return grid;
}
