import * as THREE from 'three';
import type { MaterialLibrary } from './MaterialLibrary';

export type BikeRig = {
  root: THREE.Group;
  fork: THREE.Group;
  rearShock: THREE.Group;
  wheelF: THREE.Group;
  wheelR: THREE.Group;
  crank: THREE.Group;
  rider: THREE.Group;
  torso: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  collision: THREE.Object3D;
};

function tube(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function wheel(mats: MaterialLibrary, radius: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 8, 28), mats.rubber);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.86, 0.012, 6, 24), mats.trim);
  rim.rotation.y = Math.PI / 2;
  g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 10), mats.trim);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 16), mats.trim);
  rotor.rotation.z = Math.PI / 2;
  rotor.position.x = 0.04;
  g.add(rotor);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.006, radius * 1.6, 0.006), mats.trim);
    spoke.rotation.z = (i / 8) * Math.PI;
    g.add(spoke);
  }
  return g;
}

export function createBike(mats: MaterialLibrary): BikeRig {
  const root = new THREE.Group();
  root.name = 'bike';

  const bb = new THREE.Vector3(0, 0.34, 0);
  const head = new THREE.Vector3(0, 0.78, 0.52);
  const seat = new THREE.Vector3(0, 0.82, -0.28);
  const rearHub = new THREE.Vector3(0, 0.35, -0.62);
  const frontHub = new THREE.Vector3(0, 0.35, 0.62);

  root.add(tube(bb, head, 0.022, mats.bodyPrimary));
  root.add(tube(bb, seat, 0.02, mats.bodyPrimary));
  root.add(tube(seat, head, 0.016, mats.bodySecondary));
  root.add(tube(bb, rearHub, 0.014, mats.bodySecondary));
  root.add(tube(seat, rearHub, 0.013, mats.bodySecondary));

  const fork = new THREE.Group();
  fork.name = 'fork';
  fork.position.copy(head);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), mats.trim);
  fork.add(crown);
  const stanchionL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), mats.trim);
  stanchionL.position.set(-0.05, -0.2, 0.04);
  const stanchionR = stanchionL.clone();
  stanchionR.position.x = 0.05;
  fork.add(stanchionL, stanchionR);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 10, Math.PI), mats.bodySecondary);
  arch.rotation.x = Math.PI / 2;
  arch.position.set(0, -0.38, 0.05);
  fork.add(arch);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 8), mats.bodySecondary);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.06, -0.02);
  fork.add(bar);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), mats.trim);
  stem.position.set(0, 0.04, -0.04);
  fork.add(stem);
  root.add(fork);

  const wheelF = wheel(mats, 0.35);
  wheelF.name = 'wheelF';
  wheelF.position.copy(frontHub);
  root.add(wheelF);

  const wheelR = wheel(mats, 0.35);
  wheelR.name = 'wheelR';
  wheelR.position.copy(rearHub);
  root.add(wheelR);

  const rearShock = new THREE.Group();
  rearShock.position.copy(seat);
  const shockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), mats.trim);
  shockBody.rotation.x = 0.7;
  shockBody.position.set(0, -0.12, 0.04);
  rearShock.add(shockBody);
  root.add(rearShock);

  const crank = new THREE.Group();
  crank.position.copy(bb);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.012), mats.trim);
  arm.position.y = -0.06;
  crank.add(arm);
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.04), mats.bodySecondary);
  pedal.position.set(0.05, -0.13, 0);
  crank.add(pedal);
  root.add(crank);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.22), mats.rubber);
  saddle.position.copy(seat).add(new THREE.Vector3(0, 0.04, 0));
  root.add(saddle);

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.16), mats.plate);
  plate.position.set(0, 0.62, 0.18);
  plate.rotation.x = -0.2;
  root.add(plate);

  const rotorGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.08), mats.bodySecondary);
  rotorGuard.position.set(0.06, 0.38, 0.58);
  root.add(rotorGuard);

  const rider = new THREE.Group();
  rider.name = 'rider';
  rider.position.set(0, 0.9, -0.02);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.16), mats.cloth);
  hips.name = 'hips';
  rider.add(hips);

  const torso = new THREE.Group();
  torso.position.set(0, 0.22, 0.04);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.18), mats.cloth);
  chest.castShadow = true;
  torso.add(chest);
  const number = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), mats.plate);
  number.position.set(0, 0.04, -0.1);
  number.rotation.y = Math.PI;
  torso.add(number);
  rider.add(torso);

  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 0.48, 0.08);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mats.helmet);
  helm.scale.set(1, 1.05, 1.12);
  helmetGroup.add(helm);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0.4, 0.7), mats.glass);
  visor.position.set(0, 0.01, 0.02);
  helmetGroup.add(visor);
  torso.add(helmetGroup);

  const armL = new THREE.Group();
  armL.position.set(-0.18, 0.12, 0.04);
  const upperL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8), mats.skin);
  upperL.position.set(0, -0.13, 0);
  armL.add(upperL);
  const foreL = new THREE.Group();
  foreL.position.set(0, -0.26, 0);
  const foreLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.24, 8), mats.skin);
  foreLimb.position.set(0, -0.12, 0);
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mats.rubber);
  gloveL.position.set(0, -0.25, 0);
  foreL.add(foreLimb, gloveL);
  armL.add(foreL);
  torso.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.18, 0.12, 0.04);
  const upperR = upperL.clone();
  armR.add(upperR);
  const foreR = new THREE.Group();
  foreR.position.set(0, -0.26, 0);
  const foreLimbR = foreLimb.clone();
  foreLimbR.position.set(0, -0.12, 0);
  const gloveR = gloveL.clone();
  gloveR.position.set(0, -0.25, 0);
  foreR.add(foreLimbR, gloveR);
  armR.add(foreR);
  torso.add(armR);

  const legL = new THREE.Group();
  legL.position.set(-0.08, -0.04, 0);
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8), mats.cloth);
  thighL.position.set(0, -0.15, 0);
  legL.add(thighL);
  const shinL = new THREE.Group();
  shinL.position.set(0, -0.3, 0);
  const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.32, 8), mats.cloth);
  shinMesh.position.set(0, -0.16, 0);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.16), mats.rubber);
  bootL.position.set(0, -0.34, 0);
  shinL.add(shinMesh, bootL);
  legL.add(shinL);
  rider.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.08, -0.04, 0);
  const thighR = thighL.clone();
  thighR.position.set(0, -0.15, 0);
  legR.add(thighR);
  const shinR = new THREE.Group();
  shinR.position.set(0, -0.3, 0);
  const shinMeshR = shinMesh.clone();
  shinMeshR.position.set(0, -0.16, 0);
  const bootR = bootL.clone();
  bootR.position.set(0, -0.34, 0);
  shinR.add(shinMeshR, bootR);
  legR.add(shinR);
  rider.add(legR);

  root.add(rider);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.02, 0);
  blob.name = 'contactShadow';
  root.add(blob);

  const collision = new THREE.Object3D();
  collision.name = 'collisionProxy';
  collision.position.set(0, 0.55, 0);
  root.add(collision);

  return {
    root,
    fork,
    rearShock,
    wheelF,
    wheelR,
    crank,
    rider,
    torso,
    armL,
    armR,
    foreL,
    foreR,
    legL,
    legR,
    shinL,
    shinR,
    collision,
  };
}

const _ikN = new THREE.Vector3();
const _ikMid = new THREE.Vector3();
const _ikPerp = new THREE.Vector3();
const _ikElbow = new THREE.Vector3();
const _ikUp = new THREE.Vector3();
const _ikLo = new THREE.Vector3();
const _ikDown = new THREE.Vector3(0, -1, 0);

/** Analytic two-bone IK. All inputs/outputs in the same (root) space. */
function solveTwoBone(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  l1: number,
  l2: number,
  pole: THREE.Vector3,
  outUpper: THREE.Quaternion,
  outLower: THREE.Quaternion,
): void {
  _ikN.subVectors(target, origin);
  let d = _ikN.length();
  if (d < 1e-5) {
    outUpper.identity();
    outLower.identity();
    return;
  }
  _ikN.divideScalar(d);
  d = THREE.MathUtils.clamp(d, 0.02, l1 + l2 - 0.04);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hSq = l1 * l1 - a * a;
  const h = hSq > 0 ? Math.sqrt(hSq) : 0;
  _ikMid.copy(origin).addScaledVector(_ikN, a);
  _ikPerp.subVectors(pole, origin);
  _ikPerp.addScaledVector(_ikN, -_ikPerp.dot(_ikN));
  if (_ikPerp.lengthSq() < 1e-6) _ikPerp.set(_ikN.z, 0, -_ikN.x);
  _ikPerp.normalize();
  _ikElbow.copy(_ikMid).addScaledVector(_ikPerp, h);
  _ikUp.subVectors(_ikElbow, origin).divideScalar(l1);
  _ikLo.subVectors(target, _ikElbow).normalize();
  outUpper.setFromUnitVectors(_ikDown, _ikUp);
  outLower.setFromUnitVectors(_ikDown, _ikLo);
}

const _pole = new THREE.Vector3();
const _torsoQuat = new THREE.Quaternion();
const _torsoQuatInv = new THREE.Quaternion();
const _upperQuat = new THREE.Quaternion();
const _lowerQuat = new THREE.Quaternion();
const _upperLocal = new THREE.Quaternion();
const _upperLocalInv = new THREE.Quaternion();
const _lowerTorso = new THREE.Quaternion();
const _upperInv = new THREE.Quaternion();
const _target = new THREE.Vector3();
const _localOffset = new THREE.Vector3();

/**
 * Runtime sockets per the brief: hands glued to the grips and feet to the
 * pedals every frame via two-bone IK (no baked ride loop). Everything is
 * solved in bike-root space so the rig needs no matrixWorld refreshes.
 */
export function applyRiderPose(bike: BikeRig, crouch: number): void {
  const { fork, crank, rider, torso, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = bike;

  // Torso pitch (attack stance) in root space.
  _torsoQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35 + crouch);
  _torsoQuatInv.copy(_torsoQuat).invert();

  // Hands: grip ends on the bar, in root space (fork group translates with travel).
  const barY = fork.position.y + 0.06;
  const handX = 0.31;
  const handZ = fork.position.z - 0.02;

  // Feet: pedal orbits in root space.
  const theta = crank.rotation.x;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const pedalLY = -0.13 * cosT;
  const pedalLZ = -0.13 * sinT;
  const pedalRY = 0.13 * cosT;
  const pedalRZ = 0.13 * sinT;

  // Shoulders / hips (root space), following torso pitch and rider crouch.
  const shoulderBase = new THREE.Vector3();
  const shoulderL = new THREE.Vector3();
  const shoulderR = new THREE.Vector3();
  const hipBase = rider.position.clone();
  const hipL = new THREE.Vector3();
  const hipR = new THREE.Vector3();

  shoulderBase.copy(rider.position).add(torso.position);
  _localOffset.set(-0.18, 0.12, 0.04).applyQuaternion(_torsoQuat);
  shoulderL.copy(shoulderBase).add(_localOffset);
  _localOffset.set(0.18, 0.12, 0.04).applyQuaternion(_torsoQuat);
  shoulderR.copy(shoulderBase).add(_localOffset);

  // Arms: two-bone IK shoulder → grip, elbows flared out and slightly low.
  // Upper solved in torso-local space; forearm relative to the upper arm.
  _target.set(fork.position.x - handX, barY, handZ);
  _pole.copy(shoulderL).add(new THREE.Vector3(-0.3, -0.18, 0.06));
  solveTwoBone(shoulderL, _target, 0.3, 0.28, _pole, _upperQuat, _lowerQuat);
  _upperLocal.copy(_torsoQuatInv).multiply(_upperQuat);
  armL.quaternion.copy(_upperLocal);
  _upperLocalInv.copy(_upperLocal).invert();
  _lowerTorso.copy(_torsoQuatInv).multiply(_lowerQuat);
  foreL.quaternion.copy(_upperLocalInv.multiply(_lowerTorso));

  _target.set(fork.position.x + handX, barY, handZ);
  _pole.copy(shoulderR).add(new THREE.Vector3(0.3, -0.18, 0.06));
  solveTwoBone(shoulderR, _target, 0.3, 0.28, _pole, _upperQuat, _lowerQuat);
  _upperLocal.copy(_torsoQuatInv).multiply(_upperQuat);
  armR.quaternion.copy(_upperLocal);
  _upperLocalInv.copy(_upperLocal).invert();
  _lowerTorso.copy(_torsoQuatInv).multiply(_lowerQuat);
  foreR.quaternion.copy(_upperLocalInv.multiply(_lowerTorso));

  // Legs: hip → pedal, knees forward.
  hipL.copy(hipBase).add(new THREE.Vector3(-0.08, -0.04, 0));
  hipR.copy(hipBase).add(new THREE.Vector3(0.08, -0.04, 0));
  _target.set(crank.position.x - 0.05, crank.position.y + pedalLY, crank.position.z + pedalLZ);
  _pole.copy(hipL).add(new THREE.Vector3(0, -0.15, 0.3));
  solveTwoBone(hipL, _target, 0.3, 0.36, _pole, _upperQuat, _lowerQuat);
  legL.quaternion.copy(_upperQuat);
  _upperInv.copy(_upperQuat).invert();
  shinL.quaternion.copy(_upperInv.multiply(_lowerQuat));

  _target.set(crank.position.x + 0.05, crank.position.y + pedalRY, crank.position.z + pedalRZ);
  _pole.copy(hipR).add(new THREE.Vector3(0, -0.15, 0.3));
  solveTwoBone(hipR, _target, 0.3, 0.36, _pole, _upperQuat, _lowerQuat);
  legR.quaternion.copy(_upperQuat);
  _upperInv.copy(_upperQuat).invert();
  shinR.quaternion.copy(_upperInv.multiply(_lowerQuat));
}
