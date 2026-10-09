import { element } from '../../shared/ui/controls.ts';
import type { Copy } from '../../i18n/locales.ts';

export function stageDirectionView(text: string | undefined, copy: Copy): HTMLElement | undefined {
  if (!text?.trim()) return undefined;
  const cue = element('aside', 'stage-direction');
  cue.append(element('span', 'stage-direction-label', copy.stageDirection), element('p', '', '{' + text.trim() + '}'));
  return cue;
}
