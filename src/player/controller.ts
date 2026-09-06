import * as T from 'three';
import { clamp } from '../core/geometry';
import type { Collider, PlayerState } from '../core/types';
import { createPlayer } from './characters';

/**
 * Walking, looking, jumping, crouching and riding. The camera keeps itself out
 * of walls, and the avatar's gait is driven by the distance actually covered so
 * the feet never skate.
 */
export class PlayerController {
  readonly avatar = createPlayer();
  keys = new Set<string>();
  yaw = Math.PI;
  pitch = 0.16;
  moving = false;
  inVehicle = false;
  firstPerson = false;
  speed = 0;
  /** Ease the camera round to whatever you are pointed at. */
  autoFollow = true;
  /** Set by the game while driving; on foot it is taken from the direction of travel. */
  followYaw: number | null = null;

  private verticalSpeed = 0;
  private height = 0;
  private dragging = false;
  private crouchBlend = 0;
  private lastX = 0;
  private lastZ = 0;
  private lastYaw = Math.PI;
  private headBob = 0;
  private lookIdle = 99;
  private desired = new T.Vector3();
  private target = new T.Vector3();

  constructor(private camera: T.PerspectiveCamera, canvas: HTMLCanvasElement, private colliders: Collider[], private bounds: number) {
    addEventListener('keydown', e => {
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointerdown', e => { this.dragging = true; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointerup', () => { this.dragging = false; });
    canvas.addEventListener('pointermove', e => {
      if (!this.dragging && document.pointerLockElement !== canvas) return;
      if (e.movementX || e.movementY) this.lookIdle = 0;
      this.yaw -= e.movementX * 0.004;
      this.pitch = clamp(this.pitch + e.movementY * 0.003, -0.25, 1.03);
    });
    canvas.addEventListener('dblclick', () => { canvas.requestPointerLock?.()?.catch(() => { }); });
  }

  blocked(x: number, z: number, r = 0.36) {
    return Math.abs(x) > this.bounds || Math.abs(z) > this.bounds
      || this.colliders.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ);
  }

  update(dt: number, p: PlayerState, elapsed: number, enabled: boolean) {
    let forward = 0, strafe = 0;
    if (enabled && !this.inVehicle) {
      forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
      strafe = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    }
    this.moving = !!(forward || strafe);
    const sprint = this.keys.has('ShiftLeft') && p.stamina > 1 && this.moving;
    const crouch = this.keys.has('ControlLeft') && !this.inVehicle;
    this.crouchBlend += ((crouch ? 1 : 0) - this.crouchBlend) * Math.min(1, dt * 11);
    const speed = crouch ? 1.6 : sprint ? 6.8 : 3.4;
    if (sprint) p.stamina = Math.max(0, p.stamina - dt * 6);
    else p.stamina = Math.min(100, p.stamina + dt * 4);

    if (this.moving) {
      const norm = Math.hypot(forward, strafe);
      const dx = (Math.sin(this.yaw) * forward - Math.cos(this.yaw) * strafe) / norm * speed * dt;
      const dz = (Math.cos(this.yaw) * forward + Math.sin(this.yaw) * strafe) / norm * speed * dt;
      if (!this.blocked(p.x + dx, p.z)) p.x += dx;
      if (!this.blocked(p.x, p.z + dz)) p.z += dz;
      if (!this.inVehicle) {
        // Turn the body towards travel rather than snapping to it.
        const facing = Math.atan2(dx, dz);
        const diff = Math.atan2(Math.sin(facing - this.avatar.group.rotation.y), Math.cos(facing - this.avatar.group.rotation.y));
        this.avatar.group.rotation.y += clamp(diff, -dt * 11, dt * 11);
      }
    }

    if (enabled && !this.inVehicle && this.keys.has('Space') && this.height === 0) { this.verticalSpeed = 4.8; this.height = 0.001; }
    this.verticalSpeed -= dt * 13;
    this.height = Math.max(0, this.height + this.verticalSpeed * dt);
    if (this.height === 0) this.verticalSpeed = 0;

    const previousX = this.lastX; const previousZ = this.lastZ;
    const travelled = Math.hypot(p.x - this.lastX, p.z - this.lastZ);
    this.lastX = p.x; this.lastZ = p.z;
    const instant = Math.min(travelled / Math.max(dt, 0.001), 10);
    this.speed += (instant - this.speed) * Math.min(1, dt * 14);
    const turnRate = clamp((this.yaw - this.lastYaw) / Math.max(dt, 0.001), -3, 3);
    this.lastYaw = this.yaw;

    // Chase camera: swing round behind whatever direction you are actually
    // heading, so a turn never leaves you driving sideways across the screen.
    // Touching the mouse hands control back for a moment, then it settles again.
    this.lookIdle += dt;
    const grabbed = this.dragging;
    let follow = this.followYaw;
    if (follow === null && !this.inVehicle && this.moving && travelled > 0.0005) {
      follow = Math.atan2(p.x - previousX, p.z - previousZ);
    }
    if (this.autoFollow && follow !== null && !grabbed && this.lookIdle > (this.inVehicle ? 0.6 : 1.1)) {
      const settle = Math.min(1, (this.lookIdle - (this.inVehicle ? 0.6 : 1.1)) * 1.6);
      const rate = (this.inVehicle ? 3.6 : 1.9) * settle * Math.min(1, this.speed / (this.inVehicle ? 3 : 1.6));
      const diff = Math.atan2(Math.sin(follow - this.yaw), Math.cos(follow - this.yaw));
      this.yaw += clamp(diff, -dt * rate, dt * rate);
    }

    this.avatar.group.position.set(p.x, this.height + (this.inVehicle ? 0.42 : 0), p.z);
    if (this.inVehicle) this.avatar.group.rotation.y = this.yaw;
    this.avatar.group.visible = !this.firstPerson;
    this.avatar.animate(dt, this.inVehicle ? 0 : this.speed, this.inVehicle ? 'drive' : 'walk', elapsed, turnRate * 0.06, this.crouchBlend);

    this.headBob += this.speed * dt * 2.4;
    const bob = this.firstPerson ? Math.sin(this.headBob * 2) * 0.022 * Math.min(1, this.speed / 3) : 0;
    const range = this.firstPerson ? 0.02 : this.inVehicle ? 8 : 5.8;
    const eye = 1.62 - this.crouchBlend * 0.42;
    const elevation = this.firstPerson ? eye : 2.55 + Math.sin(this.pitch) * range - this.crouchBlend * 0.3;
    this.target.set(p.x, this.inVehicle ? 1.4 : 1.25 - this.crouchBlend * 0.3, p.z);
    this.desired.set(
      p.x - Math.sin(this.yaw) * range * Math.cos(this.pitch),
      elevation + this.height + bob,
      p.z - Math.cos(this.yaw) * range * Math.cos(this.pitch),
    );

    if (!this.firstPerson && !this.inVehicle) {
      for (let k = 1; k >= 0.1; k -= 0.1) {
        const x = p.x + (this.desired.x - p.x) * k;
        const z = p.z + (this.desired.z - p.z) * k;
        if (!this.blocked(x, z, 0.12)) { this.desired.x = x; this.desired.z = z; break; }
      }
    }

    this.camera.position.lerp(this.desired, 1 - Math.exp(-dt * (this.firstPerson ? 22 : 9)));
    if (this.firstPerson) this.target.set(p.x + Math.sin(this.yaw) * 10, eye + bob - Math.sin(this.pitch) * 10, p.z + Math.cos(this.yaw) * 10);
    this.camera.lookAt(this.target);
  }

  reset(p: PlayerState) {
    this.camera.position.set(p.x + 1, 3.7, p.z + 6);
    this.lastX = p.x; this.lastZ = p.z;
    this.yaw = Math.PI; this.pitch = 0.16; this.lastYaw = this.yaw;
  }
}
