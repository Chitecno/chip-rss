import figlet from 'figlet';
import ansiShadow from 'figlet/importable-fonts/ANSI Shadow.js';

figlet.parseFont('ANSI Shadow', ansiShadow);

/**
 * ANSI Shadow solo tiene mayúsculas sin acentos: "La Peña" sale como "LA PENA".
 * Si la Ñ importa en un nombre, más adelante podemos dibujarla a mano.
 */
export function toBannerText(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

function asciiArt(text: string): string {
  const lines = figlet
    .textSync(text, { font: 'ANSI Shadow' })
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

// Un nombre largo ("La Gaceta de Juana") va en dos renglones para que no quede diminuto.
const MAX_LINE = 12;

/** Junta palabras en renglones de hasta `max` letras. */
function lines(text: string, max: number): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + word.length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out.length ? out : [text];
}

/**
 * Banner con el nombre del lector y la capa glitch: un fantasma rosa y otro cian corridos.
 * En pantallas angostas cada palabra va en su renglón.
 */
export function renderBanner(name: string, narrow: boolean): HTMLElement {
  const text = toBannerText(name);
  const art = (narrow ? text.split(/\s+/) : lines(text, MAX_LINE)).map(asciiArt).join('\n');
  const cols = Math.max(...art.split('\n').map((line) => line.length));

  const banner = document.createElement('div');
  banner.className = 'banner glitch';
  banner.setAttribute('role', 'img');
  banner.setAttribute('aria-label', name);
  banner.style.setProperty('--cols', String(cols));

  for (const layer of ['a', 'b', 'main']) {
    const pre = document.createElement('pre');
    pre.className = `glitch__${layer}`;
    pre.textContent = art;
    if (layer !== 'main') pre.setAttribute('aria-hidden', 'true');
    banner.append(pre);
  }
  return banner;
}
