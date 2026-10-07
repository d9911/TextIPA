import test from 'node:test';
import assert from 'node:assert/strict';
import { projectFromText } from '../src/domain/library.ts';
import { emptyLibrary } from '../src/domain/preferences.ts';
import { resolveNavigation, navigationUrl } from '../src/app/navigation.ts';

const library = emptyLibrary();
const project = projectFromText('Script', '# Uno & dos\nHola. Adiós.\n\n# Другой блок\nBuenos días.', 'es');
library.projects = [project];
library.activeId = project.id;

test('links restore stable IDs, Unicode block names, search and rehearsal view without touching data', () => {
  const before = JSON.stringify(library);
  const target = { projectId: project.id, block: 'Другой блок', phraseId: project.phrases[2]!.id, query: '', focus: true, ipaDisplay: 'above' as const };
  const url = navigationUrl(new URL('http://localhost/?external=keep#anchor'), target);
  assert.ok(url.includes('external=keep'));
  assert.ok(url.endsWith('#anchor'));
  assert.deepEqual(resolveNavigation(new URL(url, 'http://localhost/').searchParams, library).state, target);
  assert.equal(JSON.stringify(library), before);
});
test('IPA placement links override saved preferences and reject invalid or duplicate values', () => {
  const saved = structuredClone(library);
  saved.settings.ipaDisplay = 'line';
  assert.equal(resolveNavigation(new URLSearchParams(), saved).state.ipaDisplay, 'line');
  const above = resolveNavigation(new URLSearchParams('ipa=above'), saved);
  assert.equal(above.state.ipaDisplay, 'above');
  assert.equal(saved.settings.ipaDisplay, 'line');
  const url = navigationUrl(new URL('http://localhost/?external=keep&ipa=line#anchor'), above.state);
  assert.equal(new URL(url, 'http://localhost').searchParams.get('ipa'), 'above');
  assert.ok(url.includes('external=keep'));
  assert.ok(url.endsWith('#anchor'));
  for (const query of ['ipa=other', 'ipa=above&ipa=line', 'ipa=%00', 'ipa=' + 'a'.repeat(6)]) {
    const result = resolveNavigation(new URLSearchParams(query), saved);
    assert.equal(result.corrected, true);
    assert.equal(result.state.ipaDisplay, 'line');
  }
  assert.equal(resolveNavigation(new URLSearchParams('ipa=line'), emptyLibrary()).state.ipaDisplay, 'line');
});
test('absent navigation starts from saved project; missing projects, blocks and phrases fall back safely', () => {
  assert.equal(resolveNavigation(new URLSearchParams(), library).state.projectId, project.id);
  for (const query of ['project=missing&block=bad&phrase=bad', `project=${project.id}&block=bad&phrase=bad`]) {
    const result = resolveNavigation(new URLSearchParams(query), library);
    assert.equal(result.corrected, true);
    assert.equal(result.state.block, '');
    assert.equal(result.state.phraseId, project.phrases[0]!.id);
  }
  const empty = resolveNavigation(new URLSearchParams('project=missing&focus=1'), emptyLibrary());
  assert.equal(empty.state.projectId, null);
  assert.equal(empty.state.focus, false);
});
test('duplicate, oversized and control-character values are rejected, IDs are not constrained to UUIDs', () => {
  for (const query of ['project=x&project=y', 'block=' + 'a'.repeat(251), 'phrase=%00', 'focus=true', 'q=' + 'a'.repeat(301)]) {
    assert.equal(resolveNavigation(new URLSearchParams(query), library).corrected, true);
  }
  const p = structuredClone(project);
  p.id = 'legacy / id';
  assert.equal(resolveNavigation(new URLSearchParams({ project: p.id }), { ...library, projects: [p] }).state.projectId, p.id);
});
test('a valid phrase takes precedence over a conflicting block; search restoration keeps only matching focus', () => {
  const result = resolveNavigation(new URLSearchParams({ project: project.id, block: 'Uno & dos', phrase: project.phrases[2]!.id }), library);
  assert.equal(result.state.block, 'Другой блок');
  assert.equal(result.corrected, true);
  const search = resolveNavigation(new URLSearchParams({ project: project.id, q: 'Adiós', phrase: project.phrases[0]!.id }), library);
  assert.equal(search.state.phraseId, project.phrases[1]!.id);
  const noMatches = resolveNavigation(new URLSearchParams({ q: 'no matching text' }), library);
  assert.equal(noMatches.state.phraseId, null);
  const emptyFocus = resolveNavigation(new URLSearchParams({ q: 'no matching text', focus: '1' }), library);
  assert.equal(emptyFocus.state.focus, false);
  assert.equal(emptyFocus.corrected, true);
});
test('deleting a linked phrase resolves to the first remaining phrase, unrelated parameters survive canonicalization', () => {
  const reduced = { ...library, projects: [{ ...project, phrases: project.phrases.slice(1) }] };
  const result = resolveNavigation(new URLSearchParams({ phrase: project.phrases[0]!.id }), reduced);
  assert.equal(result.state.phraseId, project.phrases[1]!.id);
  assert.equal(result.corrected, true);
});

test('history preserves edits and foreign state, survives reload and truncates forward branch', async () => {
  const { NavigationHistory } = await import('../src/app/navigation.ts');
  const entries = [{ url: new URL('http://localhost/'), state: { otherFeature: 'keep' } as unknown }];
  let index = 0;
  const memory = new Map<string, string>();
  const browser = {
    get location() {
      return entries[index]!.url;
    },
    sessionStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    },
    history: {
      get state() {
        return entries[index]!.state;
      },
      replaceState(state: unknown, _unused: string, url: string | URL | null) {
        entries[index] = { state, url: new URL(String(url), 'http://localhost/') };
      },
      pushState(state: unknown, _unused: string, url: string | URL | null) {
        entries.splice(index + 1);
        entries.push({ state, url: new URL(String(url), 'http://localhost/') });
        index++;
      },
    },
  };
  let navigation = new NavigationHistory(browser as unknown as Window);
  navigation.write('/?phrase=one', 'replace');
  navigation.write('/?phrase=two', 'push');
  navigation.write('/?phrase=three', 'push');
  assert.equal(navigation.canBack, true);
  assert.equal(navigation.canForward, false);
  assert.equal((browser.history.state as { otherFeature: string }).otherFeature, 'keep');
  index--;
  navigation.restore(browser.history.state);
  assert.equal(navigation.canForward, true);
  navigation = new NavigationHistory(browser as unknown as Window);
  assert.equal(navigation.canBack, true);
  assert.equal(navigation.canForward, true);
  navigation.write('/?phrase=four', 'push');
  assert.equal(entries.length, 3);
  assert.equal(navigation.canForward, false);
  index--;
  navigation.restore(browser.history.state);
  assert.equal(browser.location.search, '?phrase=two');
});

test('a clean app URL restores the reading position, while explicit links take precedence', async () => {
  const { initialNavigation } = await import('../src/app/navigation.ts');
  const { loadReadingPosition, saveReadingPosition, readingPositionKey } = await import('../src/infrastructure/storage.ts');
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const saved = new URLSearchParams({ project: project.id, phrase: project.phrases[1]!.id, focus: '1', ipa: 'above' });
  assert.equal(saveReadingPosition(storage, saved), true);
  const restored = resolveNavigation(initialNavigation(new URLSearchParams(), loadReadingPosition(storage)), library);
  assert.equal(restored.state.phraseId, project.phrases[1]!.id);
  assert.equal(restored.state.focus, true);
  assert.equal(restored.state.ipaDisplay, 'above');
  const linked = resolveNavigation(initialNavigation(new URLSearchParams({ project: project.id, phrase: project.phrases[0]!.id }), saved), library);
  assert.equal(linked.state.phraseId, project.phrases[0]!.id);
  assert.equal(linked.state.focus, false);
  const placement = resolveNavigation(initialNavigation(new URLSearchParams('ipa=line'), saved), library);
  assert.equal(placement.state.phraseId, project.phrases[1]!.id);
  assert.equal(placement.state.ipaDisplay, 'line');
  const reduced = { ...library, projects: [{ ...project, phrases: project.phrases.slice(2) }] };
  assert.equal(resolveNavigation(initialNavigation(new URLSearchParams(), saved), reduced).state.phraseId, project.phrases[2]!.id);
  values.delete(readingPositionKey);
  assert.equal(loadReadingPosition(storage).toString(), '');
  const unavailable = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('full');
    },
  };
  assert.equal(loadReadingPosition(unavailable).toString(), '');
  assert.equal(saveReadingPosition(unavailable, saved), false);
});
