import type { ExampleFile } from '../../types/api.ts';
import type { Copy } from '../../i18n/locales.ts';
import { button, dialog, element } from '../../shared/ui/controls.ts';

export function showExamples(copy: Copy, importFiles: (files: File[]) => void, error: (error: unknown) => void): void {
  const view = dialog(copy.examples, copy.close);
  view.dialog.classList.add('examples-dialog');
  const status = element('p', 'muted', copy.loading);
  const list = element('div', 'example-list');
  view.body.append(element('p', 'muted', copy.examplesHint), status, list);
  view.dialog.showModal();
  const controller = new AbortController();
  view.dialog.addEventListener('close', () => controller.abort());
  void fetch('/api/examples', { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error('INVALID_FILE');
      return response.json() as Promise<ExampleFile[]>;
    })
    .then((files) => {
      status.textContent = files.length ? '' : copy.examplesEmpty;
      status.hidden = files.length > 0;
      for (const file of files) {
        const entry = button(
          '',
          () => {
            entry.disabled = true;
            void fetch('/api/examples/file?name=' + encodeURIComponent(file.name), { signal: controller.signal })
              .then(async (response) => {
                if (!response.ok) throw new Error('INVALID_FILE');
                return response.text();
              })
              .then((text) => {
                view.dialog.close();
                importFiles([new File([text], file.name, { type: file.name.endsWith('.json') ? 'application/json' : 'text/plain' })]);
              })
              .catch((reason) => {
                if (!controller.signal.aborted) {
                  entry.disabled = false;
                  error(reason);
                }
              });
          },
          'example-entry',
          copy.openFile + ': ' + file.name,
        );
        entry.append(element('strong', '', file.name), element('span', 'muted small', file.name.split('.').pop()!.toUpperCase()), element('span', '', '↑'));
        list.append(entry);
      }
    })
    .catch((reason) => {
      if (!controller.signal.aborted) {
        status.textContent = copy.error;
        error(reason);
      }
    });
}
