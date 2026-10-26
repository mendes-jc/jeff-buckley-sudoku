export interface AssetManifest {
  photos: string[];
  moans: string[];
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Fetches the asset manifest; returns an empty manifest on any failure. */
export async function loadManifest(url = '/assets/manifest.json'): Promise<AssetManifest> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { photos: [], moans: [] };
    const data = await res.json();
    return { photos: strings(data?.photos), moans: strings(data?.moans) };
  } catch {
    return { photos: [], moans: [] };
  }
}
