/**
 * Session info card shown when a hero is clicked. Plain DOM on top of the
 * canvas; one singleton popup at a time.
 */

import type { SessionInfo } from '../types';

let popupEl: HTMLDivElement | null = null;

function formatElapsed(since: number): string {
  const sec = Math.floor((Date.now() - since) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function showPopup(session: SessionInfo, anchorX: number): void {
  hidePopup();
  const el = document.createElement('div');
  el.className = 'hero-popup';
  const rows: Array<[string, string]> = [
    ['project', session.projectName],
    ['state', session.state.toLowerCase()],
    ['tool', session.currentTool ?? '—'],
    ['uptime', formatElapsed(session.startedAt)],
    ['cwd', session.cwd],
  ];
  if (session.isCompanion) rows.splice(1, 0, ['agent', session.agentType ?? 'companion']);
  el.innerHTML = rows
    .map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${escapeHtml(v)}</span></div>`)
    .join('');
  document.body.appendChild(el);
  const width = el.offsetWidth;
  el.style.left = `${Math.max(8, Math.min(anchorX - width / 2, window.innerWidth - width - 8))}px`;
  popupEl = el;
}

export function hidePopup(): void {
  popupEl?.remove();
  popupEl = null;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
