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

A local workspace for preparing voiceover scripts: multilingual text, IPA, translations and phrase-by-phrase rehearsal. Paste a script, choose its language columns and practise with pronunciation above each word or on a separate line.

![Text IPA — multilingual reading](docs/images/app.jpg)

## Reading and pronunciation

- One continuous script, with phrase navigation and optional following scroll. Space starts/stops the rehearsal timer; arrows move between phrases.
- “Languages and columns” beside the title selects up to eight language versions in one JSON file. Changing the source or hiding a column preserves other versions.
- The gear menu selects **above-word IPA** or the **separate-line layout**, translation visibility, pinned header and compact sidebar. Choices persist after reload; `ipa=above` / `ipa=line` in the URL reproduce the layout.
- Automatic draft IPA for Spanish (Spain/seseo), English (UK/US) and Russian. Other language tags support imported/manual IPA; pronunciation needs review before recording.
- Above-word IPA uses explicit `wordIpa` pairs, never a guessed split of sentence IPA. Word drafts are generated separately and can differ from connected speech; the sentence transcription stays available. Missing/stale annotations fall back to the separate line.
- Local browser speech, adjustable pace, text/IPA sizes and pauses. Availability depends on installed local voices; playback uses no paid-token service.
- Light/dark/system themes, custom menus/tooltips, compact icon sidebar, responsive columns and reduced-motion support.

![Text IPA — separate-line layout](docs/images/reader-line.jpg)

## Examples and files

The first visit opens [Kolobok](examples/kolobok-es-ru.json): ten phrases in Spanish, English and Russian, each with independent draft IPA and word annotations. [Hello](examples/hello-multilingual.json) is a small three-language JSON template; Russian IPA is deliberately empty and can be prepared locally.

TXT/Markdown create a source script. JSON preserves language versions, IPA, word annotations, pauses and notes. Export the current JSON, a library backup, source TXT or Markdown with selected columns. Imports create editable browser copies; they do not overwrite the source files.

## Technologies

| Area         | Implementation                                                     |
| ------------ | ------------------------------------------------------------------ |
| Browser UI   | TypeScript, semantic HTML, CSS variables; no React/Next.js         |
| Build        | Vite 8.3.2, TypeScript 7.0.2                                       |
| Local API    | Node.js 24+, Vite middleware, eSpeak NG                            |
| IPA font     | Locally served Charis 7.000, free SIL OFL 1.1                      |
| Storage      | Browser localStorage; portable JSON backups                        |
| Offline app  | Manifest, icons and versioned build-generated service worker       |
| Verification | Node test runner, TypeScript, Prettier 3.9.9; local browser checks |

## Local development

Requires **Node.js 24+**, npm and Make; automatic IPA additionally requires **eSpeak NG** in PATH or an absolute `ESPEAK_BIN`. No database or Docker is required.

```sh
make            # install if needed, build, start and open localhost:8767
make start      # same (aliases: make s / make S)
make init       # install dependencies without starting
make dev        # development server
make check      # TypeScript, tests and formatting
make build      # production HTML, CSS, JavaScript and PWA → dist/
make format     # apply Prettier
```

Without Make, use `npm start` or `npm run dev`. The launcher uses the lockfile and checks direct dependency versions. Repeated production starts rebuild assets and reuse a matching server for this checkout; a conflicting server is reported. `PORT` chooses another local port, `NO_OPEN=1` disables automatic browser opening. Windows execution has not been verified here.

## Structure

- `src/types/`: shared data/API contracts; `src/domain/`: validation, imports, language versions and word annotations.
- `src/widgets/`: header, sidebar, workspace, editor, reader and footer.
- `src/features/`: preferences, example catalog, pronunciation help and playback.
- `src/shared/ui/`: controls, custom dropdowns, popovers and tooltips.
- `src/infrastructure/`: persistence, PWA and local server adapters; `src/i18n/`: RU/EN/ES interface copy.
- `src/app/`: application state and navigation; `src/styles/`: theme and layout.
- `scripts/`: launch/build/PWA; `tests/`: regression tests; `examples/`: public JSON demos; `public/`: logo, icons and fonts.

TypeScript is the source. `dist/`, dependencies, diagnostics and personal samples are ignored; do not edit generated assets.

## Privacy and offline use

Scripts and settings are stored in this browser's localStorage. IPA sends selected text only to the running local server on `127.0.0.1`, which invokes eSpeak NG. No analytics, automatic translation API or cloud TTS is integrated. Back up JSON before clearing site data. Another browser profile, host or port has separate storage.

After an online production load, cached app files and saved scripts work offline. New IPA and the example catalog need the local server. The service worker caches app files, not API responses or personal text, and activates updates after app windows close. README badges come from Shields.io and are not part of the application.

## Notes and license

IPA is a draft, not a pronunciation guarantee. The timer estimates reading time, not audio duration; speech recognition and scoring are not included.

Read the complete terms in [LICENSE](LICENSE). That file takes priority; this README does not replace it. Charis has its own [SIL OFL license](public/fonts/charis/OFL.txt).

[![License: see LICENSE](https://img.shields.io/badge/license-see_LICENSE-blue)](LICENSE)
