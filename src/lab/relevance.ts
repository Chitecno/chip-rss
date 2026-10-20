import type { Article, Feed } from '../db/db';
import type { Story } from './stories';
import { tokenize } from './text';

/**
 * Relevancia explicable: cada historia dice por qué está donde está, y los pesos los
 * movés vos. Cada peso va de 0 (no cuenta) a 2 (cuenta el doble).
 */
export type Weights = {
  cobertura: number;
  recencia: number;
  principal: number;
  volumen: number;
  temas: number;
};

export const DEFAULT_WEIGHTS: Weights = { cobertura: 1, recencia: 1, principal: 1, volumen: 1, temas: 1 };

export type Topic = { stem: string; label: string; weight: number; feeds: number };

export type Ranked = Story & { score: number; reasons: string[] };

const HOUR = 3600_000;

/**
 * Temas del día: palabras de los títulos de las últimas 24 horas que aparecen en varias
 * fuentes y que antes no aparecían tanto. "Gobierno" está siempre; "Chubut" hoy es noticia.
 */
export function topicsOfTheDay(articles: Article[], now: number, hours = 24, limit = 30): Topic[] {
  const recent = articles.filter((a) => now - a.published <= hours * HOUR);
  const older = articles.filter((a) => now - a.published > hours * HOUR);

  const recentFeeds = new Map<string, Set<string>>();
  const recentCount = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const a of recent) {
    for (const t of new Set(tokenize(a.title).map((t) => t.stem))) {
      recentCount.set(t, (recentCount.get(t) ?? 0) + 1);
      const feeds = recentFeeds.get(t) ?? new Set<string>();
      feeds.add(a.feedId);
      recentFeeds.set(t, feeds);
    }
    for (const t of tokenize(a.title)) if (!labels.has(t.stem)) labels.set(t.stem, t.form);
  }

  const olderCount = new Map<string, number>();
  for (const a of older) {
    for (const t of new Set(tokenize(a.title).map((t) => t.stem))) olderCount.set(t, (olderCount.get(t) ?? 0) + 1);
  }
  const olderTotal = Math.max(1, older.length);

  const topics: Topic[] = [];
  for (const [stem, count] of recentCount) {
    if (count < 2) continue;
    const feeds = recentFeeds.get(stem)!.size;
    const baseline = (olderCount.get(stem) ?? 0) / olderTotal;
    const weight = (feeds * Math.log(1 + count)) / (1 + 20 * baseline);
    topics.push({ stem, label: labels.get(stem) ?? stem, weight, feeds });
  }
  return topics.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

function hoursAgo(ms: number): string {
  const h = Math.round(ms / HOUR);
  if (h < 1) return 'recién';
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

export function rankStories(
  stories: Story[],
  feeds: Feed[],
  topics: Topic[],
  weights: Weights,
  now: number,
): Ranked[] {
  const byId = new Map(feeds.map((f) => [f.id, f]));

  // Cuántas notas por día publica cada fuente: la que publica cien no puede tapar a la que publica cinco.
  const volume = new Map<string, number>();
  for (const s of stories) {
    for (const a of s.articles) {
      if (now - a.published <= 24 * HOUR) volume.set(a.feedId, (volume.get(a.feedId) ?? 0) + 1);
    }
  }
  const topicWeight = new Map(topics.map((t) => [t.stem, t.weight]));
  const maxTopic = Math.max(1, ...topics.map((t) => t.weight));

  return stories
    .map((story) => {
      const reasons: string[] = [];
      const coverage = story.feedIds.size;
      const c = Math.log2(1 + coverage);
      if (coverage > 1) reasons.push(`${coverage} fuentes`);

      const age = now - story.newest;
      const r = 0.5 ** (Math.max(0, age) / (12 * HOUR));
      reasons.push(hoursAgo(age));

      const isPrincipal = [...story.feedIds].some((id) => byId.get(id)?.principal);
      if (isPrincipal) reasons.push('principal');

      const avgVolume =
        [...story.feedIds].reduce((sum, id) => sum + (volume.get(id) ?? 0), 0) / Math.max(1, coverage);
      const v = 1 / Math.log2(2 + avgVolume);

      const hot = story.stems.filter((s) => topicWeight.has(s));
      const t = hot.reduce((sum, s) => sum + topicWeight.get(s)!, 0) / maxTopic;
      if (hot.length) reasons.push(`tema del día: ${hot.map((s) => story.terms[story.stems.indexOf(s)]).join(', ')}`);

      const score =
        c ** weights.cobertura *
        r ** weights.recencia *
        (1 + 0.5 * (isPrincipal ? 1 : 0) * weights.principal) *
        v ** weights.volumen *
        (1 + Math.min(1, t) * weights.temas);
      return { ...story, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
