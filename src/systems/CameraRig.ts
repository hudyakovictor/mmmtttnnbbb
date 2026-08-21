import * as THREE from 'three';
import type { SimState } from './BikeSim';

export type CameraMode = 'pov' | 'chase';

export class CameraRig {
  mode: CameraMode = 'pov';
  private readonly desired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private fovPunch = 0;
  private readonly baseFov: number;

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.baseFov = camera.fov;
  }

  snap(state: SimState): void {
    this.update(1, state, false);
  }

  punch(deg: number): void {
    this.fovPunch = Math.min(10, this.fovPunch + deg);
  }

  update(delta: number, state: SimState, reducedMotion: boolean): void {
    if (this.mode === 'pov') this.updatePov(delta, state, reducedMotion);
    else this.updateChase(delta, state, reducedMotion);

    this.fovPunch *= Math.exp(-delta / 0.22);
    if (this.fovPunch < 0.02) this.fovPunch = 0;
  }

  /** First-person: helmet cam on the rider's head, look down the fall line. */
  private updatePov(delta: number, state: SimState, reducedMotion: boolean): void {
    const fwd = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const speed = state.vel.length();
    // Eye height: rider torso + head, minus hop preload crouch and suspension sag.
    const eyeHeight = 1.36 - state.hopCharge * 0.14 - state.fork * 0.1 - state.rear * 0.05;
    this.desired.copy(state.pos)
      .addScaledVector(fwd, 0.24)
      .addScaledVector(this.up, eyeHeight)
      .addScaledVector(this.up, -Math.min(0.3, Math.abs(speed)) * 0.006 * Math.sin(speed * 1.7));
    this.look.copy(this.desired)
      .addScaledVector(fwd, 12)
      // Nose-down pitch (positive when descending) tilts the view into the trail.
      .addScaledVector(this.up, -state.pitch * 9 - speed * 0.04);

    const lag = reducedMotion ? 1 : 1 - Math.exp(-delta / 0.055);
    this.camera.position.lerp(this.desired, lag);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    // The head stays more level than the bike: partial lean roll only.
    this.camera.rotateZ(-state.lean * 0.18);

    const fov = this.baseFov + 4 + speed * 0.7 + this.fovPunch;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Third-person chase: behind the bike, speed-scaled pull-back. */
  private updateChase(delta: number, state: SimState, reducedMotion: boolean): void {
    const fwd = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const speed = state.vel.length();
    const back = 4.3 + speed * 0.09 + (state.airTime > 0.12 ? 1.15 : 0);
    const height = 1.55 + speed * 0.02;
    this.desired.copy(state.pos)
      .addScaledVector(fwd, -back)
      .addScaledVector(this.up, height)
      .addScaledVector(right, state.lean * 0.45);
    this.look.copy(state.pos)
      .addScaledVector(fwd, 8.5 + speed * 0.28)
      .addScaledVector(this.up, 0.45);

    const lag = reducedMotion ? 1 : 1 - Math.exp(-delta / 0.12);
    this.camera.position.lerp(this.desired, lag);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    this.camera.rotateZ(-state.lean * 0.32);

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
