import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public/assets/manifest.json', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(__dirname, '../../../public/assets/manifest.json'), 'utf8'),
  );

  it('lists at least one photo and one moan, all string paths', () => {
    expect(manifest.photos.length).toBeGreaterThanOrEqual(1);
    expect(manifest.moans.length).toBeGreaterThanOrEqual(1);
    for (const p of [...manifest.photos, ...manifest.moans]) {
      expect(typeof p).toBe('string');
    }
  });

  it('has an endings section (finale sounds) of string paths that all contain "-end"', () => {
    expect(Array.isArray(manifest.endings)).toBe(true);
    for (const p of manifest.endings ?? []) {
      expect(typeof p).toBe('string');
      expect(p).toContain('-end');
    }
  });
});
