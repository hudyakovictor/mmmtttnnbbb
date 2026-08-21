import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import GUI from 'lil-gui';
import { MaterialLibrary } from '../assets/MaterialLibrary';
import { applyRiderPose, createBike, type BikeRig } from '../assets/BikeFactory';
import { InputController } from '../core/Input';
import { Loop } from '../core/Loop';
import { createRenderer, qualitySettings, resizeRenderer, type QualityTier } from '../core/Renderer';
import { AudioSystem } from '../systems/AudioSystem';
import { BikeSim, type SkillMode } from '../systems/BikeSim';
import { CameraRig, ShakeRig } from '../systems/CameraRig';
import { Hud } from '../systems/Hud';
import { Ragdoll } from '../systems/Ragdoll';
import { VfxSystem } from '../systems/Vfx';
import { createSeededRandom } from '../utils/random';
import { createSky, Environment } from '../world/Environment';
import { Track } from '../world/Track';
import { FIXED_DT } from './config';

type Mode = 'menu' | 'ride' | 'pause' | 'crash' | 'fail' | 'win';

const WIND = new THREE.Vector2(0.9, 0.35);

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.35 }, uSize: { value: 0.78 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uStrength, uSize; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(uSize, uSize - 0.4, d), uStrength); gl_FragColor = c; }`,
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.12, 1400);
  private readonly input: InputController;
  private readonly audio = new AudioSystem();
  private readonly mats = new MaterialLibrary();
  private readonly loop: Loop;
  private readonly cameraRig: CameraRig;
  private readonly shake = new ShakeRig();
  private readonly vfx = new VfxSystem();
  private readonly hud: Hud;
  private readonly sun: THREE.DirectionalLight;
  private readonly fill: THREE.HemisphereLight;
  private composer: EffectComposer | null = null;

  private track: Track;
  private env: Environment;
  private sim: BikeSim;
  private bike: BikeRig;
  private ragdoll: Ragdoll;
  private rng = createSeededRandom(27);
  private mode: Mode = 'menu';
  private skill: SkillMode = 'assist';
  private quality: QualityTier = 'med';
  private frame = 0;
  private elapsed = 0;
  private accum = 0;
  private crashes = 0;
  private lastSector = 0;
  private respawnS = 0;
  private crashTimer = 0;
  private pausedForScreenshot = false;
  private reducedMotion = false;
  private timeScale = 1;
  private hitstopRemaining = 0;
  private afterimage: AfterimagePass | null = null;
  private chromatic: ShaderPass | null = null;
  private debug: GUI | null = null;
  private readonly tuning = { exposure: 1.08, maxDpr: 1.5 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.fill = new THREE.HemisphereLight(0xcfe4f5, 0x3a2a18, 0.85);
    this.scene.add(this.fill);
    this.sun = new THREE.DirectionalLight(0xfff1bf, 2.35);
    this.sun.position.set(40, 70, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog(0xb7c7d4, 48, 220);
    this.scene.add(createSky());

    this.track = new Track(this.mats);
    this.env = new Environment(this.track, this.mats, this.rng, 0.75, false);
    this.scene.add(this.env.group);
    this.scene.add(this.vfx.group);

    const start = this.track.points[6];
    this.sim = new BikeSim(this.track, start.position.clone().add(new THREE.Vector3(0, 0.7, 0)), Math.atan2(start.tangent.x, start.tangent.z));
    this.bike = createBike(this.mats);
    this.scene.add(this.bike.root);
    this.ragdoll = new Ragdoll(this.mats, this.track);
    this.scene.add(this.ragdoll.group);

    this.cameraRig = new CameraRig(this.camera, this.track);
    this.cameraRig.snap(this.sim.state);

    this.input = new InputController(
      this.el('#touch-stick'),
      this.el('#touch-knob'),
      this.el('#brake-button'),
      this.el('#hop-button'),
    );

    this.hud = new Hud(
      this.el('#speed-value'),
      this.el('#speedo-fill') as unknown as SVGPathElement,
      this.el('#fork-front'),
      this.el('#fork-rear'),
      this.el('#sector-label'),
      this.el('#sector-fill'),
      this.el('#timer-value'),
      this.el('#slip-fill'),
      this.el('#surface-badge'),
      this.el('#lean-needle'),
      this.el('#status-line'),
      this.el('#minimap') as HTMLCanvasElement,
      this.el('#overlay'),
      this.el('#pause-overlay'),
      this.el('#fail-overlay'),
      this.el('#win-overlay'),
      this.el('#fail-title'),
      this.el('#fail-copy'),
      this.el('#win-copy'),
      this.track,
    );

    this.bindUi();
    this.applyQuality('med');
    this.loop = new Loop((d, e) => this.update(d, e), () => this.render());
    this.installHooks();
    this.publish();
    this.hud.setMode('menu');
    this.hud.banner('WHISTLER-CLASS DH', 2.4);
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.audio.dispose();
    this.ragdoll.dispose();
    this.debug?.destroy();
    this.mats.dispose();
    this.renderer.dispose();
    window.__THREE_GAME_DIAGNOSTICS__ = undefined;
    window.__THREE_GAME_TEST_HOOKS__ = undefined;
  }

  private update(delta: number, elapsed: number): void {
    this.frame += 1;
    if (this.pausedForScreenshot) {
      this.publish();
      return;
    }
    const resized = resizeRenderer(this.renderer, this.camera, this.tuning.maxDpr);
    if (resized && this.composer) {
      this.composer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tuning.maxDpr));
    }

    this.input.poll();
    const ui = this.input.consumeUi();
    if (ui.start && this.mode === 'menu') this.beginRun();
    if (ui.pause && this.mode === 'ride') this.setMode('pause');
    else if (ui.pause && this.mode === 'pause') this.setMode('ride');
    if (ui.restart && (this.mode === 'ride' || this.mode === 'pause' || this.mode === 'crash')) this.beginRun();

    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= delta;
      if (this.hitstopRemaining <= 0) {
        this.timeScale = 1;
        this.audio.setDuck(1);
      }
    }
    const gdt = delta * this.timeScale;
    const animElapsed = this.reducedMotion ? 0 : elapsed;

    if (this.mode === 'ride') {
      this.accum += Math.min(gdt, 0.1);
      while (this.accum >= FIXED_DT) {
        this.sim.step(this.input.steer, this.input.brake, this.input.hopHeld, this.input.hopReleased, this.skill);
        this.accum -= FIXED_DT;
      }
      this.elapsed += gdt;
      this.syncBike(gdt);
      this.followSun();
      this.env.tick(animElapsed);
      this.track.tickClouds(this.elapsed, WIND);
      this.vfx.update(gdt, this.camera.position, this.rng);

      const st = this.sim.state;
      if (st.grounded && st.slip > 0.28) {
        this.vfx.emitDust(st.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), st.vel, st.slip, this.rng);
      }
      if (this.input.hopReleased && st.airTime < 0.05) this.cameraRig.punch(4);

      // Camera shake from high-frequency fork compression, not position.
      const forkKick = Math.abs(st.forkVel) + Math.abs(st.rearVel) * 0.6;
      if (st.grounded && forkKick > 1.1) {
        this.shake.add(Math.min(0.14, (forkKick - 1.1) * 0.045));
      }

      const sector = Math.floor(st.s * 4);
      if (sector > this.lastSector) {
        this.lastSector = sector;
        this.respawnS = st.s;
        this.audio.checkpoint(this.rng);
        this.hud.banner(this.el('#sector-label').textContent ?? 'SECTOR');
        this.shake.add(0.12);
      }
      if (st.s > 0.97 && this.mode === 'ride') this.onFinish();
      else if (st.crashed && this.mode === 'ride') this.onCrash();
    } else if (this.mode === 'crash') {
      // Ragdoll fail-state: rider tumbles, bike keeps its inertia, the
      // camera stays on the rider until the fail overlay shows.
      this.accum += Math.min(gdt, 0.1);
      while (this.accum >= FIXED_DT) {
        this.sim.step(0, 0, false, false, this.skill);
        this.accum -= FIXED_DT;
      }
      this.ragdoll.update(gdt);
      this.crashTimer -= gdt;
      if (this.crashTimer <= 0) {
        this.hud.setFail(this.sim.state.crashReason);
        this.setMode('fail');
      }
      this.syncBike(gdt);
      this.followSun();
      this.env.tick(animElapsed);
      this.track.tickClouds(this.elapsed, WIND);
      this.vfx.update(gdt, this.camera.position, this.rng);
    } else {
      this.syncBike(0);
      this.env.tick(animElapsed);
      this.track.tickClouds(this.elapsed, WIND);
      this.vfx.update(gdt, this.camera.position, this.rng);
    }

    if (this.mode === 'crash' && this.ragdoll.active) {
      // Keep the camera on the rider: slow chase toward the ragdoll focus.
      const target = this.ragdoll.focus.clone().add(new THREE.Vector3(0, 1.1, 2.4));
      const lag = 1 - Math.exp(-delta / 0.16);
      this.camera.position.lerp(target, lag);
      this.camera.lookAt(this.ragdoll.focus);
    } else {
      this.cameraRig.update(delta, this.sim.state, this.reducedMotion);
    }
    this.shake.update(delta, this.camera, this.reducedMotion);
    const st = this.sim.state;
    const breath = THREE.MathUtils.clamp(
      st.slip * 1.3 + (st.airTime > 0.7 ? 0.4 : 0) + (this.mode === 'crash' ? 0.9 : 0),
      0,
      1,
    );
    this.audio.setLayers(
      st.vel.length(),
      st.slip,
      st.grounded,
      st.airTime,
      (st.omegaF + st.omegaR) * 0.5,
      breath,
    );
    this.hud.update(this.sim.state, this.elapsed, elapsed);
    this.publish();
  }

  private render(): void {
    this.renderer.info.reset();
    if (this.composer && this.quality === 'high') {
      if (this.afterimage) {
        // AfterimageShader: higher damp = stronger persistence. Scale it with
        // camera velocity only — standing still must leave no trail.
        const speed = this.sim.state.vel.length();
        const damp = THREE.MathUtils.clamp(0.18 + speed * 0.012, 0.18, 0.72);
        this.afterimage.uniforms['damp'].value = damp;
      }
      if (this.chromatic) {
        const speed = this.sim.state.vel.length();
        const amount = this.shake.level * 0.004 + Math.min(0.002, speed * 0.00006);
        this.chromatic.uniforms['amount'].value = amount;
        this.chromatic.uniforms['angle'].value = this.sim.state.lean * 0.4;
      }
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private syncBike(dt: number): void {
    const st = this.sim.state;
    const root = this.bike.root;
    root.position.copy(st.pos);
    root.rotation.order = 'YXZ';
    root.rotation.set(st.pitch, st.yaw, -st.lean);
    this.bike.wheelF.rotation.x += st.omegaF * dt;
    this.bike.wheelR.rotation.x += st.omegaR * dt;
    this.bike.fork.position.y = 0.78 - st.fork * 0.55;
    this.bike.wheelF.position.y = 0.35 - st.fork * 0.85;
    this.bike.wheelR.position.y = 0.35 - st.rear * 0.7;
    this.bike.rearShock.scale.y = 1 - st.rear * 1.4;
    this.bike.crank.rotation.x += st.omegaR * dt * 0.7;
    const crouch = (this.input.brake > 0 ? 0.12 : 0) + (st.airTime > 0.1 ? 0.1 : 0) + st.hopCharge * 0.14;
    this.bike.torso.rotation.x = 0.35 + crouch;
    this.bike.rider.position.y = 0.9 - crouch * 0.4;
    // Runtime sockets: hands to grips, feet to pedals, every frame.
    applyRiderPose(this.bike, crouch);
    if (st.crashed) {
      root.rotation.z += dt * 1.8;
    }
  }

  private followSun(): void {
    const p = this.sim.state.pos;
    this.sun.position.set(p.x + 36, p.y + 58, p.z + 18);
    this.sun.target.position.copy(p);
    this.sun.target.updateMatrixWorld();
  }

  private beginRun(): void {
    this.audio.unlock();
    this.audio.ui(this.rng);
    const start = this.track.sampleAt(this.respawnS > 0.02 && (this.mode === 'fail' || this.mode === 'crash') ? this.respawnS : 0.012);
    const yaw = Math.atan2(start.tangent.x, start.tangent.z);
    this.sim.reset(start.position.clone().add(new THREE.Vector3(0, 0.72, 0)), yaw);
    this.sim.state.vel.copy(start.tangent).multiplyScalar(4.5);
    this.bike.rider.rotation.set(0, 0, 0);
    this.bike.rider.visible = true;
    this.ragdoll.hide();
    this.crashTimer = 0;
    this.elapsed = this.respawnS > 0.02 && (this.mode === 'fail' || this.mode === 'crash') ? this.elapsed : 0;
    if (this.mode !== 'fail') {
      this.crashes = 0;
      this.lastSector = 0;
      this.respawnS = 0;
    }
    this.setMode('ride');
    this.cameraRig.snap(this.sim.state);
    this.hud.banner('DROP IN');
  }

  private onCrash(): void {
    this.crashes += 1;
    this.hitstopRemaining = 0.08;
    this.timeScale = 0.08;
    this.audio.setDuck(0.35);
    this.shake.add(0.55);
    this.audio.impact(0.9, this.rng);
    this.vfx.burst(this.sim.state.pos, this.rng);
    this.flash();
    // Live procedural pose → capsule ragdoll with the bike's momentum.
    const st = this.sim.state;
    this.ragdoll.spawn(
      st.pos.clone().add(new THREE.Vector3(0, 0.55, 0)),
      st.vel.clone(),
      st.yaw,
      this.rng,
    );
    this.bike.rider.visible = false;
    this.crashTimer = 1.25;
    this.setMode('crash');
  }

  private onFinish(): void {
    this.audio.checkpoint(this.rng);
    this.hud.setWin(this.elapsed, this.crashes);
    this.setMode('win');
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.hud.setMode(mode === 'ride' ? 'ride' : mode);
  }

  private flash(): void {
    const el = this.el('#flash');
    el.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 110, easing: 'ease-out' });
  }

  private applyQuality(tier: QualityTier): void {
    this.quality = tier;
    const q = qualitySettings(tier);
    this.tuning.maxDpr = q.maxDpr;
    this.sun.castShadow = q.shadows;
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (q.post) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      // Light motion blur by camera velocity — no fat bloom, grit survives.
      this.afterimage = new AfterimagePass(0.94);
      this.composer.addPass(this.afterimage);
      // Chromatic aberration only on impacts/speed, then vignette.
      this.chromatic = new ShaderPass(RGBShiftShader);
      this.chromatic.uniforms['amount'].value = 0.0012;
      this.chromatic.uniforms['angle'].value = 0;
      this.composer.addPass(this.chromatic);
      this.composer.addPass(new ShaderPass(VignetteShader));
      this.composer.addPass(new OutputPass());
    } else {
      this.composer = null;
      this.afterimage = null;
      this.chromatic = null;
    }
    resizeRenderer(this.renderer, this.camera, q.maxDpr);
  }

  private bindUi(): void {
    this.el('#ride-button').addEventListener('click', () => {
      this.skill = (this.el('#skill-select') as HTMLSelectElement).value as SkillMode;
      this.applyQuality((this.el('#quality-select') as HTMLSelectElement).value as QualityTier);
      this.respawnS = 0;
      this.beginRun();
    });
    this.el('#how-button').addEventListener('click', () => {
      this.el('#how-copy').classList.toggle('hidden');
    });
    this.el('#pause-button').addEventListener('click', () => {
      if (this.mode === 'ride') this.setMode('pause');
    });
    this.el('#resume-button').addEventListener('click', () => this.setMode('ride'));
    this.el('#restart-pause').addEventListener('click', () => {
      this.respawnS = 0;
      this.beginRun();
    });
    this.el('#retry-button').addEventListener('click', () => this.beginRun());
    this.el('#again-button').addEventListener('click', () => {
      this.respawnS = 0;
      this.beginRun();
    });
    this.el('#menu-fail').addEventListener('click', () => this.setMode('menu'));
    this.el('#menu-win').addEventListener('click', () => this.setMode('menu'));

    if (new URLSearchParams(location.search).has('debug')) {
      this.debug = new GUI({ title: 'FALL LINE' });
      this.debug.add(this.tuning, 'exposure', 0.6, 1.6).onChange((v: number) => {
        this.renderer.toneMappingExposure = v;
      });
    }
  }

  private installHooks(): void {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: (value: number) => {
        this.rng = createSeededRandom(value);
      },
      setState: (name: string) => {
        if (name === 'active-play' || name === 'menu') {
          this.respawnS = 0;
          this.beginRun();
        } else if (name === 'complete' || name === 'finished') {
          this.beginRun();
          this.sim.state.s = 0.99;
          this.onFinish();
        } else if (name === 'crashed' || name === 'fail') {
          this.beginRun();
          this.sim.crash('low-side');
          this.onCrash();
        } else {
          console.warn(`Unknown test state: ${name}`);
        }
      },
      setPausedForScreenshot: (paused: boolean) => {
        this.pausedForScreenshot = paused;
      },
      setReducedMotion: (enabled: boolean) => {
        this.reducedMotion = enabled;
      },
      hideDebugUi: (hidden: boolean) => {
        if (this.debug) this.debug.domElement.style.display = hidden ? 'none' : '';
      },
    };
  }

  private publish(): void {
    const info = this.renderer.info;
    const st = this.sim.state;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      elapsed: this.elapsed,
      score: Math.floor(st.s * 1000),
      targetScore: 1000,
      complete: this.mode === 'win',
      mode: this.mode,
      skill: this.skill,
      quality: this.quality,
      surface: st.surface,
      lean: st.lean,
      slip: st.slip,
      fork: st.fork,
      sector: this.lastSector,
      physics: {
        engine: 'custom-raycast-heightfield',
        timestep: FIXED_DT,
        bodies: this.ragdoll.active ? 12 : 1,
        colliders: this.ragdoll.active ? 13 : 2,
        ccd: false,
        sensors: 4,
        ragdoll: this.ragdoll.active,
      },
      player: {
        position: { x: st.pos.x, y: st.pos.y, z: st.pos.z },
        speed: st.vel.length(),
        distance: st.s * this.track.length,
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      canvas: {
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        width: this.canvas.width,
        height: this.canvas.height,
        dpr: Math.min(window.devicePixelRatio || 1, this.tuning.maxDpr),
      },
    };
  }

  private el(sel: string): HTMLElement {
    const n = document.querySelector<HTMLElement>(sel);
    if (!n) throw new Error(`Missing ${sel}`);
    return n;
  }
}
