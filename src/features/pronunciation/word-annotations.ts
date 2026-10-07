import type { Dialect, Language, WordIpa } from '../../types/domain.ts';
import type { IpaRequest, IpaResponse } from '../../types/api.ts';
import { ipaWords, validateWordIpa } from '../../domain/word-ipa.ts';

/** Generate isolated-word annotations without replacing the existing sentence transcription. */
export async function requestWordAnnotations(text: string, language: Language, dialect: Dialect): Promise<WordIpa[]> {
  const words = ipaWords(text);
  const unique = [...new Set(words)];
  const result = new Map<string, string>();
  for (let at = 0; at < unique.length; at += 40) {
    const batch = unique.slice(at, at + 40);
    const response = await fetch('/api/ipa', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch, language, dialect } satisfies IpaRequest),
    });
    const data = (await response.json()) as IpaResponse;
    if (!response.ok) throw new Error(data.error ?? 'ENGINE_FAILED');
    if (!Array.isArray(data.ipa) || data.ipa.length !== batch.length || data.ipa.some((ipa) => typeof ipa !== 'string' || !ipa.trim()))
      throw new Error('ENGINE_FAILED');
    batch.forEach((word, index) => result.set(word, data.ipa![index]!));
  }
  return validateWordIpa(
    words.map((word) => ({ word, ipa: result.get(word)! })),
    text,
  );
}
