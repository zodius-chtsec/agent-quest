/**
 * Assign horizontal slots on the strip. Main heroes get evenly spaced slots
 * ordered by arrival; companions stand next to their parent.
 */

import type { SessionInfo } from '../types';

export const MAX_HEROES = 12;
const SLOT_WIDTH = 190; // hero + companion + monster (up to dragon width)
const LEFT_MARGIN = 60;
const COMPANION_OFFSET = 56;

export interface SlotAssignment {
  readonly targetX: number;
  readonly visible: boolean;
}

/** Returns a map of session id → slot. Overflow heroes are hidden. */
export function assignSlots(
  sessions: readonly SessionInfo[],
  stripWidth: number,
): Map<string, SlotAssignment> {
  const result = new Map<string, SlotAssignment>();
  const mains = sessions
    .filter((s) => !s.isCompanion)
    .sort((a, b) => a.startedAt - b.startedAt);

  const usable = Math.max(1, Math.floor((stripWidth - LEFT_MARGIN * 2) / SLOT_WIDTH));
  const visibleCount = Math.min(mains.length, Math.min(usable, MAX_HEROES));

  mains.forEach((session, i) => {
    result.set(session.id, {
      targetX: LEFT_MARGIN + i * SLOT_WIDTH,
      visible: i < visibleCount,
    });
  });

  for (const companion of sessions.filter((s) => s.isCompanion)) {
    const parent = companion.parentId ? result.get(companion.parentId) : undefined;
    result.set(companion.id, {
      targetX: (parent?.targetX ?? LEFT_MARGIN) + COMPANION_OFFSET,
      visible: parent?.visible ?? false,
    });
  }
  return result;
}

/** Number of hidden (overflow) main heroes, for the "+N" badge. */
export function overflowCount(slots: Map<string, SlotAssignment>): number {
  let hidden = 0;
  for (const slot of slots.values()) {
    if (!slot.visible) hidden++;
  }
  return hidden;
}
