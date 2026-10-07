import type { Settings } from '../types/domain.ts';
import type { Copy } from '../i18n/locales.ts';

let headerObserver: ResizeObserver | undefined;
let footerObserver: IntersectionObserver | undefined;
export function watchFooter(footer: HTMLElement): void {
  footerObserver?.disconnect();
  document.body.classList.remove('footer-visible');
  footerObserver = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    document.body.classList.toggle('footer-visible', entry.isIntersecting);
    const sidebarFooter = document.querySelector<HTMLElement>('.sidebar-footer');
    if (sidebarFooter) sidebarFooter.inert = entry.isIntersecting;
  });
  footerObserver.observe(footer);
}
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
