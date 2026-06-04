/**
 * Canvas 2D render loop: 30fps cap, paused while the document is hidden.
 * Draws terrain, heroes (body + action item overlays), name tags and
 * status marks from the current session snapshot.
 */

import { Hero } from '../hero/hero';
import type { SessionInfo } from '../types';
import { assignSlots, overflowCount } from './layout';
import { bodyForState, HAND_X, HAND_Y, HERO_SIZE } from './sprites';
import { GROUND_HEIGHT, renderTerrain } from './terrain';

const TARGET_FRAME_MS = 1000 / 30;
const IDLE_FRAME_MS = 500;
const WALK_FRAME_MS = 150;
const ACTION_FRAME_MS = 260;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private readonly heroes = new Map<string, Hero>();
  private lastFrame = 0;
  private rafId = 0;
  private getSessions: () => readonly SessionInfo[];
  private onHeroGone: (id: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    getSessions: () => readonly SessionInfo[],
    onHeroGone: (id: string) => void,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.getSessions = getSessions;
    this.onHeroGone = onHeroGone;
    this.terrain = renderTerrain(canvas.width);

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(this.rafId);
      } else {
        this.lastFrame = 0;
        this.rafId = requestAnimationFrame((t) => this.loop(t));
      }
    });
    this.resize();
  }

  start(): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.terrain = renderTerrain(this.canvas.width);
  }

  /** Find the hero at canvas x/y, for click handling. */
  heroAt(x: number, y: number): Hero | undefined {
    const groundTop = this.canvas.height - GROUND_HEIGHT;
    if (y < groundTop - HERO_SIZE) return undefined;
    for (const hero of this.heroes.values()) {
      if (Math.abs(x - hero.x - hero.width / 2) < hero.width / 2 + 8) return hero;
    }
    return undefined;
  }

  private loop(timestamp: number): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    if (this.lastFrame === 0) {
      this.lastFrame = timestamp;
      return;
    }
    const dt = timestamp - this.lastFrame;
    if (dt < TARGET_FRAME_MS) return;
    this.lastFrame = timestamp;

    this.syncHeroes();
    for (const hero of this.heroes.values()) {
      hero.update(dt, this.canvas.width);
      if (hero.gone) {
        this.heroes.delete(hero.id);
        this.onHeroGone(hero.id);
      }
    }
    this.draw();
  }

  private syncHeroes(): void {
    const sessions = this.getSessions();
    const slots = assignSlots(sessions, this.canvas.width);
    const liveIds = new Set<string>();

    for (const session of sessions) {
      liveIds.add(session.id);
      const slot = slots.get(session.id);
      if (!slot?.visible) continue;
      let hero = this.heroes.get(session.id);
      if (!hero) {
        hero = new Hero(session, slot.targetX);
        this.heroes.set(session.id, hero);
      }
      hero.session = session;
      if (session.state !== 'LEAVING') hero.targetX = slot.targetX;
    }
    // Heroes whose session vanished from the store: send them off.
    for (const hero of this.heroes.values()) {
      if (!liveIds.has(hero.id)) {
        hero.session = { ...hero.session, state: 'LEAVING' };
      }
    }
    this.overflow = overflowCount(slots);
  }

  private overflow = 0;

  private draw(): void {
    const { ctx, canvas } = this;
    const groundTop = canvas.height - GROUND_HEIGHT;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.terrain, 0, groundTop);

    for (const hero of this.heroes.values()) {
      this.drawHero(hero, groundTop);
    }

    if (this.overflow > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(canvas.width - 64, groundTop - 26, 56, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(`+${this.overflow}`, canvas.width - 54, groundTop - 12);
    }
  }

  private drawHero(hero: Hero, groundTop: number): void {
    const { ctx } = this;
    const s = hero.session;
    const size = hero.width;
    const feetY = groundTop + 6;
    const topY = feetY - size;
    const walking = hero.walking;

    const bodyKey = bodyForState(s.state, walking);
    const frames = hero.sprites.bodies[bodyKey];
    const frameMs = walking ? WALK_FRAME_MS : IDLE_FRAME_MS;
    const body = frames[hero.frame(frames.length, frameMs)];

    // Body and hand-item share one mirror transform so the weapon always
    // points the way the hero faces.
    ctx.save();
    if (hero.facing === -1) {
      ctx.translate(hero.x + size, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(hero.x, 0);
    }
    ctx.drawImage(body, 0, topY, size, size);
    if (s.state === 'WORKING' && !walking) {
      const item = hero.sprites.items[s.action];
      if (item) {
        const img = item.frames[hero.frame(item.frames.length, ACTION_FRAME_MS)];
        const scale = size / HERO_SIZE; // companions are drawn smaller
        ctx.drawImage(
          img,
          HAND_X * scale - item.gripX,
          topY + HAND_Y * scale - item.gripY,
        );
      }
    }
    ctx.restore();

    // Campfire next to an idle hero.
    if (s.state === 'IDLE' && !walking) {
      const fire = hero.sprites.campfire[hero.frame(2, 400)];
      ctx.drawImage(fire, hero.x - fire.width - 6, feetY - fire.height);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px monospace';
      const zPhase = hero.frame(3, 600);
      ctx.fillText('z'.repeat(zPhase + 1), hero.x + size * 0.7, topY - 4 - zPhase * 2);
    }

    // Attention mark: blinking exclamation above the head.
    if (s.state === 'ATTENTION' && hero.frame(2, 300) === 0) {
      const mark = hero.sprites.attention;
      ctx.drawImage(mark, hero.x + size / 2 - mark.width / 2, topY - mark.height - 4);
    }

    this.drawNameTag(hero, topY);
  }

  private drawNameTag(hero: Hero, topY: number): void {
    const { ctx } = this;
    const s = hero.session;
    const label = s.isCompanion ? (s.agentType ?? 'companion') : s.projectName;
    const tool = s.state === 'WORKING' && s.currentTool ? ` ${s.currentTool}` : '';
    const text = `${label}${tool}`;
    ctx.font = `${s.isCompanion ? 9 : 10}px monospace`;
    const w = ctx.measureText(text).width + 8;
    const x = hero.x + hero.width / 2 - w / 2;
    const y = topY - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + 4, y + 10);
  }
}
