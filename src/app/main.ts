import { mountNotifications, showNotification } from '../widgets/notifications/view.ts';
import type { NoticeKind } from '../domain/notifications.ts';
import { workspaceView } from '../widgets/workspace/view.ts';
import { headerView } from '../widgets/header/view.ts';
import { sidebarView } from '../widgets/sidebar/view.ts';
import { footerView } from '../widgets/footer/view.ts';
import { scrollNavigation, watchScrollNavigation } from '../widgets/scroll-navigation/view.ts';
import { readerView } from '../widgets/reader/view.ts';
import { editorRows } from '../widgets/editor/rows.ts';
import { applyShellSettings, watchHeader, watchFooter } from './shell.ts';
import { showExamples } from '../features/library/examples-dialog.ts';
import '../styles/index.css';
import '../styles/shell.css';
import '../styles/sidebar.css';
import '../styles/pronunciation.css';
import '../styles/responsive.css';
import { setupPwa } from '../infrastructure/pwa.ts';
import { localVoice } from '../features/playback/voice.ts';
import { resizePhraseFields } from '../widgets/editor/layout.ts';
import { matchingPhrases, NavigationHistory, navigationUrl, resolveNavigation, initialNavigation } from './navigation.ts';
import type { NavigationState } from './navigation.ts';
import type { HealthResponse, IpaRequest, IpaResponse } from '../types/api.ts';
import { showPronunciationGuide } from '../features/pronunciation/dialog.ts';
import { button, dialog as createDialog, element, labelled, select } from '../shared/ui/controls.ts';
import type { Dialect, Language, Library, Phrase, Project, Settings } from '../types/domain.ts';
import { locales, languageNames } from '../i18n/locales.ts';
import { decodeImport, durationMs, mergeProjects, fingerprint, projectFromText, validateLibrary, maxImportBytes } from '../domain/library.ts';
import { loadReadingPosition, saveReadingPosition } from '../infrastructure/storage.ts';
import { LibraryStorage } from '../infrastructure/library-storage.ts';
import { indexedLibraryDatabase } from '../infrastructure/library-database.ts';
import { bundledExample } from '../infrastructure/example.ts';
import { restoreExamplePronunciation } from '../domain/example-pronunciation.ts';
import { engineLanguage, languageTag, projectColumns, phraseVersion, editableVersion, readingLanguage, pronunciationDialect } from '../domain/columns.ts';
import { ipaWords, validWordIpa, displayWordIpa } from '../domain/word-ipa.ts';
import { requestWordAnnotations } from '../features/pronunciation/word-annotations.ts';
import { columnSettings } from '../features/preferences/columns-dialog.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
const libraryStorage = new LibraryStorage(browserStorage, typeof indexedDB === 'undefined' ? undefined : indexedLibraryDatabase(indexedDB));
const loaded = await libraryStorage.load(navigator.languages);
let library: Library = loaded.library;
let storageFailed = loaded.error;
if (!loaded.error) {
  let changed = false;
  const requested = new URL(window.location.href).searchParams.get('project');
  const firstVisit = !loaded.existing;
  if (
    (firstVisit || requested === bundledExample.id) &&
    library.projects.length < 300 &&
    !library.projects.some((project) => project.id === bundledExample.id)
  ) {
    library.projects.push(structuredClone(bundledExample));
    library.activeId ??= bundledExample.id;
    changed = true;
  }
  for (const project of library.projects) changed = restoreExamplePronunciation(project, bundledExample) || changed;
  if (changed) storageFailed = !(await libraryStorage.save(library));
}
let message = loaded.error ? locales[library.settings.locale].corrupt : storageFailed ? locales[library.settings.locale].storageError : '';
let savePending = false;
let saveRevision = 0;
let engineAvailable = false;
let engineChecking = true;
let generatedCount = 0;
let generationTotal = 0;
let busy = false;
let focusedId: string | null = null;
let selectedBlock = '';
let search = '';
let focusMode = false;
let playing = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let timerTick: ReturnType<typeof setInterval> | undefined;
let timerDeadline = 0;
let timerTotal = 0;
let voiceSpeaking = false;
const editHistory: string[] = [];
const annotationPending = new Set<string>();
const annotationFailed = new Set<string>();
let annotationQueue = Promise.resolve();
const navigation = new NavigationHistory(window);
let rowsHost: HTMLElement | null = null;
const t = () => locales[library.settings.locale];
const current = () => library.projects.find((p) => p.id === library.activeId);
const focused = () => current()?.phrases.find((q) => q.id === focusedId);
function checkpoint(): void {
  editHistory.push(JSON.stringify(library));
  if (editHistory.length > 20) editHistory.shift();
}
function notify(text: string, kind: NoticeKind = 'warning'): void {
  showNotification(text, kind);
}
function persist(): void {
  const p = current();
  if (p) p.updatedAt = new Date().toISOString();
  queueSave();
  const undoEl = document.querySelector<HTMLButtonElement>('#undo-button');
  if (undoEl) undoEl.disabled = busy || !editHistory.length;
  updateStats();
}
function updateSaveStatus(): void {
  const status = document.querySelector('#save-status');
  if (status) {
    status.textContent = savePending ? t().saving : storageFailed ? t().unsaved : t().saved;
    status.classList.toggle('failure', storageFailed && !savePending);
  }
}
function queueSave(): void {
  const revision = ++saveRevision;
  savePending = true;
  updateSaveStatus();
  void libraryStorage.save(library).then((saved) => {
    if (revision !== saveRevision) return;
    savePending = false;
    storageFailed = !saved;
    updateSaveStatus();
    if (!saved) notify(t().storageError, 'error');
  });
}
function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const copy = t();
  return (
    (
      {
        INVALID_FILE: copy.invalid,
        FILE_TOO_LARGE: copy.tooLarge,
        EMPTY_TEXT: copy.emptyText,
        ENGINE_MISSING: copy.engineMissing,
        ENGINE_BUSY: copy.engineBusy,
        ENGINE_TIMEOUT: copy.engineError,
        ENGINE_FAILED: copy.engineError,
        STALE: copy.stale,
      } as Record<string, string>
    )[code] ?? copy.error
  );
}
function stop(): void {
  clearTimeout(timer);
  clearInterval(timerTick);
  timerDeadline = 0;
  playing = false;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  voiceSpeaking = false;
}
function navigationState(): NavigationState {
  return { projectId: library.activeId, block: selectedBlock, phraseId: focusedId, query: search, focus: focusMode, ipaDisplay: library.settings.ipaDisplay };
}
function syncNavigation(mode: 'push' | 'replace' = 'replace'): void {
  if (!search && selectedBlock && focused() && focused()!.block !== selectedBlock) {
    selectedBlock = focused()!.block;
    const blocks = document.querySelector<HTMLElement & { value: string }>('.block-select .custom-select');
    if (blocks) blocks.value = selectedBlock;
  }
  navigation.write(navigationUrl(new URL(window.location.href), navigationState()), mode);
  if (!loaded.error) {
    const position = new URL(navigationUrl(new URL(window.location.origin), navigationState()), window.location.origin).searchParams;
    if (!saveReadingPosition(browserStorage, position)) {
      storageFailed = true;
      notify(t().storageError, 'error');
    }
    queueSave();
  }
  updateNavigationControls();
}
function restoreNavigation(initial = false): void {
  stop();
  const params = new URL(window.location.href).searchParams;
  const result = resolveNavigation(initial ? initialNavigation(params, loadReadingPosition(browserStorage)) : params, library);
  library.activeId = result.state.projectId;
  selectedBlock = result.state.block;
  focusedId = result.state.phraseId;
  search = result.state.query;
  focusMode = result.state.focus;
  if (result.state.ipaDisplay !== library.settings.ipaDisplay) {
    library.settings.ipaDisplay = result.state.ipaDisplay!;
    queueSave();
  }
  if (result.corrected) message = t().linkAdjusted;
  syncNavigation();
}
function updateNavigationControls(): void {
  const back = document.querySelector<HTMLButtonElement>('#navigation-back');
  const forward = document.querySelector<HTMLButtonElement>('#navigation-forward');
  if (back) back.disabled = !navigation.canBack;
  if (forward) forward.disabled = !navigation.canForward;
  const trail = document.querySelector<HTMLElement>('.navigation-trail');
  const p = current();
  const q = focused();
  if (trail && p) {
    trail.textContent = [p.title, selectedBlock || t().allBlocks, q ? t().selected + ' ' + (p.phrases.indexOf(q) + 1) : ''].filter(Boolean).join(' / ');
    trail.title = trail.textContent;
  }
}
function activate(project: Project): void {
  stop();
  library.activeId = project.id;
  focusedId = project.phrases[0]?.id ?? null;
  selectedBlock = '';
  search = '';
  syncNavigation('push');
  render();
}
function visiblePhrases(): Phrase[] {
  return matchingPhrases(current()?.phrases ?? [], '', search);
}
function ensureFocus(): void {
  if (selectedBlock && !current()?.phrases.some((q) => q.block === selectedBlock)) selectedBlock = '';
  const rows = visiblePhrases();
  if (!rows.some((q) => q.id === focusedId)) focusedId = rows[0]?.id ?? null;
  if (!focusedId) focusMode = false;
}
function updateStats(): void {
  const p = current();
  if (!p) return;
  const count = p.phrases.filter((q) => q.done).length;
  const words = p.phrases.reduce((n, q) => n + q.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const stats = document.querySelector('#stats');
  if (stats)
    stats.textContent = words + ' ' + t().words + ' · ' + p.phrases.length + ' ' + t().phrases + ' · ' + count + '/' + p.phrases.length + ' ' + t().practiced;
  const bar = document.querySelector<HTMLProgressElement>('#practice-progress');
  if (bar) {
    bar.max = p.phrases.length;
    bar.value = count;
  }
}
function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = element('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function undo(): void {
  const previous = editHistory.pop();
  if (!previous) return;
  stop();
  library = JSON.parse(previous) as Library;
  focusedId = current()?.phrases[0]?.id ?? null;
  selectedBlock = '';
  search = '';
  persist();
  render();
}
function importProjects(projects: Project[], settings?: Settings, activeId?: string | null): void {
  const result = mergeProjects(library.projects, projects);
  if (!result.added && !settings) {
    const existing = library.projects.find((project) => projects.some((incoming) => fingerprint(incoming) === fingerprint(project)));
    if (existing) activate(existing);
    notify(t().duplicate);
    return;
  }
  checkpoint();
  library.projects = result.projects;
  if (settings) library.settings = settings;
  const target = result.projects.find((p) => p.id === activeId) ?? result.projects[result.projects.length - 1];
  if (target) {
    activate(target);
    persist();
  } else {
    stop();
    library.activeId = null;
    persist();
    render();
  }
  notify(t().imported + ': ' + result.added, 'success');
}
async function importFiles(files: readonly File[], language: Language): Promise<void> {
  try {
    const projects: Project[] = [];
    let settings: Settings | undefined;
    let activeId: string | null | undefined;
    for (const file of files) {
      if (file.size > maxImportBytes) throw new Error('FILE_TOO_LARGE');
      const text = await file.text();
      projects.push(...decodeImport(text, file.name, language));
      if (file.name.toLowerCase().endsWith('.json')) {
        const x = JSON.parse(text) as Record<string, unknown>;
        if (x.schemaVersion === 1) {
          const backup = validateLibrary(x);
          settings = backup.settings;
          activeId = backup.activeId;
        }
      }
    }
    importProjects(projects, settings, activeId);
  } catch (error) {
    notify(errorMessage(error), 'error');
  }
}
function chooseImport(files: readonly File[]): void {
  if (!files.length) return;
  if (files.every((f) => f.name.toLowerCase().endsWith('.json'))) {
    void importFiles(files, 'es');
    return;
  }
  const d = dialog(t().import);
  const language = select(Object.entries(languageNames), current()?.language ?? 'es', () => {});
  d.body.append(element('p', 'muted', files.map((f) => f.name).join(', ')), labelled(t().textLanguage, language));
  d.body.append(
    button(
      t().import,
      () => {
        const value = language.value as Language;
        d.dialog.close();
        void importFiles(files, value);
      },
      'button primary',
    ),
  );
  d.dialog.showModal();
}
function dialog(title: string) {
  return createDialog(title, t().close);
}
function newProject(): void {
  const d = dialog(t().new);
  const form = element('form');
  form.append(element('p', 'muted', t().newHint));
  const name = element('input');
  name.required = true;
  name.maxLength = 200;
  name.placeholder = t().titlePlaceholder;
  const language = element('input');
  language.value = 'es';
  language.maxLength = 35;
  language.required = true;
  const columns = element('input');
  columns.placeholder = 'en, ru';
  columns.maxLength = 300;
  const text = element('textarea', 'import-text');
  text.required = true;
  text.maxLength = 500000;
  text.placeholder = t().textPlaceholder.replace(/\n/g, '\n');
  form.append(labelled(t().project, name), labelled(t().sourceLanguageCode, language), labelled(t().columnLanguageCodes, columns), labelled(t().paste, text));
  const error = element('p', 'error');
  error.setAttribute('role', 'alert');
  form.append(error);
  const actions = element('div', 'actions');
  const submit = element('button', 'button primary', t().create);
  submit.type = 'submit';
  actions.append(
    button(t().cancel, () => d.dialog.close()),
    submit,
  );
  form.append(actions);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const primary = languageTag(language.value.trim());
      const selected = columns.value
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean)
        .map(languageTag);
      if (selected.length > 7 || new Set([primary, ...selected]).size !== selected.length + 1) throw new Error('INVALID_FILE');
      const project = projectFromText(name.value, text.value, primary);
      project.columnLanguages = [primary, ...selected];
      library.settings.showTranslation = selected.length > 0;
      importProjects([project]);
      d.dialog.close();
    } catch (e) {
      error.textContent = errorMessage(e);
    }
  });
  d.body.append(form);
  d.dialog.showModal();
  name.focus();
}
function showGuide(): void {
  showPronunciationGuide(library.settings.locale);
}
function range(label: string, key: 'fontSize' | 'ipaFontSize' | 'wpm' | 'rate' | 'pauseMultiplier', min: number, max: number, step: number): HTMLElement {
  const control = element('input');
  control.type = 'range';
  control.min = String(min);
  control.max = String(max);
  control.step = String(step);
  control.value = String(library.settings[key]);
  const out = element('output', '', control.value);
  const wrapper = element('div', 'range-control');
  wrapper.append(control, out);
  control.addEventListener('input', () => {
    library.settings[key] = Number(control.value);
    out.value = control.value;
    document.documentElement.style.setProperty('--reading-size', library.settings.fontSize + 'px');
    document.documentElement.style.setProperty('--ipa-size', library.settings.ipaFontSize + 'px');
    resizePhraseFields();
    persist();
    if (playing) schedule();
  });
  return labelled(label, wrapper);
}
function move(direction: number): void {
  const rows = visiblePhrases();
  const at = rows.findIndex((q) => q.id === focusedId);
  const next = rows[at + direction];
  if (!next) {
    if (playing) {
      stop();
      renderReader();
    }
    return;
  }
  focusedId = next.id;
  syncNavigation(playing ? 'replace' : 'push');
  if (playing) schedule();
  renderReader();
  highlightRows(library.settings.scrollToPhrase);
}
function highlightRows(scroll = true): void {
  for (const row of document.querySelectorAll<HTMLElement>('.phrase-row')) row.classList.toggle('selected', row.dataset.id === focusedId);
  if (scroll) document.querySelector<HTMLElement>('.phrase-row.selected')?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
}
function schedule(): void {
  clearTimeout(timer);
  clearInterval(timerTick);
  const q = focused();
  if (!q || !playing) return;
  timerTotal = durationMs(phraseVersion(current()!, q, readingLanguage(current()!)).text, library.settings.wpm, q.pauseMs, library.settings.pauseMultiplier);
  timerDeadline = performance.now() + timerTotal;
  timer = setTimeout(() => move(1), timerTotal);
  timerTick = setInterval(updateTimerDisplay, 100);
  updateTimerDisplay();
}
function updateTimerDisplay(): void {
  const remaining = Math.max(0, timerDeadline - performance.now());
  const label = document.querySelector('#timer-countdown');
  const progress = document.querySelector<HTMLProgressElement>('#timer-progress');
  if (label && playing) label.textContent = (remaining / 1000).toFixed(1) + ' ' + t().seconds;
  if (progress && playing) {
    progress.max = timerTotal;
    progress.value = Math.max(0, timerTotal - remaining);
  }
}
function jump(edge: 'first' | 'last'): void {
  if (search) {
    const rows = current()?.phrases ?? [];
    focusedId = (edge === 'first' ? rows[0] : rows.at(-1))?.id ?? null;
    search = '';
    selectedBlock = '';
    syncNavigation('push');
    if (playing) schedule();
    render();
    highlightRows(library.settings.scrollToPhrase);
    return;
  }
  const rows = visiblePhrases();
  const at = rows.findIndex((q) => q.id === focusedId);
  move((edge === 'first' ? 0 : rows.length - 1) - at);
}
function toggleTimer(): void {
  if (playing) stop();
  else {
    stop();
    playing = true;
    schedule();
  }
  renderReader();
}
function listen(): void {
  const q = focused();
  const p = current();
  if (!q || !p) return;
  stop();
  if (!('speechSynthesis' in window)) {
    notify(t().noVoice);
    renderReader();
    return;
  }
  const code = readingLanguage(p);
  if (!phraseVersion(p, q, code).text.trim()) {
    notify(t().noTranslation);
    renderReader();
    return;
  }
  const voice = localVoice(speechSynthesis.getVoices(), code, pronunciationDialect(p, code));
  if (!voice) {
    notify(t().noVoice);
    renderReader();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(phraseVersion(p, q, code).text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = library.settings.rate;
  voiceSpeaking = true;
  utterance.onend = () => {
    voiceSpeaking = false;
    renderReader();
  };
  utterance.onerror = () => {
    voiceSpeaking = false;
    notify(t().noVoice);
    renderReader();
  };
  speechSynthesis.speak(utterance);
  renderReader();
}
function renderReader(): void {
  const host = document.querySelector('#reader');
  if (!host) return;
  const active = document.activeElement;
  const controlLabel = active instanceof HTMLButtonElement && host.contains(active) ? active.getAttribute('aria-label') : null;
  host.replaceChildren();
  const q = focused();
  const p = current();
  if (!q || !p) return;
  readerView(host, {
    project: p,
    phrase: q,
    copy: t(),
    playing,
    timerTotal: playing
      ? timerTotal
      : durationMs(phraseVersion(current()!, q, readingLanguage(current()!)).text, library.settings.wpm, q.pauseMs, library.settings.pauseMultiplier),
    timerRemaining: playing ? Math.max(0, timerDeadline - performance.now()) : undefined,
    voiceSpeaking,
    focusMode,
    showTranslation: library.settings.showTranslation,
    locale: library.settings.locale,
    ipaDisplay: library.settings.ipaDisplay,
    move,
    jump,
    timer: toggleTimer,
    listen: () => {
      if (voiceSpeaking) {
        stop();
        renderReader();
      } else listen();
    },
    focus: () => {
      focusMode = !focusMode;
      syncNavigation('push');
      render();
    },
  });
  if (controlLabel) {
    const control = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === controlLabel);
    control?.focus({ preventScroll: true });
  }
  prepareFocusedAnnotations(p, q);
}
function prepareFocusedAnnotations(project: Project, phrase: Phrase): void {
  if (library.settings.ipaDisplay !== 'above' || !engineAvailable || busy) return;
  const columns = library.settings.showTranslation ? projectColumns(project) : [readingLanguage(project)];
  for (const code of columns) {
    if (!engineLanguage(code)) continue;
    const version = phraseVersion(project, phrase, code);
    if (!version.ipa.trim() || displayWordIpa(version)) continue;
    const dialect = pronunciationDialect(project, code) as Dialect;
    const snapshot = { text: version.text, ipa: version.ipa, ipaStatus: version.ipaStatus };
    const key = JSON.stringify([project.id, phrase.id, code, dialect, snapshot]);
    if (annotationPending.has(key) || annotationFailed.has(key)) continue;
    annotationPending.add(key);
    annotationQueue = annotationQueue.then(async () => {
      try {
        if (busy || current() !== project || focused() !== phrase || library.settings.ipaDisplay !== 'above') return;
        const wordIpa = await requestWordAnnotations(snapshot.text, code, dialect);
        const live = phraseVersion(project, phrase, code);
        if (busy || current() !== project || focused() !== phrase || pronunciationDialect(project, code) !== dialect) return;
        if (live.text !== snapshot.text || live.ipa !== snapshot.ipa || live.ipaStatus !== snapshot.ipaStatus) return;
        editableVersion(project, phrase, code).wordIpa = wordIpa;
        persist();
        renderReader();
      } catch {
        annotationFailed.add(key);
      } finally {
        annotationPending.delete(key);
      }
    });
  }
}
async function generate(): Promise<void> {
  const p = current();
  if (!p || busy) return;
  const tasks = projectColumns(p)
    .filter(engineLanguage)
    .map((code) => {
      const rows = p.phrases
        .filter((q) => {
          const version = phraseVersion(p, q, code);
          return version.text.trim() && (version.ipaStatus !== 'reviewed' || !validWordIpa(version));
        })
        .map((q) => ({ id: q.id, version: phraseVersion(p, q, code) }));
      return {
        code,
        dialect: pronunciationDialect(p, code) as Dialect,
        rows,
        words: [...new Set(rows.flatMap((row) => ipaWords(row.version.text)))],
      };
    });
  if (!tasks.some((task) => task.rows.length)) return;
  stop();
  const snapshot = structuredClone(p);
  busy = true;
  generatedCount = 0;
  generationTotal = tasks.reduce((count, task) => count + task.rows.filter((row) => row.version.ipaStatus !== 'reviewed').length + task.words.length, 0);
  render();
  try {
    const request = async (texts: string[], language: Language, dialect: Dialect): Promise<string[]> => {
      const result: string[] = [];
      for (let at = 0; at < texts.length; at += 40) {
        const batch = texts.slice(at, at + 40);
        const res = await fetch('/api/ipa', {
          signal: AbortSignal.timeout(45000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, language, dialect } satisfies IpaRequest),
        });
        const data = (await res.json()) as IpaResponse;
        if (!res.ok) throw new Error(data.error ?? 'ENGINE_FAILED');
        if (!Array.isArray(data.ipa) || data.ipa.length !== batch.length || data.ipa.some((value) => typeof value !== 'string'))
          throw new Error('ENGINE_FAILED');
        result.push(...data.ipa);
        generatedCount += batch.length;
        const progress = document.querySelector<HTMLProgressElement>('#generation-progress');
        if (progress) progress.value = generatedCount;
        const label = document.querySelector('#generation-label');
        if (label) label.textContent = t().generating + ' ' + generatedCount + '/' + generationTotal;
      }
      return result;
    };
    const results: { id: string; code: string; ipa: string; reviewed: boolean; wordIpa: NonNullable<Phrase['wordIpa']> }[] = [];
    for (const task of tasks) {
      const drafts = task.rows.filter((row) => row.version.ipaStatus !== 'reviewed');
      const sentenceIpa = await request(
        drafts.map((row) => row.version.text),
        task.code,
        task.dialect,
      );
      const sentences = new Map(drafts.map((row, index) => [row.id, sentenceIpa[index]!]));
      const wordIpa = await request(task.words, task.code, task.dialect);
      const words = new Map(task.words.map((word, index) => [word, wordIpa[index]!]));
      for (const row of task.rows)
        results.push({
          id: row.id,
          code: task.code,
          ipa: sentences.get(row.id) ?? row.version.ipa,
          reviewed: row.version.ipaStatus === 'reviewed',
          wordIpa: ipaWords(row.version.text).map((word) => ({ word, ipa: words.get(word)! })),
        });
    }
    const live = library.projects.find((q) => q.id === snapshot.id);
    if (!live || JSON.stringify(live) !== JSON.stringify(snapshot)) throw new Error('STALE');
    checkpoint();
    for (const result of results) {
      const phrase = live.phrases.find((q) => q.id === result.id)!;
      const version = editableVersion(live, phrase, result.code);
      version.ipa = result.ipa;
      version.ipaStatus = result.reviewed ? 'reviewed' : 'draft';
      version.wordIpa = result.wordIpa;
    }
    persist();
    notify(t().ready, 'success');
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    busy = false;
    render();
  }
}

function renderRows(): void {
  if (!rowsHost) return;
  rowsHost.replaceChildren();
  ensureFocus();
  syncNavigation();
  const p = current();
  if (!p) return;
  const headings = document.querySelector<HTMLElement>('.column-headings');
  if (headings) headings.hidden = Boolean(p.columnLanguages && library.settings.showTranslation);
  const rows = visiblePhrases();
  if (!rows.length) {
    rowsHost.append(element('p', 'empty-search', t().emptySearch));
    renderReader();
    return;
  }
  editorRows(rowsHost, {
    project: p,
    rows,
    focusedId,
    focused: () => focusedId,
    showTranslation: library.settings.showTranslation,
    locale: library.settings.locale,
    ipaDisplay: library.settings.ipaDisplay,
    focusMode,
    busy,
    copy: t(),
    checkpoint,
    changed: persist,
    reader: renderReader,
    select: (q) => {
      stop();
      focusedId = q.id;
      syncNavigation('push');
      renderReader();
      highlightRows();
    },
    remove: (q) => {
      if (p.phrases.length === 1) return;
      checkpoint();
      p.phrases = p.phrases.filter((v) => v.id !== q.id);
      ensureFocus();
      persist();
      renderRows();
      renderReader();
    },
  });
  renderReader();
}
function render(): void {
  ensureFocus();
  const activeControl = document.activeElement?.closest<HTMLElement>('.custom-select');
  const controlIndex = activeControl ? [...document.querySelectorAll('.custom-select')].indexOf(activeControl) : -1;
  const settingsOpen = document.querySelector<HTMLDetailsElement>('details.settings')?.open ?? false;
  const copy = t();
  document.documentElement.lang = library.settings.locale;
  document.title = 'Text IPA · ' + copy.guide;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = copy.tagline + ' ' + copy.about;
  document.documentElement.dataset.theme = library.settings.theme;
  document.documentElement.style.setProperty('--reading-size', library.settings.fontSize + 'px');
  document.documentElement.style.setProperty('--ipa-size', library.settings.ipaFontSize + 'px');
  document.body.classList.toggle('focus-mode', focusMode);
  app.setAttribute('aria-busy', String(busy));
  app.replaceChildren();
  const header = headerView({
    settings: library.settings,
    copy,
    locale: (value) => {
      stop();
      library.settings.locale = value;
      message = '';
      persist();
      render();
    },
    theme: (value) => {
      library.settings.theme = value;
      persist();
      render();
    },
    preference: (key, value) => {
      library.settings[key] = value;
      persist();
      applyShellSettings(library.settings, t());
      if (key === 'showTranslation') renderRows();
    },
    display: (value) => {
      annotationFailed.clear();
      library.settings.ipaDisplay = value;
      persist();
      syncNavigation('push');
      renderRows();
    },
    guide: showGuide,
  });
  app.append(header);
  mountNotifications(copy.close);
  if (message) {
    notify(message, loaded.error || storageFailed ? 'error' : 'warning');
    message = '';
  }
  const layout = element('div', 'layout');
  const sidebar = sidebarView({
    library,
    copy,
    busy,
    engine: engineChecking ? copy.loading : engineAvailable ? copy.localEngine : copy.noEngine,
    toggle: () => {
      library.settings.sidebarCollapsed = !library.settings.sidebarCollapsed;
      persist();
      applyShellSettings(library.settings, t());
    },
    create: newProject,
    import: chooseImport,
    activate,
    examples: () => showExamples(copy, chooseImport, (error) => notify(errorMessage(error), 'error')),
    export: () => {
      const project = current();
      if (project) download(project.title + '.json', JSON.stringify(project, null, 2) + '\n', 'application/json');
    },
  });
  const p = current();
  const workspace = workspaceView({
    project: p,
    library,
    copy,
    block: selectedBlock,
    query: search,
    busy,
    engineAvailable,
    canUndo: editHistory.length > 0,
    generatedCount,
    generationTotal,
    create: newProject,
    guide: showGuide,
    columns: () => {
      if (!p) return;
      columnSettings(p, copy, library.settings.locale, (updated) => {
        stop();
        checkpoint();
        library.projects = library.projects.map((project) => (project.id === updated.id ? updated : project));
        library.settings.showTranslation = true;
        persist();
        render();
      });
    },
    checkpoint,
    changed: persist,
    generate,
    undo,
    range,
    dialectLabel,
    download,
    remove: () => {
      if (!p) return;
      stop();
      checkpoint();
      library.projects = library.projects.filter((q) => q.id !== p.id);
      library.activeId = library.projects[0]?.id ?? null;
      selectedBlock = '';
      focusedId = null;
      search = '';
      persist();
      render();
    },
    readingLanguage: (value) => {
      if (!p || !projectColumns(p).includes(value)) return;
      stop();
      p.readingLanguage = value;
      persist();
      render();
    },
    dialect: (value) => {
      if (!p) return;
      stop();
      checkpoint();
      const code = readingLanguage(p);
      if (code === p.language) p.dialect = value;
      else {
        p.pronunciations ??= {};
        p.pronunciations[code] = value;
      }
      p.phrases.forEach((q) => {
        const version = editableVersion(p, q, code);
        version.ipa = '';
        version.ipaStatus = 'empty';
        delete version.wordIpa;
      });
      if (code === p.language) restoreExamplePronunciation(p, bundledExample);
      persist();
      render();
    },
    jumpBlock: (value) => {
      if (!p) return;
      stop();
      selectedBlock = value;
      search = '';
      const input = document.querySelector<HTMLInputElement>('#search');
      if (input) input.value = '';
      focusedId = p.phrases.find((q) => !value || q.block === value)?.id ?? null;
      syncNavigation('push');
      renderRows();
      highlightRows();
    },
    search: (value, history) => {
      stop();
      search = value;
      ensureFocus();
      syncNavigation(history);
      renderRows();
    },
    add: () => {
      if (!p) return;
      checkpoint();
      const q: Phrase = {
        id: crypto.randomUUID(),
        block: selectedBlock,
        text: copy.addText,
        ipa: '',
        ipaStatus: 'empty',
        pauseMs: 1000,
        done: false,
        note: '',
      };
      p.phrases.push(q);
      focusedId = q.id;
      search = '';
      persist();
      render();
      highlightRows();
      const added = document.querySelector<HTMLElement>('.phrase-row.selected');
      added?.classList.add('just-added');
      added?.querySelector<HTMLTextAreaElement>('.phrase-text')?.focus({ preventScroll: true });
    },
  });
  rowsHost = workspace.rows;
  const main = workspace.main;
  layout.append(sidebar, main);
  app.append(layout);
  const footer = footerView(copy, storageFailed, showGuide);
  app.append(footer);
  watchFooter(footer);
  const scrolling = scrollNavigation(copy);
  app.append(scrolling);
  watchScrollNavigation(scrolling);
  updateSaveStatus();
  const disclosure = document.querySelector<HTMLDetailsElement>('details.settings');
  if (disclosure) disclosure.open = settingsOpen;
  applyShellSettings(library.settings, copy);
  watchHeader(header);
  if (!p) syncNavigation();
  updateNavigationControls();
  if (p) {
    renderRows();
    updateStats();
  }
  if (controlIndex >= 0)
    document.querySelectorAll<HTMLElement>('.custom-select')[controlIndex]?.querySelector<HTMLButtonElement>('.select-trigger')?.focus({ preventScroll: true });
}
function dialectLabel(d: Dialect): string {
  return { 'es-ES': t().esSpain, 'es-419': t().esSeseo, 'en-GB': t().enGb, 'en-US': t().enUs, 'ru-RU': t().ruRu }[d] ?? d;
}
document.addEventListener('keydown', (e) => {
  if (
    document.querySelector('dialog[open]') ||
    (e.target instanceof HTMLElement && (e.target.matches('input,textarea,select,button,summary,a') || e.target.isContentEditable))
  )
    return;
  if (e.code === 'Space' && current()) {
    e.preventDefault();
    toggleTimer();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'Escape' && focusMode) {
    focusMode = false;
    syncNavigation('push');
    render();
  }
});
window.addEventListener('beforeunload', (e) => {
  if ((storageFailed || savePending) && library.projects.length) {
    e.preventDefault();
    e.returnValue = '';
  }
});
window.addEventListener('popstate', (event) => {
  navigation.restore(event.state);
  restoreNavigation();
  render();
});
restoreNavigation(true);
render();
setupPwa(
  () => library.settings.locale,
  (text) => notify(text, 'warning'),
);
void fetch('/api/health', { signal: AbortSignal.timeout(10000) })
  .then((r) => r.json() as Promise<HealthResponse>)
  .then((data) => {
    engineAvailable = data.engineAvailable === true;
    engineChecking = false;
    render();
  })
  .catch(() => {
    engineAvailable = false;
    engineChecking = false;
    render();
  });
if ('speechSynthesis' in window) speechSynthesis.getVoices();
void document.fonts.ready.then(() => resizePhraseFields());
document.fonts.addEventListener('loadingdone', () => resizePhraseFields());
window.addEventListener('resize', () => resizePhraseFields());
