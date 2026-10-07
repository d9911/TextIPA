import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
export function footerView(copy: Copy, failed: boolean, guide: () => void): HTMLElement {
  const footer = element('footer', 'footer');
  const status = element('span', failed ? 'failure' : '', failed ? copy.unsaved : copy.saved);
  status.id = 'save-status';
  const brand = element('div', 'footer-brand');
  brand.append(element('strong', '', 'Text IPA'), element('span', '', copy.about), element('small', 'copyright', '© 2026 Denis Gutsuliak · d9911.org'));
  const tools = element('div', 'footer-tools');
  const license = element('a', 'text-link', copy.license);
  license.href = '/LICENSE';
  license.target = '_blank';
  license.rel = 'noopener';
  tools.append(status, button(copy.guide, guide, 'text-button'), license);
  footer.append(brand, tools);
  return footer;
}
