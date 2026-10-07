import type { PhraseVersion, Project } from '../types/domain.ts';
import { phraseVersion, projectColumns } from './columns.ts';
import { validWordIpa } from './word-ipa.ts';

/** Fill missing draft data only for unchanged versions of the bundled example. */
export function restoreExamplePronunciation(project: Project, example: Project): boolean {
  if (project.id !== example.id || project.language !== example.language) return false;
  // Match the Spanish adapter's es-419 normalization; keep other dialects untouched.
  const seseo = project.language === 'es' && example.dialect === 'es-ES' && project.dialect === 'es-419';
  if (project.dialect !== example.dialect && !seseo) return false;
  let changed = false;
  const fill = (version: PhraseVersion, source: PhraseVersion): void => {
    if (version.text !== source.text || version.ipaStatus === 'reviewed') return;
    if (!version.ipa.trim() && source.ipa) {
      version.ipa = source.ipa;
      version.ipaStatus = 'draft';
      changed = true;
    }
    if (version.ipa === source.ipa && !validWordIpa(version) && validWordIpa(source)) {
      version.wordIpa = structuredClone(source.wordIpa!);
      changed = true;
    }
  };
  for (const phrase of project.phrases) {
    const source = example.phrases.find((candidate) => candidate.id === phrase.id);
    if (!source) continue;
    const pronunciation = seseo
      ? { ...source, ipa: source.ipa.replace(/θ/g, 's'), wordIpa: source.wordIpa?.map((pair) => ({ ...pair, ipa: pair.ipa.replace(/θ/g, 's') })) }
      : source;
    fill(phrase, pronunciation);
    for (const code of projectColumns(example)) {
      const version = phrase.translations?.[code];
      if (version) fill(version, phraseVersion(example, source, code));
    }
  }
  return changed;
}
