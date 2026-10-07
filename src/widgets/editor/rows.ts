import type { Project, Phrase } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element, labelled } from '../../shared/ui/controls.ts';
import { resizePhraseFields, revealPhrases } from './layout.ts';
import { projectColumns, phraseVersion, languageLabel } from '../../domain/columns.ts';
import type { Language } from '../../types/domain.ts';
import type { Settings } from '../../types/domain.ts';
import { pronunciationText } from '../../features/pronunciation/annotated-text.ts';
interface RowsOptions {
  project: Project;
  rows: Phrase[];
  focusedId: string | null;
  focused: () => string | null;
  busy: boolean;
  showTranslation: boolean;
  locale: Language;
  ipaDisplay: Settings['ipaDisplay'];
  focusMode: boolean;
  copy: Copy;
  checkpoint: () => void;
  changed: () => void;
  reader: () => void;
  select: (phrase: Phrase) => void;
  remove: (phrase: Phrase) => void;
}
export function editorRows(host: HTMLElement, options: RowsOptions): void {
  const { project: p, rows, focusedId, busy, copy } = options;
  const ordinals = new Map(p.phrases.map((q, i) => [q.id, i + 1]));
  let previousBlock: string | null = null;
  for (const q of rows) {
    if (q.block && q.block !== previousBlock) {
      host.append(element('h3', 'block-heading', q.block));
      previousBlock = q.block;
    }
    const row = element('article', 'phrase-row' + (q.id === focusedId ? ' selected' : ''));
    row.dataset.id = q.id;
    const ordinal = button(String(ordinals.get(q.id)!).padStart(2, '0'), () => options.select(q), 'phrase-number', copy.selected + ': ' + q.text);
    row.append(ordinal);
    const columns = element('div', 'phrase-columns');
    const text = element('textarea', 'phrase-text');
    text.value = q.text;
    text.lang = p.language;
    text.rows = Math.max(2, Math.ceil(q.text.length / 60));
    text.maxLength = 1500;
    text.disabled = busy;
    text.setAttribute('aria-label', copy.original + ' ' + ordinals.get(q.id)!);
    const ipa = element('textarea', 'phrase-ipa');
    ipa.value = q.ipa;
    ipa.rows = text.rows;
    ipa.maxLength = 5000;
    ipa.disabled = busy;
    ipa.placeholder = copy.blankIpa;
    ipa.setAttribute('aria-label', copy.ipa + ' ' + ordinals.get(q.id)!);
    const status = element('span', 'ipa-status', q.ipaStatus === 'reviewed' ? copy.reviewed : copy.draft);
    const reviewed = element('input');
    reviewed.type = 'checkbox';
    reviewed.checked = q.ipaStatus === 'reviewed';
    reviewed.disabled = busy || !q.ipa;
    text.addEventListener('focus', options.checkpoint);
    text.addEventListener('input', () => {
      q.text = text.value;
      delete q.wordIpa;
      resizePhraseFields(row);
      q.ipa = '';
      q.ipaStatus = 'empty';
      q.done = false;
      done.checked = false;
      ipa.value = '';
      reviewed.checked = false;
      reviewed.disabled = true;
      status.textContent = copy.draft;
      options.changed();
      if (options.focused() === q.id) options.reader();
    });
    ipa.addEventListener('focus', options.checkpoint);
    ipa.addEventListener('input', () => {
      q.ipa = ipa.value;
      delete q.wordIpa;
      resizePhraseFields(row);
      q.ipaStatus = ipa.value.trim() ? 'draft' : 'empty';
      reviewed.checked = false;
      reviewed.disabled = !ipa.value.trim();
      status.textContent = copy.draft;
      options.changed();
      if (options.focused() === q.id) options.reader();
    });
    reviewed.addEventListener('change', () => {
      options.checkpoint();
      q.ipaStatus = reviewed.checked ? 'reviewed' : 'draft';
      status.textContent = reviewed.checked ? copy.reviewed : copy.draft;
      options.changed();
    });
    const left = element('div', 'phrase-cell');
    left.append(text);
    const right = element('div', 'phrase-cell');
    right.append(ipa, status);
    columns.append(left, right);
    const inlineReading = options.focusMode && options.ipaDisplay === 'above';
    const preview = (cell: HTMLElement, version: Parameters<typeof pronunciationText>[0], language: string) => {
      if (!inlineReading) return;
      cell.classList.add('word-preview-cell');
      const view = element('div', 'phrase-word-preview');
      view.append(...pronunciationText(version, language, options.ipaDisplay, copy));
      cell.prepend(view);
    };
    preview(left, q, p.language);
    if (inlineReading && !(options.showTranslation && p.columnLanguages)) {
      right.hidden = true;
      columns.classList.add('inline-reading-columns');
    }
    if (options.showTranslation && p.columnLanguages) {
      const languages = projectColumns(p);
      columns.classList.add('phrase-language-columns');
      columns.style.setProperty('--language-columns', String(languages.length));
      left.prepend(element('span', 'field-label', languageLabel(p.language, options.locale)));
      left.append(ipa, status);
      right.remove();
      for (const code of languages.filter((code) => code !== p.language)) {
        const version = phraseVersion(p, q, code);
        const cell = element('div', 'phrase-cell');
        const translated = element('textarea', 'phrase-text phrase-version-text');
        translated.value = version.text;
        translated.lang = code;
        translated.rows = 2;
        translated.maxLength = 3000;
        translated.disabled = busy;
        translated.setAttribute('aria-label', languageLabel(code, options.locale) + ' ' + ordinals.get(q.id)!);
        const transcription = element('textarea', 'phrase-ipa');
        transcription.value = version.ipa;
        transcription.rows = 2;
        transcription.placeholder = copy.blankIpa;
        transcription.maxLength = 5000;
        transcription.disabled = busy;
        transcription.setAttribute('aria-label', copy.ipa + ' · ' + languageLabel(code, options.locale) + ' ' + ordinals.get(q.id)!);
        for (const field of [translated, transcription]) field.addEventListener('focus', options.checkpoint);
        translated.addEventListener('input', () => {
          q.translations ??= {};
          q.translations[code] = version;
          version.text = translated.value;
          delete version.wordIpa;
          version.ipa = '';
          version.ipaStatus = 'empty';
          transcription.value = '';
          if (code === p.translationLanguage) q.translation = version.text;
          resizePhraseFields(row);
          options.changed();
          if (options.focused() === q.id) options.reader();
        });
        transcription.addEventListener('input', () => {
          q.translations ??= {};
          q.translations[code] = version;
          version.ipa = transcription.value;
          delete version.wordIpa;
          version.ipaStatus = version.ipa.trim() ? 'draft' : 'empty';
          resizePhraseFields(row);
          options.changed();
          if (options.focused() === q.id) options.reader();
        });
        cell.append(element('span', 'field-label', languageLabel(code, options.locale)), translated, transcription);
        preview(cell, version, code);
        columns.append(cell);
      }
    } else if (options.showTranslation) {
      const translation = element('textarea', 'phrase-translation');
      translation.value = q.translation ?? '';
      translation.placeholder = copy.noTranslation;
      translation.rows = 1;
      translation.maxLength = 3000;
      translation.disabled = busy;
      translation.setAttribute('aria-label', copy.translation + ' ' + ordinals.get(q.id)!);
      if (p.translationLanguage) translation.lang = p.translationLanguage;
      translation.addEventListener('focus', options.checkpoint);
      translation.addEventListener('input', () => {
        q.translation = translation.value;
        resizePhraseFields(row);
        options.changed();
        if (options.focused() === q.id) options.reader();
      });
      columns.append(labelled(copy.translation + ' ' + ordinals.get(q.id)!, translation, 'translation-field'));
    }
    row.append(columns);
    const meta = element('div', 'phrase-meta');
    const pause = element('input');
    pause.type = 'number';
    pause.min = '0';
    pause.max = '10';
    pause.step = '.1';
    pause.value = String(q.pauseMs / 1000);
    pause.disabled = busy;
    pause.addEventListener('change', () => {
      const value = Number(pause.value);
      if (Number.isFinite(value) && value >= 0 && value <= 10) {
        options.checkpoint();
        q.pauseMs = Math.round(value * 1000);
        options.changed();
        options.reader();
      } else pause.value = String(q.pauseMs / 1000);
    });
    const note = element('input', 'notes');
    note.value = q.note;
    note.maxLength = 3000;
    note.placeholder = copy.notesPlaceholder;
    note.disabled = busy;
    note.setAttribute('aria-label', copy.notes);
    note.addEventListener('focus', options.checkpoint);
    note.addEventListener('input', () => {
      q.note = note.value;
      options.changed();
    });
    const done = element('input');
    done.type = 'checkbox';
    done.checked = q.done;
    done.disabled = busy;
    done.addEventListener('change', () => {
      options.checkpoint();
      q.done = done.checked;
      options.changed();
    });
    const remove = button('×', () => options.remove(q), 'icon-button subdued', copy.remove);
    remove.disabled = busy || p.phrases.length === 1;
    meta.append(
      labelled(copy.pauses + ' (' + copy.seconds + ')', pause, 'inline-field'),
      labelled(copy.checked, reviewed, 'check-field'),
      labelled(copy.done, done, 'check-field'),
      note,
      remove,
    );
    row.append(meta);
    host.append(row);
  }
  resizePhraseFields(host);
  revealPhrases(host);
}
