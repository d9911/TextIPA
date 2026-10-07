/** Textareas grow with their actual shaped content, including multi-codepoint IPA marks. */
export function resizePhraseFields(root: ParentNode = document): void {
  for (const field of root.querySelectorAll<HTMLTextAreaElement>('.phrase-text, .phrase-ipa, .phrase-translation')) {
    field.style.height = 'auto';
    field.style.height = field.scrollHeight + 4 + 'px';
  }
}
let observer: IntersectionObserver | undefined;
export function revealPhrases(root: HTMLElement): void {
  observer?.disconnect();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer?.unobserve(entry.target);
        }
    },
    { threshold: 0.03 },
  );
  for (const row of root.querySelectorAll('.phrase-row')) {
    row.classList.add('reveal-ready');
    observer.observe(row);
  }
}
