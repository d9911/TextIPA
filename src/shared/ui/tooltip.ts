import { element } from './dom.ts';

let dismiss: (() => void) | undefined;
let listening = false;

export function tooltip(control: HTMLElement, owner: HTMLElement, options: { text?: string; placement?: 'below' } = {}): void {
  if (!listening) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') dismiss?.();
    });
    document.addEventListener('scroll', () => dismiss?.(), { capture: true, passive: true });
    window.addEventListener('resize', () => dismiss?.());
    listening = true;
  }
  const tip = element('div', 'sidebar-tooltip');
  tip.id = 'tooltip-' + crypto.randomUUID();
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('popover', 'manual');
  tip.textContent = options.text ?? control.getAttribute('aria-label') ?? control.textContent;
  control.removeAttribute('title');
  control.setAttribute('aria-describedby', tip.id);
  owner.append(tip);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    clearTimeout(timer);
    if (tip.isConnected) tip.hidePopover();
    if (dismiss === hide) dismiss = undefined;
  };
  const show = () => {
    if (control.getAttribute('aria-expanded') === 'true') return;
    clearTimeout(timer);
    if (dismiss !== hide) dismiss?.();
    dismiss = hide;
    tip.textContent = options.text ?? control.getAttribute('aria-label') ?? control.textContent;
    tip.showPopover();
    const box = control.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const left = options.placement === 'below' ? box.left + (box.width - width) / 2 : Math.max(box.right + 10, owner.getBoundingClientRect().right + 8);
    tip.style.left = Math.max(8, Math.min(left, innerWidth - width - 8)) + 'px';
    const top = options.placement === 'below' ? box.bottom + 8 : box.top + (box.height - height) / 2;
    tip.style.top = Math.max(8, Math.min(top, innerHeight - height - 8)) + 'px';
  };
  const later = () => {
    timer = setTimeout(() => {
      if (document.activeElement !== control) hide();
    }, 120);
  };
  control.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') show();
  });
  control.addEventListener('pointerleave', later);
  control.addEventListener('focus', show);
  control.addEventListener('blur', hide);
  control.addEventListener('click', hide);
  control.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') hide();
  });
  tip.addEventListener('pointerenter', () => clearTimeout(timer));
  tip.addEventListener('pointerleave', later);
  owner.addEventListener('scroll', hide, { passive: true });
}
