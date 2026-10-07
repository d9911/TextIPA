import type { Project, Phrase, PhraseVersion, Language } from '../types/domain.ts';

export function languageTag(value: string): string {
  if (!value || value.length > 35) throw new Error('INVALID_FILE');
  try {
    return Intl.getCanonicalLocales(value)[0]!;
  } catch {
    throw new Error('INVALID_FILE');
  }
}
export function engineLanguage(value: string): value is Language {
  return value === 'es' || value === 'en' || value === 'ru';
}
export function languageLabel(code: string, locale: Language): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function projectColumns(project: Project): string[] {
  return [...new Set([project.language, ...(project.columnLanguages ?? (project.translationLanguage ? [project.translationLanguage] : []))])];
}
export function phraseVersion(project: Project, phrase: Phrase, code: string): PhraseVersion {
  if (code === project.language) return phrase;
  return (
    phrase.translations?.[code] ?? {
      text: code === project.translationLanguage ? (phrase.translation ?? '') : '',
      ipa: '',
      ipaStatus: 'empty',
    }
  );
}
export function editableVersion(project: Project, phrase: Phrase, code: string): PhraseVersion {
  if (code === project.language) return phrase;
  const version = phraseVersion(project, phrase, code);
  phrase.translations ??= {};
  phrase.translations[code] = version;
  return version;
}
