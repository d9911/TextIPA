import type { Settings } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
import { popover } from '../../shared/ui/popover.ts';

export type ShellPreference = 'headerSticky' | 'sidebarCollapsed' | 'scrollToPhrase' | 'showTranslation';
export function preferenceMenu(settings: Settings, copy: Copy, change: (key: ShellPreference, value: boolean) => void, guide: () => void): HTMLElement[] {
  const content = element('div', 'preferences-content');
  content.append(element('h2', '', copy.preferences), element('p', 'muted small', copy.menuHint));
  for (const key of ['headerSticky', 'sidebarCollapsed', 'scrollToPhrase', 'showTranslation'] as const) {
    const label = element('label', 'preference-switch');
    const input = element('input');
    input.type = 'checkbox';
    input.checked = settings[key];
    input.dataset.preference = key;
    input.addEventListener('change', () => change(key, input.checked));
    label.append(element('span', '', copy[key]), input);
    content.append(label);
  }
  const guideButton = button(
    copy.guide,
    () => {
      panel.hidePopover();
      guide();
    },
    'button full',
  );
  content.append(guideButton);
  const { trigger, panel } = popover(copy.preferences, content);
  trigger.title = copy.menuHint;
  return [trigger, panel];
}
