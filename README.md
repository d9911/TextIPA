# Text IPA

Local TypeScript workspace for voiceover rehearsal. Edit text beside IPA, set pauses, keep pronunciation notes and track rehearsed phrases. Russian, Spanish and English interfaces.

[Русский](README.ru.md) · [Español](README.es.md)

Requires Node.js 24+, npm and Make. Automatic IPA requires `espeak-ng` in PATH or an absolute `ESPEAK_BIN` environment variable.

```sh
make       # install locked dependencies, build, open localhost:8767
make dev   # development
make check # types, tests, formatting
make build # production assets
```

Create a script by pasting text or importing TXT, Markdown or JSON. Paragraphs become blocks. Generate draft IPA for Spanish (Spain/seseo), English (UK/US) or Russian; review it before recording. The seseo option replaces θ with s and does not model every regional accent. Browser playback uses available local language voices; it does not export an audio track.

Use reading mode, arrows and Space to rehearse. The timer estimates word count divided by reading speed plus the configured pause, rather than an audio timecode. Edits save in this browser's localStorage. Export a library JSON backup to transfer or restore scripts and preferences. Changing browser profile, host or port changes the storage location. Undo history ends on reload. Exact imported duplicates are ignored; changed versions remain separate.

The public Kolobok example includes Spanish, English and Russian text with independent draft IPA. The personal cable example remains local and is ignored by Git. Original files remain in `../cable/transcripts/rehearsal/`. The app does not require this example. Processing runs locally; dependency installation may require internet. Automatic translation, speech recognition and pronunciation scoring are not included. Enable “Show translation while reading” in the header settings to display and edit translations supplied in JSON.

Custom [LICENSE](LICENSE) remains unchanged. See [verification](docs/VERIFICATION.md), [source context](docs/CONTEXT.md) and the full guide for limits and technical sources.

## Technologies and structure

- TypeScript 7.0.2 for the browser, local API, launch scripts and tests.
- Vite 8.3.2 for development and production builds; no UI framework.
- Node.js 24+ with native TypeScript execution and the built-in test runner.
- eSpeak NG for local draft IPA; the browser's local speech voices for phrase playback.
- CSS variables, system/light/dark themes, native accessible controls and reduced-motion support.
- Prettier 3.9.9 and Make for formatting, checks and launch.

[src/app/main.ts](src/app/main.ts) contains the editor and rehearsal UI; [pronunciation guide](src/features/pronunciation/dialog.ts) contains searchable pronunciation help; [src/domain/library.ts](src/domain/library.ts) handles validation, imports and duplicate detection; [src/infrastructure/storage.ts](src/infrastructure/storage.ts) handles persistence. The src/infrastructure/server directory provides the local API. The scripts directory contains TypeScript launch/build scripts, tests contains regression tests and examples contains one optional script.

## First-run preferences and pronunciation help

The first launch follows the system theme and chooses the first supported browser language (RU, EN or ES; Russian fallback). Saved preferences take precedence. Both selectors remain available in the header.

The question-mark button opens separate Spanish and English sound guides: IPA symbols, spelling patterns, example words, approximate Russian mnemonics and articulation hints. Search by symbol, letters, word or Russian hint. Russian mnemonics are practice aids, not exact phonetic equivalents. Links lead to the official IPA interactive chart, Cambridge's English symbol guide and a JIPA Spanish illustration. The guide does not claim to cover every regional accent or every IPA symbol.

## Data and limits

Scripts are saved in this browser's localStorage, not automatically into the project folder. Export a library JSON backup regularly, especially before clearing browser data. A backup includes settings, notes and rehearsal progress. Import merges scripts; identical content is skipped and changed versions with the same ID get a new ID.

Accepted files: TXT, Markdown, project JSON, library JSON and the older Spanish segments_ipa.json. Maximum file size: 5 MB; pasted text: 500,000 characters; library: 300 projects; project: 10,000 phrases; phrase: 1,500 characters. Invalid files are rejected before library mutation.

Initial pause suggestions are 0.4 seconds after commas/semicolons/colons, 1 second after sentences and 2 seconds after paragraphs. You can edit them. The rehearsal estimate is words / words-per-minute × 60 + pause × multiplier.

## Commands and runtime

Use npm with the included package-lock.json. Make and make s install missing dependencies, check TypeScript, build and serve the app. Ctrl+C stops the server. Only one process can use port 8767.

```sh
make init
make format
make check
make build
NO_OPEN=1 make s
PORT=8768 make s
ESPEAK_BIN=/absolute/path/to/espeak-ng make s
```

A different port means a different browser storage origin. The legacy /ES_PAUSAS_IPA.html URL redirects to the app. A generic static file server will not provide the local IPA API.

## Release checklist

Run make check and make build, then verify make s in a browser. Keep the custom license intact and include the lockfile. This is a local application; a static GitHub Pages deployment alone cannot run its IPA backend. Repository publication, tags and releases are manual owner operations.

## Technical references

[Node.js TypeScript](https://nodejs.org/api/typescript.html) · [Vite API](https://vite.dev/guide/api-javascript.html) · [eSpeak NG phonemes](https://github.com/espeak-ng/espeak-ng/blob/master/docs/phonemes.md) · [IPA chart](https://www.internationalphoneticassociation.org/content/ipa-chart).

![Application](docs/images/app.jpg)

## URL navigation

Project, block, phrase, search and reading mode are restored from `project`, `block`, `phrase`, `q` and `focus=1`. Project and phrase links use their existing IDs, so phrase order changes do not retarget them. Use the in-app Back/Forward buttons or browser history; navigation does not undo or rewrite your edits. A missing selection opens an available script or phrase with a notice. Links select data already present in that browser; transfer scripts through JSON backup.

See [architecture and parameter rules](docs/ARCHITECTURE.md). Domain types remain in `src/types/domain.ts`; wire contracts are in `src/types/api.ts`, URL state/history in `src/app/navigation.ts`, DOM controls in `src/shared/ui/controls.ts` and the sound-guide presentation in `src/features/pronunciation/dialog.ts`.

## The voice workshop

Text IPA is a workspace for preparing a script before recording: shape the text, read the sounds, find the pauses, rehearse. The name is language-neutral; the current text/IPA modes support Spanish, English and Russian.

All phrases stay in one continuous list, also in reading mode. Blocks are jump destinations rather than collapsed or filtered sections. Search can narrow the list; clearing it restores the complete script. Adding a phrase scrolls to it and focuses the editor.

Themed dropdowns support rotating arrows, keyboard navigation (arrows, Home/End, Enter, Escape), type-to-jump and click-away dismissal. Motion respects the system's reduced-motion preference. Separate text and IPA size controls live in reading settings. IPA uses the bundled free [Charis 7.000](https://software.sil.org/charis/download/) regular webfont, distributed unchanged under [SIL OFL 1.1](public/fonts/charis/OFL.txt). Its support includes IPA Extensions and combining marks: [SIL character coverage](https://software.sil.org/charis/charset/). No font purchase, remote font request or runtime download is needed. The application's custom LICENSE remains separate. Better typography does not add missing phonemes to a generated transcription.

Repeated `make s` reuses a running production instance only if its application identifier, real checkout path and mode match. It rebuilds the assets and opens the existing address. A foreign server or different mode receives a readable error; no process is automatically killed. The existing origin and library key remain unchanged.

## PWA and reading preferences

Production builds (`make s`) include a manifest, PNG icons and a service worker. Install from the browser menu where supported, using localhost/127.0.0.1 or HTTPS. Development does not register a worker. After the first online visit the interface, Charis and guide work offline; scripts stay in localStorage. New IPA and the built-in sample require the local server. API responses and imports are excluded from the cache. Updates activate after all app windows close and reopen.

Arrow buttons and the timer change the reader phrase without scrolling by default. Enable “Scroll to the phrase when switching” in settings to follow its row; the preference persists. Explicit block navigation still scrolls to its row. The guide keeps a shared symbol/spelling/example base and changes only the explanation with the hint-language dropdown. It is a short guide with links to the complete IPA chart. Playback only selects local Web Speech voices and has no paid-token or cloud TTS integration.

Generated output, caches, recordings, archives and OS/editor metadata are ignored. Redundant PNG verification screenshots live in ignored `output/archive/screenshots`; two README images remain. Licenses and the npm lockfile are retained. Git index changes and publication remain manual: ignore rules do not remove files already added to the index.

## Workspace and files

The sidebar collapses to a narrow icon rail with full-name tooltips on hover or keyboard focus, staying visible while reading and scrolling. The header question button opens persisted header/sidebar/following preferences and IPA help. Built-in examples are discovered from JSON/TXT/MD in examples, including subfolders; selecting one imports an editable browser copy. Export the selected project directly from the rail or use JSON/TXT/Markdown/library backup in the workspace. See [file workflow and JSON format](docs/FILES.md).

Choose “Languages and columns” beside the script title or set language codes when creating a script. JSON supports additional language tags and keeps hidden versions. Desktop columns sit side by side; mobile columns stack. Automatic IPA processes selected ES/EN/RU columns; other languages support manually entered IPA. See [file format](docs/FILES.md).
