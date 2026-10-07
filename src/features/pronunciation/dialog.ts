import { searchSounds, guideCopy } from './sounds.ts';
import { languageNames, locales } from '../../i18n/locales.ts';
import type { Language } from '../../types/domain.ts';
import { dialog, element, labelled, select } from '../../shared/ui/controls.ts';

export function showPronunciationGuide(locale: Language): void {
  const t = () => locales[locale];
  const copy = guideCopy[locale];
  const d = dialog(t().guideTitle, t().close);
  d.dialog.classList.add('guide-dialog');
  d.body.append(element('p', 'guide-intro', copy.intro), element('p', 'guide-practice muted', copy.practice));
  let hintLanguage: Language = locale;
  const query = element('input');
  query.type = 'search';
  query.placeholder = copy.search;
  query.setAttribute('aria-label', copy.search);
  const controls = element('div', 'guide-controls');
  const table = element('table', 'guide-table');
  const caption = element('caption', 'sr-only', t().guideTitle);
  const head = element('thead');
  const headings = element('tr');
  for (const label of [copy.symbol, copy.spelling, copy.example, copy.hint]) {
    const th = element('th', '', label);
    th.scope = 'col';
    headings.append(th);
  }
  head.append(headings);
  const body = element('tbody');
  const empty = element('p', 'muted', copy.empty);
  const dialectHint = element('p', 'muted', t().guideSeseo);
  const paint = () => {
    body.replaceChildren();
    const entries = searchSounds(query.value);
    empty.hidden = entries.length > 0;
    for (const entry of entries) {
      const row = element('tr');
      const display = entry.symbol === '͡' ? '◌͡◌' : entry.symbol === '̯' ? '◌̯' : entry.symbol;
      const symbol = element('th', 'sound', display);
      symbol.scope = 'row';
      const hint = element('td');
      if (hintLanguage === 'ru') hint.append(element('strong', '', entry.russian));
      hint.append(element('p', 'muted', entry.tip[hintLanguage]));
      hint.lang = hintLanguage;
      hint.dataset.label = copy.hint;
      const spelling = element('td', '', entry.spelling);
      spelling.dataset.label = copy.spelling;
      const example = element('td', 'guide-example', entry.example);
      const transcription = entry.example.match(/^(.*?)(\[[^\]]+\])$/u);
      if (transcription?.[1] !== undefined && transcription[2] !== undefined) {
        example.replaceChildren(document.createTextNode(transcription[1]), element('span', 'guide-transcription', transcription[2]));
      }
      example.dataset.label = copy.example;
      row.append(symbol, spelling, example, hint);
      body.append(row);
    }
  };
  controls.append(
    labelled(
      copy.language,
      select(Object.entries(languageNames), hintLanguage, (v) => {
        hintLanguage = v as Language;
        paint();
      }),
    ),
    labelled(copy.search, query, 'field guide-search'),
  );
  query.addEventListener('input', paint);
  table.append(caption, head, body);
  const overflow = element('div', 'guide-overflow');
  overflow.append(table);
  d.body.append(controls, overflow, empty, dialectHint, element('h3', '', copy.sources));
  const sources = element('div', 'guide-sources');
  for (const [label, href] of [
    ['International Phonetic Association · interactive sounds', 'https://www.internationalphoneticassociation.org/IPAcharts/IPA_charts_TI/IPA_charts_TI.html'],
    ['Cambridge Dictionary · English symbols', 'https://dictionary.cambridge.org/help/phonetics.html'],
    ['FundéuRAE · b, v, w', 'https://www.fundeu.es/recomendacion/bvw-pronunciacion/'],
    ['JIPA · Russian', 'https://doi.org/10.1017/S0025100300005090'],
    ['JIPA · Mexico City Spanish', 'https://doi.org/10.1017/S0025100316000232'],
  ] as const) {
    const link = element('a', 'guide-source', label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    sources.append(link);
  }
  d.body.append(sources);
  paint();
  d.dialog.showModal();
}
