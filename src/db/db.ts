import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ParsedItem } from '../feeds/parse';

/** Cada feed, etiqueta y artículo tiene su UUID desde el día 1, pensando en la sincronización. */
export type Feed = {
  id: string;
  url: string;
  title: string;
  siteUrl: string;
  /** Principal o secundaria: cuánto te importa la fuente. */
  principal: boolean;
  /** Las etiquetas van en la fuente; sus artículos las heredan. */
  tagIds: string[];
  addedAt: number;
  lastFetchedAt: number;
  lastError?: string;
};

export type Tag = {
  id: string;
  name: string;
  createdAt: number;
};

export type Article = {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  link: string;
  summary: string;
  /** HTML que trae el propio feed (sin limpiar: se limpia al mostrarlo). */
  content?: string;
  /** HTML de la nota traída del sitio, guardado para leerla sin conexión. */
  fullContent?: string;
  fullContentVersion?: number;
  image?: string;
  published: number;
  fetchedAt: number;
};

interface ChipRssDB extends DBSchema {
  feeds: { key: string; value: Feed; indexes: { byUrl: string } };
  tags: { key: string; value: Tag; indexes: { byName: string } };
  articles: {
    key: string;
    value: Article;
    indexes: { byFeed: string; byFeedGuid: [string, string]; byPublished: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ChipRssDB>> | undefined;

function db(): Promise<IDBPDatabase<ChipRssDB>> {
  dbPromise ??= openDB<ChipRssDB>('chip-rss', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const feeds = database.createObjectStore('feeds', { keyPath: 'id' });
        feeds.createIndex('byUrl', 'url', { unique: true });
        const articles = database.createObjectStore('articles', { keyPath: 'id' });
        articles.createIndex('byFeed', 'feedId');
        articles.createIndex('byFeedGuid', ['feedId', 'guid'], { unique: true });
        articles.createIndex('byPublished', 'published');
      }
      if (oldVersion < 2) {
        const tags = database.createObjectStore('tags', { keyPath: 'id' });
        tags.createIndex('byName', 'name', { unique: true });
      }
    },
  });
  return dbPromise;
}

// --- Fuentes ---

export async function listFeeds(): Promise<Feed[]> {
  const feeds = await (await db()).getAll('feeds');
  return feeds.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export async function getFeed(id: string): Promise<Feed | undefined> {
  return (await db()).get('feeds', id);
}

export async function findFeedByUrl(url: string): Promise<Feed | undefined> {
  return (await db()).getFromIndex('feeds', 'byUrl', url);
}

export async function saveFeed(feed: Feed): Promise<void> {
  await (await db()).put('feeds', feed);
}

/** Quita el feed y todos sus artículos. */
export async function removeFeed(id: string): Promise<void> {
  const tx = (await db()).transaction(['feeds', 'articles'], 'readwrite');
  await tx.objectStore('feeds').delete(id);
  let cursor = await tx.objectStore('articles').index('byFeed').openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Etiquetas ---

export class TagError extends Error {}

/** "#Medios LatAm" → "medios-latam". Se permiten tildes. */
export function normalizeTagName(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export async function listTags(): Promise<Tag[]> {
  const tags = await (await db()).getAll('tags');
  return tags.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function createTag(raw: string): Promise<Tag> {
  const name = normalizeTagName(raw);
  if (!name) throw new TagError('escribí un nombre primero');
  const database = await db();
  if (await database.getFromIndex('tags', 'byName', name)) throw new TagError(`#${name} ya existe`);
  const tag: Tag = { id: crypto.randomUUID(), name, createdAt: Date.now() };
  await database.add('tags', tag);
  return tag;
}

export async function renameTag(id: string, raw: string): Promise<void> {
  const name = normalizeTagName(raw);
  if (!name) throw new TagError('escribí un nombre primero');
  const database = await db();
  const other = await database.getFromIndex('tags', 'byName', name);
  if (other && other.id !== id) throw new TagError(`#${name} ya existe`);
  const tag = await database.get('tags', id);
  if (tag) await database.put('tags', { ...tag, name });
}

/** Borra la etiqueta y se la saca a las fuentes. Las fuentes no se borran. */
export async function deleteTag(id: string): Promise<void> {
  const tx = (await db()).transaction(['tags', 'feeds'], 'readwrite');
  await tx.objectStore('tags').delete(id);
  let cursor = await tx.objectStore('feeds').openCursor();
  while (cursor) {
    if (cursor.value.tagIds.includes(id)) {
      await cursor.update({ ...cursor.value, tagIds: cursor.value.tagIds.filter((t) => t !== id) });
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Artículos ---

/** Guarda los artículos nuevos de un feed (los que ya estaban se saltean). Devuelve cuántos sumó. */
export async function addArticles(feedId: string, items: ParsedItem[], now: number): Promise<number> {
  const tx = (await db()).transaction('articles', 'readwrite');
  const byGuid = tx.store.index('byFeedGuid');
  const seen = new Set<string>();
  let added = 0;
  for (const item of items) {
    if (!item.guid || seen.has(item.guid)) continue;
    seen.add(item.guid);
    if (await byGuid.getKey([feedId, item.guid])) continue;
    await tx.store.add({
      id: crypto.randomUUID(),
      feedId,
      ...item,
      published: item.published || now,
      fetchedAt: now,
    });
    added++;
  }
  await tx.done;
  return added;
}

export async function getArticle(id: string): Promise<Article | undefined> {
  return (await db()).get('articles', id);
}

export async function saveArticle(article: Article): Promise<void> {
  await (await db()).put('articles', article);
}

/** Los artículos más nuevos primero. Si se pasan fuentes, solo los de esas fuentes. */
export async function listArticles(feedIds?: Set<string>, limit = 200): Promise<Article[]> {
  const out: Article[] = [];
  let cursor = await (await db()).transaction('articles').store.index('byPublished').openCursor(null, 'prev');
  while (cursor && out.length < limit) {
    if (!feedIds || feedIds.has(cursor.value.feedId)) out.push(cursor.value);
    cursor = await cursor.continue();
  }
  return out;
}
