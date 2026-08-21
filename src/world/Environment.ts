import * as THREE from 'three';
import type { MaterialLibrary } from '../assets/MaterialLibrary';
import type { Track } from './Track';

function pineGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0, 1, 2.4, 7);
  g.translate(0, 1.2, 0);
  return g;
}

export class Environment {
  readonly group = new THREE.Group();
  readonly trees: THREE.InstancedMesh;
  readonly rocks: THREE.InstancedMesh;
  readonly grass: THREE.InstancedMesh | null;
  readonly beacons: THREE.Mesh[] = [];
  readonly finish: THREE.Group;
  readonly treeCount: number;
  private readonly dummy = new THREE.Object3D();
  private readonly treeMat: THREE.MeshStandardMaterial;
  private readonly windMats: THREE.MeshStandardMaterial[] = [];

  constructor(
    track: Track,
    mats: MaterialLibrary,
    rng: () => number,
    treeScale: number,
    useGrass: boolean,
  ) {
    this.group.add(track.mesh);
    this.addRidges(track, mats);
    this.addChairlift(track, mats);
    this.addRiver(track, mats);
    this.finish = this.addFinish(track, mats);
    this.addCheckpoints(track, mats);
    this.addRoots(track, mats, rng);
    this.addTrailKit(track, mats);

    this.treeMat = mats.pine.clone();
    this.treeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      this.treeMat.userData.shader = shader;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           float phase = instanceMatrix[3].x + instanceMatrix[3].z;
         #else
           float phase = 0.0;
         #endif
         float h = max(position.y, 0.0);
         transformed.x += sin(uTime * 1.5 + phase) * 0.08 * h;
         transformed.z += cos(uTime * 1.1 + phase) * 0.05 * h;`,
      );
    };
    this.treeMat.customProgramCacheKey = () => 'wind-sway';
    this.windMats.push(this.treeMat);

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6);
    trunkGeo.translate(0, 1.1, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, mats.bark, Math.floor(420 * treeScale));
    const canopy = new THREE.InstancedMesh(pineGeometry(), this.treeMat, Math.floor(420 * treeScale));
    trunks.castShadow = true;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    let planted = 0;
    const maxTrees = Math.floor(420 * treeScale);
    for (let i = 0; i < 1800 && planted < maxTrees; i += 1) {
      const p = track.points[Math.floor(rng() * track.points.length)];
      const side = rng() < 0.5 ? -1 : 1;
      const lat = side * (p.width * 0.5 + 2.4 + rng() * 16);
      if (Math.abs(lat) < p.width * 0.5 + 1.6) continue;
      const x = p.position.x + p.binormal.x * lat;
      const z = p.position.z + p.binormal.z * lat;
      const h = track.height(x, z);
      if (h.trail > 0.35) continue;
      const s = 1.3 + rng() * 1.8;
      this.dummy.position.set(x, h.y, z);
      this.dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      this.dummy.scale.set(s, s * (1.1 + rng() * 0.5), s);
      this.dummy.updateMatrix();
      trunks.setMatrixAt(planted, this.dummy.matrix);
      this.dummy.position.y += 1.6 * s;
      this.dummy.scale.set(s * 1.6, s * 2.1, s * 1.6);
      this.dummy.updateMatrix();
      canopy.setMatrixAt(planted, this.dummy.matrix);
      planted += 1;
    }
    trunks.count = planted;
    canopy.count = planted;
    this.treeCount = planted;
    this.trees = canopy;
    this.group.add(trunks, canopy);

    const rockGeo = new THREE.DodecahedronGeometry(0.45, 0);
    this.rocks = new THREE.InstancedMesh(rockGeo, mats.rock, 90);
    this.rocks.castShadow = true;
    this.rocks.receiveShadow = true;
    let ri = 0;
    for (let i = 0; i < track.points.length && ri < 90; i += 5) {
      const p = track.points[i];
      if (p.feature !== 'rockgarden' && p.feature !== 'drop' && rng() > 0.35) continue;
      const lat = (rng() - 0.5) * (p.width + 1.4);
      const x = p.position.x + p.binormal.x * lat;
      const z = p.position.z + p.binormal.z * lat;
      const h = track.height(x, z);
      this.dummy.position.set(x, h.y + 0.15, z);
      this.dummy.rotation.set(rng() * 1.2, rng() * 6, rng() * 1.2);
      const s = 0.4 + rng() * 1.3;
      this.dummy.scale.set(s, s * 0.7, s);
      this.dummy.updateMatrix();
      this.rocks.setMatrixAt(ri, this.dummy.matrix);
      ri += 1;
    }
    this.rocks.count = ri;
    this.group.add(this.rocks);

    if (useGrass) {
      const grassGeo = new THREE.PlaneGeometry(0.28, 0.42);
      grassGeo.translate(0, 0.21, 0);
      const grassMat = mats.pine.clone();
      grassMat.side = THREE.DoubleSide;
      grassMat.depthWrite = false;
      this.grass = new THREE.InstancedMesh(grassGeo, grassMat, 700);
      let gi = 0;
      for (let i = 0; i < 1600 && gi < 700; i += 1) {
        const p = track.points[Math.floor(rng() * Math.min(track.points.length, 80))];
        const lat = (rng() - 0.5) * 10;
        if (Math.abs(lat) < p.width * 0.45) continue;
        const x = p.position.x + p.binormal.x * lat;
        const z = p.position.z + p.binormal.z * lat;
        const h = track.height(x, z);
        this.dummy.position.set(x, h.y, z);
        this.dummy.rotation.set(0, rng() * Math.PI, 0.15);
        this.dummy.scale.setScalar(0.8 + rng() * 0.8);
        this.dummy.updateMatrix();
        this.grass.setMatrixAt(gi, this.dummy.matrix);
        gi += 1;
      }
      this.grass.count = gi;
      this.group.add(this.grass);
    } else {
      this.grass = null;
    }
  }

  tick(time: number): void {
    for (const mat of this.windMats) {
      const shader = mat.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
      if (shader) shader.uniforms.uTime.value = time;
    }
    for (const b of this.beacons) {
      b.rotation.y = time * 1.4;
      const m = b.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.5;
    }
  }

  private addRidges(track: Track, mats: MaterialLibrary): void {
    const pts = track.points;
    const far = new THREE.Group();
    for (let k = 0; k < 18; k += 1) {
      const p = pts[Math.floor((k / 18) * (pts.length - 1))];
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(18 + (k % 5) * 6, 28 + (k % 3) * 10, 5),
        mats.rock,
      );
      const side = k % 2 === 0 ? 1 : -1;
      mesh.position.set(
        p.position.x + p.binormal.x * side * (38 + (k % 4) * 10),
        p.position.y + 10,
        p.position.z + p.binormal.z * side * (38 + (k % 4) * 10),
      );
      mesh.rotation.y = k;
      far.add(mesh);
    }
    this.group.add(far);
  }

  private addChairlift(track: Track, mats: MaterialLibrary): void {
    const start = track.points[2];
    const end = track.points[10];
    const lift = new THREE.Group();
    for (let i = 0; i < 5; i += 1) {
      const u = i / 4;
      const p = start.position.clone().lerp(end.position, u);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 14, 0.35), mats.trim);
      tower.position.set(p.x + start.binormal.x * 8, p.y + 7, p.z + start.binormal.z * 8);
      tower.castShadow = true;
      lift.add(tower);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.18), mats.trim);
      arm.position.copy(tower.position).add(new THREE.Vector3(0, 6.6, 0));
      lift.add(arm);
    }
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          start.position.clone().add(start.binormal.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 14, 0)),
          end.position.clone().add(end.binormal.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 16, 0)),
        ]),
        12,
        0.05,
        5,
        false,
      ),
      mats.trim,
    );
    lift.add(cable);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.5), mats.wood);
    chair.position.copy(start.position).add(start.binormal.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 12.4, 0));
    lift.add(chair);
    this.group.add(lift);
  }

  private addRiver(track: Track, mats: MaterialLibrary): void {
    const p = track.points[Math.floor(track.points.length * 0.5)];
    const water = new THREE.Mesh(new THREE.PlaneGeometry(18, 7, 8, 4), mats.water);
    water.rotation.x = -Math.PI / 2;
    water.position.copy(p.position).add(new THREE.Vector3(0, -0.35, 0));
    water.lookAt(p.position.clone().add(p.tangent));
    water.rotation.x = -Math.PI / 2;
    water.position.copy(p.position);
    water.position.y -= 0.4;
    this.group.add(water);
  }

  private addFinish(track: Track, mats: MaterialLibrary): THREE.Group {
    const p = track.points[track.points.length - 8];
    const g = new THREE.Group();
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.2, 8), mats.wood);
    const postR = postL.clone();
    postL.position.copy(p.position).add(p.binormal.clone().multiplyScalar(2.4)).add(new THREE.Vector3(0, 2.1, 0));
    postR.position.copy(p.position).add(p.binormal.clone().multiplyScalar(-2.4)).add(new THREE.Vector3(0, 2.1, 0));
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), mats.banner);
    banner.position.copy(p.position).add(new THREE.Vector3(0, 3.6, 0));
    banner.lookAt(p.position.clone().add(p.tangent));
    g.add(postL, postR, banner);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 1.4), mats.reward);
    pad.position.copy(p.position).add(new THREE.Vector3(0, 0.2, 0));
    g.add(pad);
    this.group.add(g);
    return g;
  }

  private addCheckpoints(track: Track, mats: MaterialLibrary): void {
    for (const t of [0.22, 0.48, 0.74]) {
      const p = track.sampleAt(t);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.8, 8), mats.wood);
      post.position.copy(p.position).add(p.binormal.clone().multiplyScalar(p.width * 0.55 + 0.4));
      post.position.y += 0.9;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mats.reward);
      lamp.position.copy(post.position).add(new THREE.Vector3(0, 1.05, 0));
      this.beacons.push(lamp);
      this.group.add(post, lamp);
    }
  }

  private addTrailKit(track: Track, mats: MaterialLibrary): void {
    const tape = new THREE.MeshStandardMaterial({
      color: 0xd7b14a,
      roughness: 0.45,
      metalness: 0.05,
      emissive: 0x3a2a08,
      emissiveIntensity: 0.25,
    });
    for (let i = 12; i < track.points.length - 12; i += 28) {
      const p = track.points[i];
      const gate = new THREE.Group();
      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.6, 6), mats.wood);
      const poleR = poleL.clone();
      poleL.position.copy(p.position).add(p.binormal.clone().multiplyScalar(p.width * 0.55)).add(new THREE.Vector3(0, 0.8, 0));
      poleR.position.copy(p.position).add(p.binormal.clone().multiplyScalar(-p.width * 0.55)).add(new THREE.Vector3(0, 0.8, 0));
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(p.width * 1.15, 0.04, 0.04), tape);
      ribbon.position.copy(p.position).add(new THREE.Vector3(0, 1.45, 0));
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 5), mats.hazard);
      arrow.position.copy(p.position).add(p.tangent.clone().multiplyScalar(0.4)).add(new THREE.Vector3(0, 0.55, 0));
      arrow.rotation.x = Math.PI / 2;
      gate.add(poleL, poleR, ribbon, arrow);
      this.group.add(gate);
    }
    for (let i = 0; i < 10; i += 1) {
      const p = track.points[8 + i * 36];
      if (!p) continue;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 8), mats.bark);
      const lat = (i % 2 === 0 ? 1 : -1) * (p.width * 0.5 + 1.2);
      stump.position.copy(p.position).add(p.binormal.clone().multiplyScalar(lat)).add(new THREE.Vector3(0, 0.15, 0));
      this.group.add(stump);
    }
  }

  private addRoots(track: Track, mats: MaterialLibrary, rng: () => number): void {
    for (const p of track.points) {
      if (p.feature !== 'roots' || rng() > 0.18) continue;
      const root = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 5, 10, Math.PI), mats.bark);
      root.position.copy(p.position).add(new THREE.Vector3(0, 0.06, 0));
      root.rotation.set(-Math.PI / 2, rng() * 2, p.bank);
      this.group.add(root);
    }
  }
}

export function createSky(): THREE.Mesh {
  const uniforms = {
    uTop: { value: new THREE.Color(0x3a6fb0) },
    uHorizon: { value: new THREE.Color(0xcfe4f5) },
    uSunColor: { value: new THREE.Color(0xfff2cc) },
    uSunDir: { value: new THREE.Vector3(0.42, 0.32, 0.55).normalize() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: true,
      uniforms,
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vDir;
        uniform vec3 uTop, uHorizon, uSunColor, uSunDir;
        void main(){
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.62));
          float d = clamp(dot(normalize(vDir), normalize(uSunDir)), 0.0, 1.0);
          col += uSunColor * (pow(d, 720.0) + pow(d, 7.0) * 0.22);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.frustumCulled = false;
  sky.name = 'sky';
  return sky;
}
