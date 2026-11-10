import { button, el } from './dom';
import { ICONO_COMPARTIR } from './iconos';
import { attachMenu } from './menu';

/** Copia texto al portapapeles; si el navegador no deja, usa el método viejo. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function externalOption(label: string, href: string, close: () => void): HTMLAnchorElement {
  const a = el('a', 'term-button menu__opcion', label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.addEventListener('click', () => close());
  return a;
}

/**
 * El botón de compartir de una nota: copiar el link, WhatsApp, mail y, donde el navegador
 * lo permite (sobre todo en el celu), el menú de compartir del sistema.
 * Siempre se comparte el link a la nota en el sitio original.
 */
export function shareButton(title: string, link: string, compact = false): HTMLElement {
  const wrap = el('span', 'compartir');
  if (!link) return wrap;
  const trigger = button('', `term-button compartir__boton${compact ? ' compartir__boton--chico' : ''}`);
  trigger.innerHTML = `${ICONO_COMPARTIR}${compact ? '' : '<span>compartir</span>'}`;
  trigger.setAttribute('aria-label', `Compartir: ${title}`);
  trigger.title = 'Compartir';

  attachMenu(wrap, trigger, (close) => {
    const menu = el('div', 'compartir__menu');
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Compartir la nota');
    menu.append(el('p', 'menu__titulo', 'compartir:'));

    const copyButton = button('  copiar link', 'term-button menu__opcion');
    copyButton.addEventListener('click', async () => {
      const ok = await copy(link);
      copyButton.textContent = ok ? '  link copiado ✓' : '  no pude copiarlo';
      setTimeout(() => {
        close();
        trigger.focus();
      }, 900);
    });
    menu.append(copyButton);

    menu.append(
      externalOption('  WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${title}\n${link}`)}`, close),
      externalOption(
        '  mail',
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${link}`)}`,
        close,
      ),
    );

    // El menú de compartir del sistema (Telegram, Signal…), donde exista.
    if (typeof navigator.share === 'function') {
      const more = button('  más opciones…', 'term-button menu__opcion');
      more.addEventListener('click', () => {
        close();
        navigator.share({ title, url: link }).catch(() => {});
      });
      menu.append(more);
    }
    return menu;
  });

  wrap.append(trigger);
  return wrap;
}
