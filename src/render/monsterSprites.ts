/**
 * Monster sprites for the four evolution tiers, authored FACING LEFT
 * (toward the hero). Each tier has a 2-frame idle; a white silhouette
 * variant is pre-rendered for hit flashes.
 */

import { rasterize, type Palette } from './pixelart';
import { SPRITE_SCALE } from './sprites';

/**
 * Elemental families: each is a (light, dark, membrane) trio applied to
 * every tier's body colors, so any species can appear at any tier.
 * Order must match SPECIES_COUNT in monsterStore.
 */
export const FAMILIES = [
  { name: 'Forest', light: '#7bc950', dark: '#4e9636', membrane: '#c9eaa0' },
  { name: 'Frost', light: '#6db7d9', dark: '#3d7fa6', membrane: '#cfe9f4' },
  { name: 'Magma', light: '#d97a4a', dark: '#a6432a', membrane: '#f4c98f' },
  { name: 'Shadow', light: '#9b6dd9', dark: '#5d3da6', membrane: '#d9cfee' },
  { name: 'Toxic', light: '#c4c950', dark: '#8f9636', membrane: '#e9e9a0' },
] as const;

function familyPalette(species: number): Palette {
  const f = FAMILIES[species % FAMILIES.length];
  return {
    g: f.light, // slime light
    G: f.dark, // slime dark
    s: f.light, // goblin skin
    S: f.dark, // goblin skin shade
    c: '#7a5a35', // club / horn wood
    o: f.light, // ogre skin
    O: f.dark, // ogre shade
    d: f.light, // dragon scale
    D: f.dark, // dragon shade
    w: f.membrane, // dragon wing membrane
    E: '#1c1c1c', // eyes
    T: '#f4f0e6', // teeth/claws
  };
}

const SLIME_A = [
  '............',
  '....gggg....',
  '..gggggggg..',
  '.gGgggggggG.',
  '.gEgggggEgg.',
  'gggggggggggg',
  'gGgggggggGgg',
  '.gggggggggg.',
  '..GGGGGGGG..',
  '............',
];
const SLIME_B = [
  '............',
  '............',
  '...gggggg...',
  '.gggggggggg.',
  'gGgggggggGgg',
  'gEgggggggEgg',
  'gggggggggggg',
  'gGggggggggGg',
  '.GGGGGGGGGG.',
  '............',
];

const GOBLIN_A = [
  '..............',
  '.s..ssss......',
  '.ss.ssssss....',
  '..sssEsEss....',
  '...ssssss..c..',
  '....ssss...c..',
  '..SssssssS.c..',
  '.S.ssssss.Sc..',
  '...ssssss.cc..',
  '...ssssss.....',
  '....ssss......',
  '...SS..SS.....',
  '...SS..SS.....',
  '..SSS..SSS....',
  '..............',
];
const GOBLIN_B = [
  '..............',
  '..............',
  '.s..ssss......',
  '.ss.ssssss....',
  '..sssEsEss.c..',
  '...ssssss..c..',
  '....ssss...c..',
  '..SssssssS.c..',
  '.S.ssssss.Scc.',
  '...ssssss.....',
  '...ssssss.....',
  '....SSSS......',
  '...SS..SS.....',
  '..SSS..SSS....',
  '..............',
];

const OGRE_A = [
  '..................',
  '.....oooooo.......',
  '....oooooooo......',
  '...oooEooEooo.....',
  '...oooooooooo.....',
  '....oTTTTTTo......',
  '...oooooooooo..c..',
  '..oooooooooooo.c..',
  '.OoooooooooooOOc..',
  '.O.oooooooooo.Oc..',
  '...oooooooooo.cc..',
  '...oooooooooo.....',
  '..oooooooooooo....',
  '..oooooooooooo....',
  '...OOOO..OOOO.....',
  '...OOOO..OOOO.....',
  '..OOOOO..OOOOO....',
  '..................',
];
const OGRE_B = [
  '..................',
  '..................',
  '.....oooooo.......',
  '....oooooooo......',
  '...oooEooEooo..c..',
  '...oooooooooo..c..',
  '....oTTTTTTo...c..',
  '...oooooooooo..c..',
  '..ooooooooooooOc..',
  '.Oooooooooooo.Occ.',
  '.O.oooooooooo.....',
  '...oooooooooo.....',
  '..oooooooooooo....',
  '..oooooooooooo....',
  '....OOOOOOOO......',
  '...OOOO..OOOO.....',
  '..OOOOO..OOOOO....',
  '..................',
];

const DRAGON_A = [
  '........................',
  '..........www...........',
  '.........wwwww..........',
  '........wwwwwww.........',
  '...dd...wwwwwww.........',
  '..dddd..dwwwwwd.........',
  '.ddEdd.ddddddddd........',
  '.ddddddddddddddd...d....',
  '.dTddddddddddddd..dd....',
  '..ddddddddddddddddDd....',
  '...dddddddddddddddD.....',
  '....DdddddddddddD......',
  '....DddddddddddD........',
  '.....dddddddddd.........',
  '.....DD....DDD..........',
  '....TDD....DDT..........',
  '........................',
];
const DRAGON_B = [
  '........................',
  '........................',
  '..........www...........',
  '...dd....wwwww..........',
  '..dddd..wwwwwww.........',
  '.ddEdd..dwwwwwd....d....',
  '.dddddddddddddddd.dd....',
  '.dTdddddddddddddddDd....',
  '..ddddddddddddddddD.....',
  '...dddddddddddddddD.....',
  '....DdddddddddddD.......',
  '....DddddddddddD........',
  '.....dddddddddd.........',
  '.....DD....DDD..........',
  '....TDD....DDT..........',
  '........................',
  '........................',
];

// --- Family-specific low-tier shapes (authored facing LEFT) -------------
// High tiers (ogre/dragon) are shared body plans with family palettes; the
// commonly-seen tiers 0-1 get a distinct species shape per family.

/** Cheap second frame: shift the body down one pixel (breathing bob). */
function bob(map: readonly string[]): readonly string[] {
  const width = Math.max(...map.map((r) => r.length));
  return ['.'.repeat(width), ...map.slice(0, -1)];
}

const BAT = [
  '..............',
  '.gg........gg.',
  '.gGg......gGg.',
  '..gGg.gg.gGg..',
  '...gggggggg...',
  '...gEgggggg...',
  '...gggggggg...',
  '....gTgggg....',
  '.....gggg.....',
  '..............',
];

const EMBER = [
  '............',
  '.....g......',
  '....gg.g....',
  '...gggg.....',
  '..gwgggg....',
  '..gwwggg....',
  '.ggwwgggg...',
  '.ggwggggg...',
  '.gggggggg...',
  '.gEggggEg...',
  '..gggggg....',
  '...GGGG.....',
];

const GHOST = [
  '....gggg....',
  '..gggggggg..',
  '.gggggggggg.',
  '.ggEggEgggg.',
  '.gggggggggg.',
  '.gggggggggg.',
  '.gggggggggg.',
  '..ggggggggg.',
  '...g.gg.gg..',
  '............',
];

const MUSHROOM = [
  '...gggggg...',
  '..gggggggg..',
  '.gGggGGgGgg.',
  '.gggggggggg.',
  '.GGGGGGGGGG.',
  '....wwww....',
  '...wEwwEw...',
  '...wwwwww...',
  '..ww....ww..',
  '............',
];

const WOLF = [
  '..................',
  '.gg...............',
  '.gGg..............',
  '..ggg.ggggggggg...',
  '..gEgggggggggggg..',
  '...gggggggggggGg..',
  '...gTggggggggggg..',
  '....ggggggggggg...',
  '....gg..gg..ggg...',
  '....gg..gg...gg...',
  '...GG...GG...GG...',
  '..................',
];

const IMP = [
  '..c.....c.....',
  '..cg...gc.....',
  '...ggggg......',
  '...gEgEg......',
  '....ggg.......',
  '..gggggggg....',
  '.g.gggggg.g...',
  '...gggggg..g..',
  '...gggggg.gg..',
  '....gggg......',
  '....g..g......',
  '...gg..gg.....',
];

const WRAITH = [
  '....ggggg.....',
  '...ggggggg....',
  '..ggGGGGGgg...',
  '..gGwg.gwGg...',
  '..ggGGGGGgg...',
  '..ggggggggg...',
  '..ggggggggg...',
  '..ggggggggg...',
  '...gggggggg...',
  '...ggggggg....',
  '....g.gg.g....',
  '..............',
];

const SPIDER = [
  '..................',
  '..g..g....g..g....',
  '.g..g......g..g...',
  '.g..gggggggg..g...',
  '..ggGggggggGgg....',
  '.g.ggggggggggg.g..',
  '.g.gEg.ggg.gEg.g..',
  '..g.gggggggg.g....',
  '....gggggggg......',
  '.....g....g.......',
  '..................',
];

type Frames = readonly (readonly string[])[];

/** Tier 0 and tier 1 shapes per family (order matches FAMILIES). */
const TIER0_SHAPES: readonly Frames[] = [
  [SLIME_A, SLIME_B],
  [BAT, bob(BAT)],
  [EMBER, bob(EMBER)],
  [GHOST, bob(GHOST)],
  [MUSHROOM, bob(MUSHROOM)],
];
const TIER1_SHAPES: readonly Frames[] = [
  [GOBLIN_A, GOBLIN_B],
  [WOLF, bob(WOLF)],
  [IMP, bob(IMP)],
  [WRAITH, bob(WRAITH)],
  [SPIDER, bob(SPIDER)],
];

function tierMaps(species: number): readonly Frames[] {
  const s = species % FAMILIES.length;
  return [
    TIER0_SHAPES[s],
    TIER1_SHAPES[s],
    [OGRE_A, OGRE_B],
    [DRAGON_A, DRAGON_B],
  ];
}

export interface MonsterSprite {
  readonly frames: HTMLCanvasElement[];
  readonly flash: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

function whitePalette(): Palette {
  const white: Palette = {};
  for (const key of Object.keys(familyPalette(0))) white[key] = '#ffffff';
  return white;
}

const cache = new Map<number, MonsterSprite[]>();

/** Sprite set (all tiers) for one elemental family; built once per family. */
export function monsterSprites(species: number): MonsterSprite[] {
  const key = species % FAMILIES.length;
  const cached = cache.get(key);
  if (cached) return cached;

  const pal = familyPalette(key);
  const flashPal = whitePalette();
  const built = tierMaps(key).map((maps) => {
    const frames = maps.map((m) => rasterize(m, pal, SPRITE_SCALE));
    return {
      frames,
      flash: rasterize(maps[0], flashPal, SPRITE_SCALE),
      width: frames[0].width,
      height: frames[0].height,
    };
  });
  cache.set(key, built);
  return built;
}
