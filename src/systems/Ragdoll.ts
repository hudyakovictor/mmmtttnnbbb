import * as THREE from 'three';
import type { MaterialLibrary } from '../assets/MaterialLibrary';
import type { Track } from '../world/Track';

/**
 * Crash fail-state per the brief: the rider becomes a procedural pose that
 * breaks into a capsule-chain ragdoll with the bike's velocity, tumbles over
 * the shared heightfield, and settles. The bike keeps rolling by inertia.
 * Verlet-style particle chain: positions, velocities, distance constraints,
 * ground collision against the SAME height function the wheels use.
 */

type Part = {
  name: string;
  parent: number;
  radius: number;
  rest: number;
  mesh: THREE.Mesh;
};

type Point = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
};

const DAMP = 0.996;
const GROUND_FRICTION = 0.72;
const RESTITUTION = 0.18;
const ITERATIONS = 9;
const SUBSTEPS = 2;

export class Ragdoll {
  readonly group = new THREE.Group();
  readonly focus = new THREE.Vector3();
  active = false;

  private readonly points: Point[] = [];
  private readonly parts: Part[] = [];
  private time = 0;

  constructor(
    private readonly mats: MaterialLibrary,
    private readonly track: Track,
  ) {
    // Chain: pelvis(0) → torso(1) → head(2); torso → upper arms(3,4) → forearms(5,6);
    // pelvis → thighs(7,8) → shins(9,10).
    this.addPart(-1, 0.14, 0.24, this.clothBox(0.3, 0.18, 0.2, 0x2a3a28));
    this.addPart(0, 0.17, 0.3, this.clothBox(0.36, 0.4, 0.2, 0xc45c2a));
    this.addPart(1, 0.13, 0.24, this.helmet());
    this.addPart(1, 0.055, 0.2, this.capsule(0.055, 0.2, this.mats.skin));
    this.addPart(1, 0.055, 0.2, this.capsule(0.055, 0.2, this.mats.skin));
    this.addPart(3, 0.05, 0.2, this.capsule(0.05, 0.2, this.mats.skin));
    this.addPart(4, 0.05, 0.2, this.capsule(0.05, 0.2, this.mats.skin));
    this.addPart(0, 0.07, 0.3, this.capsule(0.07, 0.3, this.mats.cloth));
    this.addPart(0, 0.07, 0.3, this.capsule(0.07, 0.3, this.mats.cloth));
    this.addPart(7, 0.055, 0.32, this.capsule(0.055, 0.32, this.mats.rubber));
    this.addPart(8, 0.055, 0.32, this.capsule(0.055, 0.32, this.mats.rubber));

    for (let i = 0; i < this.parts.length; i += 1) {
      this.points.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3() });
    }
    this.group.visible = false;
  }

  private addPart(parent: number, radius: number, rest: number, mesh: THREE.Mesh): Part {
    const part: Part = { name: `p${this.parts.length}`, parent, radius, rest, mesh };
    this.parts.push(part);
    this.group.add(mesh);
    return part;
  }

  private helmet(): THREE.Mesh {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), this.mats.helmet);
    helm.scale.set(1, 1.05, 1.12);
    return helm;
  }

  private clothBox(w: number, h: number, d: number, color: number): THREE.Mesh {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    box.userData.privateMaterial = true;
    return box;
  }

  private capsule(radius: number, length: number, mat: THREE.Material): THREE.Mesh {
    const geo = new THREE.CapsuleGeometry(radius, Math.max(0.02, length - radius * 2), 4, 8);
    return new THREE.Mesh(geo, mat);
  }

  spawn(pos: THREE.Vector3, vel: THREE.Vector3, yaw: number, rng: () => number): void {
    this.active = true;
    this.group.visible = true;
    this.time = 0;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const up = new THREE.Vector3(0, 1, 0);

    const pelvisPos = pos.clone().addScaledVector(up, 0.75).addScaledVector(fwd, -0.05);
    this.set(0, pelvisPos);
    this.set(1, pelvisPos.clone().addScaledVector(up, 0.3).addScaledVector(fwd, 0.05));
    this.set(2, this.get(1).pos.clone().addScaledVector(up, 0.3).addScaledVector(fwd, 0.04));
    this.set(3, this.get(1).pos.clone().addScaledVector(right, -0.2).addScaledVector(fwd, 0.18));
    this.set(4, this.get(1).pos.clone().addScaledVector(right, 0.2).addScaledVector(fwd, 0.18));
    this.set(5, this.get(3).pos.clone().addScaledVector(right, -0.06).addScaledVector(fwd, 0.26));
    this.set(6, this.get(4).pos.clone().addScaledVector(right, 0.06).addScaledVector(fwd, 0.26));
    this.set(7, pelvisPos.clone().addScaledVector(right, -0.08).addScaledVector(fwd, 0.22).addScaledVector(up, -0.05));
    this.set(8, pelvisPos.clone().addScaledVector(right, 0.08).addScaledVector(fwd, 0.22).addScaledVector(up, -0.05));
    this.set(9, this.get(7).pos.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.05));
    this.set(10, this.get(8).pos.clone().addScaledVector(fwd, 0.3).addScaledVector(up, -0.05));

    for (let i = 0; i < this.points.length; i += 1) {
      const p = this.points[i];
      p.vel.copy(vel);
      p.vel.y += 1.4 + rng() * 0.8;
      p.vel.x += (rng() - 0.5) * 3.2;
      p.vel.z += (rng() - 0.5) * 3.2;
    }
    // The rider goes over the bars: extra forward pitch for head/arms.
    this.points[2].vel.addScaledVector(fwd, 2.2).addScaledVector(up, 1.6);
    this.points[5].vel.addScaledVector(fwd, 1.4);
    this.points[6].vel.addScaledVector(fwd, 1.4);
  }

  hide(): void {
    this.active = false;
    this.group.visible = false;
  }

  private get(i: number): Point {
    return this.points[i];
  }

  private set(i: number, p: THREE.Vector3): void {
    this.points[i].pos.copy(p);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    const step = Math.min(dt, 1 / 30) / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s += 1) {
      for (let i = 0; i < this.points.length; i += 1) {
        const p = this.points[i];
        p.vel.y -= 9.81 * step;
        p.vel.multiplyScalar(DAMP);
        p.pos.addScaledVector(p.vel, step);
        const ground = this.track.height(p.pos.x, p.pos.z);
        const floor = ground.y + this.parts[i].radius * 0.6 + 0.04;
        if (p.pos.y < floor) {
          p.pos.y = floor;
          if (p.vel.y < 0) p.vel.y = -p.vel.y * RESTITUTION;
          p.vel.x *= GROUND_FRICTION;
          p.vel.z *= GROUND_FRICTION;
        }
      }
      for (let k = 0; k < ITERATIONS; k += 1) {
        for (let i = 1; i < this.parts.length; i += 1) {
          const part = this.parts[i];
          const a = this.points[part.parent].pos;
          const b = this.points[i].pos;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dz = b.z - a.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
          const diff = (dist - part.rest) / dist;
          const push = diff * 0.5;
          const px = dx * push;
          const py = dy * push;
          const pz = dz * push;
          b.x -= px;
          b.y -= py;
          b.z -= pz;
          a.x += px;
          a.y += py;
          a.z += pz;
        }
      }
    }
    this.syncVisuals();
    const pelvis = this.points[0].pos;
    const head = this.points[2].pos;
    this.focus.copy(pelvis).add(head).multiplyScalar(0.5);
  }

  private syncVisuals(): void {
    const tmp = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.parts.length; i += 1) {
      const part = this.parts[i];
      if (part.parent < 0) {
        // Pelvis: free body, no parent link.
        part.mesh.position.copy(this.points[i].pos);
        part.mesh.scale.set(1, 1, 1);
        continue;
      }
      const a = this.points[part.parent].pos;
      const b = this.points[i].pos;
      tmp.subVectors(b, a);
      const len = tmp.length();
      part.mesh.position.copy(a).add(b).multiplyScalar(0.5);
      part.mesh.scale.set(1, Math.max(0.35, len / part.rest), 1);
      if (len > 0.0001) {
        part.mesh.quaternion.setFromUnitVectors(yAxis, tmp.normalize());
      }
    }
  }

  dispose(): void {
    // Library materials (skin/cloth/rubber/helmet) are shared with the bike
    // rig and owned by MaterialLibrary — only private box materials go here.
    for (const p of this.parts) {
      p.mesh.geometry.dispose();
      if (p.mesh.userData.privateMaterial) {
        const m = p.mesh.material;
        if (Array.isArray(m)) for (const x of m) x.dispose();
        else m.dispose();
      }
    }
  }
}
