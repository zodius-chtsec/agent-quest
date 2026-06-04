import { describe, expect, it } from 'vitest';
import { parseHook } from './parseHook';

const base = {
  session_id: 'abc-123',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/Users/me/code/proj',
};

describe('parseHook', () => {
  it('parses PreToolUse with tool name', () => {
    const event = parseHook({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Edit' });
    expect(event).toEqual({
      kind: 'pre-tool',
      sessionId: 'abc-123',
      cwd: '/Users/me/code/proj',
      tool: 'Edit',
      agentId: undefined,
      agentType: undefined,
      fullyIdle: undefined,
    });
  });

  it('parses subagent identity', () => {
    const event = parseHook({
      ...base,
      hook_event_name: 'PreToolUse',
      tool_name: 'Grep',
      agent_id: 'agent-9',
      agent_type: 'Explore',
    });
    expect(event?.agentId).toBe('agent-9');
    expect(event?.agentType).toBe('Explore');
  });

  it('derives fullyIdle and bgTasks from background_tasks on Stop', () => {
    expect(parseHook({ ...base, hook_event_name: 'Stop', background_tasks: [] })?.fullyIdle).toBe(true);
    expect(parseHook({ ...base, hook_event_name: 'Stop' })?.fullyIdle).toBe(true);
    const busy = parseHook({
      ...base,
      hook_event_name: 'Stop',
      background_tasks: [{ id: 1 }, { id: 2 }],
    });
    expect(busy?.fullyIdle).toBe(false);
    expect(busy?.bgTasks).toBe(2);
  });

  it('rejects unknown events and malformed payloads', () => {
    expect(parseHook({ ...base, hook_event_name: 'PreCompact' })).toBeNull();
    expect(parseHook({ hook_event_name: 'Stop' })).toBeNull(); // no session_id
    expect(parseHook(null)).toBeNull();
    expect(parseHook('string')).toBeNull();
    expect(parseHook(42)).toBeNull();
  });

  it('defaults cwd when missing', () => {
    expect(parseHook({ session_id: 'x', hook_event_name: 'Stop' })?.cwd).toBe('unknown');
  });
});
