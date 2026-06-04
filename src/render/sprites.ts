/**
 * Built-in fallback sprite definitions: a 16x16 adventurer with body frames
 * and hand-item overlays per action. Armor color ('A') is tinted per hero.
 */

import { rasterize, type Palette } from './pixelart';
import type { HeroAction, HeroState } from '../types';

export const SPRITE_SCALE = 3;
export const HERO_SIZE = 16 * SPRITE_SCALE;

const BASE_PALETTE: Palette = {
  H: '#8a8f98', // helmet
  K: '#e8b88a', // skin
  A: '#5577cc', // armor (tinted per hero)
  L: '#444a55', // legs
  B: '#6b4a2b', // boots
  S: '#cfd6e4', // steel
  G: '#caa53d', // gold/handle
  W: '#8a5a2b', // wood
  F: '#ff9633', // flame
  f: '#ffd23f', // flame core
  R: '#d23f3f', // red accent
  E: '#222222', // eyes/outline
};

const BODY_IDLE_A = [
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKEKEH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '....K.AAAA.K....',
  '......AAAA......',
  '......AAAA......',
  '.....LL..LL.....',
  '.....LL..LL.....',
  '.....LL..LL.....',
  '....BBB..BBB....',
  '................',
];

const BODY_IDLE_B = [
  '................',
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKEKEH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '....K.AAAA.K....',
  '......AAAA......',
  '.....LL..LL.....',
  '.....LL..LL.....',
  '.....LL..LL.....',
  '....BBB..BBB....',
  '................',
];

const BODY_WALK_A = [
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKEKEH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '....K.AAAA.K....',
  '......AAAA......',
  '......AAAA......',
  '....LL...LL.....',
  '...LL.....LL....',
  '...LL......LL...',
  '..BBB.....BBB...',
  '................',
];

const BODY_WALK_B = [
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKEKEH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '....K.AAAA.K....',
  '......AAAA......',
  '......AAAA......',
  '......LLLL......',
  '.....LL..LL.....',
  '.....LL..LL.....',
  '....BBB..BBB....',
  '................',
];

const BODY_SIT = [
  '................',
  '................',
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKEKEH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '....AAAAAAAA....',
  '....K.AAAA.K....',
  '......AAAA......',
  '....LLLLLLLL....',
  '...LL......LL...',
  '...BBB....BBB...',
  '................',
];

const BODY_HURT = [
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HKKKKH.....',
  '.....HKRKRH.....',
  '......KKKK......',
  '.....AAAAAA.....',
  '...AAAAAAAAA....',
  '...K..AAAA..K...',
  '......AAAA......',
  '......AAAA......',
  '....LL....LL....',
  '....LL....LL....',
  '....LL....LL....',
  '...BBB....BBB...',
  '................',
];

// Hand-item overlays, authored facing RIGHT (blade/arrow point away from
// the hero); the renderer mirrors them together with the body when the hero
// faces left. Every frame of an item is authored on the same grid with the
// grip at a fixed cell, so animation pivots around the hero's hand instead
// of the item's own center.

interface ItemDef {
  readonly frames: readonly (readonly string[])[];
  /** Grip cell within the map; this cell is pinned to the hero's hand. */
  readonly gripX: number;
  readonly gripY: number;
}

// Sword swing: raised → diagonal → forward thrust, pivoting on the grip.
const SWORD: ItemDef = {
  frames: [
    ['.S....', '.S....', '.S....', '.S....', 'GG....', '.G....'],
    ['......', '....S.', '...S..', '..S...', 'GS....', '.G....'],
    ['......', '......', '......', '......', 'GSSSS.', '.G....'],
  ],
  gripX: 1,
  gripY: 4,
};

const STAFF: ItemDef = {
  frames: [
    ['.f....', '.W....', '.W....', '.W....', '.W....', '.W....'],
    ['fff...', 'fWf...', '.W....', '.W....', '.W....', '.W....'],
  ],
  gripX: 1,
  gripY: 4,
};

const BOW: ItemDef = {
  frames: [
    ['W.....', '.W....', '.W....', '.W....', '.W....', 'W.....'],
    ['W.....', '.W....', '.WSS..', '.W....', '.W....', 'W.....'],
  ],
  gripX: 1,
  gripY: 2,
};

const SCROLL: ItemDef = {
  frames: [
    ['....', 'GGG.', 'SSS.', 'SSS.', 'GGG.', '....'],
    ['....', 'GGGG', 'SSSS', 'SSSS', 'GGGG', '....'],
  ],
  gripX: 1,
  gripY: 3,
};

const CAMPFIRE_A = [
  '...f....',
  '..fFf...',
  '..FfF...',
  '.FfFfF..',
  '.WWWWW..',
  'WW...WW.',
];
const CAMPFIRE_B = [
  '........',
  '...f....',
  '..FfF...',
  '.fFfFf..',
  '.WWWWW..',
  'WW...WW.',
];

const MARK_ATTENTION = ['RR', 'RR', 'RR', 'RR', '..', 'RR'];

export interface RenderedItem {
  readonly frames: HTMLCanvasElement[];
  /** Grip offset in scaled pixels; pin this point to the hero's hand. */
  readonly gripX: number;
  readonly gripY: number;
}

export interface SpriteSet {
  readonly bodies: Record<string, HTMLCanvasElement[]>;
  readonly items: Partial<Record<HeroAction, RenderedItem>>;
  readonly campfire: HTMLCanvasElement[];
  readonly attention: HTMLCanvasElement;
}

/** Build the full sprite set for a hero, tinting armor with `accent`. */
export function buildSpriteSet(accent: string): SpriteSet {
  const pal: Palette = { ...BASE_PALETTE, A: accent };
  const r = (m: readonly string[]) => rasterize(m, pal, SPRITE_SCALE);
  const item = (def: ItemDef): RenderedItem => ({
    frames: def.frames.map((f) => r(f)),
    gripX: def.gripX * SPRITE_SCALE,
    gripY: def.gripY * SPRITE_SCALE,
  });
  const sword = item(SWORD);
  const staff = item(STAFF);
  return {
    bodies: {
      idle: [r(BODY_IDLE_A), r(BODY_IDLE_B)],
      walk: [r(BODY_WALK_A), r(BODY_WALK_B)],
      sit: [r(BODY_SIT), r(BODY_IDLE_A)],
      hurt: [r(BODY_HURT)],
    },
    items: {
      attack: sword,
      cast: staff,
      bow: item(BOW),
      scout: item(SCROLL),
      summon: staff,
      generic: sword,
    },
    campfire: [r(CAMPFIRE_A), r(CAMPFIRE_B)],
    attention: r(MARK_ATTENTION),
  };
}

/** The hero's hand position within the 16x16 body, in scaled pixels. */
export const HAND_X = 11 * SPRITE_SCALE;
export const HAND_Y = 8 * SPRITE_SCALE;

/** Which body animation a hero state maps to. */
export function bodyForState(state: HeroState, walking: boolean): string {
  if (walking) return 'walk';
  switch (state) {
    case 'IDLE':
      return 'sit';
    case 'HURT':
      return 'hurt';
    default:
      return 'idle';
  }
}
