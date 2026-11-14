import type { Article } from '../db/db';
import { textLength } from './sanitize';

// Si el feed trae menos texto que esto, es un resumen: la nota completa está en el sitio.
const ENOUGH_TEXT = 600;

export type FeedContent = { html: string; complete: boolean };

/**
 * La nota tal como la trae el RSS. Nunca vamos a buscarla al sitio: mostramos solo lo que
 * el medio decidió compartir en su feed, y para el resto invitamos a leerla en el sitio original.
 */
export function feedContent(article: Article): FeedContent | null {
  if (!article.content) return null;
  return { html: article.content, complete: textLength(article.content) >= ENOUGH_TEXT };
}

/** ¿El RSS trae la nota entera? Sirve también para las notas guardadas en el archivo. */
export function isComplete(html: string | undefined): boolean {
  return Boolean(html) && textLength(html!) >= ENOUGH_TEXT;
}
