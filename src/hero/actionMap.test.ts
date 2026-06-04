import { describe, expect, it } from 'vitest';
import { actionForTool } from './actionMap';

describe('actionForTool', () => {
  it.each([
    ['Read', 'scout'],
    ['Grep', 'scout'],
    ['Glob', 'scout'],
    ['Edit', 'attack'],
    ['Write', 'attack'],
    ['MultiEdit', 'attack'],
    ['Bash', 'cast'],
    ['Task', 'summon'],
    ['WebSearch', 'bow'],
    ['WebFetch', 'bow'],
    ['mcp__github__create_pr', 'bow'],
    ['SomeUnknownTool', 'generic'],
  ])('%s -> %s', (tool, expected) => {
    expect(actionForTool(tool)).toBe(expected);
  });

  it('handles missing tool', () => {
    expect(actionForTool(undefined)).toBe('generic');
  });
});
