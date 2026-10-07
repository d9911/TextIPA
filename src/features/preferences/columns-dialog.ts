import type { Project, Language } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { languageTag, phraseVersion, projectColumns, engineLanguage } from '../../domain/columns.ts';
import { dialects } from '../../domain/preferences.ts';
import { button, dialog, element, labelled } from '../../shared/ui/controls.ts';

export function columnSettings(project: Project, copy: Copy, locale: Language, save: (updated: Project) => void): void {
  const view = dialog(copy.columnSettings, copy.close);
  const form = element('form');
  const primary = element('input');
  primary.value = project.language;
  primary.maxLength = 35;
  primary.required = true;
  const columns = element('input');
  columns.value = projectColumns(project)
    .filter((code) => code !== project.language)
    .join(', ');
  columns.maxLength = 300;
  columns.placeholder = 'en, ru, fr';
  const error = element('p', 'error');
  error.setAttribute('role', 'alert');
  form.append(element('p', 'muted', copy.columnsHint), labelled(copy.sourceLanguageCode, primary), labelled(copy.columnLanguageCodes, columns), error);
  const submit = button(copy.applyColumns, () => {});
  submit.type = 'submit';
  form.append(submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const language = languageTag(primary.value.trim());
      const selected = columns.value
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(languageTag);
      if (selected.length > 7 || new Set([language, ...selected]).size !== selected.length + 1) throw new Error('INVALID_FILE');
      const updated = structuredClone(project);
      updated.columnLanguages = [language, ...selected];
      if (language !== project.language) {
        updated.language = language;
        updated.dialect = engineLanguage(language) ? dialects[language][0]! : language;
        for (const [index, phrase] of updated.phrases.entries()) {
          const original = project.phrases[index]!;
          const version = phraseVersion(project, original, language);
          phrase.translations ??= {};
          phrase.translations[project.language] = {
            text: original.text,
            ipa: original.ipa,
            ipaStatus: original.ipaStatus,
            ...(original.wordIpa ? { wordIpa: original.wordIpa } : {}),
          };
          delete phrase.translations[language];
          phrase.text = version.text;
          phrase.ipa = version.ipa;
          phrase.ipaStatus = version.ipaStatus;
          if (version.wordIpa) phrase.wordIpa = version.wordIpa;
          else delete phrase.wordIpa;
        }
      }
      view.dialog.close();
      save(updated);
    } catch {
      error.textContent = copy.invalidColumns;
    }
  });
  form.lang = locale;
  view.body.append(form);
  view.dialog.showModal();
}
