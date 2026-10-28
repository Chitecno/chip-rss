import { hashFrame } from './hash-frame';
import { createLeer, type LeerRoute } from './leer';
import { createFuentes, type FuentesTab } from './fuentes';
import { renderGuardada, renderNota } from './nota';
import { createArchivo } from './archivo';
import { loadFormat } from './preferencias';
import { createAcerca } from './acerca';
import { el, plural } from './dom';
import { listFeeds } from '../db/db';
import { refreshAll } from '../feeds/refresh';
import './shell.css';

type Route =
  | ({ name: 'leer' } & LeerRoute)
  | { name: 'fuentes'; tab: FuentesTab }
  | { name: 'acerca' }
  | { name: 'nota'; id: string }
  | { name: 'archivo'; filter: string }
  | { name: 'guardada'; id: string };

/** Cada pantalla tiene su dirección (#/leer, #/fuentes…), así el botón de volver funciona. */
function parseRoute(): Route {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  if (path.startsWith('nota/')) return { name: 'nota', id: decodeURIComponent(path.slice(5)) };
  if (path.startsWith('archivo/')) return { name: 'guardada', id: decodeURIComponent(path.slice(8)) };
  if (path === 'archivo') return { name: 'archivo', filter: new URLSearchParams(query).get('s') ?? 'todo' };
  if (path === 'fuentes') return { name: 'fuentes', tab: new URLSearchParams(query).get('t') === 'etiquetas' ? 'etiquetas' : 'fuentes' };
  if (path === 'acerca') return { name: 'acerca' };
  const params = new URLSearchParams(query);
  return {
    name: 'leer',
    filter: params.get('f') ?? 'todo',
    page: Math.max(1, Number(params.get('p')) || 1),
    shared: params.get('c') === '1',
  };
}

/** La app después del arranque: menú arriba y una pantalla por vez. */
export function startApp(root: HTMLElement): void {
  const main = el('main', 'app');
  main.innerHTML = `
    <header class="topbar">
      <a class="topbar__brand" href="#/leer">CHIP RSS</a>
      <button type="button" class="term-button topbar__menu" aria-expanded="false" aria-controls="menu">[ menú ]</button>
      <nav id="menu" class="topbar__nav" aria-label="Secciones">
        <a href="#/leer" data-route="leer">leer</a>
        <a href="#/archivo" data-route="archivo">archivo</a>
        <a href="#/fuentes" data-route="fuentes">fuentes</a>
        <a href="#/acerca" data-route="acerca">acerca de</a>
      </nav>
    </header>
    <div class="views"></div>
    <p class="app__sign web-small muted">// un proyecto chip tecno</p>
  `;
  root.replaceChildren(hashFrame(main));

  const views = main.querySelector<HTMLElement>('.views')!;
  const nav = main.querySelector<HTMLElement>('.topbar__nav')!;
  const menuButton = main.querySelector<HTMLButtonElement>('.topbar__menu')!;

  const setMenu = (open: boolean) => {
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? '[ cerrar ]' : '[ menú ]';
  };
  menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

  // El timeline se arma una vez y se guarda: al volver de una nota queda igual y en el mismo lugar.
  const leer = createLeer();
  let previous: Route | null = null;
  let leerScroll = 0;
  let moves = 0;

  const goBack = () => {
    if (moves > 0) history.back();
    else location.hash = '#/leer';
  };

  async function go(): Promise<void> {
    const route = parseRoute();
    setMenu(false);
    if (previous?.name === 'leer') leerScroll = window.scrollY;

    const section = route.name === 'nota' ? 'leer' : route.name === 'guardada' ? 'archivo' : route.name;
    for (const link of Array.from(nav.querySelectorAll<HTMLAnchorElement>('a'))) {
      if (link.dataset.route === section) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    if (route.name === 'leer') {
      views.replaceChildren(leer.el);
      await leer.show(route);
      window.scrollTo(0, previous?.name === 'nota' ? leerScroll : 0);
    } else if (route.name === 'nota') {
      // Si se está leyendo en formato diario, la nota se abre en la misma hoja de papel.
      views.replaceChildren(
        renderNota(route.id, goBack, () => leer.invalidate(), (id) => leer.storyFor(id), loadFormat() === 'diario'),
      );
      window.scrollTo(0, 0);
    } else if (route.name === 'guardada') {
      views.replaceChildren(renderGuardada(route.id, goBack, () => leer.invalidate()));
      window.scrollTo(0, 0);
    } else if (route.name === 'archivo') {
      const page = createArchivo(route.filter, () => leer.invalidate());
      views.replaceChildren(page);
      page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } else {
      const page =
        route.name === 'fuentes'
          ? createFuentes(() => leer.invalidate(), route.tab)
          : createAcerca();
      views.replaceChildren(page);
      window.scrollTo(0, 0);
      page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    }
    previous = route;
  }

  window.addEventListener('hashchange', () => {
    moves++;
    void go();
  });

  void (async () => {
    await go();
    if ((await listFeeds()).length === 0) return;
    leer.setStatus('buscando novedades…');
    const added = await refreshAll();
    leer.invalidate();
    const route = parseRoute();
    // Si la persona ya está leyendo más abajo, no le movemos el timeline.
    if (route.name === 'leer' && window.scrollY < 200) await leer.show(route);
    leer.setStatus(added > 0 ? plural(added, 'artículo nuevo', 'artículos nuevos') : 'al día');
  })();
}
