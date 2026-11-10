/// <reference types="vite/client" />

/** La versión de la app, tomada de package.json. */
declare const __APP_VERSION__: string;

// Las fuentes de figlet listas para importar en el navegador son texto plano (.flf).
declare module 'figlet/importable-fonts/*' {
  const font: string;
  export default font;
}
