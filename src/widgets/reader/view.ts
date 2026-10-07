import type { Project, Phrase } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
import { projectColumns, phraseVersion, languageLabel, readingLanguage } from '../../domain/columns.ts';
import type { Language } from '../../types/domain.ts';
import type { Settings } from '../../types/domain.ts';
import { pronunciationText } from '../../features/pronunciation/annotated-text.ts';
import { tooltip } from '../../shared/ui/tooltip.ts';
interface ReaderOptions {
  project: Project;
  phrase: Phrase;
  copy: Copy;
  playing: boolean;
  timerTotal: number;
  timerRemaining?: number;
  voiceSpeaking: boolean;
  focusMode: boolean;
  showTranslation: boolean;
  locale: Language;
  ipaDisplay: Settings['ipaDisplay'];
  move: (direction: number) => void;
  jump: (edge: 'first' | 'last') => void;
  timer: () => void;
  listen: () => void;
  focus: () => void;
}
export function readerView(host: Element, options: ReaderOptions): void {
  const { project: p, phrase: q, copy, playing, voiceSpeaking, focusMode } = options;
  const number = p.phrases.indexOf(q) + 1;
  const selectedLanguage = readingLanguage(p);
  const heading = element('div', 'reader-heading');
  heading.append(
    element('span', 'eyebrow', copy.selected + ' · ' + String(number).padStart(2, '0') + '/' + p.phrases.length),
    element('span', 'pause-badge', q.pauseMs / 1000 + ' ' + copy.seconds),
  );
  heading.append(element('span', 'reader-current-language', copy.readingLanguage + ': ' + languageLabel(selectedLanguage, options.locale)));
  heading.querySelector('.pause-badge')?.setAttribute('aria-label', copy.pauses + ': ' + q.pauseMs / 1000 + ' ' + copy.seconds);
  const content = element('div', 'reader-content');
  if (projectColumns(p).length > 1 && options.showTranslation) {
    const columns = projectColumns(p);
    content.classList.add('reader-language-columns');
    content.style.setProperty('--language-columns', String(columns.length));
    for (const code of columns) {
      const version = phraseVersion(p, q, code);
      const column = element('div', code === p.language ? 'reader-language-column' : 'reader-language-column reader-translation');
      column.append(element('span', 'eyebrow', languageLabel(code, options.locale)), ...pronunciationText(version, code, options.ipaDisplay, copy));
      content.append(column);
    }
  } else {
    content.append(...pronunciationText(phraseVersion(p, q, selectedLanguage), selectedLanguage, options.ipaDisplay, copy));
    if (options.showTranslation) {
      const translation = element('div', 'reader-translation');
      translation.append(element('span', 'eyebrow', copy.translation));
      const translated = element('p', '', q.translation?.trim() || copy.noTranslation);
      if (q.translation?.trim() && p.translationLanguage) translated.lang = p.translationLanguage;
      translation.append(translated);
      content.append(translation);
    }
  }
  const controls = element('div', 'reader-controls');
  const first = button('⇤', () => options.jump('first'), 'icon-button', copy.first);
  const last = button('⇥', () => options.jump('last'), 'icon-button', copy.last);
  first.disabled = number === 1;
  last.disabled = number === p.phrases.length;
  controls.append(
    first,
    button('←', () => options.move(-1), 'icon-button', copy.previous),
    button(playing ? copy.stop : copy.start, options.timer, 'button primary'),
    button('→', () => options.move(1), 'icon-button', copy.next),
    last,
    button(voiceSpeaking ? copy.stopVoice : copy.listen, options.listen),
    button(focusMode ? copy.exitFocus : copy.focus, options.focus),
  );
  const clock = element('div', 'rehearsal-clock');
  const time = element('span', '', ((options.timerRemaining ?? options.timerTotal) / 1000).toFixed(1) + ' ' + copy.seconds);
  time.id = 'timer-countdown';
  const progress = element('progress');
  progress.id = 'timer-progress';
  progress.max = options.timerTotal;
  progress.value = playing ? options.timerTotal - (options.timerRemaining ?? options.timerTotal) : 0;
  progress.setAttribute('aria-label', copy.timerRemaining);
  clock.append(element('span', '', playing ? copy.timerRemaining : copy.timerReady), time, progress);
  host.append(heading, content, clock, controls, element('p', 'timer-note', copy.timerNote), element('p', 'voice-note', copy.voiceInfo));
  for (const control of controls.querySelectorAll('button')) {
    const text = control.getAttribute('aria-label');
    tooltip(control, host as HTMLElement, {
      placement: 'below',
      text: text === copy.focus || text === copy.exitFocus ? copy.focusInfo : text === copy.listen ? copy.voiceInfo : undefined,
    });
  }
}
