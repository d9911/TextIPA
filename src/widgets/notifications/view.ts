import { NoticeQueue, type NoticeKind } from '../../domain/notifications.ts';
import { button, element } from '../../shared/ui/controls.ts';

const queue = new NoticeQueue();
const host = element('div', 'toast-stack');
let closeLabel = 'Close';
export function mountNotifications(label: string): void {
  closeLabel = label;
  for (const close of host.querySelectorAll('button')) close.setAttribute('aria-label', label);
  if (!host.isConnected) document.body.append(host);
}
export function showNotification(text: string, kind: NoticeKind): void {
  const notice = queue.add(text, kind);
  if (!notice || host.querySelector(`[data-notice="${notice.id}"]`)) return;
  const card = element('div', `toast toast-${kind}`);
  card.dataset.notice = String(notice.id);
  card.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  card.setAttribute('aria-atomic', 'true');
  const icon = element('span', 'toast-icon', kind === 'success' ? '✓' : kind === 'warning' ? '!' : '×');
  icon.setAttribute('aria-hidden', 'true');
  let remaining = kind === 'success' ? 5500 : 10000;
  let started = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pause = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (Date.now() - started));
  };
  const dismiss = () => {
    pause();
    queue.remove(notice.id);
    card.remove();
  };
  const resume = () => {
    if (kind === 'error' || timer || card.matches(':hover') || card.contains(document.activeElement)) return;
    started = Date.now();
    timer = setTimeout(dismiss, remaining);
  };
  card.append(icon, element('span', 'toast-message', text), button('×', dismiss, 'toast-close', closeLabel));
  card.addEventListener('pointerenter', pause);
  card.addEventListener('pointerleave', resume);
  card.addEventListener('focusin', pause);
  card.addEventListener('focusout', () => queueMicrotask(resume));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismiss();
  });
  host.append(card);
  resume();
}
