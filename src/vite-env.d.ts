/// <reference types="vite/client" />

// Las fuentes de figlet listas para importar en el navegador son texto plano (.flf).
declare module 'figlet/importable-fonts/*' {
  const font: string;
  export default font;
}
