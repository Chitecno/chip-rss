/** Pide una dirección a través del proxy (en desarrollo, el servidor local; en producción, el Worker). */
const PROXY: string = import.meta.env.VITE_PROXY_URL ?? './proxy';

export class FetchError extends Error {}

export type Fetched = { text: string; finalUrl: string };

export async function fetchText(url: string): Promise<Fetched> {
  let res: Response;
  try {
    res = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`);
  } catch {
    throw new FetchError('no hay conexión');
  }
  const finalUrl = res.headers.get('x-final-url');
  if (!res.ok) {
    // Si hay x-final-url, el error vino del sitio; si no, del proxy, que manda su motivo como texto.
    throw new FetchError(finalUrl ? `el sitio respondió ${res.status}` : (await res.text()) || `error ${res.status}`);
  }
  const bytes = await res.arrayBuffer();
  return { text: decode(bytes, res.headers.get('content-type') ?? ''), finalUrl: finalUrl ?? url };
}

/** Muchos medios todavía publican en ISO-8859-1: leemos el charset antes de decodificar. */
function decode(bytes: ArrayBuffer, contentType: string): string {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}
