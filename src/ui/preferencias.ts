/**
 * Preferencias que se recuerdan en este navegador (no son datos: si se pierden, la app
 * vuelve a la opción de siempre). Van también en el archivo de exportar.
 */

/** Cómo se muestra "leer": la lista de siempre o las historias como diario, revista o teletipo. */
export type Format = 'timeline' | 'diario' | 'revista' | 'teletipo';

export const FORMATS: { id: Format; label: string }[] = [
  { id: 'timeline', label: 'timeline' },
  { id: 'diario', label: 'diario' },
  { id: 'revista', label: 'revista' },
  { id: 'teletipo', label: 'teletipo' },
];

const FORMAT_KEY = 'chip-rss:leer-formato';

export function isFormat(value: unknown): value is Format {
  return FORMATS.some((f) => f.id === value);
}

export function loadFormat(): Format {
  try {
    const saved = localStorage.getItem(FORMAT_KEY);
    if (saved === 'tapa') return 'diario'; // nombre viejo del diario
    return isFormat(saved) ? saved : 'timeline';
  } catch {
    return 'timeline';
  }
}

export function saveFormat(format: Format): void {
  try {
    localStorage.setItem(FORMAT_KEY, format);
  } catch {
    // sin almacenamiento: vale hasta cerrar la pestaña
  }
}
