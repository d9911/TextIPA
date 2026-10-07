import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
import { tooltip } from '../../shared/ui/tooltip.ts';

let dispose: (() => void) | undefined;
export function scrollNavigation(copy: Copy): HTMLElement {
  const navigation = element('nav', 'page-scroll-controls');
  navigation.setAttribute('aria-label', copy.pageNavigation);
  const scroll = (bottom: boolean) =>
    window.scrollTo({
      top: bottom ? Math.max(0, document.documentElement.scrollHeight - innerHeight) : 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  const up = button('↑', () => scroll(false), 'page-scroll-button', copy.scrollTop);
  const down = button('↓', () => scroll(true), 'page-scroll-button', copy.scrollBottom);
  navigation.append(up, down);
  tooltip(up, navigation, { placement: 'below' });
  tooltip(down, navigation, { placement: 'below' });
  return navigation;
}
export function watchScrollNavigation(navigation: HTMLElement): void {
  dispose?.();
  const [up, down] = Array.from(navigation.querySelectorAll<HTMLButtonElement>('.page-scroll-button'));
  let frame = 0;
  const update = () => {
    frame = 0;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const position = document.documentElement.scrollTop;
    navigation.hidden = maximum <= 4;
    up!.disabled = position <= 4;
    down!.disabled = position >= maximum - 4;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(document.body);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
  dispose = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}
