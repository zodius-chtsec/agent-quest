/**
 * Sprite-sheet atlas loader for real art packs (e.g. Tiny Swords).
 * An atlas JSON (committed) describes one animation strip PNG per anim
 * (the PNGs themselves are gitignored):
 *
 *   {
 *     "frameW": 192, "frameH": 192,
 *     "anims": {
 *       "idle": { "image": "/sprites/.../Warrior_Idle.png", "frames": 8, "fps": 6 },
 *       "walk": { "image": "/sprites/.../Warrior_Run.png", "frames": 6, "fps": 10 }
 *     }
 *   }
 *
 * Loading is best-effort: any failure (missing pack, bad JSON) resolves to
 * null and the caller falls back to the built-in procedural art.
 */

export interface AtlasAnim {
  readonly image: HTMLImageElement | HTMLCanvasElement;
  readonly frames: number;
  readonly fps: number;
}

export interface Atlas {
  readonly frameW: number;
  readonly frameH: number;
  /** Fraction of frame height where the character's feet sit (default 1). */
  readonly anchorY: number;
  /** Fraction of frame height where the character's head starts (default 0). */
  readonly bodyTop: number;
  /** Suggested on-screen frame height in px (optional sizing hint). */
  readonly displayH?: number;
  readonly anims: Readonly<Record<string, AtlasAnim>>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

interface AnimMeta {
  readonly image: string;
  readonly frames: number;
  readonly fps: number;
}

function isAnimMeta(value: unknown): value is AnimMeta {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.image === 'string' && typeof a.frames === 'number' && typeof a.fps === 'number'
  );
}

/** Load and validate one atlas; null = use procedural fallback. */
export async function loadAtlas(url: string): Promise<Atlas | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const meta = (await res.json()) as Record<string, unknown>;
    if (
      typeof meta.frameW !== 'number' ||
      typeof meta.frameH !== 'number' ||
      typeof meta.anims !== 'object' ||
      meta.anims === null
    ) {
      return null;
    }
    const entries = Object.entries(meta.anims).filter(
      (e): e is [string, AnimMeta] => isAnimMeta(e[1]),
    );
    if (entries.length === 0) return null;

    const anims: Record<string, AtlasAnim> = {};
    for (const [name, anim] of entries) {
      anims[name] = {
        image: await loadImage(anim.image),
        frames: anim.frames,
        fps: anim.fps,
      };
    }
    return {
      frameW: meta.frameW,
      frameH: meta.frameH,
      anchorY: typeof meta.anchorY === 'number' ? meta.anchorY : 1,
      bodyTop: typeof meta.bodyTop === 'number' ? meta.bodyTop : 0,
      displayH: typeof meta.displayH === 'number' ? meta.displayH : undefined,
      anims,
    };
  } catch {
    return null;
  }
}

/**
 * Draw one frame of an atlas animation. The frame is positioned so the
 * character's FEET (frameH * anchorY) land exactly on feetY, horizontally
 * centered on centerX.
 */
export function drawAtlasFrame(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  animName: string,
  clockMs: number,
  centerX: number,
  feetY: number,
  targetH: number,
  flip: boolean,
  /** One-shot animations clamp to the last frame instead of looping. */
  once = false,
): void {
  const anim = atlas.anims[animName] ?? Object.values(atlas.anims)[0];
  const raw = Math.floor((clockMs / 1000) * anim.fps);
  const frame = once ? Math.min(raw, anim.frames - 1) : raw % anim.frames;
  const sx = frame * atlas.frameW;
  const scale = targetH / atlas.frameH;
  const targetW = atlas.frameW * scale;
  const x = centerX - targetW / 2;
  const y = feetY - targetH * atlas.anchorY;

  ctx.save();
  if (flip) {
    ctx.translate(x + targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(anim.image, sx, 0, atlas.frameW, atlas.frameH, 0, y, targetW, targetH);
  } else {
    ctx.drawImage(anim.image, sx, 0, atlas.frameW, atlas.frameH, x, y, targetW, targetH);
  }
  ctx.restore();
}
