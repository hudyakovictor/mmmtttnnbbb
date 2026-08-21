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
  legL: THREE.Group;
  legR: THREE.Group;
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
  const upperL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.28, 8), mats.skin);
  upperL.rotation.x = 0.9;
  upperL.position.set(0, -0.04, 0.1);
  armL.add(upperL);
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mats.rubber);
  gloveL.position.set(0, -0.08, 0.28);
  armL.add(gloveL);
  torso.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.18;
  torso.add(armR);

  const legL = new THREE.Group();
  legL.position.set(-0.08, -0.04, 0);
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 8), mats.cloth);
  thigh.rotation.x = 0.55;
  thigh.position.set(0, -0.12, 0.08);
  legL.add(thigh);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.16), mats.rubber);
  boot.position.set(0, -0.32, 0.16);
  legL.add(boot);
  rider.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.08;
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
    legL,
    legR,
    collision,
  };
}
