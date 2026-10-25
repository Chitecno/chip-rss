# Cómo trabajamos

Qué es cada cosa en Git y GitHub, explicado sin dar nada por sabido.

## La idea general

Pensalo como un documento al que le vas guardando versiones. **Git** es el programa que guarda esas versiones en tu compu. **GitHub** es la página de internet donde vive una copia pública del proyecto, con toda su historia.

## Palabras

| Palabra | Qué es |
| --- | --- |
| **Repositorio (repo)** | La carpeta del proyecto más toda su historia de cambios. Hay una copia en tu compu y otra en GitHub. |
| **Commit** | Una versión guardada del proyecto, como una foto, con una frase que dice qué cambió. Si algo se rompe, se puede volver a una foto anterior. Guardar un archivo no es hacer un commit: el commit es lo que queda en la historia. |
| **main** | La versión principal, la oficial. Es lo que se ve primero en GitHub. |
| **Rama** | Un borrador aparte de main. Se hacen cambios ahí sin tocar la versión oficial y, cuando están listos, se pasan a main. |
| **Pull request (PR)** | El pedido de "pasá los cambios de este borrador a main". En GitHub se ven todos los cambios antes de aceptarlos. |
| **Merge (unir)** | Aceptar el pull request: los cambios pasan a main. |
| **Push (subir)** | Mandar los commits de tu compu a GitHub. |
| **Pull (traer)** | Bajar a tu compu lo nuevo que haya en GitHub. Ojo: "pull" y "pull request" son cosas distintas. |
| **Clone (clonar)** | Bajar el proyecto entero de GitHub por primera vez. |
| **Fork** | Una copia entera del proyecto en la cuenta de otra persona, para que haga su propia versión. No es lo mismo que una rama. |

## Cómo se ve el recorrido de un cambio

1. Se hace el cambio en los archivos.
2. Se guarda como **commit**, con una frase que diga qué cambió.
3. Se **sube** a GitHub (push).
4. Si se trabajó en una **rama**, se abre un **pull request** y, cuando está bien, se **une** a main.

## Los commits van firmados

Cada commit dice quién lo hizo. Los de este proyecto van firmados como "Gala - Chip Tecno" con el mail privado que da GitHub, así el mail personal no queda publicado.
