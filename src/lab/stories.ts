import type { Article } from '../db/db';
import { buildCorpus, cosine, type Corpus } from './text';

/** Una historia: la misma noticia contada por una o varias fuentes. */
export type Story = {
  key: string;
  articles: Article[];
  feedIds: Set<string>;
  /** Las palabras que más pesan en la historia, para mostrar de qué trata. */
  terms: string[];
  stems: string[];
  newest: number;
};

export type GroupOptions = {
  /** Qué tan parecidas tienen que ser dos notas para ir juntas (0 a 1). */
  threshold: number;
  /** Solo se juntan notas publicadas con menos de estas horas de diferencia. */
  windowHours: number;
};

const MAX_STORY = 12;
// Una historia es la misma noticia en varios medios, no diez notas de un mismo medio.
const MAX_PER_FEED = 3;

/**
 * Agrupa por parecido de palabras. Solo une notas de fuentes distintas y, para no armar
 * cadenas (A se parece a B, B a C, pero A no tiene nada que ver con C), antes de juntar dos
 * grupos pide que se parezcan en promedio, no solo por un par de notas.
 */
export function groupStories(articles: Article[], opts: GroupOptions): { stories: Story[]; corpus: Corpus } {
  const corpus = buildCorpus(articles);
  const n = articles.length;
  const windowMs = opts.windowHours * 3600_000;

  const simCache = new Map<number, number>();
  const sim = (i: number, j: number) => {
    const k = i < j ? i * n + j : j * n + i;
    let s = simCache.get(k);
    if (s === undefined) {
      s = cosine(corpus.vectors.get(articles[i].id)!, corpus.vectors.get(articles[j].id)!);
      simCache.set(k, s);
    }
    return s;
  };

  const edges: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (articles[i].feedId === articles[j].feedId) continue;
      if (Math.abs(articles[i].published - articles[j].published) > windowMs) continue;
      const s = sim(i, j);
      if (s >= opts.threshold) edges.push([i, j, s]);
    }
  }
  edges.sort((a, b) => b[2] - a[2]);

  const group = articles.map((_, i) => [i]);
  const owner = articles.map((_, i) => i);
  for (const [i, j] of edges) {
    const a = owner[i];
    const b = owner[j];
    if (a === b) continue;
    const ga = group[a];
    const gb = group[b];
    if (ga.length + gb.length > MAX_STORY) continue;
    const perFeed = new Map<string, number>();
    for (const x of [...ga, ...gb]) perFeed.set(articles[x].feedId, (perFeed.get(articles[x].feedId) ?? 0) + 1);
    if ([...perFeed.values()].some((c) => c > MAX_PER_FEED)) continue;
    let total = 0;
    for (const x of ga) for (const y of gb) total += sim(x, y);
    if (total / (ga.length * gb.length) < opts.threshold * 0.6) continue;
    for (const y of gb) {
      ga.push(y);
      owner[y] = a;
    }
    group[b] = [];
  }

  const stories: Story[] = [];
  for (const members of group) {
    if (members.length === 0) continue;
    const list = members.map((i) => articles[i]).sort((a, b) => b.published - a.published);
    const weight = new Map<string, number>();
    for (const a of list) {
      for (const [term, w] of corpus.vectors.get(a.id)!) weight.set(term, (weight.get(term) ?? 0) + w);
    }
    const stems = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
    stories.push({
      key: list[list.length - 1].id,
      articles: list,
      feedIds: new Set(list.map((a) => a.feedId)),
      stems,
      terms: stems.map((s) => corpus.forms.get(s) ?? s),
      newest: list[0].published,
    });
  }
  return { stories, corpus };
}
