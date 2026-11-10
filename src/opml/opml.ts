import {
  findFeedByUrl,
  getFeed,
  getSaved,
  getSectionByName,
  getTag,
  getTagByName,
  listFeeds,
  listSaved,
  listSections,
  listTags,
  normalizeTagName,
  putSaved,
  saveFeed,
  saveSection,
  saveTag,
  type Feed,
  type Saved,
  type Tag,
} from '../db/db';
import { resolveUrl } from '../feeds/parse';
import { refreshFeed } from '../feeds/refresh';
import { isFormat, loadFormat, saveFormat } from '../ui/preferencias';

/**
 * Exportar e importar las fuentes en OPML, el formato que entienden casi todos los lectores de RSS.
 *
 * Además de lo estándar (nombre, dirección del feed y del sitio, etiquetas como carpetas y como
 * "category"), guardamos lo propio de chip-rss en atributos con prefijo "chip:": los UUID, si la
 * fuente es principal, las etiquetas (también las que no se usan) y el formato de lectura.
 * Los otros lectores ignoran esos atributos; chip-rss los usa para restaurar todo como estaba.
 */

const CHIP_NS = 'https://chiptecno.ar/chip-rss';
const XMLNS = 'http://www.w3.org/2000/xmlns/';

export class OpmlError extends Error {}

function chipAttr(el: Element, name: string, value: string): void {
  el.setAttributeNS(CHIP_NS, `chip:${name}`, value);
}

function readChip(el: Element, name: string): string | null {
  return el.getAttributeNS(CHIP_NS, name) ?? el.getAttribute(`chip:${name}`);
}

function feedOutline(doc: XMLDocument, feed: Feed, tagNames: Map<string, string>): Element {
  const o = doc.createElement('outline');
  o.setAttribute('type', 'rss');
  o.setAttribute('text', feed.title);
  o.setAttribute('title', feed.title);
  o.setAttribute('xmlUrl', feed.url);
  if (feed.siteUrl) o.setAttribute('htmlUrl', feed.siteUrl);
  const names = feed.tagIds.map((id) => tagNames.get(id)).filter((n): n is string => Boolean(n));
  if (names.length) o.setAttribute('category', names.join(','));
  chipAttr(o, 'id', feed.id);
  chipAttr(o, 'principal', String(feed.principal));
  chipAttr(o, 'tagIds', feed.tagIds.join(' '));
  chipAttr(o, 'addedAt', String(feed.addedAt));
  return o;
}

/** Arma el archivo OPML con todas las fuentes y su configuración. */
export async function exportOpml(): Promise<{ text: string; feeds: number; tags: number; saved: number }> {
  const [feeds, tags, sections, saved] = await Promise.all([listFeeds(), listTags(), listSections(), listSaved()]);
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));

  const doc = document.implementation.createDocument(null, 'opml', null);
  const root = doc.documentElement;
  root.setAttribute('version', '2.0');
  root.setAttributeNS(XMLNS, 'xmlns:chip', CHIP_NS);

  const head = doc.createElement('head');
  const title = doc.createElement('title');
  title.textContent = 'chip-rss: mis fuentes';
  const created = doc.createElement('dateCreated');
  created.textContent = new Date().toUTCString();
  head.append(title, created);
  const prefs = doc.createElementNS(CHIP_NS, 'chip:preferencias');
  prefs.setAttribute('formato', loadFormat());
  head.append(prefs);
  const tagList = doc.createElementNS(CHIP_NS, 'chip:etiquetas');
  for (const t of tags) {
    const item = doc.createElementNS(CHIP_NS, 'chip:etiqueta');
    item.setAttribute('id', t.id);
    item.setAttribute('name', t.name);
    item.setAttribute('createdAt', String(t.createdAt));
    tagList.append(item);
  }
  head.append(tagList);

  // El archivo: secciones y notas guardadas, con su copia completa.
  const sectionList = doc.createElementNS(CHIP_NS, 'chip:secciones');
  for (const sec of sections) {
    const item = doc.createElementNS(CHIP_NS, 'chip:seccion');
    item.setAttribute('id', sec.id);
    item.setAttribute('name', sec.name);
    item.setAttribute('createdAt', String(sec.createdAt));
    sectionList.append(item);
  }
  head.append(sectionList);
  const savedList = doc.createElementNS(CHIP_NS, 'chip:guardados');
  for (const note of saved) {
    const item = doc.createElementNS(CHIP_NS, 'chip:guardado');
    item.setAttribute('id', note.id);
    item.setAttribute('articleId', note.articleId);
    if (note.sectionId) item.setAttribute('sectionId', note.sectionId);
    item.setAttribute('feedTitle', note.feedTitle);
    item.setAttribute('title', note.title);
    item.setAttribute('link', note.link);
    if (note.image) item.setAttribute('image', note.image);
    item.setAttribute('published', String(note.published));
    item.setAttribute('savedAt', String(note.savedAt));
    const summary = doc.createElementNS(CHIP_NS, 'chip:resumen');
    summary.textContent = note.summary;
    item.append(summary);
    if (note.content) {
      const content = doc.createElementNS(CHIP_NS, 'chip:contenido');
      content.textContent = note.content;
      item.append(content);
    }
    savedList.append(item);
  }
  head.append(savedList);
  root.append(head);

  // Para los otros lectores: cada fuente va dentro de la carpeta de su primera etiqueta.
  const body = doc.createElement('body');
  const folders = new Map<string, Element>();
  for (const feed of feeds) {
    const first = feed.tagIds.map((id) => tagNames.get(id)).find(Boolean);
    let parent: Element = body;
    if (first) {
      let folder = folders.get(first);
      if (!folder) {
        folder = doc.createElement('outline');
        folder.setAttribute('text', first);
        folder.setAttribute('title', first);
        folders.set(first, folder);
        body.append(folder);
      }
      parent = folder;
    }
    parent.append(feedOutline(doc, feed, tagNames));
  }
  root.append(body);

  const text = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(doc)}`;
  return { text, feeds: feeds.length, tags: tags.length, saved: saved.length };
}

export type ImportResult = { added: number; updated: number; tags: number; saved: number; failed: string[] };

/**
 * Carga un OPML. Si una fuente ya está, vale lo que dice el archivo (sirve para restaurar):
 * nombre, principal o secundaria, y etiquetas. Las fuentes nuevas se agregan y se bajan sus notas.
 */
export async function importOpml(text: string, onStep?: (msg: string) => void): Promise<ImportResult> {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'opml') {
    throw new OpmlError('el archivo no es un OPML válido');
  }

  // 1. Etiquetas guardadas por chip-rss, con sus id, para que las fuentes las encuentren.
  const tagIdMap = new Map<string, string>(); // id del archivo → id en esta app
  let tagsTouched = 0;
  const ensureTagByName = async (raw: string): Promise<string | null> => {
    const name = normalizeTagName(raw);
    if (!name) return null;
    const found = await getTagByName(name);
    if (found) return found.id;
    const tag: Tag = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    await saveTag(tag);
    tagsTouched++;
    return tag.id;
  };
  for (const item of Array.from(doc.getElementsByTagNameNS(CHIP_NS, 'etiqueta'))) {
    const id = item.getAttribute('id') ?? '';
    const name = normalizeTagName(item.getAttribute('name') ?? '');
    if (!name) continue;
    const byName = await getTagByName(name);
    if (byName) {
      tagIdMap.set(id, byName.id);
      continue;
    }
    // Si el id ya lo usa otra etiqueta, le damos uno nuevo.
    const useId = id && !(await getTag(id)) ? id : crypto.randomUUID();
    await saveTag({ id: useId, name, createdAt: Number(item.getAttribute('createdAt')) || Date.now() });
    tagIdMap.set(id, useId);
    tagsTouched++;
  }

  // 2. Las fuentes, recorriendo carpetas (de otros lectores) y fuentes sueltas.
  const outlines: { el: Element; folders: string[] }[] = [];
  const walk = (parent: Element, folders: string[]) => {
    for (const child of Array.from(parent.children)) {
      if (child.localName !== 'outline') continue;
      if (child.getAttribute('xmlUrl')) outlines.push({ el: child, folders });
      else walk(child, [...folders, child.getAttribute('title') || child.getAttribute('text') || ''].filter(Boolean));
    }
  };
  const body = Array.from(doc.documentElement.children).find((c) => c.localName === 'body');
  if (body) walk(body, []);
  const savedItems = Array.from(doc.getElementsByTagNameNS(CHIP_NS, 'guardado'));
  if (outlines.length === 0 && savedItems.length === 0) throw new OpmlError('el archivo no tiene fuentes');

  const result: ImportResult = { added: 0, updated: 0, tags: 0, saved: 0, failed: [] };
  const toFetch: Feed[] = [];
  for (const [i, { el, folders }] of outlines.entries()) {
    const url = resolveUrl(el.getAttribute('xmlUrl') ?? '', 'https://invalid/');
    const title = el.getAttribute('title') || el.getAttribute('text') || url;
    if (!url) {
      result.failed.push(title);
      continue;
    }
    onStep?.(`fuente ${i + 1} de ${outlines.length}: ${title}`);

    // Etiquetas: las de chip-rss por id; si no hay, las "category" o las carpetas de otros lectores.
    const tagIds = new Set<string>();
    const chipTagIds = readChip(el, 'tagIds');
    if (chipTagIds !== null) {
      for (const id of chipTagIds.split(/\s+/).filter(Boolean)) {
        const local = tagIdMap.get(id);
        if (local) tagIds.add(local);
      }
    } else {
      const names = [...(el.getAttribute('category') ?? '').split(','), ...folders];
      for (const raw of names) {
        const id = await ensureTagByName(raw.replace(/^\/+/, ''));
        if (id) tagIds.add(id);
      }
    }
    const existing = await findFeedByUrl(url);
    // Un OPML de otro lector no dice qué es principal: ahí se respeta lo que ya estaba.
    const principalAttr = readChip(el, 'principal');
    const principal = principalAttr === null ? (existing?.principal ?? false) : principalAttr === 'true';

    if (existing) {
      await saveFeed({ ...existing, title, principal, tagIds: [...tagIds] });
      result.updated++;
      continue;
    }
    const wantedId = readChip(el, 'id');
    const id = wantedId && !(await getFeed(wantedId)) ? wantedId : crypto.randomUUID();
    const now = Date.now();
    const feed: Feed = {
      id,
      url,
      title,
      siteUrl: resolveUrl(el.getAttribute('htmlUrl') ?? '', url) || url,
      principal,
      tagIds: [...tagIds],
      addedAt: Number(readChip(el, 'addedAt')) || now,
      lastFetchedAt: 0,
    };
    await saveFeed(feed);
    toFetch.push(feed);
    result.added++;
  }

  // 3. El archivo: secciones (por nombre o id) y notas guardadas. Si una nota ya estaba, vale la del archivo.
  const sectionIdMap = new Map<string, string>();
  for (const item of Array.from(doc.getElementsByTagNameNS(CHIP_NS, 'seccion'))) {
    const id = item.getAttribute('id') ?? '';
    const name = (item.getAttribute('name') ?? '').trim();
    if (!name) continue;
    const byName = await getSectionByName(name);
    if (byName) {
      sectionIdMap.set(id, byName.id);
      continue;
    }
    const newId = id || crypto.randomUUID();
    await saveSection({ id: newId, name, createdAt: Number(item.getAttribute('createdAt')) || Date.now() });
    sectionIdMap.set(id, newId);
  }
  for (const item of savedItems) {
    const child = (name: string) => Array.from(item.children).find((c) => c.localName === name)?.textContent ?? '';
    const id = item.getAttribute('id') || crypto.randomUUID();
    const sectionId = item.getAttribute('sectionId');
    const note: Saved = {
      id,
      articleId: item.getAttribute('articleId') ?? '',
      feedTitle: item.getAttribute('feedTitle') ?? '',
      title: item.getAttribute('title') ?? '(sin título)',
      link: resolveUrl(item.getAttribute('link') ?? '', 'https://invalid/'),
      summary: child('resumen'),
      content: child('contenido') || undefined,
      image: resolveUrl(item.getAttribute('image') ?? '', 'https://invalid/') || undefined,
      published: Number(item.getAttribute('published')) || Date.now(),
      savedAt: Number(item.getAttribute('savedAt')) || Date.now(),
      sectionId: sectionId ? (sectionIdMap.get(sectionId) ?? null) : null,
    };
    const existing = await getSaved(id);
    await putSaved(existing ? { ...existing, ...note } : note);
    result.saved++;
  }

  // 4. El formato de lectura, si el archivo lo trae.
  const prefs = doc.getElementsByTagNameNS(CHIP_NS, 'preferencias')[0];
  const formato = prefs?.getAttribute('formato');
  if (isFormat(formato)) saveFormat(formato);

  // 5. Bajar las notas de las fuentes nuevas, de a tres por vez.
  for (let i = 0; i < toFetch.length; i += 3) {
    onStep?.(`bajando notas: ${Math.min(i + 3, toFetch.length)} de ${toFetch.length} fuentes`);
    await Promise.all(toFetch.slice(i, i + 3).map(refreshFeed));
  }

  result.tags = tagsTouched;
  return result;
}
