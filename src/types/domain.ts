export type Language = 'ru' | 'en' | 'es';
export type Dialect = 'es-ES' | 'es-419' | 'en-GB' | 'en-US' | 'ru-RU';
export type IpaStatus = 'empty' | 'draft' | 'reviewed';
export interface WordIpa {
  word: string;
  ipa: string;
}
export interface PhraseVersion {
  text: string;
  ipa: string;
  ipaStatus: IpaStatus;
  wordIpa?: WordIpa[];
}
export interface Phrase {
  id: string;
  block: string;
  text: string;
  ipa: string;
  ipaStatus: IpaStatus;
  pauseMs: number;
  done: boolean;
  note: string;
  translation?: string;
  translations?: Record<string, PhraseVersion>;
  wordIpa?: WordIpa[];
}
export interface Project {
  id: string;
  title: string;
  language: string;
  dialect: string;
  updatedAt: string;
  phrases: Phrase[];
  translationLanguage?: string;
  columnLanguages?: string[];
}
export interface Settings {
  locale: Language;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  ipaFontSize: number;
  wpm: number;
  rate: number;
  pauseMultiplier: number;
  scrollToPhrase: boolean;
  headerSticky: boolean;
  sidebarCollapsed: boolean;
  showTranslation: boolean;
  ipaDisplay: 'line' | 'above';
}
export interface Library {
  schemaVersion: 1;
  projects: Project[];
  activeId: string | null;
  settings: Settings;
}
