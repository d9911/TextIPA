import { defaultSettings } from '../../domain/preferences.ts';
import type { Settings } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element, labelled, select } from '../../shared/ui/controls.ts';
import { popover } from '../../shared/ui/popover.ts';

export type ShellPreference = 'headerSticky' | 'sidebarCollapsed' | 'scrollToPhrase' | 'showTranslation';
export function preferenceMenu(
  settings: Settings,
  copy: Copy,
  change: (key: ShellPreference, value: boolean) => void,
  guide: () => void,
  display: (value: Settings['ipaDisplay']) => void,
  directionColor: (value: string) => void,
): HTMLElement[] {
  const content = element('div', 'preferences-content');
  const heading = element('div', 'preferences-heading');
  heading.append(element('h2', '', copy.preferences));
  content.append(heading, element('p', 'muted small', copy.menuHint));
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
  content.append(
    labelled(
      copy.ipaDisplay,
      select(
        [
          ['above', copy.ipaAbove],
          ['line', copy.ipaLine],
        ],
        settings.ipaDisplay,
        (value) => display(value as Settings['ipaDisplay']),
      ),
    ),
  );
  const color = element('input');
  color.type = 'color';
  color.value = settings.stageDirectionColor;
  color.addEventListener('input', () => directionColor(color.value));
  const colorField = labelled(copy.stageDirectionColor, color);
  colorField.append(element('p', 'muted small', copy.stageDirectionHint));
  colorField.append(
    button(copy.resetDirectionColor, () => {
      color.value = defaultSettings.stageDirectionColor;
      directionColor(color.value);
    }),
  );
  content.append(colorField);
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
  heading.append(
    button(
      '×',
      () => {
        panel.hidePopover();
        trigger.focus({ preventScroll: true });
      },
      'icon-button preferences-close',
      copy.close,
    ),
  );
  trigger.classList.add('settings-trigger');
  trigger.textContent = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute(
    'd',
    'M9.5 3h5l.6 2.4 2 .9 2.3-.7 2.5 4.3-1.7 1.7v2.4l1.7 1.7-2.5 4.3-2.3-.7-2 .9-.6 2.4h-5l-.6-2.4-2-.9-2.3.7-2.5-4.3 1.7-1.7v-2.4L2.1 9.9l2.5-4.3 2.3.7 2-.9L9.5 3Z M15.5 12.8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z',
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  trigger.append(svg);
  return [trigger, panel];
}
