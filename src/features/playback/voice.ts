export function localVoice<T extends { localService: boolean; lang: string }>(voices: readonly T[], language: string, dialect: string): T | undefined {
  const local = voices.filter((voice) => voice.localService && voice.lang.toLowerCase().split('-')[0] === language.toLowerCase().split('-')[0]);
  return local.find((voice) => voice.lang.toLowerCase() === dialect.toLowerCase()) ?? local[0];
}
