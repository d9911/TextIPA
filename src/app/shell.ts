import type { Settings } from '../types/domain.ts';
import type { Copy } from '../i18n/locales.ts';

let headerObserver: ResizeObserver | undefined;
export function applyShellSettings(settings: Settings, copy: Copy): void {
  document.body.classList.toggle('header-sticky', settings.headerSticky);
  document.body.classList.toggle('sidebar-collapsed', settings.sidebarCollapsed);
  for (const key of ['headerSticky', 'sidebarCollapsed', 'scrollToPhrase', 'showTranslation'] as const) {
    const input = document.querySelector<HTMLInputElement>(`[data-preference="${key}"]`);
    if (input) input.checked = settings[key];
  }
  const toggle = document.querySelector<HTMLButtonElement>('.sidebar-toggle');
  const label = settings.sidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar;
  toggle?.setAttribute('aria-expanded', String(!settings.sidebarCollapsed));
  toggle?.setAttribute('aria-label', label);
  document.querySelector('.sidebar-heading-label')?.setAttribute('aria-expanded', String(!settings.sidebarCollapsed));
  if (toggle) {
    toggle.querySelector('.sidebar-label')!.textContent = label;
  }
}
export function watchHeader(header: HTMLElement): void {
  headerObserver?.disconnect();
  const measure = () => document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  measure();
  headerObserver = new ResizeObserver(measure);
  headerObserver.observe(header);
}
