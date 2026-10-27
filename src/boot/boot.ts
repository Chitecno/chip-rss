import { renderBanner } from './banner';
import { hashFrame } from '../ui/hash-frame';
import { listFeeds } from '../db/db';
import { READER_NAME, VERSION } from '../config';
import './boot.css';

// Ancho fijo de las líneas de chequeo: entra en un celu angosto sin cortarse.
const LINE_WIDTH = 36;

type Check = { label: string; run: () => string | Promise<string> };

async function countFeeds(): Promise<string> {
  try {
    const n = (await listFeeds()).length;
    return `${n} ${n === 1 ? 'feed' : 'feeds'}`;
  } catch {
    return 'sin acceso';
  }
}

// Chequeos reales del navegador: lo que la app necesita para ser local-first.
const CHECKS: Check[] = [
  { label: 'almacenamiento local', run: () => ('indexedDB' in window ? 'ok' : 'no disponible') },
  { label: 'modo offline', run: () => ('serviceWorker' in navigator ? 'ok' : 'no disponible') },
  { label: 'conexión', run: () => (navigator.onLine ? 'con señal' : 'sin señal') },
  { label: 'tus fuentes', run: countFeeds },
];

function dotted(label: string, result: string): string {
  const dots = '.'.repeat(Math.max(3, LINE_WIDTH - label.length - result.length - 4));
  return `> ${label} ${dots} ${result}`;
}

/** Pantalla de arranque tipo boot. Resuelve cuando la persona entra. */
export function runBoot(root: HTMLElement): Promise<void> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Cualquier tecla o toque durante el arranque lo adelanta hasta el final.
  let fast = reducedMotion;
  const hurry = () => {
    fast = true;
  };
  document.addEventListener('keydown', hurry);
  document.addEventListener('pointerdown', hurry);

  const sleep = (ms: number) => (fast ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

  const screen = document.createElement('div');
  screen.className = 'boot';
  const log = document.createElement('pre');
  log.className = 'boot__log';
  screen.append(log);
  root.replaceChildren(hashFrame(screen));

  const print = async (line: string, pause: number) => {
    log.textContent += `${line}\n`;
    await sleep(pause);
  };

  return (async () => {
    await print(`CHIP-RSS v${VERSION} · arranque`, 260);
    await print('', 120);
    for (const check of CHECKS) {
      await print(dotted(check.label, await check.run()), 300);
    }
    await print('', 120);
    await print('// un proyecto chip tecno', 500);

    screen.append(renderBanner(READER_NAME, window.innerWidth < 640));
    await sleep(400);

    document.removeEventListener('keydown', hurry);
    document.removeEventListener('pointerdown', hurry);

    const enter = document.createElement('button');
    enter.type = 'button';
    enter.className = 'term-button boot__enter';
    enter.innerHTML = '[ enter ] para entrar <span class="cursor" aria-hidden="true">_</span>';
    screen.append(enter);
    enter.focus();

    await new Promise<void>((resolve) => {
      const done = () => {
        document.removeEventListener('keydown', onKey);
        enter.removeEventListener('click', done);
        resolve();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        done();
      };
      enter.addEventListener('click', done);
      document.addEventListener('keydown', onKey);
    });
  })();
}
