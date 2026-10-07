export type NoticeKind = 'success' | 'warning' | 'error';
export interface Notice {
  id: number;
  text: string;
  kind: NoticeKind;
}
export class NoticeQueue {
  items: Notice[] = [];
  private sequence = 0;
  add(text: string, kind: NoticeKind): Notice | undefined {
    if (!text.trim()) return;
    const existing = this.items.find((item) => item.text === text && item.kind === kind);
    if (existing) return existing;
    const notice = { id: ++this.sequence, text, kind };
    this.items.push(notice);
    return notice;
  }
  remove(id: number): void {
    this.items = this.items.filter((item) => item.id !== id);
  }
}
