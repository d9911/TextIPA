import { element } from './dom.ts';
export { element } from './dom.ts';
export function button(text: string, action: () => void, cls = 'button', label = text): HTMLButtonElement {
  const b = element('button', cls, text);
  if (text === '×') {
    b.textContent = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', 'M6 6l12 12M18 6L6 18');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.append(path);
    b.append(svg);
  }
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.addEventListener('click', action);
  return b;
}
export function labelled(label: string, control: HTMLElement, cls = 'field'): HTMLElement {
  const custom = control.querySelector<HTMLButtonElement>('.select-trigger');
  const l = element(custom ? 'div' : 'label', cls);
  const caption = element('span', 'field-label', label);
  caption.id = 'field-' + crypto.randomUUID();
  const input = control.matches('input,textarea') ? control : control.querySelector('input');
  input?.setAttribute('aria-labelledby', caption.id);
  if (custom) {
    custom.setAttribute('aria-labelledby', caption.id + ' ' + control.querySelector('.select-value')!.id);
    control.querySelector('[role=listbox]')?.setAttribute('aria-labelledby', caption.id);
  }
  l.append(caption, control);
  return l;
}
export { dropdown as select } from './dropdown.ts';

export function dialog(title: string, closeLabel: string): { dialog: HTMLDialogElement; body: HTMLDivElement } {
  const d = element('dialog');
  const heading = element('div', 'dialog-heading');
  const h = element('h2', '', title);
  h.id = 'dialog-title';
  d.setAttribute('aria-labelledby', h.id);
  heading.append(
    h,
    button('×', () => d.close(), 'icon-button', closeLabel),
  );
  const body = element('div', 'dialog-body');
  d.append(heading, body);
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const box = d.getBoundingClientRect();
      const click = e as MouseEvent;
      if (click.clientX < box.left || click.clientX > box.right || click.clientY < box.top || click.clientY > box.bottom) d.close();
    }
  });
  return { dialog: d, body };
}
