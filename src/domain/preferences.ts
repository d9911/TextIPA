import type { Dialect, Language, Library, Settings } from '../types/domain.ts';
export const dialects: Record<Language, Dialect[]> = { es: ['es-ES', 'es-419'], en: ['en-GB', 'en-US'], ru: ['ru-RU'] };
export const defaultSettings: Settings = {
  locale: 'ru',
  theme: 'system',
  fontSize: 25,
  ipaFontSize: 28,
  wpm: 110,
  rate: 0.85,
  pauseMultiplier: 1,
  scrollToPhrase: false,
  headerSticky: true,
  sidebarCollapsed: false,
  showTranslation: false,
};
export function preferredLocale(languages: readonly string[]): Language {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'ru' || base === 'es' || base === 'en') return base;
  }
  return 'ru';
}
export function emptyLibrary(languages: readonly string[] = []): Library {
  return { schemaVersion: 1, projects: [], activeId: null, settings: { ...defaultSettings, locale: preferredLocale(languages) } };
}
