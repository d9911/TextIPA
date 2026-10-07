import type { WordIpa, PhraseVersion } from '../types/domain.ts';

/** Keep original spacing and punctuation; annotate only tokens containing letters or digits. */
export function readingTokens(text: string): { text: string; word: boolean }[] {
  return (text.match(/\s+|\S+/gu) ?? []).map((text) => ({ text, word: /[\p{L}\p{N}]/u.test(text) }));
}
export function ipaWords(text: string): string[] {
  return readingTokens(text)
    .filter((token) => token.word)
    .map((token) => token.text);
}
export function validWordIpa(version: PhraseVersion): boolean {
  const words = ipaWords(version.text);
  return words.length > 0 && version.wordIpa?.length === words.length && words.every((word, index) => version.wordIpa?.[index]?.word === word);
}
/** Legacy sentence IPA can supply word boundaries only when every word has exactly one segment. */
export function displayWordIpa(version: PhraseVersion): WordIpa[] | undefined {
  if (validWordIpa(version)) return version.wordIpa;
  const match = /^\[([^\[\]]+)\]$/.exec(version.ipa.trim());
  if (!match) return undefined;
  const parts = match[1]!.trim().split(/\s+/u);
  const words = ipaWords(version.text);
  if (!words.length || parts.length !== words.length || parts.some((part) => !/[\p{L}\p{N}]/u.test(part))) return undefined;
  return words.map((word, index) => ({ word, ipa: '[' + parts[index]! + ']' }));
}
export function validateWordIpa(value: unknown, text: string): WordIpa[] {
  const words = ipaWords(text);
  if (!Array.isArray(value) || value.length !== words.length || value.length > 1500) throw new Error('INVALID_FILE');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || entry.word !== words[index] || typeof entry.ipa !== 'string' || entry.ipa.length > 500 || !entry.ipa.trim())
      throw new Error('INVALID_FILE');
    return { word: entry.word as string, ipa: entry.ipa as string };
  });
}
