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

## Cada vez que la quiero usar

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

- En **leer** ves todas las notas, de la más nueva a la más vieja. Arriba podés filtrar por **todo**, **principales** o cualquier **#etiqueta**.
- Tocá un título para abrir la nota completa dentro de la app. **[ < volver ]** te deja en el mismo lugar del timeline.
- Al final de cada nota está el link al sitio original.

### Laboratorio

Es una pantalla para probar otras formas de ver las noticias:

- Arriba elegís qué fuentes mirar y cómo mostrarlas: **tapa de diario**, **revista**, **teletipo** o **grilla**.
- Si varias fuentes cuentan lo mismo, aparece una marca rosa, "3 fuentes", y la opción de ver cada versión.
- En **[ ajustar relevancia y agrupado ]** movés los criterios con que se ordenan las historias.
- **Temas del día:** tocá una palabra para ver solo las notas que la nombran.
- **La rutina del día** junta aparte el clima, el dólar, el horóscopo y otras notas de servicio.

## Tus datos

- Todo lo que cargás se guarda **en tu navegador, en tu compu**. No viaja a ningún servidor.
- Chrome guarda los datos **por dirección**: lo que cargues en `localhost:4173` no aparece en otra dirección, y al revés. Usá siempre `localhost:4173`.
- **Si borrás los datos de navegación de Chrome, se borran tus fuentes.** Todavía no está la opción de exportarlas para tener un respaldo (está en la [hoja de ruta](hoja-de-ruta.md)).

## Si algo falla

| Qué ves | Qué hacer |
| --- | --- |
| `No se puede cargar el archivo npm.ps1…` | Escribiste `npm` en vez de `npm.cmd`. Usá `npm.cmd`. |
| `npm.cmd no se reconoce…` | Falta instalar Node.js, o hay que cerrar y volver a abrir PowerShell después de instalarlo. |
| `Port 4173 is already in use` | La app ya está prendida en otra ventana de PowerShell. Entrá directo a `localhost:4173`. |
| La página no carga | Fijate que la ventana de PowerShell siga abierta y sin errores. Si no, volvé a correr `npm.cmd run app`. |
| No aparece el ícono de instalar | Confirmá que la dirección sea `localhost:4173`. Si ya la instalaste, el ícono no vuelve a aparecer. |
| Una fuente dice `! el sitio respondió…` | El sitio no respondió esa vez. Suele arreglarse solo en la próxima actualización. |
