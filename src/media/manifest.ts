export interface AssetManifest {
  photos: string[];
  /** Gameplay moans: played on row/col/box completion and when a digit is used up. */
  moans: string[];
  /** Finale sounds (filenames contain "-end"): played once when the puzzle is solved. */
  endings: string[];
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

const empty = (): AssetManifest => ({ photos: [], moans: [], endings: [] });

/** Fetches the asset manifest; returns an empty manifest on any failure. */
export async function loadManifest(url = '/assets/manifest.json'): Promise<AssetManifest> {
  try {
    const res = await fetch(url);
    if (!res.ok) return empty();
    const data = await res.json();
    return { photos: strings(data?.photos), moans: strings(data?.moans), endings: strings(data?.endings) };
  } catch {
    return empty();
  }
}
