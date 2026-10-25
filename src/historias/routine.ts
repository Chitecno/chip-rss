import type { Article } from '../db/db';

/**
 * La rutina: notas de servicio que todos los medios publican igual todos los días.
 * No son malas, pero no son "la noticia": van aparte para no tapar la tapa.
 * Se reconocen por palabras del título; la lista está a la vista para ajustarla.
 */
export type RoutineKind = { id: string; label: string; words: string[]; pattern: RegExp };

function kind(id: string, label: string, words: string[], pattern: RegExp): RoutineKind {
  return { id, label, words, pattern };
}

export const ROUTINE: RoutineKind[] = [
  // Reglas estrictas a propósito: mejor que se escape algo de rutina a que se esconda una noticia.
  // "El clima de la Tierra entra en un terreno desconocido" es noticia; "Clima hoy en Rosario", no.
  kind(
    'clima',
    'clima',
    ['clima hoy', 'clima en…', 'pronóstico del tiempo', 'cómo estará el tiempo', 'alerta amarilla/naranja/roja'],
    /\b(clima (hoy|en|para)|pron[oó]stico (del tiempo|extendido|para)|c[oó]mo estar[aá] el (tiempo|clima)|alerta (amarilla|naranja|roja) por)\b/i,
  ),
  kind(
    'dolar',
    'dólar y mercados',
    ['dólar hoy', 'dólar blue hoy', 'cotización del dólar', 'a cuánto cotiza', 'jornada financiera', 'cierre de mercados', 'plazo fijo hoy'],
    /\b(d[oó]lar (hoy|blue hoy|oficial hoy|tarjeta hoy)|cotizaci[oó]n del (d[oó]lar|euro|real)|a cu[aá]nto (cotiza|cerr[oó])|jornada financiera|cierre de (los )?mercados|riesgo pa[ií]s hoy|plazo fijo hoy|euro hoy|bitcoin hoy)\b/i,
  ),
  kind('horoscopo', 'horóscopo', ['horóscopo', 'signo', 'tarot'], /\b(hor[oó]scopo|tarot|astrolog[ií]a)\b|\bsigno del zod/i),
  kind(
    'loteria',
    'quinielas y loterías',
    ['quiniela', 'Loto', 'Quini 6', 'Brinco', 'Telekino', 'sorteo'],
    /\b(quinielas?|loto|quini ?6|brinco|telekino|resultados? del sorteo)\b/i,
  ),
  kind(
    'deportes',
    'resultados y tablas',
    ['tabla de posiciones', 'tabla anual', 'fixture', 'minuto a minuto', 'agenda deportiva'],
    /\b(tabla de posiciones|tabla anual|as[ií] est[aá]n las posiciones|fixture|minuto a minuto|agenda deportiva)\b/i,
  ),
  kind('tv', 'agenda de TV', ['agenda de TV', 'qué ver', 'rating'], /\b(agenda de (tv|streaming)|qu[eé] ver (hoy|este)|rating)\b/i),
  kind(
    'efemerides',
    'efemérides',
    ['efemérides', 'santo del día', 'un día como hoy'],
    /\b(efem[eé]rides|santo del d[ií]a|un d[ií]a como hoy|qu[eé] se celebra hoy)\b/i,
  ),
  kind('tapas', 'tapas de diarios', ['la tapa', 'tapas de los diarios'], /\b(la tapa del|tapas de (los )?diarios)\b/i),
];

export function routineKind(article: Article): RoutineKind | undefined {
  return ROUTINE.find((k) => k.pattern.test(article.title));
}

export type RoutineGroup = { kind: RoutineKind; articles: Article[] };

/** Separa la rutina del resto. */
export function splitRoutine(articles: Article[]): { news: Article[]; routine: RoutineGroup[] } {
  const news: Article[] = [];
  const groups = new Map<string, RoutineGroup>();
  for (const a of articles) {
    const k = routineKind(a);
    if (!k) {
      news.push(a);
      continue;
    }
    const g = groups.get(k.id) ?? { kind: k, articles: [] };
    g.articles.push(a);
    groups.set(k.id, g);
  }
  const routine = ROUTINE.map((k) => groups.get(k.id)).filter((g): g is RoutineGroup => Boolean(g));
  return { news, routine };
}
