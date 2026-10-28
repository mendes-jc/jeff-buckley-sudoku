import { makeRng, type RNG } from '../core/rng';
import type { AssetManifest } from './manifest';

export class MediaController {
  private muted = false;
  private volume = 1;
  private readonly rng: RNG;

  constructor(private readonly manifest: AssetManifest, rng?: RNG) {
    this.rng = rng ?? makeRng(Date.now());
  }

  private pick(list: string[]): string | null {
    if (list.length === 0) return null;
    return list[Math.floor(this.rng.next() * list.length)];
  }

  pickBackground(): string | null {
    return this.pick(this.manifest.photos);
  }

  /** Fresh Audio per call so rapid completions overlap cleanly. Never throws. */
  playMoan(): void {
    this.playFrom(this.manifest.moans);
  }

  /** Finale sound played once when the puzzle is solved. Silent if none are configured. */
  playEnding(): void {
    this.playFrom(this.manifest.endings);
  }

  private playFrom(list: string[]): void {
    if (this.muted) return;
    const src = this.pick(list);
    if (src === null) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.volume;
      // Release the underlying media player once the clip is done (or fails).
      // Android WebView caps concurrent media players; without this, a game's
      // moans pile up and the finale — the last sound created — can't get a
      // player and silently fails. Desktop browsers don't hit the cap.
      const release = () => {
        try {
          audio.src = '';
          audio.load?.();
        } catch {
          /* ignore */
        }
      };
      audio.addEventListener?.('ended', release, { once: true });
      audio.addEventListener?.('error', release, { once: true });
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => release());
    } catch {
      // audio unavailable or blocked; ignore
    }
  }

  setMuted(b: boolean): void {
    this.muted = b;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  }
}
