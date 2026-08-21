import * as THREE from 'three';

export type QualityTier = 'low' | 'med' | 'high';

export function qualitySettings(tier: QualityTier): {
  maxDpr: number;
  shadows: boolean;
  shadowSize: number;
  treeScale: number;
  grass: boolean;
  post: boolean;
} {
  if (tier === 'low') {
    return { maxDpr: 1, shadows: false, shadowSize: 512, treeScale: 0.45, grass: false, post: false };
  }
  if (tier === 'med') {
    return { maxDpr: 1.5, shadows: true, shadowSize: 1024, treeScale: 0.75, grass: false, post: false };
  }
  return { maxDpr: 2, shadows: true, shadowSize: 2048, treeScale: 1, grass: true, post: true };
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  maxDpr = 2,
): boolean {
  const canvas = renderer.domElement;
  const width = Math.max(1, Math.floor(canvas.clientWidth));
  const height = Math.max(1, Math.floor(canvas.clientHeight));
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const bufferWidth = Math.floor(width * dpr);
  const bufferHeight = Math.floor(height * dpr);
  const needsResize = canvas.width !== bufferWidth || canvas.height !== bufferHeight;
  if (needsResize) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  return needsResize;
}
