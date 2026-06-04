/**
 * Monster sprites for the four evolution tiers, authored FACING LEFT
 * (toward the hero). Each tier has a 2-frame idle; a white silhouette
 * variant is pre-rendered for hit flashes.
 */

import { rasterize, type Palette } from './pixelart';
import { SPRITE_SCALE } from './sprites';

const PALETTE: Palette = {
  g: '#7bc950', // slime light
  G: '#4e9636', // slime dark
  s: '#9ab973', // goblin skin
  S: '#6f8f4f', // goblin skin shade
  c: '#7a5a35', // club / horn wood
  o: '#b07a4a', // ogre skin
  O: '#8a5a32', // ogre shade
  d: '#c0504d', // dragon scale
  D: '#8e3431', // dragon shade
  w: '#e8a87c', // dragon wing membrane
  E: '#1c1c1c', // eyes
  T: '#f4f0e6', // teeth/claws
};

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

const TIER_MAPS: readonly (readonly string[])[][] = [
  [SLIME_A, SLIME_B],
  [GOBLIN_A, GOBLIN_B],
  [OGRE_A, OGRE_B],
  [DRAGON_A, DRAGON_B],
];

export interface MonsterSprite {
  readonly frames: HTMLCanvasElement[];
  readonly flash: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

function whitePalette(): Palette {
  const white: Palette = {};
  for (const key of Object.keys(PALETTE)) white[key] = '#ffffff';
  return white;
}

let cache: MonsterSprite[] | null = null;

/** Sprites are tier-global (not per-session); build once and cache. */
export function monsterSprites(): MonsterSprite[] {
  if (cache) return cache;
  const flashPal = whitePalette();
  cache = TIER_MAPS.map((maps) => {
    const frames = maps.map((m) => rasterize(m, PALETTE, SPRITE_SCALE));
    return {
      frames,
      flash: rasterize(maps[0], flashPal, SPRITE_SCALE),
      width: frames[0].width,
      height: frames[0].height,
    };
  });
  return cache;
}
