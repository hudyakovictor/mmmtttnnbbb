export const FIXED_DT = 1 / 60;

export const BIKE = {
  mass: 92,
  wheelbase: 1.22,
  bbHeight: 0.34,
  comHeight: 0.62,
  wheelRadius: 0.35,
  forkTravel: 0.2,
  rearTravel: 0.18,
  forkSpring: 18500,
  rearSpring: 21000,
  forkDampBump: 1400,
  forkDampRebound: 1800,
  rearDampBump: 1600,
  rearDampRebound: 2000,
  inertiaYaw: 18,
  inertiaLean: 12,
  tireInertia: 0.32,
  brakeFront: 920,
  brakeRear: 640,
  maxSteer: 0.62,
  minSteer: 0.14,
  cdArea: 0.42,
};

export const SURFACES: Record<
  string,
  { gripLong: number; gripLat: number; roll: number; rest: number; wet: number; label: string }
> = {
  packed: { gripLong: 1.08, gripLat: 1.12, roll: 0.011, rest: 0.18, wet: 0.9, label: 'PACKED' },
  dirt: { gripLong: 0.94, gripLat: 0.9, roll: 0.02, rest: 0.12, wet: 0.78, label: 'DIRT' },
  root: { gripLong: 0.68, gripLat: 0.52, roll: 0.018, rest: 0.08, wet: 0.55, label: 'ROOTS' },
  rock: { gripLong: 0.82, gripLat: 0.74, roll: 0.01, rest: 0.22, wet: 0.7, label: 'ROCK' },
  mud: { gripLong: 0.52, gripLat: 0.46, roll: 0.045, rest: 0.04, wet: 0.4, label: 'MUD' },
  pine: { gripLong: 0.76, gripLat: 0.7, roll: 0.028, rest: 0.1, wet: 0.65, label: 'DUFF' },
};

export const SECTORS = [
  { t: 0, name: 'START GATE' },
  { t: 0.22, name: 'PINE WALL' },
  { t: 0.48, name: 'ROCK DROP' },
  { t: 0.74, name: 'FINISH FALL' },
];
