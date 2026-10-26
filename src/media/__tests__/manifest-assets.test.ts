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
});
