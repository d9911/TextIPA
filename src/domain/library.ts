import { dialects, emptyLibrary } from './preferences.ts';
import { languageTag, engineLanguage, projectColumns, phraseVersion } from './columns.ts';
import { validateWordIpa } from './word-ipa.ts';
import type { Dialect, Language, Library, Phrase, Project } from '../types/domain.ts';
const languages: readonly string[] = ['ru', 'en', 'es'];
const statuses: readonly string[] = ['empty', 'draft', 'reviewed'];
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_FILE');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('INVALID_FILE');
  return value;
}
export function validateProject(value: unknown): Project {
  const p = record(value);
  const language = languageTag(string(p.language, 35));
  const dialect = languageTag(string(p.dialect, 35));
  if (engineLanguage(language) ? !dialects[language].includes(dialect as Dialect) : dialect.split('-')[0] !== language.split('-')[0])
    throw new Error('INVALID_FILE');
  if (!Array.isArray(p.phrases) || p.phrases.length > 10000) throw new Error('INVALID_FILE');
  const seen = new Set<string>();
  const phrases = p.phrases.map((value): Phrase => {
    const q = record(value);
    const id = string(q.id, 150);
    if (!id || seen.has(id)) throw new Error('INVALID_FILE');
    seen.add(id);
    if (!Number.isFinite(q.pauseMs) || (q.pauseMs as number) < 0 || (q.pauseMs as number) > 10000 || typeof q.done !== 'boolean')
      throw new Error('INVALID_FILE');
    const ipaStatus = string(q.ipaStatus, 10) as Phrase['ipaStatus'];
    if (!statuses.includes(ipaStatus)) throw new Error('INVALID_FILE');
    const translations: Phrase['translations'] = {};
    if (q.translations !== undefined) {
      const variants = record(q.translations);
      if (Object.keys(variants).length > 8) throw new Error('INVALID_FILE');
      for (const [code, value] of Object.entries(variants)) {
        const tag = languageTag(code);
        if (tag === language || Object.hasOwn(translations, tag)) throw new Error('INVALID_FILE');
        const version = record(value);
        const state = string(version.ipaStatus, 10) as Phrase['ipaStatus'];
        if (!statuses.includes(state)) throw new Error('INVALID_FILE');
        translations[tag] = { text: string(version.text, 3000), ipa: string(version.ipa, 5000), ipaStatus: state };
        if (version.wordIpa !== undefined) translations[tag]!.wordIpa = validateWordIpa(version.wordIpa, translations[tag]!.text);
      }
    }
    return {
      id,
      block: string(q.block, 250),
      text: string(q.text, 1500),
      ipa: string(q.ipa, 5000),
      ipaStatus,
      pauseMs: q.pauseMs as number,
      done: q.done,
      note: string(q.note, 3000),
      ...(q.translation !== undefined ? { translation: string(q.translation, 3000) } : {}),
      ...(q.translations !== undefined ? { translations } : {}),
      ...(q.wordIpa !== undefined ? { wordIpa: validateWordIpa(q.wordIpa, string(q.text, 1500)) } : {}),
    };
  });
  if (!phrases.length) throw new Error('EMPTY_TEXT');
  if (!string(p.id, 150).trim()) throw new Error('INVALID_FILE');
  const translationLanguage = p.translationLanguage === undefined ? undefined : languageTag(string(p.translationLanguage, 35));
  let columnLanguages: string[] | undefined;
  if (p.columnLanguages !== undefined) {
    if (!Array.isArray(p.columnLanguages) || p.columnLanguages.length > 8) throw new Error('INVALID_FILE');
    columnLanguages = p.columnLanguages.map((value) => languageTag(string(value, 35)));
    if (new Set(columnLanguages).size !== columnLanguages.length) throw new Error('INVALID_FILE');
    if (new Set([language, ...columnLanguages]).size > 8) throw new Error('INVALID_FILE');
  }
  return {
    id: string(p.id, 150),
    title: string(p.title, 200),
    language,
    dialect,
    updatedAt: string(p.updatedAt, 100),
    phrases,
    ...(translationLanguage !== undefined ? { translationLanguage } : {}),
    ...(columnLanguages !== undefined ? { columnLanguages } : {}),
  };
}
export function validateLibrary(value: unknown): Library {
  const x = record(value);
  if (x.schemaVersion !== 1 || !Array.isArray(x.projects) || x.projects.length > 300) throw new Error('INVALID_FILE');
  const base = emptyLibrary();
  const projects = x.projects.map(validateProject);
  if (new Set(projects.map((p) => p.id)).size !== projects.length) throw new Error('INVALID_FILE');
  base.projects = projects;
  base.activeId = projects.some((p) => p.id === x.activeId) ? (x.activeId as string) : (projects[0]?.id ?? null);
  if (x.settings) {
    const s = record(x.settings);
    for (const key of ['scrollToPhrase', 'headerSticky', 'sidebarCollapsed', 'showTranslation'] as const) {
      if (typeof s[key] === 'boolean') base.settings[key] = s[key];
    }
    if (languages.includes(String(s.locale))) base.settings.locale = s.locale as Language;
    if (['light', 'dark', 'system'].includes(String(s.theme))) base.settings.theme = s.theme as Library['settings']['theme'];
    if (s.ipaDisplay === 'above' || s.ipaDisplay === 'line') base.settings.ipaDisplay = s.ipaDisplay;
    for (const [key, min, max] of [
      ['fontSize', 18, 40],
      ['ipaFontSize', 18, 48],
      ['wpm', 60, 240],
      ['rate', 0.5, 1.5],
      ['pauseMultiplier', 0.5, 3],
    ] as const) {
      if (typeof s[key] === 'number' && Number.isFinite(s[key])) base.settings[key] = Math.min(max, Math.max(min, s[key]));
    }
  }
  return base;
}
function chunks(text: string): string[] {
  return text
    .split(/(?<=[,;:!?])\s+|(?<=\.)\s+|\s+(?=\|)|(?<=\|)\s+/u)
    .flatMap((part) => {
      const words = part.trim().split(/\s+/);
      const result: string[] = [];
      while (words.length) result.push(words.splice(0, 24).join(' '));
      return result;
    })
    .map((s) => s.replace(/\|/g, '').trim())
    .filter(Boolean);
}
export function projectFromText(title: string, text: string, language: string): Project {
  if (text.length > 500000) throw new Error('FILE_TOO_LARGE');
  const phrases: Phrase[] = [];
  let headingBlock = '';
  let paragraphIndex = 0;
  for (const para of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const content: string[] = [];
    paragraphIndex++;
    for (const line of para.split('\n')) {
      const heading = /^#{1,6}\s+(.+)/.exec(line);
      if (heading) headingBlock = heading[1] ?? '';
      else content.push(line);
    }
    const block = headingBlock || (({ es: 'Bloque', en: 'Block', ru: 'Блок' } as Record<string, string>)[language] ?? 'Block') + ' ' + paragraphIndex;
    for (const phrase of chunks(content.join(' '))) {
      const pauseMs = /[.!?]$/.test(phrase) ? 1000 : /[,;:]$/.test(phrase) ? 400 : 600;
      phrases.push({ id: crypto.randomUUID(), block, text: phrase, ipa: '', ipaStatus: 'empty', pauseMs, done: false, note: '' });
    }
    if (phrases.length) phrases[phrases.length - 1]!.pauseMs = 2000;
  }
  if (!phrases.length) throw new Error('EMPTY_TEXT');
  if (phrases.length > 10000) throw new Error('FILE_TOO_LARGE');
  return validateProject({
    id: crypto.randomUUID(),
    title: title.trim() || language.toUpperCase(),
    language,
    dialect: engineLanguage(language) ? dialects[language][0]! : language,
    updatedAt: new Date().toISOString(),
    phrases,
  });
}
export function importLegacy(value: unknown, title: string): Project {
  const data = record(value);
  if (!Array.isArray(data.blocks)) throw new Error('INVALID_FILE');
  const phrases: Phrase[] = [];
  for (const value of data.blocks) {
    const block = record(value);
    if (!Array.isArray(block.rows)) throw new Error('INVALID_FILE');
    for (const value of block.rows) {
      const row = record(value);
      phrases.push({
        id: crypto.randomUUID(),
        block: string(block.title, 250),
        text: string(row.text, 1500),
        ipa: string(row.ipa_es ?? '', 5000),
        ipaStatus: row.ipa_es ? 'draft' : 'empty',
        pauseMs: row.pause_kind === 'block' ? 2500 : row.pause_kind === 'short' ? 400 : row.pause_kind === 'breath' ? 650 : 1000,
        done: false,
        note: '',
      });
    }
  }
  return validateProject({ id: crypto.randomUUID(), title, language: 'es', dialect: 'es-ES', updatedAt: new Date().toISOString(), phrases });
}
export function decodeImport(text: string, filename: string, language: Language): Project[] {
  if (new TextEncoder().encode(text).length > 5_000_000) throw new Error('FILE_TOO_LARGE');
  if (!filename.toLowerCase().endsWith('.json')) return [projectFromText(filename.replace(/\.(txt|md)$/i, ''), text, language)];
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('INVALID_FILE');
  }
  const x = record(value);
  if (x.schemaVersion === 1) return validateLibrary(x).projects;
  if (x.blocks) return [importLegacy(x, filename.replace(/\.json$/i, ''))];
  return [validateProject(x)];
}
export function fingerprint(p: Project): string {
  return JSON.stringify([
    p.language,
    p.dialect,
    p.translationLanguage,
    projectColumns(p),
    p.phrases.map((q) => [
      q.block,
      q.text.trim(),
      q.ipa,
      q.pauseMs,
      q.translation ?? '',
      q.wordIpa,
      Object.entries(q.translations ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    ]),
  ]);
}
export function mergeProjects(existing: Project[], incoming: Project[]): { projects: Project[]; added: number } {
  const result = [...existing];
  const signatures = new Set(existing.map(fingerprint));
  let added = 0;
  for (const p of incoming) {
    const key = fingerprint(p);
    if (signatures.has(key)) continue;
    const idCollision = result.some((x) => x.id === p.id);
    result.push(idCollision ? { ...p, id: crypto.randomUUID(), title: p.title + ' (import)' } : p);
    signatures.add(key);
    added++;
  }
  if (result.length > 300) throw new Error('FILE_TOO_LARGE');
  return { projects: result, added };
}
export function exportMarkdown(project: Project): string {
  const languages = projectColumns(project);
  const headings = ['Block', ...languages.flatMap((code) => [code + ' text', code + ' IPA']), 'Pause (s)', 'Notes'];
  const lines = [
    '# ' + project.title,
    '',
    'Language: ' + project.dialect,
    '',
    '| ' + headings.join(' | ') + ' |',
    '| ' + headings.map(() => '---').join(' | ') + ' |',
  ];
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  for (const q of project.phrases) {
    const versions = languages.flatMap((code) => {
      const version = phraseVersion(project, q, code);
      return [version.text, version.ipa];
    });
    lines.push('| ' + [q.block, ...versions, String(q.pauseMs / 1000), q.note].map(esc).join(' | ') + ' |');
  }
  return lines.join('\n') + '\n';
}
export function durationMs(text: string, wpm: number, pauseMs: number, multiplier = 1): number {
  return (text.trim().split(/\s+/).filter(Boolean).length / wpm) * 60000 + pauseMs * multiplier;
}
