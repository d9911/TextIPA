import type { Project, Library, Dialect } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { dialects } from '../../domain/preferences.ts';
import { engineLanguage, projectColumns, readingLanguage, pronunciationDialect, languageLabel } from '../../domain/columns.ts';
import { exportMarkdown } from '../../domain/library.ts';
import { button, element, labelled, select } from '../../shared/ui/controls.ts';
import { tooltip } from '../../shared/ui/tooltip.ts';
interface WorkspaceOptions {
  project: Project | undefined;
  library: Library;
  copy: Copy;
  block: string;
  query: string;
  busy: boolean;
  engineAvailable: boolean;
  canUndo: boolean;
  generatedCount: number;
  generationTotal: number;
  guide: () => void;
  columns: () => void;
  create: () => void;
  checkpoint: () => void;
  changed: () => void;
  generate: () => void;
  undo: () => void;
  remove: () => void;
  dialect: (value: Dialect) => void;
  readingLanguage: (value: string) => void;
  dialectLabel: (value: Dialect) => string;
  range: (label: string, key: 'fontSize' | 'ipaFontSize' | 'wpm' | 'rate' | 'pauseMultiplier', min: number, max: number, step: number) => HTMLElement;
  download: (name: string, content: string, mime: string) => void;
  jumpBlock: (block: string) => void;
  search: (query: string, history: 'push' | 'replace') => void;
  add: () => void;
}
export function workspaceView(options: WorkspaceOptions): { main: HTMLElement; rows: HTMLElement | null } {
  const { copy, busy, library, download } = options;
  let rows: HTMLElement | null = null;
  const main = element('main', 'main');
  const hint = (control: HTMLElement, text: string) => tooltip(control, main, { text, placement: 'below' });
  const p = options.project;
  const address = element('nav', 'navigation-bar');
  address.setAttribute('aria-label', copy.navigation);
  const back = button('← ' + copy.back, () => window.history.back());
  back.id = 'navigation-back';
  const forward = button(copy.forward + ' →', () => window.history.forward());
  forward.id = 'navigation-forward';
  const trail = element('span', 'navigation-trail', p ? p.title + ' / ' + (options.block || copy.allBlocks) : copy.library);
  trail.title = trail.textContent ?? '';
  address.append(back, forward, trail);
  main.append(address);
  if (!p) {
    const empty = element('section', 'empty');
    empty.append(
      element('div', 'empty-mark', '[ a ]'),
      element('p', 'eyebrow', copy.workshop),
      element('h2', '', copy.empty),
      element('p', 'muted', copy.workshopHint + ' ' + copy.emptyHint),
      button(copy.new, options.create, 'button primary'),
    );
    main.append(empty);
    if (options.canUndo) {
      const undo = button('↶ ' + copy.undo, options.undo, 'button', copy.undo);
      empty.append(undo);
      hint(undo, copy.undoHint);
    }
    rows = null;
  } else {
    const heading = element('div', 'project-heading');
    const headingText = element('div');
    headingText.append(element('p', 'eyebrow', copy.about));
    const title = element('input', 'project-title');
    title.value = p.title;
    title.maxLength = 200;
    title.setAttribute('aria-label', copy.project);
    title.disabled = busy;
    title.addEventListener('focus', options.checkpoint);
    title.addEventListener('input', () => {
      p.title = title.value;
      options.changed();
    });
    const stats = element('p', 'stats');
    stats.id = 'stats';
    const progress = element('progress');
    progress.id = 'practice-progress';
    progress.setAttribute('aria-label', copy.practiced);
    const columnButton = button(copy.columnSettings + ' · ' + projectColumns(p).join(' / ').toUpperCase(), options.columns, 'button project-columns-button');
    columnButton.disabled = busy;
    headingText.append(title, columnButton, stats, progress);
    const actions = element('div', 'project-actions');
    const gen = button(
      busy ? copy.generating : copy.generate,
      () => {
        options.generate();
      },
      'button primary',
    );
    gen.disabled = busy || !options.engineAvailable || !projectColumns(p).some(engineLanguage);
    if (!projectColumns(p).some(engineLanguage)) gen.title = copy.manualIpa;
    const exports = element('details', 'export-menu');
    const summary = element('summary', 'button', copy.export + ' ↓');
    const menu = element('div', 'export-options');
    menu.append(
      button(copy.projectJson, () => download(p.title + '.json', JSON.stringify(p, null, 2) + '\n', 'application/json')),
      button(copy.backup, () => download('text-ipa-library.json', JSON.stringify(library, null, 2) + '\n', 'application/json')),
      button(copy.plainText, () => download(p.title + '.txt', p.phrases.map((q) => q.text).join('\n\n') + '\n', 'text/plain')),
      button(copy.markdown, () => download(p.title + '.md', exportMarkdown(p), 'text/markdown')),
    );
    exports.append(summary, menu);
    exports.title = copy.exportHint;
    const undoButton = button('↶ ' + copy.undo, options.undo, 'button undo-action', copy.undo);
    undoButton.id = 'undo-button';
    undoButton.disabled = busy || !options.canUndo;
    const remove = button('×', options.remove, 'icon-button', copy.removeProject);
    remove.disabled = busy;
    actions.append(gen, exports, undoButton, remove);
    hint(undoButton, copy.undoHint);
    hint(remove, copy.removeProjectHint);
    hint(gen, projectColumns(p).some(engineLanguage) ? copy.generateHint : copy.manualIpa);
    hint(summary, copy.exportHint);
    exports.removeAttribute('title');
    hint(columnButton, copy.columnsHint);
    heading.append(headingText, actions);
    main.append(heading, element('p', 'draft-note', copy.draftNote));
    if (busy) {
      const loading = element('div', 'generation-state');
      loading.setAttribute('role', 'status');
      const label = element('span', '', copy.generating + ' ' + options.generatedCount + '/' + options.generationTotal);
      label.id = 'generation-label';
      const progress = element('progress');
      progress.id = 'generation-progress';
      progress.max = options.generationTotal;
      progress.value = options.generatedCount;
      progress.setAttribute('aria-label', copy.generating);
      loading.append(element('span', 'spinner'), label, progress);
      main.append(loading);
    }
    const settings = element('details', 'settings');
    settings.open = false;
    settings.append(element('summary', '', copy.pace + ' / ' + copy.font));
    const settingsGrid = element('div', 'settings-grid');
    const code = readingLanguage(p);
    const language = select(
      projectColumns(p).map((code): [string, string] => [code, languageLabel(code, library.settings.locale)]),
      code,
      options.readingLanguage,
    );
    language.disabled = busy;
    const pronunciation = select(
      (engineLanguage(code) ? dialects[code] : [pronunciationDialect(p, code)]).map((d): [string, string] => [d, options.dialectLabel(d as Dialect)]),
      pronunciationDialect(p, code),
      (value) => options.dialect(value as Dialect),
    );
    pronunciation.title = copy.dialectHint;
    pronunciation.disabled = busy;
    settingsGrid.append(
      labelled(copy.readingLanguage, language),
      labelled(copy.dialect, pronunciation),
      options.range(copy.font, 'fontSize', 18, 40, 1),
      options.range(copy.ipaFont, 'ipaFontSize', 18, 48, 1),
      options.range(copy.pace + ' · ' + copy.wpm, 'wpm', 60, 240, 5),
      options.range(copy.speechRate, 'rate', 0.5, 1.5, 0.05),
      options.range(copy.pauseScale, 'pauseMultiplier', 0.5, 3, 0.1),
    );
    settings.append(settingsGrid);
    main.append(settings);
    hint(settings.querySelector('summary')!, copy.settingsHint);
    hint(language.querySelector('.select-trigger')!, copy.readingLanguageHint);
    hint(pronunciation.querySelector('.select-trigger')!, copy.dialectHint);
    for (const [control, text] of [...settingsGrid.querySelectorAll<HTMLElement>('input[type="range"]')].map(
      (control, index) => [control, [copy.fontHint, copy.ipaFontHint, copy.paceHint, copy.speechRateHint, copy.pauseScaleHint][index]!] as const,
    ))
      hint(control, text);
    const reader = element('section', 'reader');
    reader.id = 'reader';
    reader.tabIndex = 0;
    reader.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && !event.target.closest('button,input,textarea,select,a,summary,[contenteditable]')) {
        reader.focus({ preventScroll: true });
      }
    });
    reader.setAttribute('aria-label', copy.focus);
    main.append(reader);
    const toolbar = element('div', 'row-toolbar');
    const blocks = [...new Set(p.phrases.map((q) => q.block).filter(Boolean))];
    toolbar.append(
      labelled(copy.blocks, select([['', copy.allBlocks], ...blocks.map((b): [string, string] => [b, b])], options.block, options.jumpBlock), 'block-select'),
    );
    const query = element('input');
    query.type = 'search';
    query.id = 'search';
    query.value = options.query;
    query.maxLength = 300;
    query.placeholder = copy.search;
    query.setAttribute('aria-label', copy.search);
    let searchEditing = false;
    query.addEventListener('blur', () => {
      searchEditing = false;
    });
    query.addEventListener('input', () => {
      options.search(query.value, searchEditing ? 'replace' : 'push');
      searchEditing = true;
    });
    toolbar.append(query);
    const add = button('+ ' + copy.addPhrase, options.add, 'button');
    add.disabled = busy;
    toolbar.append(add);
    main.append(toolbar);
    const columns = element('div', 'column-headings');
    columns.hidden = Boolean(p.columnLanguages && library.settings.showTranslation);
    const ipaHeading = element('div', 'ipa-heading');
    ipaHeading.append(element('span', '', copy.ipa), button('?', options.guide, 'inline-help', copy.guide));
    columns.append(element('span', '', copy.original), ipaHeading);
    main.append(columns);
    rows = element('section', 'phrases');
    main.append(rows);
  }
  for (const control of main.querySelectorAll<HTMLElement>('button, .select-trigger')) {
    if (!control.hasAttribute('aria-describedby') && !control.closest('.export-options'))
      hint(control, control.getAttribute('aria-label') ?? control.textContent ?? '');
  }

  return { main, rows };
}
