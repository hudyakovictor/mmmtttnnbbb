import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

function canvas(size: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2d context missing');
  return { c, g };
}

function toTexture(c: HTMLCanvasElement, repeat: number, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

export function makeDirtTexture(seed = 7): THREE.CanvasTexture {
  const { c, g } = canvas(512);
  const rng = createSeededRandom(seed);
  g.fillStyle = '#6a4a2e';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i += 1) {
    const x = rng() * 512;
    const y = rng() * 512;
    const s = 1 + rng() * 3.2;
    const v = 70 + rng() * 70;
    g.fillStyle = `rgba(${v + 40},${v},${v - 20},${0.18 + rng() * 0.35})`;
    g.fillRect(x, y, s, s * (0.4 + rng()));
  }
  for (let i = 0; i < 80; i += 1) {
    g.strokeStyle = `rgba(40,24,12,${0.08 + rng() * 0.12})`;
    g.beginPath();
    g.moveTo(rng() * 512, rng() * 512);
    g.quadraticCurveTo(rng() * 512, rng() * 512, rng() * 512, rng() * 512);
    g.stroke();
  }
  return toTexture(c, 1);
}

export function makeRockTexture(seed = 19): THREE.CanvasTexture {
  const { c, g } = canvas(512);
  const rng = createSeededRandom(seed);
  g.fillStyle = '#6d6a66';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i += 1) {
    g.fillStyle = `rgba(${90 + rng() * 50},${88 + rng() * 40},${80 + rng() * 30},${0.18 + rng() * 0.3})`;
    g.beginPath();
    g.moveTo(rng() * 512, rng() * 512);
    g.lineTo(rng() * 512, rng() * 512);
    g.lineTo(rng() * 512, rng() * 512);
    g.closePath();
    g.fill();
  }
  return toTexture(c, 1);
}

export function makeTrailTexture(seed = 3): THREE.CanvasTexture {
  const { c, g } = canvas(512);
  const rng = createSeededRandom(seed);
  g.fillStyle = '#8a6238';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 3) {
    g.strokeStyle = `rgba(50,30,14,${0.05 + rng() * 0.08})`;
    g.beginPath();
    g.moveTo(0, y + rng() * 2);
    g.lineTo(512, y + rng() * 2);
    g.stroke();
  }
  for (let i = 0; i < 120; i += 1) {
    g.fillStyle = `rgba(30,18,8,${0.08 + rng() * 0.1})`;
    g.fillRect(rng() * 512, rng() * 512, 40 + rng() * 80, 2);
  }
  return toTexture(c, 1);
}

export function makeNeedleTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(256);
  g.fillStyle = '#1c2c18';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(40,70,32,0.7)';
  for (let i = 0; i < 400; i += 1) {
    const x = (i * 47) % 256;
    const y = (i * 19) % 256;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 6, y + 14);
    g.stroke();
  }
  return toTexture(c, 1);
}

export function makeBannerTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(512);
  g.fillStyle = '#c45c2a';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#f3ead6';
  g.font = 'bold 72px sans-serif';
  g.textAlign = 'center';
  g.fillText('FALL LINE', 256, 220);
  g.font = '28px sans-serif';
  g.fillText('FINISH GATE', 256, 280);
  g.fillStyle = '#1a1610';
  for (let i = 0; i < 16; i += 1) {
    g.fillRect(i * 32, 400, 16, 80);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function makeNumberPlate(): THREE.CanvasTexture {
  const { c, g } = canvas(256);
  g.fillStyle = '#f3ead6';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c45c2a';
  g.fillRect(0, 0, 256, 36);
  g.fillRect(0, 220, 256, 36);
  g.fillStyle = '#14110c';
  g.font = 'bold 110px sans-serif';
  g.textAlign = 'center';
  g.fillText('27', 128, 168);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function makeCloudTexture(seed = 41): THREE.CanvasTexture {
  const { c, g } = canvas(256);
  const rng = createSeededRandom(seed);
  g.fillStyle = '#30343a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i += 1) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 18 + rng() * 46;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(235,240,248,${0.34 + rng() * 0.3})`);
    grad.addColorStop(1, 'rgba(235,240,248,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

export function makeGradientMap(): THREE.CanvasTexture {
  const { c, g } = canvas(8);
  const grd = g.createLinearGradient(0, 0, 8, 0);
  grd.addColorStop(0, '#000');
  grd.addColorStop(1, '#fff');
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 8);
  return toTexture(c, 1, false);
}
