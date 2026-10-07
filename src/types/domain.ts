export type Language = 'ru' | 'en' | 'es';
export type Dialect = 'es-ES' | 'es-419' | 'en-GB' | 'en-US' | 'ru-RU';
export type IpaStatus = 'empty' | 'draft' | 'reviewed';
export interface PhraseVersion {
  text: string;
  ipa: string;
  ipaStatus: IpaStatus;
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
}
export interface Library {
  schemaVersion: 1;
  projects: Project[];
  activeId: string | null;
  settings: Settings;
}
