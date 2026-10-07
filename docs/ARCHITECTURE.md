# Architecture and URL contract

Text IPA remains a small vanilla TypeScript/Vite application. The directory structure follows a simplified separation of domain, application, UI and adapters.

## Ownership

| Folder               | Responsibility                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| `src/types`          | Pure project, phrase, preferences and API contracts                                  |
| `src/domain`         | Library parsing/validation, merging, export/timing rules, language/dialect defaults  |
| `src/infrastructure` | Browser persistence/PWA and Node-only HTTP/eSpeak/example-file adapters              |
| `src/shared/ui`      | Generic DOM factories, buttons/dialogs, dropdowns and popover placement              |
| `src/i18n`           | RU/EN/ES interface copy                                                              |
| `src/features`       | Example-file loading, preference menu, local-voice selection and pronunciation guide |
| `src/widgets`        | Header, sidebar, footer, reader, workspace and phrase-row presentation               |
| `src/app`            | Application state, actions, URL history and screen composition                       |
| `src/styles`         | Base/editor styles, shell styles and pronunciation-guide styles                      |

This is a small modular vanilla TypeScript architecture. It uses ownership and dependency direction without adding framework layers, Redux, dependency injection containers or empty FSD folders. Widgets receive callbacks and current data; they do not import the application controller. `src/app/main.ts` retains editor/rehearsal orchestration and its mutable application state; the substantial screen blocks are separate modules.

`tests/architecture.test.ts` checks allowed folder dependencies and rejects browser imports of server implementations or Node APIs. Domain imports only domain/types; shared UI imports only shared UI; types import only types. Infrastructure consumes domain/types. Features may use infrastructure adapters; widgets compose features/domain/shared UI; app composes the application. Styles are imported at the entry point. The check enforces these import boundaries, not all principles of Clean Architecture.

## Stable query parameters

- `project`: existing project ID, maximum 150 characters. IDs are not limited to UUIDs because legacy JSON can contain other IDs.
- `block`: exact stored block name, maximum 250 characters. An omitted or empty value starts at the current phrase or first phrase. A block value navigates to its first phrase; it does not filter the continuous list. Same-named blocks form one group, matching the existing model.
- `phrase`: existing phrase ID, maximum 150 characters, scoped to the selected project. Ordinal numbers are display only, so removing an earlier phrase does not retarget a link.
- `q`: phrase search, maximum 300 characters; searches text, IPA and notes. Search filters the continuous phrase list; clearing it restores all phrases.
- `focus=1`: rehearsal view. It is cleared if no phrase is available, keeping the editor accessible.

`URLSearchParams` encodes names, Unicode, spaces and punctuation. Duplicate known keys, control characters, oversized values and unsupported `focus` values are rejected. Unknown parameters and the hash remain intact.

Without a project parameter, navigation starts from the library's saved active project or its first project. Missing project IDs fall back to an available project and discard stale child selection. Missing blocks fall back to all blocks. Missing phrases select the first matching phrase. A valid phrase wins over a conflicting block when no search is active. Invalid selections display a localized notice and replace the URL with the resolved address. Nothing is imported or deleted by following a link.

## History and persistence

Explicit project, block, phrase and rehearsal-view choices create browser history entries. Search creates one entry per editing session and replaces it while typing; timer advancement replaces the current entry. Native browser Back/Forward and in-app controls restore the URL selection and stop playback. Back/Forward do not undo content edits.

A separate `sessionStorage` key, `espanol-text-ipa:navigation-session:v1`, tracks only the tab's navigation history bounds. It allows the in-app controls to remain accurate across reloads; foreign browser history state is preserved. If session storage is denied, native browser navigation and URL restoration still work; in-app history bounds restart on reload.

The existing library key `espanol-text-ipa:library:v1` and schema version 1 are unchanged. Following links and changing selection do not write localStorage or update project timestamps. Content edits, imports and preferences use the existing persistence path. The URL contains a selection and optional search text, not the script library; a link works only where that project already exists. JSON backup remains the transfer mechanism.

## Visual direction

The supplied design reference informs cream `#f2f0eb`, ceramic `#edebe9`, heading green `#006241`, CTA green `#00754a`, house green `#1e3932`, mint `#d4e9e2`, pills and gentle layered shadows. Rehearsal and footer use dark green; editor cards remain light or follow dark mode. The UI uses the local system fallback stack; IPA now uses bundled Charis 7.000 under its separate SIL OFL 1.1; no proprietary font, logo, remote font or commerce flow is added. Reduced-motion preferences remain supported.

## Themed controls, typography and startup

`src/shared/ui/dom.ts` owns the DOM factory. `src/shared/ui/dropdown.ts` depends on it and implements a themed single-select with native popover top-layer placement; `src/shared/ui/controls.ts` exposes the controls and localized labels without a runtime cycle. Menus keep focus on a combobox trigger and use `aria-activedescendant`, `aria-selected` and `aria-expanded` to describe keyboard selection. Popovers reposition on viewport changes and close on outside clicks. Modern browser popover support is required.

`src/widgets/editor/layout.ts` grows phrase fields to their actual shaped text height and reveals rows as they enter the viewport. Textarea internal scrolling is removed; all phrases remain rendered in a continuous list, including reading mode. Reduced motion disables entrance effects.

Settings include `ipaFontSize` (default 28, range 18–48). Old schema-v1 backups acquire the default while preserving existing settings; neither the schema nor localStorage key changes. Charis regular WOFF2 and its original OFL are in `public/fonts/charis`. It is served from the same local application origin.

`scripts/server-instance.ts` probes the configured local port and accepts reuse only when `/api/instance` reports Text IPA, the same realpath and the requested development/production mode. A mismatched process is not killed. Repeated production startup rebuilds assets on the existing server; Node/API source changes still require restarting that server in its owning terminal.

## Reader following, speech and PWA

`scrollToPhrase` is a schema-v1 optional boolean preference, default false. Arrow buttons, arrow keys and timer advance update the reader/selection/URL; they scroll the selected row only when this preference is enabled. Explicit block/row/add actions retain their requested navigation. All rows remain in the list. Legacy backups default false.

`src/features/pronunciation/sounds.ts` provides a shared searchable subset of IPA symbols, spellings and examples. `src/features/pronunciation/dialog.ts` switches only the pronunciation explanation language (RU/EN/ES); the base columns stay unchanged. Complete IPA is linked externally; no full-IPA coverage is claimed. `src/features/playback/voice.ts` chooses only local Web Speech voices, prefers the dialect, then falls back to a local voice of the same language. There is no remote-voice fallback or paid TTS integration.

`scripts/pwa.ts` is a build-only Vite plugin that runs after HTML generation, hashes emitted assets plus public files, and emits `dist/sw.js`. It precaches the immutable shell including index.html, CSS/JS, local font and install icons. Navigation is network-first with a cached HTML fallback; asset requests use the installed shell cache. Non-GET, foreign-origin and `/api/` requests are not intercepted. Imported personal files are not precached; library data remains in localStorage.

`src/infrastructure/pwa.ts` registers only in production, exposes localized offline/update/failure notices, and checks updates on window focus. There is no forced reload, skipWaiting or clients.claim. A new worker waits until all old app windows close, then removes only older `text-ipa-shell-*` caches. It never clears localStorage or unrelated caches. Install support requires a compatible browser and secure context (HTTPS or localhost).

PNG install icons are generated from the existing project SVG without new dependencies. The UI uses theme-coloured native scrollbar styling with a gradient thumb in WebKit/Blink and a solid-colour fallback in Firefox. Width/visibility can still be influenced by browser/OS scrollbar settings.

Generated browser evidence and redundant screenshots live under ignored output/. The repository keeps the two JPEG README images, the local IPA font, its OFL and package-lock.json. Git index changes remain manual.

## Shell and file catalog

`headerSticky` defaults true and `sidebarCollapsed` defaults false; legacy schema-v1 backups get these defaults. Both persist alongside scrollToPhrase. The header question button opens the preference popover, which contains all three switches and a guide action. Sidebar collapse changes the grid width and uses short visible action/project labels with full accessible names and title tooltips. The sidebar has its own scrolling area and sticky position; a ResizeObserver tracks the header height. Reading mode keeps header/sidebar accessible. Print styles omit the sidebar.

`GET /api/examples` discovers supported JSON/TXT/MD files under examples, recursively, excluding symlinks and files over the import limit. `GET /api/examples/file?name=...` only reads a name present in that catalog; traversal/unlisted names are rejected. Both routes use the existing localhost Host/Origin checks and no-store headers. The old cable-example route remains compatible. Example files use the normal import path, creating editable localStorage copies; source files are not rewritten. Reopening an identical import activates its existing copy rather than adding a duplicate. Changed imports retain the existing collision/duplicate rules.

The workspace offers current-project JSON, library-backup JSON, plain TXT and Markdown exports. Sidebar export directly downloads the current editable project JSON. TXT contains phrase text only; JSON retains IPA, blocks, pauses, notes and progress. Downloading a file does not automatically write it into examples; the user can place it there manually.

Pronunciation help uses Charis for both symbols and IPA-containing examples, fixed table columns on desktop, labelled cards on narrow screens, and a fixed dialog heading with separately scrolling body. Close buttons use a centered inline SVG. No remote icon library or paid font was added.

## Multilingual columns

Project language codes are independent of the RU/EN/ES interface locale. `domain/columns.ts` validates canonical language tags and resolves each phrase version. Project `columnLanguages` chooses visible versions; phrase `translations` stores independent text, IPA and status. Legacy single translations remain accepted. The column dialog can promote another version without deleting the previous source; JSON preserves hidden versions. Generation snapshots the project and processes supported ES/EN/RU columns in batches, committing only after all requests succeed and the snapshot still matches. Other language versions remain editable with manual IPA and locally available browser speech.
