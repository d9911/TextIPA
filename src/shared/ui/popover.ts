import { button, element } from './controls.ts';

export function popover(label: string, content: HTMLElement, cls = 'icon-button'): { trigger: HTMLButtonElement; panel: HTMLDivElement } {
  const panel = element('div', 'preferences-popover');
  panel.id = 'popover-' + crypto.randomUUID();
  panel.popover = 'auto';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', label);
  panel.append(content);
  const position = () => {
    const box = trigger.getBoundingClientRect();
    const width = Math.min(350, innerWidth - 24);
    panel.style.width = width + 'px';
    panel.style.left = Math.max(12, Math.min(box.right - width, innerWidth - width - 12)) + 'px';
    panel.style.top = Math.min(box.bottom + 10, innerHeight - 100) + 'px';
    panel.style.maxHeight = Math.max(80, innerHeight - Math.min(box.bottom + 10, innerHeight - 100) - 12) + 'px';
  };
  const trigger = button('?', () => (panel.matches(':popover-open') ? panel.hidePopover() : panel.showPopover()), cls, label);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', panel.id);
  trigger.setAttribute('aria-expanded', 'false');
  let listeners: AbortController | undefined;
  panel.addEventListener('beforetoggle', (event) => {
    if ((event as ToggleEvent).newState === 'open') position();
  });
  panel.addEventListener('toggle', () => {
    const open = panel.matches(':popover-open');
    trigger.setAttribute('aria-expanded', String(open));
    listeners?.abort();
    if (open) {
      listeners = new AbortController();
      window.addEventListener('resize', position, { signal: listeners.signal });
      window.addEventListener('scroll', position, { capture: true, signal: listeners.signal });
    }
  });
  return { trigger, panel };
}
