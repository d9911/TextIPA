import { element } from './dom.ts';

export type SelectControl = HTMLDivElement & { value: string; disabled: boolean };
let closeActive: (() => void) | undefined;

/** A themed, keyboard-operable single-select. Listbox uses the browser's top layer. */
export function dropdown(options: [string, string][], initial: string, change: (value: string) => void): SelectControl {
  const root = element('div', 'custom-select') as SelectControl;
  const trigger = element('button', 'select-trigger');
  trigger.type = 'button';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const valueText = element('span', 'select-value');
  valueText.id = 'select-value-' + crypto.randomUUID();
  const arrow = element('span', 'select-arrow', '⌄');
  arrow.setAttribute('aria-hidden', 'true');
  trigger.append(valueText, arrow);
  const popup = element('div', 'select-options');
  popup.id = 'select-options-' + crypto.randomUUID();
  popup.setAttribute('role', 'listbox');
  popup.setAttribute('popover', 'auto');
  trigger.setAttribute('aria-controls', popup.id);
  let selected = options.some(([key]) => key === initial) ? initial : (options[0]?.[0] ?? '');
  let active = Math.max(
    0,
    options.findIndex(([key]) => key === selected),
  );
  let opened = false;
  const choices = options.map(([key, name], index) => {
    const choice = element('div', 'select-option');
    choice.id = popup.id + '-' + index;
    choice.setAttribute('role', 'option');
    choice.dataset.value = key;
    const check = element('span', 'select-check', '✓');
    check.setAttribute('aria-hidden', 'true');
    choice.append(element('span', '', name), check);
    choice.addEventListener('pointermove', () => {
      active = index;
      paintActive();
    });
    choice.addEventListener('click', () => choose(index));
    popup.append(choice);
    return choice;
  });
  const paint = () => {
    valueText.textContent = options.find(([key]) => key === selected)?.[1] ?? '';
    choices.forEach((choice, i) => choice.setAttribute('aria-selected', String(options[i]?.[0] === selected)));
  };
  const paintActive = () => {
    choices.forEach((choice, i) => choice.classList.toggle('highlighted', i === active));
    trigger.setAttribute('aria-activedescendant', choices[active]?.id ?? '');
    choices[active]?.scrollIntoView({ block: 'nearest' });
  };
  const position = () => {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const height = Math.min(280, Math.max(spaceBelow, rect.top - 12));
    popup.style.width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24) + 'px';
    popup.style.maxHeight = height + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - parseFloat(popup.style.width) - 12) + 'px';
    popup.style.top =
      (spaceBelow >= Math.min(280, options.length * 44 + 16) ? rect.bottom + 8 : Math.max(12, rect.top - Math.min(height, popup.scrollHeight) - 8)) + 'px';
  };
  const close = () => {
    if (opened) popup.hidePopover();
  };
  const open = () => {
    if (trigger.disabled || opened) return;
    closeActive?.();
    active = Math.max(
      0,
      options.findIndex(([key]) => key === selected),
    );
    popup.showPopover();
    opened = true;
    closeActive = close;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    position();
    paintActive();
  };
  function choose(index: number): void {
    const next = options[index]?.[0];
    if (next === undefined) return;
    const changed = selected !== next;
    selected = next;
    paint();
    close();
    trigger.focus();
    if (changed) change(next);
  }
  popup.addEventListener('beforetoggle', (event) => {
    if ((event as ToggleEvent).newState === 'closed') {
      opened = false;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      root.classList.remove('is-open');
      if (closeActive === close) closeActive = undefined;
    }
  });
  trigger.addEventListener('click', () => (opened ? close() : open()));
  trigger.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (opened) choose(active);
        else open();
        return;
      }
      const wasOpen = opened;
      open();
      if (event.key === 'Home') active = 0;
      else if (event.key === 'End') active = options.length - 1;
      else if (wasOpen) active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      paintActive();
    } else if (event.key === 'Tab') close();
    else if (event.key.length === 1) {
      const index = options.findIndex(([, name], i) => i > active && name.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      const fallback = options.findIndex(([, name]) => name.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      if (index >= 0 || fallback >= 0) {
        open();
        active = index >= 0 ? index : fallback;
        paintActive();
      }
    }
  });
  trigger.addEventListener('blur', () => {
    if (!root.contains(document.activeElement)) close();
  });
  popup.addEventListener('pointerdown', (event) => event.preventDefault());
  popup.addEventListener('toggle', () => {
    if (opened) {
      const abort = new AbortController();
      const update = () => {
        if (root.isConnected && opened) position();
        else abort.abort();
      };
      window.addEventListener('resize', update, { signal: abort.signal });
      window.addEventListener('scroll', update, { capture: true, signal: abort.signal });
      popup.addEventListener('beforetoggle', () => abort.abort(), { once: true });
    }
  });
  Object.defineProperties(root, {
    value: {
      get: () => selected,
      set: (value: string) => {
        if (options.some(([key]) => key === value)) {
          selected = value;
          paint();
        }
      },
    },
    disabled: {
      get: () => trigger.disabled,
      set: (value: boolean) => {
        trigger.disabled = value;
        if (value) close();
      },
    },
  });
  root.append(trigger, popup);
  paint();
  return root;
}
