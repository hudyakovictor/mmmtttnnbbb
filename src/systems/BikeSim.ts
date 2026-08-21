import * as THREE from 'three';
import { BIKE, FIXED_DT, SURFACES } from '../game/config';
import type { SurfaceId, Track } from '../world/Track';

export type SkillMode = 'assist' | 'pro';

export type SimState = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  lean: number;
  steer: number;
  omegaF: number;
  omegaR: number;
  fork: number;
  rear: number;
  grounded: boolean;
  airTime: number;
  hopCharge: number;
  crashed: boolean;
  crashReason: string;
  surface: SurfaceId;
  slip: number;
  longSpeed: number;
  trailLat: number;
  s: number;
};

export class BikeSim {
  readonly state: SimState;
  private leanI = 0;
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(
    private readonly track: Track,
    start: THREE.Vector3,
    yaw: number,
  ) {
    this.state = {
      pos: start.clone(),
      vel: new THREE.Vector3(),
      yaw,
      pitch: 0,
      lean: 0,
      steer: 0,
      omegaF: 0,
      omegaR: 0,
      fork: 0,
      rear: 0,
      grounded: true,
      airTime: 0,
      hopCharge: 0,
      crashed: false,
      crashReason: '',
      surface: 'packed',
      slip: 0,
      longSpeed: 0,
      trailLat: 0,
      s: 0,
    };
  }

  reset(start: THREE.Vector3, yaw: number): void {
    this.state.pos.copy(start);
    this.state.vel.set(0, 0, 0);
    this.state.yaw = yaw;
    this.state.pitch = 0;
    this.state.lean = 0;
    this.state.steer = 0;
    this.state.omegaF = 0;
    this.state.omegaR = 0;
    this.state.fork = 0.08;
    this.state.rear = 0.08;
    this.state.grounded = true;
    this.state.airTime = 0;
    this.state.hopCharge = 0;
    this.state.crashed = false;
    this.state.crashReason = '';
    this.state.slip = 0;
    this.leanI = 0;
  }

  step(steerInput: number, brake: number, hopHeld: boolean, hopReleased: boolean, skill: SkillMode): void {
    if (this.state.crashed) {
      this.state.vel.y -= 9.81 * FIXED_DT;
      this.state.pos.addScaledVector(this.state.vel, FIXED_DT);
      this.state.lean += this.state.vel.x * 0.01;
      return;
    }

    const st = this.state;
    const loc = this.track.locate(st.pos.x, st.pos.z);
    const ground = this.track.height(st.pos.x, st.pos.z);
    st.s = loc.s;
    st.trailLat = loc.lateral;
    st.surface = ground.surface;
    const surf = SURFACES[ground.surface];

    this.fwd.set(Math.sin(st.yaw), 0, Math.cos(st.yaw));
    this.right.set(this.fwd.z, 0, -this.fwd.x);

    const speed = st.vel.length();
    const long = st.vel.dot(this.fwd);
    const lat = st.vel.dot(this.right);
    st.longSpeed = long;

    const maxSteer = THREE.MathUtils.lerp(BIKE.maxSteer, BIKE.minSteer, THREE.MathUtils.clamp(Math.abs(long) / 24, 0, 1));
    st.steer += (steerInput * maxSteer - st.steer) * 8 * FIXED_DT;

    const wheelBase = BIKE.wheelbase;
    const hubF = st.pos.clone().addScaledVector(this.fwd, wheelBase * 0.5).addScaledVector(this.up, 0.55);
    const hubR = st.pos.clone().addScaledVector(this.fwd, -wheelBase * 0.5).addScaledVector(this.up, 0.5);
    const hitF = this.track.height(hubF.x, hubF.z);
    const hitR = this.track.height(hubR.x, hubR.z);
    const travelF = hubF.y - hitF.y - BIKE.wheelRadius;
    const travelR = hubR.y - hitR.y - BIKE.wheelRadius;
    const contactF = travelF < BIKE.forkTravel;
    const contactR = travelR < BIKE.rearTravel;
    st.grounded = contactF || contactR;
    st.airTime = st.grounded ? 0 : st.airTime + FIXED_DT;

    const compF = contactF ? THREE.MathUtils.clamp(BIKE.forkTravel - travelF, 0, BIKE.forkTravel) : 0;
    const compR = contactR ? THREE.MathUtils.clamp(BIKE.rearTravel - travelR, 0, BIKE.rearTravel) : 0;
    const vF = (compF - st.fork) / FIXED_DT;
    const vR = (compR - st.rear) / FIXED_DT;
    st.fork = compF;
    st.rear = compR;

    const springF = compF * BIKE.forkSpring;
    const springR = compR * BIKE.rearSpring;
    const dampF = vF > 0 ? vF * BIKE.forkDampBump : vF * BIKE.forkDampRebound;
    const dampR = vR > 0 ? vR * BIKE.rearDampBump : vR * BIKE.rearDampRebound;
    const nForce = Math.max(0, springF + dampF + springR + dampR);
    const load = Math.max(80, nForce);

    const slopeAccel = -9.81 * hitF.normal.dot(this.fwd);
    st.vel.addScaledVector(this.fwd, slopeAccel * FIXED_DT);
    st.vel.y -= 9.81 * FIXED_DT;

    if (st.grounded) {
      const targetY = (hitF.y + hitR.y) * 0.5 + BIKE.wheelRadius + 0.28 - (compF + compR) * 0.35;
      if (st.pos.y < targetY) {
        st.pos.y = targetY;
        if (st.vel.y < 0) st.vel.y *= -0.05;
      }
      const slopePitch = Math.atan2(-(hitF.y - hitR.y), wheelBase);
      st.pitch += (slopePitch - st.pitch) * 8 * FIXED_DT;
    } else {
      st.pitch += (-0.15 - st.pitch) * 0.6 * FIXED_DT;
    }

    const wheelSpeed = (st.omegaF + st.omegaR) * 0.5 * BIKE.wheelRadius;
    const longSlip = THREE.MathUtils.clamp((long - wheelSpeed) / Math.max(1.2, Math.abs(long)), -1.5, 1.5);
    const latSlip = lat / Math.max(1.4, Math.abs(long));
    const slipMag = Math.hypot(longSlip * 0.7, latSlip);
    const pace = Math.sin(1.65 * Math.atan(8.5 * slipMag));
    const muLong = surf.gripLong * (0.35 + 0.65 * Math.abs(pace));
    const muLat = surf.gripLat * (0.3 + 0.7 * Math.abs(pace)) * (1 - Math.min(0.6, Math.abs(longSlip) * 0.5));

    const brakeTorque = brake * (BIKE.brakeFront + BIKE.brakeRear);
    const driveOmega = long / Math.max(0.08, BIKE.wheelRadius);
    st.omegaF += (driveOmega - st.omegaF) * 6 * FIXED_DT;
    st.omegaR += (driveOmega - st.omegaR) * 6 * FIXED_DT;
    st.omegaF = Math.max(0, st.omegaF - (brake * BIKE.brakeFront) / (BIKE.tireInertia * 90) * FIXED_DT);
    st.omegaR = Math.max(0, st.omegaR - (brake * BIKE.brakeRear) / (BIKE.tireInertia * 90) * FIXED_DT);

    if (st.grounded) {
      const fx = -Math.sign(longSlip || 1) * muLong * load * Math.min(1, Math.abs(longSlip) * 2.2);
      const fy = -lat * muLat * 9.5 - st.steer * Math.max(0, long) * 2.4;
      st.vel.addScaledVector(this.fwd, (fx / BIKE.mass - Math.sign(long) * surf.roll * 9.81 - brakeTorque / (BIKE.mass * 12)) * FIXED_DT);
      st.vel.addScaledVector(this.right, (fy / BIKE.mass) * FIXED_DT);
      const drag = 0.5 * 1.2 * BIKE.cdArea * speed * speed;
      if (speed > 0.2) st.vel.addScaledVector(st.vel.clone().normalize(), (-drag / BIKE.mass) * FIXED_DT);
    }

    st.yaw += st.steer * THREE.MathUtils.clamp(long, -4, 18) * 0.085 * FIXED_DT * 60 * 0.018;

    const berm = loc.point.bank;
    const targetLean = THREE.MathUtils.clamp(
      st.steer * 0.55 * THREE.MathUtils.clamp(Math.abs(long) / 12, 0.2, 1) + berm * 0.65 + lat * 0.04,
      -0.72,
      0.72,
    );
    const err = targetLean - st.lean;
    this.leanI = THREE.MathUtils.clamp(this.leanI + err * FIXED_DT, -0.4, 0.4);
    st.lean += (err * 14 + this.leanI * 6 - st.lean * 5.5) * FIXED_DT;
    st.lean = THREE.MathUtils.clamp(st.lean, -0.85, 0.85);

    if (skill === 'assist') {
      const rail = THREE.MathUtils.clamp(-loc.lateral * 2.4, -6, 6);
      st.vel.addScaledVector(loc.point.binormal, rail * FIXED_DT);
      st.yaw += (-loc.lateral * 0.08 - (st.yaw - Math.atan2(loc.point.tangent.x, loc.point.tangent.z)) * 0.35) * FIXED_DT;
    }

    if (hopHeld) st.hopCharge = Math.min(1, st.hopCharge + FIXED_DT * 1.7);
    if (hopReleased && st.grounded) {
      const impulse = 3.4 + st.hopCharge * 4.2;
      st.vel.addScaledVector(this.up, impulse);
      st.vel.addScaledVector(this.fwd, 1.1 * st.hopCharge);
      st.pitch -= 0.18 * st.hopCharge;
      st.hopCharge = 0;
      st.grounded = false;
    }
    if (!hopHeld) st.hopCharge *= 0.9;

    const spd = st.vel.length();
    if (spd > 36) st.vel.multiplyScalar(36 / spd);
    if (!Number.isFinite(st.pos.x) || !Number.isFinite(st.vel.y)) {
      this.crash('sim NaN');
      return;
    }
    st.pos.addScaledVector(st.vel, FIXED_DT);
    st.slip = THREE.MathUtils.clamp(slipMag, 0, 1.4);

    const off = Math.abs(loc.lateral) > loc.point.width * 0.5 + 1.35;
    if (st.grounded && off && Math.abs(long) > 7 && Math.abs(latSlip) > 0.55) {
      this.crash('off-camber washout');
    }
    if (Math.abs(st.lean) > 0.82 && Math.abs(long) > 6) this.crash('low-side');
    if (st.airTime > 2.4) this.crash('over-rotate');
    if (st.pos.y < ground.y - 2.5) this.crash('over the bars');
  }

  crash(reason: string): void {
    if (this.state.crashed) return;
    this.state.crashed = true;
    this.state.crashReason = reason;
    this.state.vel.x += this.state.lean * 2;
    this.state.vel.y += 1.2;
  }
}
