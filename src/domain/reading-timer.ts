/** Phrase timing independent of browser scheduling, including pause/resume. */
export class ReadingTimer {
  private deadline = 0;
  private pausedRemaining: number | undefined;
  total = 0;
  running = false;

  get paused(): boolean {
    return this.pausedRemaining !== undefined;
  }
  remaining(now: number): number {
    return this.running ? Math.max(0, this.deadline - now) : (this.pausedRemaining ?? this.total);
  }
  start(duration: number, now: number, resume = false): number {
    const remaining = resume && this.paused ? this.pausedRemaining! : duration;
    if (!resume || !this.paused) this.total = duration;
    this.pausedRemaining = undefined;
    this.deadline = now + remaining;
    this.running = true;
    return remaining;
  }
  pause(now: number): void {
    if (!this.running) return;
    this.pausedRemaining = this.remaining(now);
    this.running = false;
  }
  reset(): void {
    this.deadline = 0;
    this.pausedRemaining = undefined;
    this.total = 0;
    this.running = false;
  }
}
