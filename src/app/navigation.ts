import type { Library, Phrase, Settings } from '../types/domain.ts';

/** UI address; persisted separately from the text library and never sent to the IPA API. */
export interface NavigationState {
  projectId: string | null;
  block: string;
  phraseId: string | null;
  query: string;
  focus: boolean;
  ipaDisplay?: Settings['ipaDisplay'];
}
const limits = { project: 150, block: 250, phrase: 150, q: 300, focus: 1, ipa: 5 } as const;
export function initialNavigation(params: URLSearchParams, saved: URLSearchParams): URLSearchParams {
  if (['project', 'block', 'phrase', 'q', 'focus'].some((key) => params.has(key))) return params;
  const restored = new URLSearchParams(saved);
  if (params.has('ipa')) {
    restored.delete('ipa');
    for (const value of params.getAll('ipa')) restored.append('ipa', value);
  }
  return restored;
}
export function matchingPhrases(phrases: readonly Phrase[], block: string, query: string): Phrase[] {
  return phrases.filter((phrase) =>
    query ? (phrase.text + ' ' + phrase.ipa + ' ' + phrase.note).toLocaleLowerCase().includes(query.toLocaleLowerCase()) : !block || phrase.block === block,
  );
}
export function resolveNavigation(params: URLSearchParams, library: Library): { state: NavigationState; corrected: boolean } {
  let corrected = false;
  const read = (key: keyof typeof limits): string => {
    const values = params.getAll(key);
    const value = values[0] ?? '';
    if (values.length > 1 || value.length > limits[key] || /[\u0000-\u001f\u007f]/u.test(value) || (key === 'focus' && value && value !== '1')) {
      corrected = true;
      return '';
    }
    return value;
  };
  const projectId = read('project');
  let block = read('block');
  const phraseId = read('phrase');
  const query = read('q');
  const focus = read('focus') === '1';
  const placement = read('ipa');
  if (placement && placement !== 'above' && placement !== 'line') corrected = true;
  const ipaDisplay = placement === 'above' || placement === 'line' ? placement : library.settings.ipaDisplay;
  const requested = library.projects.find((p) => p.id === projectId);
  const project = requested ?? library.projects.find((p) => p.id === library.activeId) ?? library.projects[0];
  if (projectId && !requested) corrected = true;
  if (!project) {
    if (block || phraseId || query || focus) corrected = true;
    return { state: { projectId: null, block: '', phraseId: null, query: '', focus: false, ipaDisplay }, corrected };
  }
  // Child addresses are scoped to their project; never apply stale IDs to a fallback project.
  if (projectId && !requested) block = '';
  if (block && !project.phrases.some((p) => p.block === block)) {
    block = '';
    corrected = true;
  }
  const phrase = !projectId || requested ? project.phrases.find((p) => p.id === phraseId) : undefined;
  if (phraseId && !phrase) corrected = true;
  if (!query && phrase && block && phrase.block !== block) {
    block = phrase.block;
    corrected = true;
  }
  const visible = matchingPhrases(project.phrases, '', query);
  const blockFirst = visible.find((p) => p.block === block);
  const selected = visible.find((p) => p.id === phrase?.id) ?? blockFirst ?? visible[0];
  if (phraseId && selected?.id !== phraseId) corrected = true;
  if (focus && !selected) corrected = true;
  return { state: { projectId: project.id, block, phraseId: selected?.id ?? null, query, focus: focus && Boolean(selected), ipaDisplay }, corrected };
}
export function navigationUrl(url: URL, state: NavigationState): string {
  const next = new URL(url);
  for (const key of Object.keys(limits)) next.searchParams.delete(key);
  if (state.ipaDisplay) next.searchParams.set('ipa', state.ipaDisplay);
  if (state.projectId) {
    next.searchParams.set('project', state.projectId);
    if (state.block) next.searchParams.set('block', state.block);
    if (state.phraseId) next.searchParams.set('phrase', state.phraseId);
    if (state.query) next.searchParams.set('q', state.query);
    if (state.focus) next.searchParams.set('focus', '1');
  }
  return next.pathname + next.search + next.hash;
}

/** Own only history entries created in this page session. Foreign history state is preserved. */
export class NavigationHistory {
  private index = 0;
  private last = 0;
  private session: string = crypto.randomUUID();
  private readonly storageKey = 'espanol-text-ipa:navigation-session:v1';
  private readonly browser: Pick<Window, 'history' | 'location' | 'sessionStorage'>;
  constructor(browser: Pick<Window, 'history' | 'location' | 'sessionStorage'>) {
    this.browser = browser;
    try {
      const saved = JSON.parse(browser.sessionStorage.getItem(this.storageKey) ?? 'null') as { session?: string; last?: number } | null;
      const entry = browser.history.state?.textIpaNavigation as { session?: string; index?: number } | undefined;
      if (
        saved &&
        typeof saved.session === 'string' &&
        entry?.session === saved.session &&
        Number.isInteger(saved.last) &&
        Number.isInteger(entry.index) &&
        entry.index! >= 0 &&
        entry.index! <= saved.last!
      ) {
        this.session = saved.session;
        this.index = entry.index!;
        this.last = saved.last!;
      }
    } catch {
      /* Navigation remains available even when session storage is denied. */
    }
    this.remember();
    this.replace(this.browser.location.pathname + this.browser.location.search + this.browser.location.hash);
  }
  private remember(): void {
    try {
      this.browser.sessionStorage.setItem(this.storageKey, JSON.stringify({ session: this.session, last: this.last }));
    } catch {}
  }
  get canBack(): boolean {
    return this.index > 0;
  }
  get canForward(): boolean {
    return this.index < this.last;
  }
  private entry(): Record<string, unknown> {
    const previous: unknown = this.browser.history.state;
    return { ...(previous && typeof previous === 'object' ? previous : {}), textIpaNavigation: { session: this.session, index: this.index } };
  }
  private replace(url: string): void {
    this.browser.history.replaceState(this.entry(), '', url);
  }
  write(url: string, mode: 'push' | 'replace'): void {
    const current = this.browser.location.pathname + this.browser.location.search + this.browser.location.hash;
    if (current === url) return;
    if (mode === 'push') {
      this.index++;
      this.last = this.index;
      this.remember();
      this.browser.history.pushState(this.entry(), '', url);
    } else this.replace(url);
  }
  restore(value: unknown): void {
    const entry = (value as { textIpaNavigation?: { session?: string; index?: number } } | null)?.textIpaNavigation;
    if (entry?.session === this.session && Number.isInteger(entry.index) && entry.index! >= 0 && entry.index! <= this.last) this.index = entry.index!;
    else {
      this.index = 0;
      this.last = 0;
    }
  }
}
