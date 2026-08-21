import * as THREE from 'three';
import {
  makeBannerTexture,
  makeDirtTexture,
  makeNeedleTexture,
  makeNumberPlate,
  makeRockTexture,
  makeTrailTexture,
} from './ProceduralTextures';

export class MaterialLibrary {
  readonly dirtMap = makeDirtTexture();
  readonly rockMap = makeRockTexture();
  readonly trailMap = makeTrailTexture();
  readonly needleMap = makeNeedleTexture();
  readonly bannerMap = makeBannerTexture();
  readonly plateMap = makeNumberPlate();

  readonly bodyPrimary = new THREE.MeshPhysicalMaterial({
    color: 0xc45c2a,
    metalness: 0.05,
    roughness: 0.42,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
  });
  readonly bodySecondary = new THREE.MeshStandardMaterial({
    color: 0x1a1a1c,
    metalness: 0.35,
    roughness: 0.4,
  });
  readonly trim = new THREE.MeshStandardMaterial({
    color: 0xaeb4bd,
    metalness: 1,
    roughness: 0.38,
  });
  readonly rubber = new THREE.MeshStandardMaterial({
    color: 0x0a0a0b,
    metalness: 0,
    roughness: 0.92,
    envMapIntensity: 0.3,
  });
  readonly hazard = new THREE.MeshStandardMaterial({
    color: 0xc45c2a,
    roughness: 0.48,
    metalness: 0.08,
    emissive: 0x3a1408,
    emissiveIntensity: 0.2,
  });
  readonly reward = new THREE.MeshStandardMaterial({
    color: 0xd7b14a,
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0x6a4a10,
    emissiveIntensity: 0.55,
  });
  readonly glass = new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.28,
    clearcoat: 1,
    depthWrite: false,
  });
  readonly emissiveSignal = new THREE.MeshStandardMaterial({
    color: 0x101010,
    emissive: 0x18e0ff,
    emissiveIntensity: 1.8,
    roughness: 0.4,
  });
  readonly groundContact = new THREE.MeshStandardMaterial({
    color: 0x2a2218,
    roughness: 0.95,
    metalness: 0,
  });
  readonly bark = new THREE.MeshStandardMaterial({
    color: 0x4a3424,
    roughness: 0.92,
    metalness: 0,
  });
  readonly pine = new THREE.MeshStandardMaterial({
    color: 0x243820,
    map: this.needleMap,
    roughness: 0.86,
    metalness: 0,
  });
  readonly wood = new THREE.MeshStandardMaterial({
    color: 0x7a5230,
    roughness: 0.78,
    metalness: 0,
  });
  readonly cloth = new THREE.MeshPhysicalMaterial({
    color: 0x2a3a28,
    roughness: 0.9,
    metalness: 0,
    sheen: 0.6,
    sheenColor: new THREE.Color(0x6a8a62),
  });
  readonly skin = new THREE.MeshStandardMaterial({
    color: 0xc4a07a,
    roughness: 0.62,
    metalness: 0,
  });
  readonly helmet = new THREE.MeshPhysicalMaterial({
    color: 0xf3ead6,
    roughness: 0.28,
    metalness: 0.05,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  readonly water = new THREE.MeshPhysicalMaterial({
    color: 0x2a5a62,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.1,
  });
  readonly plate = new THREE.MeshStandardMaterial({
    map: this.plateMap,
    roughness: 0.55,
    metalness: 0.05,
  });
  readonly banner = new THREE.MeshStandardMaterial({
    map: this.bannerMap,
    roughness: 0.7,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  readonly rock = new THREE.MeshStandardMaterial({
    color: 0x8a8680,
    map: this.rockMap,
    roughness: 0.9,
    metalness: 0.04,
  });

  dispose(): void {
    const mats = [
      this.bodyPrimary,
      this.bodySecondary,
      this.trim,
      this.rubber,
      this.hazard,
      this.reward,
      this.glass,
      this.emissiveSignal,
      this.groundContact,
      this.bark,
      this.pine,
      this.wood,
      this.cloth,
      this.skin,
      this.helmet,
      this.water,
      this.plate,
      this.banner,
      this.rock,
    ];
    for (const m of mats) m.dispose();
    this.dirtMap.dispose();
    this.rockMap.dispose();
    this.trailMap.dispose();
    this.needleMap.dispose();
    this.bannerMap.dispose();
    this.plateMap.dispose();
  }
}
