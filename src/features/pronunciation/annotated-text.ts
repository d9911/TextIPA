import type { PhraseVersion, Settings } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { readingTokens, displayWordIpa } from '../../domain/word-ipa.ts';
import { element } from '../../shared/ui/controls.ts';

export function pronunciationText(version: PhraseVersion, language: string, mode: Settings['ipaDisplay'], copy: Copy): HTMLElement[] {
  const text = element('p', 'reader-text', version.text || copy.noTranslation);
  text.lang = language;
  const annotations = mode === 'above' ? displayWordIpa(version) : undefined;
  if (annotations) {
    text.classList.add('annotated-text');
    text.replaceChildren();
    let index = 0;
    for (const token of readingTokens(version.text)) {
      if (!token.word) {
        text.append(document.createTextNode(token.text));
        continue;
      }
      const ruby = element('ruby', 'ipa-word');
      const base = element('span', 'word-text', token.text);
      const ipa = element('rt', '', annotations[index++]!.ipa);
      ipa.lang = 'und-fonipa';
      ruby.append(base, ipa);
      text.append(ruby);
    }
    return [text];
  }
  const ipa = element('p', 'reader-ipa', version.ipa || copy.blankIpa);
  ipa.lang = 'und-fonipa';
  return mode === 'above' && version.ipa ? [text, ipa, element('p', 'word-ipa-note', copy.wordIpaMissing)] : [text, ipa];
}
