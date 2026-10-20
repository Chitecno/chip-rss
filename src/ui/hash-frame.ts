/** Marco de # que encierra la pantalla, como en las piezas de Chip Tecno. */
export function hashFrame(content: HTMLElement): HTMLElement {
  const frame = document.createElement('div');
  frame.className = 'hash-frame';

  // Una tira larga de # por lado; el CSS la recorta al tamaño de la pantalla.
  const strip = '#'.repeat(240);
  for (const side of ['top', 'bottom', 'left', 'right']) {
    const el = document.createElement('div');
    el.className = `hash-frame__${side}`;
    el.setAttribute('aria-hidden', 'true');
    el.textContent = strip;
    frame.append(el);
  }

  const inner = document.createElement('div');
  inner.className = 'hash-frame__inner';
  inner.append(content);
  frame.append(inner);
  return frame;
}
