import * as THREE from 'three';

type PointerState = {
  active: boolean;
  id: number | null;
  centerX: number;
  centerY: number;
  radius: number;
};

export class InputController {
  steer = 0;
  brake = 0;
  hopHeld = false;
  hopReleased = false;
  startPressed = false;
  pausePressed = false;
  restartPressed = false;

  private readonly keys = new Set<string>();
  private readonly pointer = new THREE.Vector2();
  private hopWasHeld = false;
  private brakeTouch = false;
  private hopTouch = false;

  private readonly pointerState: PointerState = {
    active: false,
    id: null,
    centerX: 0,
    centerY: 0,
    radius: 1,
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
    if (event.code === 'Escape') this.pausePressed = true;
    if (event.code === 'KeyR') this.restartPressed = true;
    if (event.code === 'Enter' || event.code === 'KeyE') this.startPressed = true;
    if (event.code === 'Space') event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly onStickDown = (event: PointerEvent) => {
    event.preventDefault();
    const rect = this.stick.getBoundingClientRect();
    this.pointerState.active = true;
    this.pointerState.id = event.pointerId;
    this.pointerState.centerX = rect.left + rect.width / 2;
    this.pointerState.centerY = rect.top + rect.height / 2;
    this.pointerState.radius = rect.width * 0.42;
    try {
      this.stick.setPointerCapture(event.pointerId);
    } catch {
      // synthetic events
    }
    this.updatePointer(event.clientX, event.clientY);
  };

  private readonly onStickMove = (event: PointerEvent) => {
    if (!this.pointerState.active || event.pointerId !== this.pointerState.id) return;
    event.preventDefault();
    this.updatePointer(event.clientX, event.clientY);
  };

  private readonly onStickUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerState.id) return;
    event.preventDefault();
    this.pointerState.active = false;
    this.pointerState.id = null;
    this.pointer.set(0, 0);
    this.updateKnob();
  };

  constructor(
    private readonly stick: HTMLElement,
    private readonly knob: HTMLElement,
    private readonly brakeButton: HTMLElement,
    private readonly hopButton: HTMLElement,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.stick.addEventListener('pointerdown', this.onStickDown);
    this.stick.addEventListener('pointermove', this.onStickMove);
    this.stick.addEventListener('pointerup', this.onStickUp);
    this.stick.addEventListener('pointercancel', this.onStickUp);
    this.brakeButton.addEventListener('pointerdown', this.onBrakeDown);
    this.brakeButton.addEventListener('pointerup', this.onBrakeUp);
    this.brakeButton.addEventListener('pointercancel', this.onBrakeUp);
    this.brakeButton.addEventListener('pointerleave', this.onBrakeUp);
    this.hopButton.addEventListener('pointerdown', this.onHopDown);
    this.hopButton.addEventListener('pointerup', this.onHopUp);
    this.hopButton.addEventListener('pointercancel', this.onHopUp);
    this.hopButton.addEventListener('pointerleave', this.onHopUp);
  }

  poll(): void {
    let steer = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer += 1;
    steer += this.pointer.x;
    this.steer = THREE.MathUtils.clamp(steer, -1, 1);

    const keyBrake = this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('ControlLeft');
    this.brake = keyBrake || this.brakeTouch ? 1 : 0;

    const hop = this.keys.has('Space') || this.hopTouch;
    this.hopReleased = this.hopWasHeld && !hop;
    this.hopHeld = hop;
    this.hopWasHeld = hop;
  }

  consumeUi(): { start: boolean; pause: boolean; restart: boolean } {
    const flags = {
      start: this.startPressed,
      pause: this.pausePressed,
      restart: this.restartPressed,
    };
    this.startPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
    return flags;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.stick.removeEventListener('pointerdown', this.onStickDown);
    this.stick.removeEventListener('pointermove', this.onStickMove);
    this.stick.removeEventListener('pointerup', this.onStickUp);
    this.stick.removeEventListener('pointercancel', this.onStickUp);
    this.brakeButton.removeEventListener('pointerdown', this.onBrakeDown);
    this.brakeButton.removeEventListener('pointerup', this.onBrakeUp);
    this.brakeButton.removeEventListener('pointercancel', this.onBrakeUp);
    this.brakeButton.removeEventListener('pointerleave', this.onBrakeUp);
    this.hopButton.removeEventListener('pointerdown', this.onHopDown);
    this.hopButton.removeEventListener('pointerup', this.onHopUp);
    this.hopButton.removeEventListener('pointercancel', this.onHopUp);
    this.hopButton.removeEventListener('pointerleave', this.onHopUp);
  }

  private readonly onBrakeDown = (event: PointerEvent) => {
    event.preventDefault();
    this.brakeTouch = true;
  };

  private readonly onBrakeUp = (event: PointerEvent) => {
    event.preventDefault();
    this.brakeTouch = false;
  };

  private readonly onHopDown = (event: PointerEvent) => {
    event.preventDefault();
    this.hopTouch = true;
  };

  private readonly onHopUp = (event: PointerEvent) => {
    event.preventDefault();
    this.hopTouch = false;
  };

  private updatePointer(clientX: number, clientY: number): void {
    const dx = clientX - this.pointerState.centerX;
    const dy = clientY - this.pointerState.centerY;
    this.pointer.set(dx / this.pointerState.radius, dy / this.pointerState.radius);
    if (this.pointer.lengthSq() > 1) this.pointer.normalize();
    this.updateKnob();
  }

  private updateKnob(): void {
    const distance = 38;
    this.knob.style.transform = `translate(calc(-50% + ${this.pointer.x * distance}px), calc(-50% + ${this.pointer.y * distance}px))`;
  }
}
