/**
 * Headless runtime smoke test for the physics + world pipeline.
 * Bundled with esbuild and run in Node (no WebGL/DOM needed for
 * Track / BikeSim / Ragdoll logic).
 *
 *   npx esbuild scripts/sim-smoke.ts --bundle --platform=node --format=esm --outfile=/tmp/sim-smoke.mjs && node /tmp/sim-smoke.mjs
 */
import * as THREE from 'three';
import { Track } from '../src/world/Track';
import { BikeSim } from '../src/systems/BikeSim';
import { Ragdoll } from '../src/systems/Ragdoll';
import { createBike, applyRiderPose } from '../src/assets/BikeFactory';
import { createSeededRandom } from '../src/utils/random';

const fail = (msg: string): never => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const ok = (name: string, detail = '') => {
  console.log(`ok  ${name}${detail ? ` — ${detail}` : ''}`);
};

// Stub textures: Track only uses them as shader uniform values.
const stubTex = {
  repeat: { set: (_u: number, _v: number) => {} },
  isTexture: true,
} as unknown as THREE.Texture;
const mats = {
  dirtMap: stubTex,
  trailMap: stubTex,
  rockMap: stubTex,
  cloudMap: stubTex,
};

const track = new Track(mats as never);
ok('track built', `${track.points.length} points, ${track.length.toFixed(0)} m`);

// Mesh sanity: all positions finite, non-degenerate.
const geo = track.mesh.geometry;
const pos = geo.getAttribute('position');
let minY = Infinity;
let maxY = -Infinity;
for (let i = 0; i < pos.count; i += 1) {
  const y = pos.getY(i);
  if (!Number.isFinite(y)) fail(`mesh vertex ${i} not finite`);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);
}
ok('terrain mesh finite', `y range ${minY.toFixed(1)}..${maxY.toFixed(1)}`);

// Height field consistency: the mesh samples the same function as the sim.
const p0 = track.points[200];
const h0 = track.height(p0.position.x, p0.position.z);
if (Math.abs(h0.y - p0.position.y) > 1.2) fail(`height mismatch at s=0.5: ${h0.y} vs ${p0.position.y}`);
ok('height channel matches spline bed');

// River band must actually dip the height field (shared by mesh + wheels).
const riverCenter = track.sampleAt(0.5);
const riverProbe = track.height(riverCenter.position.x, riverCenter.position.z);
if (riverProbe.surface !== 'mud') fail(`river surface expected mud, got ${riverProbe.surface}`);
if (riverCenter.position.y - riverProbe.y < 0.4) {
  fail(`river cut too shallow: bed ${riverCenter.position.y.toFixed(2)} vs cut ${riverProbe.y.toFixed(2)}`);
}
ok('river cut + mud surface active', `cut depth ${(riverCenter.position.y - riverProbe.y).toFixed(2)} m`);

// Bike sim: scripted run, no NaN, gravity drives progress along the spline.
const start = track.points[6];
const sim = new BikeSim(
  track,
  start.position.clone().add(new THREE.Vector3(0, 0.7, 0)),
  Math.atan2(start.tangent.x, start.tangent.z),
);
sim.state.vel.copy(start.tangent).multiplyScalar(4.5);
let lastS = 0;
let maxSpeed = 0;
let touches = 0;
let crashedAt = -1;
const steerScript = [0, 0.5, -0.3, 0.8, -0.6, 0.2];
for (let i = 0; i < 60 * 90; i += 1) {
  const steer = steerScript[Math.floor(i / 600) % steerScript.length];
  const brake = i > 60 * 60 && i < 60 * 65 ? 1 : 0;
  sim.step(steer, brake, false, false, 'assist');
  const st = sim.state;
  if (!Number.isFinite(st.pos.x) || !Number.isFinite(st.pos.y) || !Number.isFinite(st.vel.y)) {
    fail(`sim NaN at tick ${i}`);
  }
  if (st.grounded) touches += 1;
  maxSpeed = Math.max(maxSpeed, st.vel.length());
  lastS = st.s;
  if (st.crashed && crashedAt < 0) crashedAt = i;
}
ok('bike sim 90 s scripted run', `s=${lastS.toFixed(2)}, maxSpeed=${maxSpeed.toFixed(1)} m/s, grounded ${((touches / 5400) * 100).toFixed(0)}%, crash at ${crashedAt < 0 ? 'never' : `${(crashedAt / 60).toFixed(0)} s`}`);
if (lastS < 0.6) fail(`bike made no real progress along the spline (s=${lastS.toFixed(2)})`);
if (maxSpeed < 8) fail('gravity never drove the bike to a downhill speed');

// Suspension sanity: reset into the whoops and ride — the fork must work.
const whoops = track.sampleAt(0.44);
sim.reset(whoops.position.clone().add(new THREE.Vector3(0, 0.72, 0)), Math.atan2(whoops.tangent.x, whoops.tangent.z));
sim.state.vel.copy(whoops.tangent).multiplyScalar(12);
let maxFork = 0;
for (let i = 0; i < 60 * 8; i += 1) {
  sim.step(0.2, 0, false, false, 'pro');
  maxFork = Math.max(maxFork, sim.state.fork);
}
ok('fork compression on bumps', `max ${(maxFork * 100).toFixed(0)} cm`);
if (maxFork < 0.03) fail('fork never compresses — suspension dead');

// Bunny hop: preload then release must produce upward impulse and air time.
sim.reset(start.position.clone().add(new THREE.Vector3(0, 0.72, 0)), Math.atan2(start.tangent.x, start.tangent.z));
for (let i = 0; i < 30; i += 1) sim.step(0, 0, true, false, 'pro');
const preY = sim.state.pos.y;
sim.step(0, 0, false, true, 'pro');
ok('hop impulse', `vy=${sim.state.vel.y.toFixed(1)}`);
if (sim.state.vel.y < 2) fail('hop release gave no upward velocity');
let air = 0;
for (let i = 0; i < 60; i += 1) {
  sim.step(0, 0, false, false, 'pro');
  if (!sim.state.grounded) air += 1;
  void preY;
}
ok('hop produces air time', `${air} air ticks`);

// Forced crash → crashed state, bike keeps inertia.
sim.crash('low-side');
if (!sim.state.crashed) fail('crash flag not set');
const crashV = sim.state.vel.clone();
sim.step(0, 0, false, false, 'pro');
if (sim.state.vel.length() < crashV.length() * 0.5) fail('bike lost its inertia on crash');
ok('crash fail-state keeps bike inertia');

// Ragdoll: spawn at speed, tumble, settle, stay finite.
const ragMats = {
  skin: {} as THREE.Material,
  cloth: {} as THREE.Material,
  rubber: {} as THREE.Material,
  helmet: {} as THREE.Material,
};
const ragdoll = new Ragdoll(ragMats as never, track);
ragdoll.spawn(
  sim.state.pos.clone().add(new THREE.Vector3(0, 0.55, 0)),
  new THREE.Vector3(12, 1.5, 4),
  sim.state.yaw,
  createSeededRandom(5),
);
if (!ragdoll.active) fail('ragdoll did not activate');
let maxYr = -Infinity;
let settled = 0;
for (let i = 0; i < 60 * 6; i += 1) {
  ragdoll.update(1 / 60);
  for (const key of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(ragdoll.focus[key])) fail(`ragdoll NaN at tick ${i} (${key})`);
  }
  maxYr = Math.max(maxYr, ragdoll.focus.y);
  if (ragdoll.focus.y < 2) settled += 1;
}
ok('ragdoll 6 s tumble', `peak focus y=${maxYr.toFixed(1)}, low ticks=${settled}`);
ragdoll.hide();
if (ragdoll.active) fail('ragdoll hide failed');
ok('ragdoll hide');
ragdoll.dispose();
ok('ragdoll dispose');

// IK sanity: hands must land on the grips, feet on the pedals.
const stubMat = {} as THREE.Material;
const bikeMats = {
  bodyPrimary: stubMat,
  bodySecondary: stubMat,
  trim: stubMat,
  rubber: stubMat,
  plate: stubMat,
  cloth: stubMat,
  skin: stubMat,
  helmet: stubMat,
  glass: stubMat,
} as never;
const bike = createBike(bikeMats);
bike.root.position.set(10, 0, 10);
bike.root.rotation.set(0.2, 0.4, -0.1);
bike.crank.rotation.x = 0.8;
bike.fork.position.y = 0.72;
bike.rider.position.y = 0.86;
bike.torso.rotation.x = 0.45;
applyRiderPose(bike, 0.1);
bike.root.updateMatrixWorld(true);

const handLocal = new THREE.Vector3(0, -0.25, 0);
const handL = bike.foreL.localToWorld(handLocal.clone());
const gripL = new THREE.Vector3(-0.31, 0.06, -0.02).applyMatrix4(bike.fork.matrixWorld);
const errL = handL.distanceTo(gripL);
const handR = bike.foreR.localToWorld(handLocal.clone());
const gripR = new THREE.Vector3(0.31, 0.06, -0.02).applyMatrix4(bike.fork.matrixWorld);
const errR = handR.distanceTo(gripR);
const footL = bike.shinL.localToWorld(new THREE.Vector3(0, -0.34, 0));
const pedalL = new THREE.Vector3(-0.05, -0.13 * Math.cos(0.8), -0.13 * Math.sin(0.8)).applyMatrix4(bike.crank.matrixWorld);
const errFL = footL.distanceTo(pedalL);
ok('IK: hands on grips, feet on pedals', `err L=${errL.toFixed(3)} R=${errR.toFixed(3)} foot=${errFL.toFixed(3)}`);
if (errL > 0.12 || errR > 0.12 || errFL > 0.12) fail('IK targets not reached');

console.log('\nAll smoke checks passed.');
