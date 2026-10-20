import '@fontsource/anonymous-pro/400.css';
import '@fontsource/anonymous-pro/700.css';
import './themes/chip-tecno.css';
import './style.css';
import { runBoot } from './boot/boot';
import { startApp } from './ui/shell';

const app = document.querySelector<HTMLDivElement>('#app')!;

// El arranque es provisorio: no va a estar en la versión final.
runBoot(app).then(() => startApp(app));
