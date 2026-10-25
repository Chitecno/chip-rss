# Guía de uso

Esta guía está pensada para alguien que no programa. Explica qué hacer, qué escribir, qué significa cada cosa y qué deberías ver en pantalla.

> La app todavía no está publicada en internet: se usa desde el código, en tu computadora. Los pasos son para Windows.

## Palabras que vas a ver

- **Terminal o PowerShell:** un programa donde se escriben órdenes en vez de hacer clic. En Windows se llama PowerShell. Se ve como una ventana azul o negra con texto que termina en `>`.
- **Comando:** una orden que escribís en la terminal y confirmás con Enter.
- **Carpeta del proyecto:** la carpeta `chip-rss`, donde está todo el código de la app.
- **localhost:** una dirección de internet que solo existe en tu computadora. Nadie más la puede ver.
- **Puerto:** el número que va después de `localhost:`, como un número de puerta. La app usa el **4173**.

## La primera vez (se hace una sola vez por computadora)

### 1. Instalar los programas que necesita

- **Node.js:** es lo que hace funcionar la app en tu compu. Entrá a [nodejs.org](https://nodejs.org), descargá la versión que dice **LTS** e instalala con las opciones que vienen marcadas.
- **Git:** sirve para bajar el proyecto y traer sus actualizaciones. Entrá a [git-scm.com](https://git-scm.com), descargalo e instalalo con las opciones que vienen marcadas.

Después de instalarlos, **cerrá y volvé a abrir** cualquier PowerShell que tuvieras abierto, para que los reconozca.

### 2. Bajar el proyecto

1. Abrí PowerShell: apretá la tecla Windows, escribí `PowerShell` y apretá Enter.
2. Andá a tu carpeta Documentos escribiendo esto y apretando Enter:
   ```
   cd $HOME\Documents
   ```
   `cd` quiere decir "cambiar de carpeta". Es como abrir esa carpeta en el explorador, pero adentro de PowerShell.
3. Bajá el proyecto:
   ```
   git clone https://github.com/Chitecno/chip-rss.git
   ```
   Esto copia el proyecto de GitHub a tu compu. Vas a ver unas líneas que terminan en `done`. Ahora tenés una carpeta `chip-rss` dentro de Documentos.

### 3. Instalar lo que usa la app

1. Entrá a la carpeta del proyecto:
   ```
   cd chip-rss
   ```
   El texto antes del `>` ahora termina en `chip-rss`.
2. Instalá las piezas que usa la app:
   ```
   npm.cmd install
   ```
   `npm` es el programa que maneja el proyecto, e `install` le pide que baje todo lo que necesita. Tarda un rato. Termina con una línea parecida a `added 343 packages`.

> **¿Por qué `npm.cmd` y no `npm`?** En muchas compus con Windows, PowerShell no deja correr `npm` a secas por seguridad. `npm.cmd` es lo mismo y no tiene ese problema. No hace falta cambiar ninguna configuración.

## Cada vez que la quiero usar: con doble clic

En la carpeta `scripts` del proyecto está **`abrir-chip-rss.cmd`**. Con doble clic prende la app y, cuando está lista, la abre en tu navegador. No hace falta escribir nada.

- Se abre una ventana negra que dice que la app se está prendiendo. **Dejala abierta** mientras uses la app: si la cerrás, la app se apaga.
- Si la app ya estaba prendida, solo abre el navegador.

**Para tenerlo en el escritorio:** clic derecho sobre `abrir-chip-rss.cmd` → **Mostrar más opciones** → **Enviar a** → **Escritorio (crear acceso directo)**. Si querés que el acceso directo tenga el ícono de la app: clic derecho sobre él → **Propiedades** → **Cambiar icono** → elegí `chip-rss.ico`, que está en la misma carpeta `scripts`.

## Cada vez que la quiero usar: desde PowerShell

Si preferís hacerlo a mano, o si el doble clic no funciona:

1. **Abrí PowerShell**: tecla Windows, escribí `PowerShell` y Enter.
2. **Entrá a la carpeta del proyecto:**
   ```
   cd $HOME\Documents\chip-rss
   ```
3. **Prendé la app:**
   ```
   npm.cmd run app
   ```
   `run app` le pide a npm que haga la tarea llamada "app": armar la aplicación y dejarla funcionando en tu compu. Vas a ver muchas líneas durante unos segundos. Está lista cuando aparece:
   ```
   ➜  Local:   http://localhost:4173/
   ```
4. **Dejá esa ventana abierta.** Mientras esté abierta, la app funciona. Si la cerrás, la app ya no puede leer feeds nuevos.
5. **Abrí Chrome** y escribí arriba, donde van las direcciones: `localhost:4173`. Apretá Enter.

### Apagarla

Volvé a la ventana de PowerShell y apretá **Ctrl** y **C** a la vez. Si pregunta algo, escribí `S` y Enter. Después podés cerrar la ventana.

## Instalarla como app (una sola vez)

Así la abrís como cualquier programa, con su ícono, sin buscarla en Chrome.

1. Con la app abierta en `localhost:4173`, mirá el final de la barra de direcciones de Chrome, a la derecha. Tiene que haber un ícono de **instalar**: una pantalla con una flecha.
2. Tocalo y elegí **Instalar**.
3. Si no ves el ícono, abrí el menú de los tres puntos de Chrome y buscá la opción **Instalar**. Según la versión, aparece suelta o dentro de "Guardar y compartir".

Aunque esté instalada, para leer feeds nuevos tenés que tener PowerShell con `npm.cmd run app` funcionando.

## Traer la última versión

Cuando hay cambios nuevos en GitHub:

1. Si la app está prendida, apagala (Ctrl + C).
2. En la carpeta del proyecto, escribí:
   ```
   git pull
   ```
   Esto baja los cambios nuevos. Si dice `Already up to date`, ya tenías todo.
3. Por si se sumó alguna pieza nueva:
   ```
   npm.cmd install
   ```
4. Prendé la app de nuevo con `npm.cmd run app`.

## Cómo se usa

### Agregar una fuente

1. En el menú, entrá a **fuentes**.
2. Pegá en la caja la dirección del medio, por ejemplo la de su página principal o la de una sección. No hace falta saber cuál es su feed: la app lo busca.
3. Apretá **[ agregar ]**. Abajo vas a ver qué va probando y, al final, cuántas notas sumó.
4. Ahí mismo se abren sus etiquetas: marcá las que correspondan o creá una nueva.

### Principales, secundarias y etiquetas

- **Principal o secundaria** dice cuánto te importa una fuente. Las fuentes nuevas entran como secundarias. Para cambiarla, tocá **[ ] principal** al lado de su nombre.
- **Las etiquetas** dicen de qué trata una fuente, por ejemplo `#tecnología`. Una fuente puede tener varias.
- Si borrás una etiqueta, las fuentes no se borran: solo pierden esa etiqueta.

### Leer

- Arriba de todo elegís el **formato**:
  - **timeline:** todas las notas en tarjetas, de la más nueva a la más vieja;
  - **diario:** una hoja de papel, como un diario impreso. Arriba tiene el nombre, los temas del día y la rutina; abajo, la nota principal, columnas y breves;
  - **revista:** las historias con fotos grandes;
  - **teletipo:** una línea por historia, para pasar rápido.
- Adentro de cada formato está el menú de fuentes: **todo**, **principales** o cualquier **#etiqueta**. En el diario aparece como la barra de secciones, debajo del cabezal.
- En diario, revista y teletipo, las notas que cuentan lo mismo se juntan en una sola historia. La rutina (clima, dólar, horóscopo…) va aparte.
- **Cuando dos o más fuentes cuentan lo mismo**, aparece una marca rosa con cuántas son ("2 fuentes") y los links a las otras versiones. Se ve en todos los formatos, también en el timeline. Esas historias van primero si son de la última semana.
- En el menú de fuentes, **[ ] varias fuentes** deja solo las historias que cuentan dos o más fuentes. El número entre paréntesis dice cuántas hay.
- Con una etiqueta elegida, las historias se arman igual con todas tus fuentes: si una nota de `#tecnología` también la cuenta una fuente sin esa etiqueta, la ves con las dos.
- **Se muestra todo, en páginas.** Abajo de cada formato están los números de página y **[ siguiente > ]**. En el diario, desde la página 2 el cabezal es más chico, como en las páginas interiores de un diario.
- El formato que elijas queda guardado para la próxima vez.
- Tocá un título para abrir la nota completa dentro de la app. **[ < volver ]** te deja en el mismo lugar.
- Al final de cada nota está el link al sitio original.

### Hacer un respaldo de tus fuentes

1. En el menú, entrá a **ajustes**.
2. Tocá **[ exportar fuentes ]**. Se baja un archivo que termina en `.opml`, por ejemplo `chip-rss-fuentes-2026-10-25.opml`. Chrome lo guarda en tu carpeta Descargas.
3. Guardalo en un lugar seguro.

El archivo lleva tus fuentes con el nombre que les pusiste, si son principales o secundarias, sus etiquetas y el formato de lectura que elegiste. Las notas no van: se vuelven a bajar de cada fuente.

### Cargar un respaldo (o tus fuentes de otro lector)

1. En **ajustes**, tocá **[ importar fuentes ]** y elegí el archivo `.opml`.
2. Abajo vas a ver cómo va: cuántas fuentes suma y cuándo termina de bajar sus notas.
3. Si una fuente ya estaba cargada, queda como dice el archivo: su nombre, si es principal y sus etiquetas.

Sirve también con archivos de otros lectores de RSS (como Feedly o Inoreader). Sus carpetas pasan a ser etiquetas.

## Tus datos

- Todo lo que cargás se guarda **en tu navegador, en tu compu**. No viaja a ningún servidor.
- Chrome guarda los datos **por dirección**: lo que cargues en `localhost:4173` no aparece en otra dirección, y al revés. Usá siempre `localhost:4173`.
- **Si borrás los datos de navegación de Chrome, se borran tus fuentes.** Antes, hacé un respaldo desde **ajustes** (ver más arriba).

## Si algo falla

| Qué ves | Qué hacer |
| --- | --- |
| `No se puede cargar el archivo npm.ps1…` | Escribiste `npm` en vez de `npm.cmd`. Usá `npm.cmd`. |
| `npm.cmd no se reconoce…` | Falta instalar Node.js, o hay que cerrar y volver a abrir PowerShell después de instalarlo. |
| `Port 4173 is already in use` | La app ya está prendida en otra ventana de PowerShell. Entrá directo a `localhost:4173`. |
| La página no carga | Fijate que la ventana de PowerShell siga abierta y sin errores. Si no, volvé a correr `npm.cmd run app`. |
| No aparece el ícono de instalar | Confirmá que la dirección sea `localhost:4173`. Si ya la instalaste, el ícono no vuelve a aparecer. |
| Una fuente dice `! el sitio respondió…` | El sitio no respondió esa vez. Suele arreglarse solo en la próxima actualización. |
