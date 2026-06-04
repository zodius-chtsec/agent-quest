/**
 * Boundary validation: raw Claude Code hook payload (untrusted JSON) →
 * normalized QuestEvent, or null for unknown/malformed input.
 */

import type { QuestEvent } from '../types';

const KIND_BY_HOOK: Record<string, QuestEvent['kind']> = {
  SessionStart: 'session-start',
  UserPromptSubmit: 'prompt',
  PreToolUse: 'pre-tool',
  PostToolUse: 'post-tool',
  PostToolUseFailure: 'tool-fail',
  Stop: 'stop',
  PermissionRequest: 'permission',
  Notification: 'notification',
  SessionEnd: 'session-end',
  SubagentStart: 'subagent-start',
  SubagentStop: 'subagent-stop',
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function parseHook(raw: unknown): QuestEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const payload = raw as Record<string, unknown>;

  const hookName = asString(payload.hook_event_name);
  const sessionId = asString(payload.session_id);
  if (!hookName || !sessionId) return null;

  const kind = KIND_BY_HOOK[hookName];
  if (!kind) return null;

  const backgroundTasks = payload.background_tasks;
  return {
    kind,
    sessionId,
    cwd: asString(payload.cwd) ?? 'unknown',
    tool: asString(payload.tool_name),
    agentId: asString(payload.agent_id),
    agentType: asString(payload.agent_type),
    fullyIdle:
      kind === 'stop'
        ? !Array.isArray(backgroundTasks) || backgroundTasks.length === 0
        : undefined,
  };
}
