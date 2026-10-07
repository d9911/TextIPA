import type { Dialect, Language } from './domain.ts';

/** Wire contracts; boundary validation remains mandatory for received JSON. */
export interface IpaRequest {
  texts: string[];
  language: Language;
  dialect: Dialect;
}
export interface IpaResponse {
  ipa?: string[];
  error?: string;
  method?: string;
}
export interface HealthResponse {
  engineAvailable: boolean;
  engine: string | null;
  offline: boolean;
}

export interface ExampleFile {
  name: string;
  size: number;
}
