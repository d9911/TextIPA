import source from '/examples/kolobok-es-ru.json?raw';
import { validateProject } from '../domain/library.ts';

/** Vite bundles the public demo so its IPA is also available offline. */
export const bundledExample = validateProject(JSON.parse(source));
