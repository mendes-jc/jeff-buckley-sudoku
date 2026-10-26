# Game media assets

The game loads `/assets/manifest.json` at runtime. Everything in `public/` is served at the site root.

## Layout

```
public/assets/
  manifest.json
  photos/   background images
  moans/    short audio clips
```

## Manifest shape

```json
{
  "photos": ["/assets/photos/placeholder-1.svg"],
  "moans": ["/assets/moans/placeholder-1.wav"]
}
```

Paths are web-root-relative strings. Both lists must be non-empty.

## Accepted formats

- Images: svg, jpg, png, webp
- Audio: wav, mp3, ogg

## Replacing the placeholders with real media (no code changes)

1. Drop your image files into `public/assets/photos/` and audio clips into `public/assets/moans/`.
2. Edit `manifest.json`: list each file as `/assets/photos/<name>` or `/assets/moans/<name>`. Remove the placeholder entries (and delete the placeholder files) if you no longer want them.
3. Reload the app (rebuild for production). No source code needs to change.

## Rights

No real Jeff Buckley media is bundled. The placeholders are generated gradients and sine tones. You must supply only media you have the right to use.
