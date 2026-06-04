import { startDemo } from './demo';
import { Renderer } from './render/renderer';
import { hidePopup, showPopup } from './ui/popup';
import {
  applyMonsterEvent,
  removeMonster,
  tickMonsters,
  type MonsterMap,
} from './store/monsterStore';
import {
  applyEvent,
  remove,
  tick,
  type SessionMap,
} from './store/sessionStore';
import type { QuestEvent } from './types';

const canvas = document.getElementById('strip') as HTMLCanvasElement;

let sessions: SessionMap = new Map();
let monsters: MonsterMap = new Map();

function emit(event: QuestEvent): void {
  const now = Date.now();
  sessions = applyEvent(sessions, event, now);
  monsters = applyMonsterEvent(monsters, event, now);
}

const renderer = new Renderer(
  canvas,
  () => [...sessions.values()],
  () => [...monsters.values()],
  (id) => {
    sessions = remove(sessions, id);
  },
  (sessionId) => {
    monsters = removeMonster(monsters, sessionId);
  },
);

setInterval(() => {
  const now = Date.now();
  sessions = tick(sessions, now);
  monsters = tickMonsters(monsters, now);
}, 5_000);

renderer.start();

// Best-effort: load real art pack skins (Tiny Swords) if installed.
import('./render/heroSkins').then(({ loadHeroSkins }) => {
  void loadHeroSkins().then((count) => {
    if (count > 0) console.info(`[skins] loaded ${count} hero atlas(es)`);
  });
});

canvas.addEventListener('click', (e) => {
  const hero = renderer.heroAt(e.offsetX, e.offsetY);
  if (hero) showPopup(hero.session, hero.x + hero.width / 2);
  else hidePopup();
});

const params = new URLSearchParams(window.location.search);
if (params.get('demo') === '1') {
  startDemo(emit);
}

// Real hook events arrive via the Rust side (Phase 3): listen when running
// inside Tauri; skip silently in a plain browser tab.
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

if (window.__TAURI_INTERNALS__) {
  import('@tauri-apps/api/event').then(({ listen }) => {
    void listen<unknown>('hook', (e) => {
      void import('./bus/parseHook').then(({ parseHook }) => {
        const event = parseHook(e.payload);
        if (event) emit(event);
      });
    });
  });
}
