import * as THREE from 'three';
import type { SimState } from './BikeSim';
import type { Track } from '../world/Track';

export class CameraRig {
  private readonly desired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly tmp = new THREE.Vector3();
  private fovPunch = 0;
  private readonly baseFov: number;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly track: Track,
  ) {
    this.baseFov = camera.fov;
  }

  snap(state: SimState): void {
    this.update(1, state, false);
  }

  punch(deg: number): void {
    this.fovPunch = Math.min(10, this.fovPunch + deg);
  }

  update(delta: number, state: SimState, reducedMotion: boolean): void {
    const fwd = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const speed = state.vel.length();
    const back = 4.3 + speed * 0.09 + (state.airTime > 0.12 ? 1.15 : 0);
    const height = 1.55 + speed * 0.02;
    this.desired.copy(state.pos)
      .addScaledVector(fwd, -back)
      .addScaledVector(this.up, height)
      .addScaledVector(right, state.lean * 0.45);

    // Lookahead along the SPLINE (not just the velocity vector) so the camera
    // starts turning into the next apex before the bike does.
    const lookS = THREE.MathUtils.clamp(state.s + 0.035 + speed * 0.0011, 0, 0.99);
    const ahead = this.track.sampleAt(lookS);
    this.look
      .copy(ahead.position)
      .addScaledVector(this.up, 0.5 + speed * 0.008);
    // Blend with a forward point so we never stare at a hairpin mid-corner.
    this.tmp.copy(state.pos).addScaledVector(fwd, 8.5 + speed * 0.28).addScaledVector(this.up, 0.45);
    this.look.lerp(this.tmp, 0.35);

    const lag = reducedMotion ? 1 : 1 - Math.exp(-delta / 0.12);
    this.camera.position.lerp(this.desired, lag);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    this.camera.rotateZ(-state.lean * 0.32);

    this.fovPunch *= Math.exp(-delta / 0.22);
    if (this.fovPunch < 0.02) this.fovPunch = 0;
    const fov = this.baseFov + speed * 0.55 + this.fovPunch;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

export class ShakeRig {
  private trauma = 0;
  private time = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  get level(): number {
    return this.trauma;
  }

  update(delta: number, camera: THREE.PerspectiveCamera, reduced: boolean): void {
    this.time += delta;
    this.trauma = Math.max(0, this.trauma - 1.4 * delta);
    if (reduced || this.trauma <= 0) return;
    const shake = this.trauma * this.trauma;
    const freq = this.time * 32;
    camera.position.x += 0.28 * shake * Math.sin(freq * 12.9898 + 1);
    camera.position.y += 0.22 * shake * Math.sin(freq * 78.233 + 2);
    camera.rotation.z += 0.06 * shake * Math.sin(freq * 3.1);
  }
}
