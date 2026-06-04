/**
 * Tiny pixel-art rasterizer: ASCII maps → canvases. Used for the built-in
 * fallback art so the app works with zero external assets. Real sprite
 * sheets (e.g. Tiny Swords), when downloaded, take priority over these.
 */

import { hashString } from '../util/hash';

export { hashString };

export type Palette = Record<string, string>;

/** Rasterize an ASCII pixel map ('.'=transparent) into an offscreen canvas. */
export function rasterize(map: readonly string[], palette: Palette, scale = 1): HTMLCanvasElement {
  const h = map.length;
  const w = Math.max(...map.map((row) => row.length));
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

/** Pick a stable accent hue for a session id. */
export function accentColor(id: string, saturation = 60, lightness = 45): string {
  const hue = hashString(id) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
