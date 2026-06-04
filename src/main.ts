// Phase 1 placeholder: draw a translucent ground bar so the docked strip is
// visible. Replaced by the real render engine in Phase 2.

const canvas = document.getElementById('strip') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function draw(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const groundH = 48;
  ctx.fillStyle = 'rgba(60, 120, 60, 0.85)';
  ctx.fillRect(0, canvas.height - groundH, canvas.width, groundH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '14px monospace';
  ctx.fillText('agent-quest strip (phase 1)', 16, canvas.height - groundH / 2 + 5);
}

window.addEventListener('resize', resize);
resize();
