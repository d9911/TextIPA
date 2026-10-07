# Text IPA

Aplicación local en TypeScript para ensayar narraciones. Texto a la izquierda, IPA a la derecha, pausas, notas y seguimiento de frases ensayadas. Interfaz en español, inglés y ruso.

[Русский](README.ru.md) · [English](README.md)

Requiere Node.js 24+, npm y Make. La generación de IPA necesita `espeak-ng` en PATH o la variable `ESPEAK_BIN` con la ruta completa.

```sh
make       # instala dependencias, compila y abre localhost:8767
make dev   # desarrollo
make check # tipos, pruebas y formato
make build # compilación
```

Crea un texto pegando el guion o importando TXT, Markdown o JSON. Los párrafos se convierten en bloques. Genera un borrador de IPA para español de España/seseo, inglés británico/estadounidense o ruso. Revisa las palabras, cifras y marcas antes de grabar. La opción seseo cambia θ por s y no reproduce todos los acentos regionales. La reproducción utiliza voces locales disponibles en el navegador; no exporta una pista de audio.

El modo de lectura permite avanzar con las flechas y controlar el temporizador con Espacio. El tiempo se estima mediante la cantidad de palabras, la velocidad de lectura y la pausa; no es un código de tiempo de una grabación. Los cambios se guardan en localStorage de este navegador. Exporta una copia JSON de la biblioteca para recuperar los textos y ajustes. Otro perfil, dirección o puerto utiliza otro almacenamiento. La posibilidad de deshacer termina al recargar. Las importaciones idénticas no crean duplicados; las versiones modificadas se conservan por separado.

El ejemplo público de Kolobok contiene texto español, inglés y ruso con IPA provisional independiente. El ejemplo personal de cables permanece local y está excluido de Git. Los archivos anteriores siguen en `../cable/transcripts/rehearsal/`. El procesamiento es local; instalar dependencias puede necesitar internet. Activa «Mostrar traducción al leer» en las preferencias para ver y editar traducciones del archivo. Esta versión no incluye traducción automática, reconocimiento de voz ni evaluación de pronunciación.

La [licencia personalizada](LICENSE) permanece intacta. Consulta las [comprobaciones](docs/VERIFICATION.md), el [contexto de las fuentes](docs/CONTEXT.md) y la guía completa para los límites y las referencias técnicas.

## Navegación por URL

Los parámetros `project`, `block`, `phrase`, `q` y `focus=1` restauran el guion, el bloque, la frase, la búsqueda y el modo de lectura. Los proyectos y las frases usan sus ID guardados; cambiar el orden no cambia el destino de un enlace. Atrás/Adelante y el historial del navegador restauran la selección sin deshacer las ediciones. Una selección inexistente abre un elemento disponible con un aviso. El enlace requiere el proyecto en la biblioteca del navegador; usa JSON para transferir datos.

Consulta [arquitectura y parámetros](docs/ARCHITECTURE.md). Los tipos de dominio siguen en `src/types/domain.ts`, los contratos API están en `src/types/api.ts`, la navegación en `src/app/navigation.ts`, los controles DOM en `src/shared/ui/controls.ts` y la interfaz de ayuda en `src/features/pronunciation/dialog.ts`.

## Taller de voz

Text IPA prepara un guion antes de grabar: organizar el texto, leer los sonidos, encontrar las pausas y ensayar. El nombre no se limita al español; las opciones actuales admiten español, inglés y ruso.

Todas las frases permanecen en una lista continua, también en modo de lectura. Los bloques llevan a su primera frase sin ocultar el resto. La búsqueda puede reducir la lista; al borrarla vuelve el guion completo. Añadir una frase la enfoca con una animación.

Los menús personalizados siguen el tema y giran la flecha. Admiten flechas, Home/End, Enter, Escape y selección por inicial. Las animaciones respetan reduced motion. Texto e IPA tienen tamaños independientes. IPA usa [Charis 7.000](https://software.sil.org/charis/download/), fuente gratuita incluida localmente bajo [SIL OFL 1.1](public/fonts/charis/OFL.txt), con [soporte IPA y diacríticos](https://software.sil.org/charis/charset/). No requiere comprar una licencia ni descargar fuentes al leer. La licencia propia de la aplicación permanece separada. Una fuente no puede añadir fonemas ausentes en la transcripción generada.

Al repetir `make s`, se reutiliza solamente la instancia de producción del mismo proyecto, comprobando identificador, ruta real y modo. Se actualizan los assets sin cambiar el origen de almacenamiento. Otro servidor recibe un mensaje claro; no se termina ningún proceso automáticamente.

## PWA y preferencias de lectura

La compilación de producción (`make s`) incluye manifest, iconos PNG y service worker. Instala desde el menú del navegador cuando sea compatible, usando localhost/127.0.0.1 o HTTPS. Desarrollo no registra el worker. Tras la primera visita con conexión, la interfaz, Charis y la guía funcionan sin conexión; los textos siguen en localStorage. La nueva IPA y el ejemplo integrado requieren el servidor local. Las respuestas API y los archivos importados no se almacenan en caché. Las actualizaciones se activan al cerrar todas las ventanas y volver a abrir.

Las flechas y el temporizador cambian la frase sin desplazar la página por defecto. Activa «Desplazar hasta la frase al cambiar» para seguir su fila; la preferencia se guarda. La navegación explícita por bloques sigue desplazando. La guía mantiene los símbolos, letras y ejemplos; el idioma de las pistas cambia solo la explicación. Es una guía breve con enlace al alfabeto completo. La reproducción utiliza únicamente voces locales de Web Speech, sin integración de TTS de pago ni tokens.

Se ignoran salida generada, cachés, grabaciones, archivos comprimidos y metadatos. Las capturas PNG redundantes están en `output/archive/screenshots`, ignorado; quedan dos imágenes para README. Se conservan las licencias y el lockfile npm. El índice Git y la publicación se gestionan manualmente: `.gitignore` no elimina archivos ya añadidos al índice.

## Espacio y archivos

El panel lateral se contrae en una columna estrecha con iconos y nombres completos en las pistas al pasar el cursor o enfocar con el teclado; permanece visible al leer y desplazar. El botón de interrogación abre preferencias guardadas de cabecera/panel/seguimiento y la ayuda IPA. Los ejemplos JSON/TXT/MD se descubren en examples y sus subcarpetas; abrirlos importa una copia editable en el navegador. Exporta el guion seleccionado desde el panel o usa JSON/TXT/Markdown/copia de biblioteca. Consulta [formatos y flujo de archivos](docs/FILES.md).

«Idiomas y columnas» junto al título permite elegir el idioma principal y las versiones adicionales. Los códigos también se configuran al crear un texto. Las columnas se alinean en escritorio y se apilan en móvil. IPA automática para ES/EN/RU; IPA manual para otros idiomas. JSON conserva las versiones ocultas. Véase [formato](docs/FILES.md).
