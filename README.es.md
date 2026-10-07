# Text IPA

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md)

![Text IPA](public/TextIPA.svg)

![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-339933?logo=nodedotjs&logoColor=white)
![TypeScript 7.0.2](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript&logoColor=white)
![Vite 8.3.2](https://img.shields.io/badge/Vite-8.3.2-646CFF?logo=vite&logoColor=white)
![HTML & CSS](https://img.shields.io/badge/UI-HTML%20%26%20CSS-e34f26)
![PWA](https://img.shields.io/badge/App-PWA-5A0FC8)
![eSpeak NG](https://img.shields.io/badge/IPA-eSpeak_NG-006241)
![Prettier 3.9.9](https://img.shields.io/badge/Prettier-3.9.9-F7B93E?logo=prettier&logoColor=black)

Un taller local para preparar narraciones: versiones lingüísticas, IPA, traducciones y ensayo por frases. Pega un texto, elige sus columnas y lee con IPA sobre cada palabra o en una línea separada.

![Text IPA — lectura multilingüe](docs/images/app.jpg)

## Lectura y pronunciación

- Guion continuo, navegación por frases y desplazamiento opcional. Espacio activa/detiene el temporizador; las flechas cambian de frase.
- «Idiomas y columnas», junto al título, permite hasta ocho versiones en un JSON. Cambiar el idioma principal u ocultar columnas conserva otras versiones.
- El engranaje permite elegir **IPA sobre palabras** o **en línea separada**, traducciones, cabecera fija y panel compacto. Se guarda la elección; `ipa=above` / `ipa=line` en la URL reproducen la disposición.
- IPA provisional automática para español (España/seseo), inglés (UK/US) y ruso. Otros códigos admiten IPA importada/manual. Revisa la pronunciación antes de grabar.
- Las anotaciones usan parejas explícitas `wordIpa`, sin dividir arbitrariamente la IPA de la frase. Se generan por separado y pueden diferir del habla continua; se conserva la transcripción de la frase. Sin anotaciones válidas se muestra la línea separada.
- Voces locales del navegador, ritmo, tamaños de texto/IPA y pausas. Las voces dependen del sistema; no se usan servicios de tokens de pago.
- Temas claro/oscuro/sistema, menús y tooltips propios, panel de iconos, columnas adaptables y movimiento reducido.

![Text IPA — IPA en línea separada](docs/images/reader-line.jpg)

## Ejemplos y archivos

La primera visita abre [Kolobok](examples/kolobok-es-ru.json): diez frases en español, inglés y ruso con IPA provisional independiente y anotaciones por palabra. [Hello](examples/hello-multilingual.json) es una plantilla JSON pequeña; su IPA rusa está vacía para prepararla localmente.

TXT/Markdown crean el texto principal. JSON conserva versiones, IPA, anotaciones, pausas y notas. Exporta JSON/TXT del texto, Markdown de columnas seleccionadas o una copia de la biblioteca. Importar crea una copia editable en el navegador y no modifica el archivo original.

## Tecnologías

| Área               | Implementación                                                 |
| ------------------ | -------------------------------------------------------------- |
| Interfaz           | TypeScript, HTML semántico, variables CSS; sin React/Next.js   |
| Compilación        | Vite 8.3.2, TypeScript 7.0.2                                   |
| API local          | Node.js 24+, middleware Vite, eSpeak NG                        |
| Fuente IPA         | Charis 7.000 local, licencia gratuita SIL OFL 1.1              |
| Almacenamiento     | localStorage y copias JSON portátiles                          |
| Aplicación offline | Manifest, iconos y service worker generado por la compilación  |
| Verificación       | Node test runner, TypeScript, Prettier 3.9.9 y navegador local |

## Desarrollo local

Requiere **Node.js 24+**, npm y Make. La IPA automática necesita **eSpeak NG** en PATH o una ruta absoluta en `ESPEAK_BIN`. No requiere base de datos ni Docker.

```sh
make            # instalar si hace falta, compilar y abrir localhost:8767
make start      # lo mismo (alias: make s / make S)
make init       # instalar sin iniciar
make dev        # servidor de desarrollo
make check      # TypeScript, pruebas y formato
make build      # HTML, CSS, JavaScript y PWA → dist/
make format     # Prettier
```

Sin Make: `npm start` o `npm run dev`. El lanzador utiliza el lockfile y comprueba las versiones directas. Los inicios de producción repetidos recompilan y reutilizan un servidor compatible del proyecto; un servidor ajeno produce un aviso de conflicto. `PORT` cambia el puerto local; `NO_OPEN=1` evita abrir el navegador. La ejecución en Windows no se ha verificado aquí.

## Estructura

- `src/types/`: contratos de datos/API; `src/domain/`: validación, importación, versiones y anotaciones.
- `src/widgets/`: header, sidebar, workspace, editor, reader y footer.
- `src/features/`: preferencias, ejemplos, guía fonética y reproducción.
- `src/shared/ui/`: controles, dropdowns, popovers y tooltips propios.
- `src/infrastructure/`: almacenamiento, PWA y servidor local; `src/i18n/`: interfaz RU/EN/ES.
- `src/app/`: estado y navegación; `src/styles/`: tema y disposición.
- `scripts/`: inicio/compilación/PWA; `tests/`: regresión; `examples/`: demos JSON; `public/`: portada, iconos y fuentes.

TypeScript es el código fuente. `dist/`, dependencias, diagnósticos y ejemplos personales están ignorados; no edites los archivos generados.

## Privacidad y uso offline

Textos y ajustes se guardan en localStorage de este navegador. La IPA envía el texto seleccionado solamente al servidor local `127.0.0.1`, que ejecuta eSpeak NG. No hay analítica, traducción automática ni TTS en la nube. Exporta JSON antes de borrar datos. Otro perfil, dirección o puerto usa un almacenamiento independiente.

Tras una carga de producción online, la aplicación almacenada y los textos guardados funcionan offline. La nueva IPA y el catálogo requieren el servidor local. El service worker guarda archivos de la aplicación, no respuestas API ni texto personal; actualiza al cerrar las ventanas. Los badges del README proceden de Shields.io y no forman parte de la aplicación.

## Notas y licencia

La IPA es provisional, no una garantía de pronunciación. El temporizador estima lectura, no duración de audio; no incluye reconocimiento ni evaluación.

Lee las condiciones completas en [LICENSE](LICENSE), que tiene prioridad sobre este README. Charis utiliza su propia [licencia SIL OFL](public/fonts/charis/OFL.txt).

[![License: see LICENSE](https://img.shields.io/badge/license-see_LICENSE-blue)](LICENSE)
