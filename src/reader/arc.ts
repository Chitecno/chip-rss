/**
 * Arc (el sistema de Página/12 y otros medios grandes) no pone el cuerpo de la nota en el HTML:
 * lo manda como datos en Fusion.globalContent y lo dibuja con JavaScript. Lo leemos de ahí.
 */

type ArcElement = {
  type?: string;
  content?: string;
  level?: number;
  url?: string;
  caption?: string;
  list_type?: string;
  items?: ArcElement[];
  content_elements?: ArcElement[];
};

/** Recorta el objeto JSON que empieza en `start`, respetando strings y llaves anidadas. */
function sliceJsonObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function escapeText(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function toHtml(el: ArcElement): string {
  switch (el.type) {
    case 'text':
      return el.content ? `<p>${el.content}</p>` : '';
    case 'header': {
      const level = Math.min(6, Math.max(2, el.level ?? 2));
      return el.content ? `<h${level}>${el.content}</h${level}>` : '';
    }
    case 'image':
      return el.url
        ? `<figure><img src="${escapeText(el.url)}" alt="">${el.caption ? `<figcaption>${el.caption}</figcaption>` : ''}</figure>`
        : '';
    case 'list': {
      const tag = el.list_type === 'ordered' ? 'ol' : 'ul';
      const items = (el.items ?? []).map((i) => (i.content ? `<li>${i.content}</li>` : '')).join('');
      return items ? `<${tag}>${items}</${tag}>` : '';
    }
    case 'quote':
      return `<blockquote>${(el.content_elements ?? []).map(toHtml).join('')}</blockquote>`;
    default:
      // Embeds, publicidad y HTML suelto quedan afuera.
      return '';
  }
}

/** Devuelve el HTML de la nota si la página es de Arc, o null. */
export function arcContent(pageHtml: string): string | null {
  const marker = pageHtml.indexOf('Fusion.globalContent=');
  if (marker < 0) return null;
  const json = sliceJsonObject(pageHtml, pageHtml.indexOf('{', marker));
  if (!json) return null;
  try {
    const data = JSON.parse(json) as { content_elements?: ArcElement[] };
    const html = (data.content_elements ?? []).map(toHtml).join('');
    return html || null;
  } catch {
    return null;
  }
}
