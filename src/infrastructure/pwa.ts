import type { Language } from '../types/domain.ts';

const copy = {
  ru: {
    offline: 'Без подключения: тексты доступны. Для новой IPA запустите локальный сервер.',
    update: 'Есть обновление приложения. Закройте все окна Text IPA и откройте снова.',
    failed: 'Офлайн-режим не подготовлен. Перезагрузите страницу при работающем сервере.',
  },
  en: {
    offline: 'Offline: your texts are available. Start the local server to generate new IPA.',
    update: 'An app update is ready. Close all Text IPA windows and reopen.',
    failed: 'Offline mode is not ready. Reload while the server is running.',
  },
  es: {
    offline: 'Sin conexión: tus textos están disponibles. Inicia el servidor local para generar nueva IPA.',
    update: 'Hay una actualización. Cierra todas las ventanas de Text IPA y vuelve a abrir.',
    failed: 'El modo sin conexión no está preparado. Recarga con el servidor iniciado.',
  },
};

export function setupPwa(locale: () => Language, notify: (message: string) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('offline', () => notify(copy[locale()].offline));
  if (!navigator.onLine) notify(copy[locale()].offline);
  void navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      const updated = () => {
        if (registration.waiting && navigator.serviceWorker.controller) notify(copy[locale()].update);
      };
      updated();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', updated);
      });
      // Keep an edited script intact: updates activate after all app windows close.
      window.addEventListener('focus', () => {
        void registration.update().catch(() => {});
      });
    })
    .catch(() => notify(copy[locale()].failed));
}
