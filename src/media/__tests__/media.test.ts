import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaController } from '../media';
import { loadManifest } from '../manifest';
import { makeRng } from '../../core/rng';

class MockAudio {
  static instances: MockAudio[] = [];
  volume = 1;
  played = 0;
  loaded = 0;
  listeners: Record<string, Array<() => void>> = {};
  constructor(public src: string) {
    MockAudio.instances.push(this);
  }
  play(): Promise<void> {
    this.played++;
    return Promise.resolve();
  }
  addEventListener(ev: string, cb: () => void): void {
    (this.listeners[ev] ||= []).push(cb);
  }
  load(): void {
    this.loaded++;
  }
  /** test helper: fire a registered event */
  fire(ev: string): void {
    (this.listeners[ev] || []).forEach((cb) => cb());
  }
}

const manifest = {
  photos: ['a.jpg', 'b.jpg', 'c.jpg'],
  moans: ['m1.mp3', 'm2.mp3'],
  endings: ['finale-end.mp3'],
};
const g = globalThis as any;
const realAudio = g.Audio;
const realFetch = g.fetch;

beforeEach(() => {
  MockAudio.instances = [];
  g.Audio = MockAudio;
});
afterEach(() => {
  g.Audio = realAudio;
  g.fetch = realFetch;
});

describe('MediaController', () => {
  it('pickBackground returns a manifest photo, deterministic with seed', () => {
    const a = new MediaController(manifest, makeRng(5)).pickBackground();
    const b = new MediaController(manifest, makeRng(5)).pickBackground();
    expect(manifest.photos).toContain(a);
    expect(a).toBe(b);
  });

  it('playMoan creates and plays a moan at current volume', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.setVolume(0.4);
    m.playMoan();
    expect(MockAudio.instances).toHaveLength(1);
    expect(manifest.moans).toContain(MockAudio.instances[0].src);
    expect(MockAudio.instances[0].volume).toBe(0.4);
    expect(MockAudio.instances[0].played).toBe(1);
  });

  it('playEnding creates and plays a finale sound from the endings list', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.setVolume(0.6);
    m.playEnding();
    expect(MockAudio.instances).toHaveLength(1);
    expect(manifest.endings).toContain(MockAudio.instances[0].src);
    expect(MockAudio.instances[0].volume).toBe(0.6);
    expect(MockAudio.instances[0].played).toBe(1);
  });

  it('playEnding is a silent no-op when no endings are configured', () => {
    const m = new MediaController({ photos: [], moans: ['m1.mp3'], endings: [] }, makeRng(1));
    expect(() => m.playEnding()).not.toThrow();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('playEnding respects mute', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.setMuted(true);
    m.playEnding();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('releases the media player after a clip ends, so players do not pile up', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.playMoan();
    const a = MockAudio.instances[0];
    expect(a.src).not.toBe('');
    a.fire('ended'); // clip finished
    expect(a.src).toBe(''); // player released
    expect(a.loaded).toBe(1);
  });

  it('releases the media player if the clip errors', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.playEnding();
    const a = MockAudio.instances[0];
    a.fire('error');
    expect(a.src).toBe('');
  });

  it('clamps volume to [0,1]', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.setVolume(5);
    m.playMoan();
    m.setVolume(-2);
    m.playMoan();
    expect(MockAudio.instances.map((i) => i.volume)).toEqual([1, 0]);
  });

  it('muted does not play', () => {
    const m = new MediaController(manifest, makeRng(1));
    m.setMuted(true);
    m.playMoan();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('[Review Focus] empty manifest: null background and silent no-op', () => {
    const m = new MediaController({ photos: [], moans: [], endings: [] }, makeRng(1));
    expect(m.pickBackground()).toBeNull();
    expect(() => m.playMoan()).not.toThrow();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('[Review Focus] successive playMoan makes two instances, no throw', () => {
    const m = new MediaController(manifest, makeRng(1));
    expect(() => {
      m.playMoan();
      m.playMoan();
    }).not.toThrow();
    expect(MockAudio.instances).toHaveLength(2);
    expect(MockAudio.instances[0]).not.toBe(MockAudio.instances[1]);
  });

  it('swallows rejected play() and constructor errors', async () => {
    g.Audio = class {
      volume = 1;
      play() {
        return Promise.reject(new Error('NotAllowed'));
      }
    };
    const m = new MediaController(manifest, makeRng(1));
    expect(() => m.playMoan()).not.toThrow();
    await Promise.resolve();
    g.Audio = function () {
      throw new Error('boom');
    };
    expect(() => m.playMoan()).not.toThrow();
  });
});

describe('loadManifest', () => {
  it('returns parsed manifest', async () => {
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photos: ['x'], moans: ['y'], endings: ['z-end.mp3'] }),
    });
    expect(await loadManifest('/m.json')).toEqual({ photos: ['x'], moans: ['y'], endings: ['z-end.mp3'] });
  });
  it('normalizes missing fields', async () => {
    g.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photos: ['x'] }) });
    expect(await loadManifest()).toEqual({ photos: ['x'], moans: [], endings: [] });
  });
  it('returns empty on network error, non-OK, bad JSON', async () => {
    const empty = { photos: [], moans: [], endings: [] };
    g.fetch = vi.fn().mockRejectedValue(new Error('net'));
    expect(await loadManifest()).toEqual(empty);
    g.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await loadManifest()).toEqual(empty);
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('bad');
      },
    });
    expect(await loadManifest()).toEqual(empty);
  });
});
