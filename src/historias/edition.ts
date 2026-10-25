import type { Article, Feed, Tag } from '../db/db';
import { DEFAULT_WEIGHTS, rankStories, topicsOfTheDay, type Ranked, type Topic } from './relevance';
import { splitRoutine, type RoutineGroup } from './routine';
import { groupStories } from './stories';

/**
 * La "edición" de la pantalla de leer: qué fuentes se miran, qué es noticia y qué es rutina,
 * los temas del día y las historias ordenadas por relevancia.
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

export type Edition = {
  feeds: Feed[];
  news: Article[];
  routine: RoutineGroup[];
  topics: Topic[];
  ranked: Ranked[];
  label: string;
};

/** Elige las fuentes según el filtro ('todo', 'principales' o el id de una etiqueta), agrupa y ordena. */
export function buildEdition(feeds: Feed[], tags: Tag[], articles: Article[], filter: string): Edition {
  const tag = tags.find((t) => t.id === filter);
  const chosen =
    filter === 'principales' ? feeds.filter((f) => f.principal) : tag ? feeds.filter((f) => f.tagIds.includes(tag.id)) : feeds;
  const ids = new Set(chosen.map((f) => f.id));
  const mine = articles.filter((a) => ids.has(a.feedId));
  const { news, routine } = splitRoutine(mine);

  const now = Date.now();
  const lowVolume = mine.filter((a) => now - a.published <= 24 * HOUR).length < LOW_VOLUME_PER_DAY;
  const topics = topicsOfTheDay(news, now, lowVolume ? 48 : 24);
  const { stories } = groupStories(news, {
    threshold: THRESHOLD,
    windowHours: lowVolume ? WIDE_WINDOW_HOURS : WINDOW_HOURS,
  });
  return {
    feeds: chosen,
    news,
    routine,
    topics,
    ranked: rankStories(stories, feeds, topics, DEFAULT_WEIGHTS, now),
    label: filter === 'principales' ? 'principales' : tag ? `#${tag.name}` : 'todas las fuentes',
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
