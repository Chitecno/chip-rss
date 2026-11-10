/**
 * Menú chico que se abre al lado de un botón (el de guardar, el de compartir…).
 * Se cierra al tocar afuera, con Escape o al elegir una opción. Uno abierto por vez.
 */

let closeOpenMenu: (() => void) | null = null;

export function attachMenu(
  wrap: HTMLElement,
  trigger: HTMLButtonElement,
  build: (close: () => void) => HTMLElement,
): void {
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  const close = () => {
    wrap.querySelector(':scope > .menu')?.remove();
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    if (closeOpenMenu === close) closeOpenMenu = null;
  };
  const onOutside = (e: Event) => {
    if (!wrap.contains(e.target as Node)) close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      trigger.focus();
    }
  };

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wrap.querySelector(':scope > .menu')) {
      close();
      return;
    }
    closeOpenMenu?.();
    const menu = build(close);
    menu.classList.add('menu');
    wrap.append(menu);
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    closeOpenMenu = close;
    menu.querySelector<HTMLElement>('button, a')?.focus();
  });
}
