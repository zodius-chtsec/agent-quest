/**
 * Immutable session store: applies normalized QuestEvents and produces new
 * SessionInfo snapshots. Time-driven cleanup happens in tick().
 */

import { actionForTool } from '../hero/actionMap';
import { initialState, nextState } from '../hero/heroFsm';
import type { QuestEvent, SessionInfo } from '../types';

/** Sessions silent for this long are considered gone (no SessionEnd came). */
export const SESSION_TTL_MS = 120_000;
/** Companions are short-lived; evict faster. */
export const COMPANION_TTL_MS = 60_000;
/**
 * WATCHING sessions are silent BY DESIGN (no hooks fire while a background
 * monitor runs), so they get a much longer leash.
 */
export const WATCHING_TTL_MS = 30 * 60_000;
/** HURT is a transient flinch; recover to WORKING after this. */
export const HURT_RECOVERY_MS = 2_000;

export function projectNameFromCwd(cwd: string): string {
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'unknown';
}

function heroKey(event: QuestEvent): string {
  return event.agentId ? `${event.sessionId}:${event.agentId}` : event.sessionId;
}

function createSession(event: QuestEvent, now: number): SessionInfo {
  const isCompanion = Boolean(event.agentId);
  return {
    id: heroKey(event),
    sessionId: event.sessionId,
    cwd: event.cwd,
    projectName: projectNameFromCwd(event.cwd),
    isCompanion,
    parentId: isCompanion ? event.sessionId : undefined,
    agentType: event.agentType,
    state: initialState(),
    action: 'generic',
    currentTool: undefined,
    bgTasks: 0,
    lastSeen: now,
    startedAt: now,
  };
}

export type SessionMap = ReadonlyMap<string, SessionInfo>;

/** Apply one event, returning a new map (input is never mutated). */
export function applyEvent(sessions: SessionMap, event: QuestEvent, now: number): SessionMap {
  const key = heroKey(event);
  const next = new Map(sessions);

  if (event.kind === 'subagent-stop' && event.agentId) {
    const existing = next.get(key);
    if (existing) next.set(key, { ...existing, state: 'LEAVING', lastSeen: now });
    return next;
  }

  const existing = next.get(key) ?? createSession(event, now);
  const state = nextState(existing.state, event.kind, event.fullyIdle ?? true);
  const isToolEvent = event.kind === 'pre-tool';
  next.set(key, {
    ...existing,
    state,
    action: isToolEvent ? actionForTool(event.tool) : existing.action,
    currentTool: isToolEvent ? event.tool : existing.currentTool,
    bgTasks: event.kind === 'stop' ? (event.bgTasks ?? 0) : existing.bgTasks,
    lastSeen: now,
  });
  return next;
}

/** Time-driven transitions: HURT recovery and TTL eviction via LEAVING. */
export function tick(sessions: SessionMap, now: number): SessionMap {
  let changed = false;
  const next = new Map(sessions);
  for (const [key, s] of next) {
    if (s.state === 'HURT' && now - s.lastSeen > HURT_RECOVERY_MS) {
      next.set(key, { ...s, state: 'WORKING' });
      changed = true;
      continue;
    }
    const ttl =
      s.state === 'WATCHING'
        ? WATCHING_TTL_MS
        : s.isCompanion
          ? COMPANION_TTL_MS
          : SESSION_TTL_MS;
    if (s.state !== 'LEAVING' && now - s.lastSeen > ttl) {
      next.set(key, { ...s, state: 'LEAVING' });
      changed = true;
    }
  }
  return changed ? next : sessions;
}

/** Remove a session once its hero has finished walking off screen. */
export function remove(sessions: SessionMap, id: string): SessionMap {
  if (!sessions.has(id)) return sessions;
  const next = new Map(sessions);
  next.delete(id);
  return next;
}
