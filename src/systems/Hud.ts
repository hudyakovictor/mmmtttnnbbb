import type { SimState } from './BikeSim';
import { SECTORS, SURFACES } from '../game/config';
import type { Track } from '../world/Track';

function pad(n: number): string {
  return n.toFixed(0).padStart(2, '0');
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${pad(m)}:${s.toFixed(1).padStart(4, '0')}`;
}

export class Hud {
  private statusUntil = 0;

  constructor(
    private readonly speedValue: HTMLElement,
    private readonly speedFill: SVGPathElement,
    private readonly forkFront: HTMLElement,
    private readonly forkRear: HTMLElement,
    private readonly sectorLabel: HTMLElement,
    private readonly sectorFill: HTMLElement,
    private readonly timer: HTMLElement,
    private readonly slipFill: HTMLElement,
    private readonly surface: HTMLElement,
    private readonly leanNeedle: HTMLElement,
    private readonly status: HTMLElement,
    private readonly minimap: HTMLCanvasElement,
    private readonly overlay: HTMLElement,
    private readonly pause: HTMLElement,
    private readonly fail: HTMLElement,
    private readonly win: HTMLElement,
    private readonly failTitle: HTMLElement,
    private readonly failCopy: HTMLElement,
    private readonly winCopy: HTMLElement,
    private readonly track: Track,
  ) {}

  setMode(mode: 'menu' | 'pause' | 'ride' | 'fail' | 'win'): void {
    this.overlay.classList.toggle('hidden', mode !== 'menu');
    this.pause.classList.toggle('hidden', mode !== 'pause');
    this.fail.classList.toggle('hidden', mode !== 'fail');
    this.win.classList.toggle('hidden', mode !== 'win');
  }

  banner(text: string, duration = 1.6): void {
    this.status.textContent = text;
    this.status.classList.add('show');
    this.statusUntil = performance.now() / 1000 + duration;
  }

  setFail(reason: string): void {
    this.failTitle.textContent = reason.toUpperCase();
    this.failCopy.textContent = 'The bike keeps its inertia. Retry the sector.';
  }

  setWin(time: number, crashes: number): void {
    this.winCopy.textContent = `${formatTime(time)} · washouts ${crashes}`;
  }

  update(state: SimState, elapsed: number, now: number): void {
    const kmh = Math.abs(state.longSpeed) * 3.6;
    this.speedValue.textContent = String(Math.round(kmh)).padStart(2, '0');
    const dash = 157;
    this.speedFill.style.strokeDashoffset = String(dash - Math.min(dash, (kmh / 80) * dash));
    this.forkFront.style.height = `${Math.min(100, (state.fork / 0.2) * 100)}%`;
    this.forkRear.style.height = `${Math.min(100, (state.rear / 0.18) * 100)}%`;
    this.slipFill.style.width = `${Math.min(100, state.slip * 70)}%`;
    this.surface.textContent = SURFACES[state.surface].label;
    this.leanNeedle.style.left = `${50 + state.lean * 46}%`;
    this.timer.textContent = formatTime(elapsed);

    let sector = SECTORS[0];
    for (const s of SECTORS) if (state.s >= s.t) sector = s;
    this.sectorLabel.textContent = `S${SECTORS.indexOf(sector) + 1} · ${sector.name}`;
    this.sectorFill.style.width = `${Math.min(100, state.s * 100)}%`;

    if (now > this.statusUntil) this.status.classList.remove('show');
    this.drawMinimap(state);
  }

  private drawMinimap(state: SimState): void {
    const ctx = this.minimap.getContext('2d');
    if (!ctx) return;
    const w = this.minimap.width;
    const h = this.minimap.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,17,12,0.2)';
    ctx.fillRect(0, 0, w, h);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of this.track.points) {
      minX = Math.min(minX, p.position.x);
      maxX = Math.max(maxX, p.position.x);
      minZ = Math.min(minZ, p.position.z);
      maxZ = Math.max(maxZ, p.position.z);
    }
    const sx = (x: number) => ((x - minX) / (maxX - minX + 1)) * (w - 16) + 8;
    const sz = (z: number) => ((z - minZ) / (maxZ - minZ + 1)) * (h - 16) + 8;
    ctx.beginPath();
    ctx.strokeStyle = '#c9a36a';
    ctx.lineWidth = 2;
    const pts = this.track.points;
    ctx.moveTo(sx(pts[0].position.x), sz(pts[0].position.z));
    for (const p of pts) ctx.lineTo(sx(p.position.x), sz(p.position.z));
    ctx.stroke();
    ctx.fillStyle = '#c45c2a';
    ctx.beginPath();
    ctx.arc(sx(state.pos.x), sz(state.pos.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
