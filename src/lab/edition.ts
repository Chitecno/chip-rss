import type { Article, Feed, Tag } from '../db/db';
import type { LayoutName } from './layouts';
import { DEFAULT_WEIGHTS, rankStories, topicsOfTheDay, type Ranked, type Topic, type Weights } from './relevance';
import { splitRoutine, type RoutineGroup } from './routine';
import { groupStories, type GroupOptions } from './stories';

/**
 * La "edición": qué fuentes se miran, qué es noticia y qué es rutina, los temas del día
 * y las historias ordenadas. La usan la pantalla de leer y el laboratorio, con los mismos ajustes.
 */

export type Settings = GroupOptions & {
  layout: LayoutName;
  weights: Weights;
  showReasons: boolean;
  /** 'todo', 'principales' o el id de una etiqueta. */
  filter: string;
  /** Clima, dólar, horóscopo y compañía van a una caja aparte. */
  routineApart: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  layout: 'tapa',
  threshold: 0.25,
  windowHours: 48,
  weights: DEFAULT_WEIGHTS,
  showReasons: true,
  filter: 'todo',
  routineApart: true,
};

const STORAGE_KEY = 'chip-rss:lab';
const HOUR = 3600_000;
// Si las fuentes elegidas publican menos que esto por día (como los medios de tecnología),
// la ventana se agranda: una historia puede tardar días en aparecer en varios de ellos.
const LOW_VOLUME_PER_DAY = 40;
const WIDE_WINDOW_HOURS = 96;

// Los ajustes se recuerdan en este navegador. Si no se puede, se usan los de siempre.
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...saved, weights: { ...DEFAULT_WEIGHTS, ...saved.weights } };
  } catch {
    return { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_WEIGHTS } };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // sin almacenamiento: los ajustes duran hasta que cierres la pestaña
  }
}

export type Selection = {
  feeds: Feed[];
  news: Article[];
  routine: RoutineGroup[];
  topics: Topic[];
  windowHours: number;
  label: string;
};

/** Elige las fuentes según el filtro y separa noticias de rutina. */
export function selectEdition(
  feeds: Feed[],
  tags: Tag[],
  articles: Article[],
  filter: string,
  routineApart: boolean,
  windowHours: number,
): Selection {
  const tag = tags.find((t) => t.id === filter);
  const chosen =
    filter === 'principales' ? feeds.filter((f) => f.principal) : tag ? feeds.filter((f) => f.tagIds.includes(tag.id)) : feeds;
  const ids = new Set(chosen.map((f) => f.id));
  const mine = articles.filter((a) => ids.has(a.feedId));
  const { news, routine } = routineApart ? splitRoutine(mine) : { news: mine, routine: [] };

  const now = Date.now();
  const lowVolume = mine.filter((a) => now - a.published <= 24 * HOUR).length < LOW_VOLUME_PER_DAY;
  return {
    feeds: chosen,
    news,
    routine,
    topics: topicsOfTheDay(news, now, lowVolume ? 48 : 24),
    windowHours: lowVolume ? Math.max(windowHours, WIDE_WINDOW_HOURS) : windowHours,
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

/** Todo de una vez: elegir, agrupar y ordenar. */
export function buildEdition(feeds: Feed[], tags: Tag[], articles: Article[], filter: string, settings: Settings) {
  const sel = selectEdition(feeds, tags, articles, filter, settings.routineApart, settings.windowHours);
  const { stories } = groupStories(sel.news, { threshold: settings.threshold, windowHours: sel.windowHours });
  const ranked = rankStories(stories, feeds, sel.topics, settings.weights, Date.now());
  return { ...sel, stories, ranked };
}
