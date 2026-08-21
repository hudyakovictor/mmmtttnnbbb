import * as THREE from 'three';
import { fbm } from '../utils/random';
import type { MaterialLibrary } from '../assets/MaterialLibrary';

export type SurfaceId = 'packed' | 'dirt' | 'root' | 'rock' | 'mud' | 'pine';

export type FeatureId = 'trail' | 'berm' | 'whoops' | 'drop' | 'roots' | 'rockgarden' | 'offcamber';

export type TrackPoint = {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  binormal: THREE.Vector3;
  normal: THREE.Vector3;
  bank: number;
  width: number;
  s: number;
  surface: SurfaceId;
  feature: FeatureId;
};

export class Track {
  readonly points: TrackPoint[] = [];
  readonly length: number;
  readonly mesh: THREE.Mesh;
  readonly start: THREE.Vector3;
  readonly finish: THREE.Vector3;
  readonly checkpoints: number[] = [0, 0.22, 0.48, 0.74, 0.97];
  private lastIndex = 0;
  private readonly tmp = new THREE.Vector3();

  constructor(mats: MaterialLibrary) {
    const controls: THREE.Vector3[] = [];
    const banks: number[] = [];
    const widths: number[] = [];
    const surfaces: SurfaceId[] = [];
    const features: FeatureId[] = [];

    let x = 0;
    let y = 248;
    let z = 0;
    let heading = 0.15;
    const n = 88;
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      let turn = Math.sin(t * 9.2) * 0.11 + Math.sin(t * 3.1) * 0.05;
      let bank = 0;
      let width = 3.15;
      let slope = 0.16;
      let surface: SurfaceId = 'packed';
      let feature: FeatureId = 'trail';

      if (t < 0.08) {
        slope = 0.07;
        width = 4.4;
        turn *= 0.25;
      } else if (t < 0.2) {
        turn = 0.16;
        bank = 0.42;
        feature = 'berm';
        width = 3.6;
      } else if (t < 0.32) {
        surface = 'root';
        feature = 'roots';
        width = 2.7;
        turn = -0.08;
      } else if (t < 0.42) {
        turn = -0.2;
        bank = -0.48;
        feature = 'berm';
        width = 3.5;
      } else if (t < 0.55) {
        surface = 'dirt';
        feature = 'whoops';
        slope = 0.14;
        turn = 0.04;
      } else if (t < 0.64) {
        surface = 'rock';
        feature = 'drop';
        slope = 0.38;
        width = 2.9;
        turn = 0.02;
      } else if (t < 0.74) {
        surface = 'rock';
        feature = 'rockgarden';
        width = 2.6;
        slope = 0.2;
        turn = 0.1;
      } else if (t < 0.86) {
        surface = 'dirt';
        feature = 'offcamber';
        bank = 0.18;
        turn = -0.14;
        width = 2.8;
      } else {
        turn = 0.22;
        bank = 0.52;
        feature = 'berm';
        width = 3.8;
        slope = 0.22;
        surface = 'packed';
      }

      heading += turn;
      const step = 15.4;
      x += Math.sin(heading) * step;
      z += Math.cos(heading) * step;
      y -= slope * step;
      if (feature === 'drop' && t > 0.58 && t < 0.61) y -= 2.4;
      controls.push(new THREE.Vector3(x, y, z));
      banks.push(bank);
      widths.push(width);
      surfaces.push(surface);
      features.push(feature);
    }

    const curve = new THREE.CatmullRomCurve3(controls, false, 'catmullrom', 0.18);
    this.length = curve.getLength();
    const samples = 420;
    const frenet = curve.computeFrenetFrames(samples, false);

    for (let i = 0; i <= samples; i += 1) {
      const u = i / samples;
      const src = u * (n - 1);
      const a = Math.floor(src);
      const b = Math.min(n - 1, a + 1);
      const k = src - a;
      const position = curve.getPoint(u);
      const tangent = frenet.tangents[Math.min(i, samples)].clone().normalize();
      const normal = frenet.normals[Math.min(i, samples)].clone();
      // Frenet normal can flip; force up-ish
      if (normal.y < 0) normal.multiplyScalar(-1);
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const up = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
      this.points.push({
        position,
        tangent,
        binormal,
        normal: up,
        bank: banks[a] * (1 - k) + banks[b] * k,
        width: widths[a] * (1 - k) + widths[b] * k,
        s: u,
        surface: k < 0.5 ? surfaces[a] : surfaces[b],
        feature: k < 0.5 ? features[a] : features[b],
      });
    }

    this.start = this.points[4].position.clone();
    this.finish = this.points[this.points.length - 6].position.clone();
    this.mesh = this.buildMesh(mats);
  }

  sampleAt(s: number): TrackPoint {
    const u = THREE.MathUtils.clamp(s, 0, 1);
    const f = u * (this.points.length - 1);
    return this.points[Math.round(f)];
  }

  locate(x: number, z: number): {
    point: TrackPoint;
    index: number;
    lateral: number;
    s: number;
    dist: number;
  } {
    let bestI = this.lastIndex;
    let bestD = Infinity;
    const start = Math.max(0, this.lastIndex - 10);
    const end = Math.min(this.points.length - 1, this.lastIndex + 18);
    for (let i = start; i <= end; i += 1) {
      const p = this.points[i].position;
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    if (bestD > 400) {
      for (let i = 0; i < this.points.length; i += 8) {
        const p = this.points[i].position;
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
    }
    this.lastIndex = bestI;
    const point = this.points[bestI];
    const dx = x - point.position.x;
    const dz = z - point.position.z;
    const lateral = dx * point.binormal.x + dz * point.binormal.z;
    return { point, index: bestI, lateral, s: point.s, dist: Math.sqrt(bestD) };
  }

  height(x: number, z: number): { y: number; normal: THREE.Vector3; surface: SurfaceId; trail: number } {
    const loc = this.locate(x, z);
    const p = loc.point;
    const absLat = Math.abs(loc.lateral);
    const half = p.width * 0.5;
    const trail = THREE.MathUtils.smoothstep(half + 1.1, half - 0.2, absLat);
    const bankY = -loc.lateral * Math.tan(p.bank) * trail;
    let bed = p.position.y;
    if (p.feature === 'whoops') bed += Math.sin(p.s * 220) * 0.18 * trail;
    if (p.feature === 'roots') bed += Math.sin(p.s * 340) * 0.045 * trail;
    const warpX = x * 0.035 + fbm(x * 0.02, z * 0.02) * 8;
    const mountain =
      bed +
      Math.max(0, absLat - half) * 0.22 +
      (fbm(warpX, z * 0.03) - 0.45) * 6.5 * (1 - trail);
    const y = mountain * (1 - trail) + (bed + bankY) * trail;
    const e = 0.55;
    const yl = this.heightFast(x - e, z, p, loc.lateral);
    const yr = this.heightFast(x + e, z, p, loc.lateral);
    const yb = this.heightFast(x, z - e, p, loc.lateral);
    const yf = this.heightFast(x, z + e, p, loc.lateral);
    const normal = this.tmp.set(yl - yr, 2 * e, yb - yf).normalize().clone();
    let surface: SurfaceId = p.surface;
    if (trail < 0.25) surface = absLat > 9 ? 'pine' : 'dirt';
    if (p.feature === 'drop' && trail > 0.5 && absLat < half * 0.7) surface = 'rock';
    return { y, normal, surface, trail };
  }

  private heightFast(x: number, z: number, p: TrackPoint, lateral: number): number {
    const dx = x - p.position.x;
    const dz = z - p.position.z;
    const lat = dx * p.binormal.x + dz * p.binormal.z || lateral;
    const absLat = Math.abs(lat);
    const half = p.width * 0.5;
    const trail = THREE.MathUtils.smoothstep(half + 1.1, half - 0.2, absLat);
    const bankY = -lat * Math.tan(p.bank) * trail;
    const bed = p.position.y;
    const mountain = bed + Math.max(0, absLat - half) * 0.22;
    return mountain * (1 - trail) + (bed + bankY) * trail;
  }

  private buildMesh(mats: MaterialLibrary): THREE.Mesh {
    const along = this.points.length;
    const across = 17;
    const halfSpan = 26;
    const positions = new Float32Array(along * across * 3);
    const normals = new Float32Array(along * across * 3);
    const uvs = new Float32Array(along * across * 2);
    const colors = new Float32Array(along * across * 3);
    const indices: number[] = [];

    for (let i = 0; i < along; i += 1) {
      const p = this.points[i];
      for (let j = 0; j < across; j += 1) {
        const u = j / (across - 1);
        const lat = (u - 0.5) * 2 * halfSpan;
        const x = p.position.x + p.binormal.x * lat;
        const z = p.position.z + p.binormal.z * lat;
        const h = this.height(x, z);
        const idx = (i * across + j) * 3;
        positions[idx] = x;
        positions[idx + 1] = h.y;
        positions[idx + 2] = z;
        normals[idx] = h.normal.x;
        normals[idx + 1] = h.normal.y;
        normals[idx + 2] = h.normal.z;
        const uv = (i * across + j) * 2;
        uvs[uv] = p.s * 48;
        uvs[uv + 1] = u * 6;
        const packed = h.trail;
        const rock =
          h.surface === 'rock' || Math.abs(h.normal.y) < 0.72 ? 1 : 0;
        colors[idx] = packed;
        colors[idx + 1] = rock;
        colors[idx + 2] = 0.55 + packed * 0.25;
      }
    }

    for (let i = 0; i < along - 1; i += 1) {
      for (let j = 0; j < across - 1; j += 1) {
        const a = i * across + j;
        const b = a + 1;
        const c = a + across;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x8a6a44,
      map: mats.dirtMap,
      roughness: 0.92,
      metalness: 0.02,
      vertexColors: true,
    });
    mats.dirtMap.repeat.set(24, 8);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTrail = { value: mats.trailMap };
      shader.uniforms.uRock = { value: mats.rockMap };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <map_pars_fragment>',
          `#include <map_pars_fragment>
           uniform sampler2D uTrail;
           uniform sampler2D uRock;`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           vec3 trailC = texture2D(uTrail, vMapUv * vec2(1.0, 3.0)).rgb;
           vec3 rockC = texture2D(uRock, vMapUv * 0.45).rgb;
           diffuseColor.rgb = mix(diffuseColor.rgb, trailC, vColor.r);
           diffuseColor.rgb = mix(diffuseColor.rgb, rockC, vColor.g * 0.72);
           diffuseColor.rgb *= mix(0.72, 1.05, vColor.b);`,
        );
      material.userData.shader = shader;
    };
    material.customProgramCacheKey = () => 'terrain-blend';

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'terrain';
    return mesh;
  }
}
