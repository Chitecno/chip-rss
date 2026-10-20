import { addArticles, findFeedByUrl, listFeeds, saveFeed, type Feed } from '../db/db';
import { discoverFeed } from './discover';
import { parseFeed } from './parse';
import { FetchError, fetchText } from './proxy';

export type AddResult = { feed: Feed; added: number; existed: boolean };

export async function addFeedFromInput(raw: string, onStep?: (msg: string) => void): Promise<AddResult> {
  const found = await discoverFeed(raw, onStep);
  const existing = await findFeedByUrl(found.feedUrl);
  if (existing) return { feed: existing, added: 0, existed: true };

  const now = Date.now();
  const feed: Feed = {
    id: crypto.randomUUID(),
    url: found.feedUrl,
    title: found.feed.title,
    siteUrl: found.feed.siteUrl,
    // Entran como secundarias: lo principal se elige a propósito.
    principal: false,
    tagIds: [],
    addedAt: now,
    lastFetchedAt: now,
  };
  await saveFeed(feed);
  const added = await addArticles(feed.id, found.feed.items, now);
  return { feed, added, existed: false };
}

// Algunos sitios (YouTube, sobre todo) fallan de vez en cuando sin motivo: probamos una vez más.
async function fetchWithRetry(url: string) {
  try {
    return await fetchText(url);
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    return fetchText(url);
  }
}

/** Vuelve a leer un feed y guarda lo nuevo. Si falla, lo anota en el feed y sigue. */
export async function refreshFeed(feed: Feed): Promise<number> {
  const now = Date.now();
  try {
    const res = await fetchWithRetry(feed.url);
    const parsed = parseFeed(res.text, res.finalUrl);
    if (!parsed) throw new FetchError('el feed dejó de ser un feed');
    const added = await addArticles(feed.id, parsed.items, now);
    await saveFeed({ ...feed, lastFetchedAt: now, lastError: undefined });
    return added;
  } catch (err) {
    await saveFeed({ ...feed, lastFetchedAt: now, lastError: err instanceof Error ? err.message : 'error' });
    return 0;
  }
}

export async function refreshAll(): Promise<number> {
  const results = await Promise.all((await listFeeds()).map(refreshFeed));
  return results.reduce((sum, n) => sum + n, 0);
}
