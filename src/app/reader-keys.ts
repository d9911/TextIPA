export type ReaderCommand = 'previous' | 'next' | 'first' | 'last' | 'toggle';
export function readerCommand(event: Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing' | 'repeat'>): ReaderCommand | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return null;
  const key = event.key.toLowerCase();
  if (['ArrowLeft', 'ArrowUp', 'KeyW', 'KeyA'].includes(event.code) || ['arrowleft', 'arrowup', 'w', 'a', 'ц', 'ф'].includes(key)) return 'previous';
  if (['ArrowRight', 'ArrowDown', 'KeyS', 'KeyD'].includes(event.code) || ['arrowright', 'arrowdown', 's', 'd', 'ы', 'в'].includes(key)) return 'next';
  if (['Comma', 'Home'].includes(event.code) || ['<', ',', 'б', 'home'].includes(key)) return 'first';
  if (['Period', 'End'].includes(event.code) || ['>', '.', 'ю', 'end'].includes(key)) return 'last';
  if (['KeyP', 'Space'].includes(event.code) || ['p', 'з', ' '].includes(key)) return event.repeat ? null : 'toggle';
  return null;
}
