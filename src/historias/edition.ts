import type { Article, Feed, Tag } from '../db/db';
import { DEFAULT_WEIGHTS, rankStories, topicsOfTheDay, type Ranked, type Topic } from './relevance';
import { splitRoutine, type RoutineGroup } from './routine';
import { groupStories } from './stories';

/**
 * La "edición" de la pantalla de leer: qué fuentes se miran, qué es noticia y qué es rutina,
 * los temas del día y las historias ordenadas.
 *
 * Las historias se arman siempre con TODAS las fuentes: si una nota de #tecnología también la
 * cuenta una fuente que no tiene esa etiqueta, la historia muestra las dos.
 */

// Qué tan parecidas tienen que ser dos notas para contar como la misma historia (0 a 1).
const THRESHOLD = 0.25;
// Horas máximas entre notas de una misma historia.
const WINDOW_HOURS = 48;
const HOUR = 3600_000;
// Si las fuentes elegidas publican menos que esto por día (como los medios de tecnología),
// la ventana se agranda: una historia puede tardar días en aparecer en varios de ellos.
const LOW_VOLUME_PER_DAY = 40;
const WIDE_WINDOW_HOURS = 96;
// Las historias que cuentan varias fuentes van primero si son de la última semana.
const SHARED_FIRST_DAYS = 7;

export type Edition = {
  feeds: Feed[];
  routine: RoutineGroup[];
  topics: Topic[];
  /** Las historias de las fuentes elegidas, en orden (las compartidas primero). */
  ranked: Ranked[];
  /** Cuántas de esas historias cuentan dos o más fuentes. */
  sharedCount: number;
  /** La historia de cada nota, para marcar en el timeline las que cuentan varias fuentes. */
  storyOf: Map<string, Ranked>;
  label: string;
};

export function isShared(story: Ranked): boolean {
  return story.feedIds.size > 1;
}

/**
 * La nota que encabeza la historia: primero las de las fuentes elegidas (si se filtró por una
 * etiqueta o una fuente), y entre ellas la que tiene foto y más texto.
 */
export function leadOf(story: Ranked, chosen?: Set<string>): Article {
  const score = (a: Article) => Number(!chosen || chosen.has(a.feedId));
  return [...story.articles].sort(
    (a, b) =>
      score(b) - score(a) ||
      Number(Boolean(b.image)) - Number(Boolean(a.image)) ||
      b.summary.length - a.summary.length,
  )[0];
}

/**
 * Elige las fuentes según el filtro ('todo', 'principales', el id de una etiqueta o el de una
 * fuente sola), agrupa con todas las fuentes y ordena. Con `onlyShared`, deja solo las historias que cuentan varias fuentes.
 */
export function buildEdition(feeds: Feed[], tags: Tag[], articles: Article[], filter: string, onlyShared = false): Edition {
  const tag = tags.find((t) => t.id === filter);
  const single = feeds.find((f) => f.id === filter);
  const chosen =
    filter === 'principales'
      ? feeds.filter((f) => f.principal)
      : tag
        ? feeds.filter((f) => f.tagIds.includes(tag.id))
        : single
          ? [single]
          : feeds;
  const ids = new Set(chosen.map((f) => f.id));

  const { news, routine } = splitRoutine(articles);
  const mine = (list: Article[]) => list.filter((a) => ids.has(a.feedId));

  const now = Date.now();
  const lowVolume = mine(articles).filter((a) => now - a.published <= 24 * HOUR).length < LOW_VOLUME_PER_DAY;
  const topics = topicsOfTheDay(mine(news), now, lowVolume ? 48 : 24);
  const { stories } = groupStories(news, {
    threshold: THRESHOLD,
    windowHours: lowVolume ? WIDE_WINDOW_HOURS : WINDOW_HOURS,
  });
  const ranked = rankStories(stories, feeds, topics, DEFAULT_WEIGHTS, now);

  const sharedFirst = (s: Ranked) => isShared(s) && now - s.newest <= SHARED_FIRST_DAYS * 24 * HOUR;
  const ordered = [...ranked.filter(sharedFirst), ...ranked.filter((s) => !sharedFirst(s))];
  const inSelection = ordered.filter((s) => s.articles.some((a) => ids.has(a.feedId)));

  const storyOf = new Map<string, Ranked>();
  for (const s of ranked) for (const a of s.articles) storyOf.set(a.id, s);

  return {
    feeds: chosen,
    routine: routine
      .map((g) => ({ ...g, articles: mine(g.articles) }))
      .filter((g) => g.articles.length > 0),
    topics,
    ranked: onlyShared ? inSelection.filter(isShared) : inSelection,
    sharedCount: inSelection.filter(isShared).length,
    storyOf,
    label: filter === 'principales' ? 'principales' : tag ? `#${tag.name}` : single ? single.title : 'todas las fuentes',
  };
}

/** Las etiquetas de una historia, como secciones del diario ("Tecnología"). */
export function sectionsFor(feeds: Feed[], tags: Tag[]): (story: Ranked) => string[] {
  const names = new Map(tags.map((t) => [t.id, t.name]));
  const byFeed = new Map(feeds.map((f) => [f.id, f.tagIds]));
  return (story) => {
    const out = new Set<string>();
    for (const id of story.feedIds) for (const t of byFeed.get(id) ?? []) if (names.has(t)) out.add(names.get(t)!);
    return [...out].map((n) => n.charAt(0).toUpperCase() + n.slice(1));
  };
}
