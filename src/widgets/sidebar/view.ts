import type { Library, Project } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
import { tooltip } from '../../shared/ui/tooltip.ts';

interface SidebarOptions {
  library: Library;
  copy: Copy;
  engine: string;
  busy: boolean;
  toggle: () => void;
  create: () => void;
  import: (files: File[]) => void;
  activate: (project: Project) => void;
  examples: () => void;
  export: () => void;
}
function action(symbol: string, text: string, run: () => void, cls = ''): HTMLButtonElement {
  const control = button('', run, 'button sidebar-action ' + cls, text);
  const icon = element('span', 'sidebar-symbol', symbol);
  const paths: Record<string, string> = {
    '‹': 'M14 7l-5 5 5 5',
    '+': 'M12 5v14M5 12h14',
    '↑': 'M12 19V5M5 12l7-7 7 7',
    '↓': 'M12 5v14M5 12l7 7 7-7',
    '≡': 'M5 6h14M5 12h14M5 18h14',
  };
  if (paths[symbol]) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', paths[symbol]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    icon.replaceChildren(svg);
  }
  icon.setAttribute('aria-hidden', 'true');
  control.append(icon, element('span', 'sidebar-label', text));
  return control;
}
export function sidebarView(options: SidebarOptions): HTMLElement {
  const { library, copy } = options;
  const sidebar = element('aside', 'sidebar');
  sidebar.id = 'library-sidebar';
  sidebar.setAttribute('aria-label', copy.library);
  const head = element('div', 'sidebar-heading');
  const toggle = action('‹', library.settings.sidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar, options.toggle, 'sidebar-toggle');
  toggle.setAttribute('aria-expanded', String(!library.settings.sidebarCollapsed));
  toggle.setAttribute('aria-controls', 'library-sidebar');
  const heading = button(copy.library, options.toggle, 'eyebrow sidebar-heading-label');
  heading.setAttribute('aria-expanded', String(!library.settings.sidebarCollapsed));
  heading.setAttribute('aria-controls', 'library-sidebar');
  head.append(heading, toggle);
  const file = element('input');
  file.type = 'file';
  file.accept = '.txt,.md,.json,text/plain,application/json';
  file.multiple = true;
  file.hidden = true;
  file.addEventListener('change', () => {
    options.import(Array.from(file.files ?? []));
    file.value = '';
  });
  const exports = action('↓', copy.projectJson, options.export);
  exports.disabled = !library.activeId;
  sidebar.append(
    head,
    action('+', copy.new, options.create, 'primary'),
    action('↑', copy.import, () => file.click()),
    file,
    exports,
  );
  const list = element('nav', 'project-list');
  list.setAttribute('aria-label', copy.library);
  const abbreviations = new Map<string, number>();
  for (const project of library.projects) {
    const entry = button('', () => options.activate(project), 'project-entry' + (project.id === library.activeId ? ' active' : ''), project.title);
    if (project.id === library.activeId) entry.setAttribute('aria-current', 'page');
    const badge = element('span', 'project-lang', project.language.toUpperCase());
    const firstWord = project.title.trim().split(/[\s·|/]+/u)[0] || project.language.toUpperCase();
    const short = [...firstWord].slice(0, 3).join('');
    const occurrence = (abbreviations.get(short.toLocaleLowerCase()) ?? 0) + 1;
    abbreviations.set(short.toLocaleLowerCase(), occurrence);
    const compact = element('span', 'project-short', occurrence === 1 ? short : [...short].slice(0, 2).join('') + occurrence);
    compact.setAttribute('aria-hidden', 'true');
    entry.append(badge, element('strong', '', project.title), element('small', '', project.phrases.length + ' ' + copy.phrases), compact);
    list.append(entry);
  }
  sidebar.append(list, action('≡', copy.examples, options.examples));
  const footer = element('div', 'sidebar-footer');
  const license = element('a', 'text-link', copy.license);
  license.href = '/LICENSE';
  license.target = '_blank';
  license.rel = 'noopener';
  footer.append(element('span', 'engine-state', options.engine), element('span', 'muted small', copy.privacy), license);
  sidebar.append(footer);
  for (const control of sidebar.querySelectorAll<HTMLButtonElement>('.sidebar-action:not(.sidebar-toggle)')) control.disabled ||= options.busy;
  for (const control of sidebar.querySelectorAll<HTMLButtonElement>('.sidebar-action, .project-entry')) tooltip(control, sidebar);
  return sidebar;
}
