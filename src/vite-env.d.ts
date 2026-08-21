/// <reference types="vite/client" />

interface ThreeGameDiagnostics {
  frame: number;
  elapsed: number;
  score: number;
  targetScore: number;
  complete: boolean;
  mode: string;
  skill: string;
  quality: string;
  camera: string;
  surface: string;
  lean: number;
  slip: number;
  fork: number;
  sector: number;
  physics: {
    engine: string;
    timestep: number;
    bodies: number;
    colliders: number;
    ccd: boolean;
    sensors: number;
  };
  player: {
    position: { x: number; y: number; z: number };
    speed: number;
    distance: number;
  };
  renderer: {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
  canvas: {
    clientWidth: number;
    clientHeight: number;
    width: number;
    height: number;
    dpr: number;
  };
}

interface ThreeGameTestHooks {
  seed(value: number): void;
  setState(name: string): void;
  setPausedForScreenshot(paused: boolean): void;
  setReducedMotion(enabled: boolean): void;
  hideDebugUi(hidden: boolean): void;
}

interface Window {
  __THREE_GAME_DIAGNOSTICS__?: ThreeGameDiagnostics;
  __THREE_GAME_TEST_HOOKS__?: ThreeGameTestHooks;
}
