import { element } from './dom.ts';

let dismiss: (() => void) | undefined;
let listening = false;

export function tooltip(control: HTMLElement, owner: HTMLElement): void {
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
  control.removeAttribute('title');
  control.setAttribute('aria-describedby', tip.id);
  owner.append(tip);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    clearTimeout(timer);
    tip.hidePopover();
    if (dismiss === hide) dismiss = undefined;
  };
  const show = () => {
    clearTimeout(timer);
    if (dismiss !== hide) dismiss?.();
    dismiss = hide;
    tip.textContent = control.getAttribute('aria-label') ?? control.textContent;
    tip.showPopover();
    const box = control.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const left = Math.max(box.right + 10, owner.getBoundingClientRect().right + 8);
    tip.style.left = Math.max(8, Math.min(left, innerWidth - width - 8)) + 'px';
    tip.style.top = Math.max(8, Math.min(box.top + (box.height - height) / 2, innerHeight - height - 8)) + 'px';
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
    if (event.key === 'Escape') hide();
  });
  tip.addEventListener('pointerenter', () => clearTimeout(timer));
  tip.addEventListener('pointerleave', later);
  owner.addEventListener('scroll', hide, { passive: true });
}
