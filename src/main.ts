import { startDemo } from './demo';
import { Renderer } from './render/renderer';
import {
  applyEvent,
  remove,
  tick,
  type SessionMap,
} from './store/sessionStore';
import type { QuestEvent } from './types';

const canvas = document.getElementById('strip') as HTMLCanvasElement;

let sessions: SessionMap = new Map();

function emit(event: QuestEvent): void {
  sessions = applyEvent(sessions, event, Date.now());
}

const renderer = new Renderer(
  canvas,
  () => [...sessions.values()],
  (id) => {
    sessions = remove(sessions, id);
  },
);

setInterval(() => {
  sessions = tick(sessions, Date.now());
}, 5_000);

renderer.start();

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
