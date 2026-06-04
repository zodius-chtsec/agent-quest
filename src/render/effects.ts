/**
 * Transient combat effects: floating damage numbers, loot sparkles on a
 * kill, and an evolution poof. Purely cosmetic, renderer-owned.
 */

interface BaseEffect {
  readonly x: number;
  readonly y: number;
  readonly bornAt: number;
}

interface DamageEffect extends BaseEffect {
  readonly type: 'damage';
  readonly value: number;
  readonly crit: boolean;
}

interface SparkleEffect extends BaseEffect {
  readonly type: 'sparkle';
  readonly dx: number;
  readonly dy: number;
}

interface PoofEffect extends BaseEffect {
  readonly type: 'poof';
}

type Effect = DamageEffect | SparkleEffect | PoofEffect;

const DAMAGE_TTL = 800;
const SPARKLE_TTL = 900;
const POOF_TTL = 500;

export class Effects {
  private effects: Effect[] = [];

  addDamage(x: number, y: number, now: number): void {
    const crit = Math.random() < 0.12;
    const value = crit ? 10 + Math.floor(Math.random() * 9) : 1 + Math.floor(Math.random() * 5);
    this.effects.push({ type: 'damage', x: x + (Math.random() - 0.5) * 16, y, bornAt: now, value, crit });
  }

  addLoot(x: number, y: number, now: number): void {
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * (1.1 + 0.8 * Math.random());
      const speed = 18 + Math.random() * 26;
      this.effects.push({
        type: 'sparkle',
        x: x + (Math.random() - 0.5) * 20,
        y,
        bornAt: now,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 30,
      });
    }
  }

  addPoof(x: number, y: number, now: number): void {
    this.effects.push({ type: 'poof', x, y, bornAt: now });
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.effects = this.effects.filter((e) => now - e.bornAt < ttlOf(e));
    for (const e of this.effects) {
      const age = now - e.bornAt;
      if (e.type === 'damage') drawDamage(ctx, e, age);
      else if (e.type === 'sparkle') drawSparkle(ctx, e, age);
      else drawPoof(ctx, e, age);
    }
  }
}

function ttlOf(e: Effect): number {
  if (e.type === 'damage') return DAMAGE_TTL;
  if (e.type === 'sparkle') return SPARKLE_TTL;
  return POOF_TTL;
}

function drawDamage(ctx: CanvasRenderingContext2D, e: DamageEffect, age: number): void {
  const t = age / DAMAGE_TTL;
  ctx.globalAlpha = 1 - t * t;
  ctx.font = e.crit ? 'bold 14px monospace' : 'bold 11px monospace';
  ctx.fillStyle = e.crit ? '#ffd23f' : '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 2.5;
  const text = e.crit ? `${e.value}!` : `${e.value}`;
  const y = e.y - t * 28;
  ctx.strokeText(text, e.x, y);
  ctx.fillText(text, e.x, y);
  ctx.globalAlpha = 1;
}

function drawSparkle(ctx: CanvasRenderingContext2D, e: SparkleEffect, age: number): void {
  const t = age / SPARKLE_TTL;
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = t % 0.3 < 0.15 ? '#ffd23f' : '#fff3b0';
  const size = t < 0.5 ? 3 : 2;
  ctx.fillRect(e.x + e.dx * t, e.y + e.dy * t + 40 * t * t, size, size);
  ctx.globalAlpha = 1;
}

function drawPoof(ctx: CanvasRenderingContext2D, e: PoofEffect, age: number): void {
  const t = age / POOF_TTL;
  ctx.globalAlpha = 0.7 * (1 - t);
  ctx.fillStyle = '#e8e4da';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 6 + t * 22;
    const size = 6 * (1 - t) + 2;
    ctx.fillRect(e.x + Math.cos(angle) * dist, e.y + Math.sin(angle) * dist * 0.6, size, size);
  }
  ctx.globalAlpha = 1;
}
