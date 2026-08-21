import * as THREE from 'three';

type Particle = {
  life: number;
  max: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
};

export class VfxSystem {
  readonly group = new THREE.Group();
  private readonly dust: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly particles: Particle[] = [];
  private readonly pool = 80;
  private cursor = 0;

  constructor() {
    const geo = new THREE.SphereGeometry(0.07, 5, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc4a070,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.dust = new THREE.InstancedMesh(geo, mat, this.pool);
    this.dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dust.count = this.pool;
    this.group.add(this.dust);
    for (let i = 0; i < this.pool; i += 1) {
      this.particles.push({
        life: 0,
        max: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.dust.setMatrixAt(i, this.dummy.matrix);
    }
  }

  emitDust(origin: THREE.Vector3, vel: THREE.Vector3, amount: number, rng: () => number): void {
    const n = Math.min(6, Math.floor(amount * 5));
    for (let i = 0; i < n; i += 1) {
      const p = this.particles[this.cursor % this.pool];
      this.cursor += 1;
      p.life = 0.01;
      p.max = 0.35 + rng() * 0.25;
      p.pos.copy(origin);
      p.vel.copy(vel).multiplyScalar(-0.08);
      p.vel.x += (rng() - 0.5) * 1.4;
      p.vel.y += 0.4 + rng() * 0.8;
      p.vel.z += (rng() - 0.5) * 1.4;
    }
  }

  burst(origin: THREE.Vector3, rng: () => number): void {
    for (let i = 0; i < 18; i += 1) {
      const p = this.particles[this.cursor % this.pool];
      this.cursor += 1;
      p.life = 0.01;
      p.max = 0.45;
      p.pos.copy(origin);
      p.vel.set((rng() - 0.5) * 6, rng() * 4, (rng() - 0.5) * 6);
    }
  }

  update(delta: number): void {
    for (let i = 0; i < this.pool; i += 1) {
      const p = this.particles[i];
      if (p.life <= 0) {
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.dust.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.life += delta;
      if (p.life >= p.max) {
        p.life = 0;
        continue;
      }
      p.vel.y -= 4 * delta;
      p.pos.addScaledVector(p.vel, delta);
      const t = p.life / p.max;
      this.dummy.position.copy(p.pos);
      this.dummy.scale.setScalar(1.2 + t * 1.8);
      this.dummy.updateMatrix();
      this.dust.setMatrixAt(i, this.dummy.matrix);
    }
    this.dust.instanceMatrix.needsUpdate = true;
  }
}
