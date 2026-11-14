import { READER_NAME } from '../config';

/**
 * Preferencias que se recuerdan en este navegador (no son datos: si se pierden, la app
 * vuelve a la opción de siempre). Van también en el archivo de exportar.
 */

/** Cómo se muestra "leer": la lista de siempre, el mosaico o las historias como diario, revista o teletipo. */
export type Format = 'timeline' | 'mosaico' | 'diario' | 'revista' | 'teletipo';

export const FORMATS: { id: Format; label: string }[] = [
  { id: 'timeline', label: 'timeline' },
  { id: 'mosaico', label: 'mosaico' },
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

// --- El nombre del diario ---

const NAME_KEY = 'chip-rss:nombre';
/** Más largo no entra en el cabezal del diario. */
export const MAX_NAME = 24;

/** El nombre que la persona le puso a su diario, o Chip RSS si no le puso ninguno. */
export function loadReaderName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || READER_NAME;
  } catch {
    return READER_NAME;
  }
}

/** Vacío vuelve al nombre de siempre. */
export function saveReaderName(raw: string): void {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
  try {
    if (!name || name === READER_NAME) localStorage.removeItem(NAME_KEY);
    else localStorage.setItem(NAME_KEY, name);
  } catch {
    // sin almacenamiento: vale hasta cerrar la pestaña
  }
}

export function hasOwnName(): boolean {
  return loadReaderName() !== READER_NAME;
}
