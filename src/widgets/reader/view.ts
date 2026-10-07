import type { Project, Phrase } from '../../types/domain.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, element } from '../../shared/ui/controls.ts';
import { projectColumns, phraseVersion, languageLabel } from '../../domain/columns.ts';
import type { Language } from '../../types/domain.ts';
interface ReaderOptions {
  project: Project;
  phrase: Phrase;
  copy: Copy;
  playing: boolean;
  voiceSpeaking: boolean;
  focusMode: boolean;
  showTranslation: boolean;
  locale: Language;
  move: (direction: number) => void;
  timer: () => void;
  listen: () => void;
  focus: () => void;
}
export function readerView(host: Element, options: ReaderOptions): void {
  const { project: p, phrase: q, copy, playing, voiceSpeaking, focusMode } = options;
  const number = p.phrases.indexOf(q) + 1;
  const heading = element('div', 'reader-heading');
  heading.append(
    element('span', 'eyebrow', copy.selected + ' · ' + String(number).padStart(2, '0') + '/' + p.phrases.length),
    element('span', 'pause-badge', q.pauseMs / 1000 + ' ' + copy.seconds),
  );
  const content = element('div', 'reader-content');
  if (p.columnLanguages && options.showTranslation) {
    const columns = projectColumns(p);
    content.classList.add('reader-language-columns');
    content.style.setProperty('--language-columns', String(columns.length));
    for (const code of columns) {
      const version = phraseVersion(p, q, code);
      const column = element('div', code === p.language ? 'reader-language-column' : 'reader-language-column reader-translation');
      const text = element('p', 'reader-text', version.text || copy.noTranslation);
      text.lang = code;
      column.append(element('span', 'eyebrow', languageLabel(code, options.locale)), text, element('p', 'reader-ipa', version.ipa || copy.blankIpa));
      content.append(column);
    }
  } else {
    const text = element('p', 'reader-text', q.text);
    text.lang = p.language;
    content.append(text, element('p', 'reader-ipa', q.ipa || copy.blankIpa));
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
  controls.append(
    button('←', () => options.move(-1), 'icon-button', copy.previous),
    button(playing ? copy.stop : copy.start, options.timer, 'button primary'),
    button('→', () => options.move(1), 'icon-button', copy.next),
    button(voiceSpeaking ? copy.stopVoice : copy.listen, options.listen),
    button(focusMode ? copy.exitFocus : copy.focus, options.focus),
  );
  host.append(heading, content, controls, element('p', 'timer-note', copy.timerNote));
}
