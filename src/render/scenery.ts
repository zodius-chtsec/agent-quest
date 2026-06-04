/**
 * Optional dimmed parallax background (Mountain Dusk by ansimuz). OFF by
 * default — the strip's transparency is the point — toggled via the tray,
 * persisted in localStorage.
 */

const STORAGE_KEY = 'agentquest-scenery';
const LAYERS = [
  { src: '/environment/mountain-dusk/far-mountains.png', alpha: 0.35 },
  { src: '/environment/mountain-dusk/mountains.png', alpha: 0.4 },
  { src: '/environment/mountain-dusk/trees.png', alpha: 0.45 },
];

let images: { img: HTMLImageElement; alpha: number }[] | null = null;

export function sceneryEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

/** Load layers only when enabled; best-effort. */
export async function loadScenery(): Promise<boolean> {
  if (!sceneryEnabled()) return false;
  try {
    images = await Promise.all(
      LAYERS.map(
        ({ src, alpha }) =>
          new Promise<{ img: HTMLImageElement; alpha: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ img, alpha });
            img.onerror = () => reject(new Error(`scenery missing: ${src}`));
            img.src = src;
          }),
      ),
    );
    return true;
  } catch {
    images = null;
    return false;
  }
}

/** Draw all layers bottom-aligned, tiled horizontally, dimmed. */
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (!images) return;
  ctx.imageSmoothingEnabled = false;
  for (const { img, alpha } of images) {
    const scale = height / img.height;
    const w = img.width * scale;
    ctx.globalAlpha = alpha;
    for (let x = 0; x < width; x += w) {
      ctx.drawImage(img, x, 0, w, height);
    }
  }
  ctx.globalAlpha = 1;
}
