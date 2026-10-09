import type { Language, Settings } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { languageNames } from '../../i18n/locales.ts';
import { element, labelled, select } from '../../shared/ui/controls.ts';
import { tooltip } from '../../shared/ui/tooltip.ts';
import { preferenceMenu } from '../../features/preferences/view.ts';
import type { ShellPreference } from '../../features/preferences/view.ts';

interface HeaderOptions {
  settings: Settings;
  copy: Copy;
  locale: (language: Language) => void;
  theme: (value: Settings['theme']) => void;
  preference: (key: ShellPreference, value: boolean) => void;
  guide: () => void;
  display: (value: Settings['ipaDisplay']) => void;
  directionColor: (value: string) => void;
}
export function headerView(options: HeaderOptions): HTMLElement {
  const { settings, copy } = options;
  const header = element('header', 'header');
  const brand = element('div', 'brand');
  const icon = element('img');
  icon.src = '/favicon.svg';
  icon.alt = '';
  icon.width = 36;
  icon.height = 36;
  const names = element('div');
  names.append(element('h1', '', 'Text IPA'));
  brand.append(icon, names);
  const tools = element('div', 'header-tools');
  tools.append(
    labelled(
      copy.interfaceLanguage,
      select(Object.entries(languageNames), settings.locale, (value) => options.locale(value as Language)),
      'compact-field',
    ),
    labelled(
      copy.theme,
      select(
        [
          ['light', copy.light],
          ['dark', copy.dark],
          ['system', copy.system],
        ],
        settings.theme,
        (value) => options.theme(value as Settings['theme']),
      ),
      'compact-field',
    ),
    ...preferenceMenu(settings, copy, options.preference, options.guide, options.display, options.directionColor),
  );
  for (const field of tools.querySelectorAll<HTMLElement>('.compact-field')) {
    const caption = field.querySelector('.field-label')?.textContent ?? '';
    const trigger = field.querySelector<HTMLElement>('.select-trigger');
    if (trigger) tooltip(trigger, header, { text: caption, placement: 'below' });
    field.querySelector('.field-label')?.classList.add('sr-only');
  }
  const preferences = tools.querySelector<HTMLElement>('button[aria-haspopup="dialog"]');
  if (preferences) tooltip(preferences, header, { text: copy.settingsHint, placement: 'below' });
  header.append(brand, tools);
  return header;
}
