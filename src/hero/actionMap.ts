import type { HeroAction } from '../types';

const EXACT: Record<string, HeroAction> = {
  Read: 'scout',
  Grep: 'scout',
  Glob: 'scout',
  NotebookRead: 'scout',
  Edit: 'attack',
  Write: 'attack',
  MultiEdit: 'attack',
  NotebookEdit: 'attack',
  Bash: 'cast',
  BashOutput: 'cast',
  KillShell: 'cast',
  Task: 'summon',
  Agent: 'summon',
  WebSearch: 'bow',
  WebFetch: 'bow',
};

/** Map a Claude Code tool name to the hero's visual action. */
export function actionForTool(tool: string | undefined): HeroAction {
  if (!tool) return 'generic';
  if (EXACT[tool]) return EXACT[tool];
  // MCP tools (mcp__server__tool) reach out to the wider world: bow shot.
  if (tool.startsWith('mcp__')) return 'bow';
  return 'generic';
}
