// THROWAWAY prototype (SIL-12): do not reuse as is. Measures the cost of
// updating 2 000 entities per step, not a design for the real engine.

export const entityCount = 2000;
const levels = 12;
const levelHeight = 4.2;
const stepSeconds = 60;
const walkSpeed = 1.3;

// xoshiro128** : compact, serializable, no Math.random (D-02).
export class Prng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;
  constructor(seed: number) {
    let z = seed >>> 0;
    const mix = (): number => {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t ^= t >>> 15;
      t = Math.imul(t, 0x735a2d97);
      return (t ^ (t >>> 15)) >>> 0;
    };
    this.s0 = mix();
    this.s1 = mix();
    this.s2 = mix();
    this.s3 = mix();
  }
  next(): number {
    const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;
    const result = Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);
    return result / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

// Structure of arrays: positions are what the renderer reads.
export class World {
  readonly x = new Float32Array(entityCount);
  readonly y = new Float32Array(entityCount);
  readonly z = new Float32Array(entityCount);
  readonly heading = new Float32Array(entityCount);
  readonly job = new Uint8Array(entityCount);
  private tx = new Float32Array(entityCount);
  private ty = new Float32Array(entityCount);
  private tz = new Float32Array(entityCount);
  private hunger = new Float32Array(entityCount);
  private thirst = new Float32Array(entityCount);
  private fatigue = new Float32Array(entityCount);
  private mood = new Float32Array(entityCount);
  private friend = new Int32Array(entityCount);
  private order = new Uint32Array(entityCount);
  private rngMove: Prng;
  private rngNeeds: Prng;
  private rngSocial: Prng;
  stepNumber = 0;

  constructor(seed: number) {
    this.rngMove = new Prng(seed ^ 0x1111);
    this.rngNeeds = new Prng(seed ^ 0x2222);
    this.rngSocial = new Prng(seed ^ 0x3333);
    const init = new Prng(seed);
    for (let i = 0; i < entityCount; i++) {
      this.order[i] = i;
      this.place(i, init, true);
      this.tx[i] = this.x[i]!;
      this.ty[i] = this.y[i]!;
      this.tz[i] = this.z[i]!;
      this.job[i] = init.int(8);
      this.hunger[i] = init.next();
      this.thirst[i] = init.next();
      this.fatigue[i] = init.next();
      this.friend[i] = init.int(entityCount);
    }
  }

  private place(i: number, rng: Prng, current: boolean): void {
    const level = rng.int(levels);
    const angle = rng.next() * Math.PI * 2;
    const radius = 12 + rng.next() * 6.5;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const py = level * levelHeight;
    if (current) {
      this.x[i] = px;
      this.y[i] = py;
      this.z[i] = pz;
    } else {
      this.tx[i] = px;
      this.ty[i] = py;
      this.tz[i] = pz;
    }
  }

  // Fixed system order: needs, social, movement. Each shuffles its own order.
  step(): void {
    this.shuffle(this.rngNeeds);
    this.needs();
    this.shuffle(this.rngSocial);
    this.social();
    this.shuffle(this.rngMove);
    this.move();
    this.stepNumber++;
  }

  private shuffle(rng: Prng): void {
    const o = this.order;
    for (let i = entityCount - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      const t = o[i]!;
      o[i] = o[j]!;
      o[j] = t;
    }
  }

  private needs(): void {
    for (let k = 0; k < entityCount; k++) {
      const i = this.order[k]!;
      this.hunger[i]! += 0.0007 + this.rngNeeds.next() * 0.0002;
      this.thirst[i]! += 0.001 + this.rngNeeds.next() * 0.0002;
      this.fatigue[i]! += 0.0006;
      if (this.hunger[i]! > 1) this.hunger[i] = 0;
      if (this.thirst[i]! > 1) this.thirst[i] = 0;
      if (this.fatigue[i]! > 1) this.fatigue[i] = 0;
      const worst = Math.max(this.hunger[i]!, this.thirst[i]!, this.fatigue[i]!);
      this.mood[i] = 1 - worst;
    }
  }

  private social(): void {
    for (let k = 0; k < entityCount; k++) {
      const i = this.order[k]!;
      const j = this.friend[i]!;
      const dx = this.x[i]! - this.x[j]!;
      const dy = this.y[i]! - this.y[j]!;
      const dz = this.z[i]! - this.z[j]!;
      const near = dx * dx + dy * dy + dz * dz < 400;
      const delta = near ? 0.01 : -0.002;
      this.mood[i] = Math.min(1, Math.max(0, this.mood[i]! + delta));
      if (this.rngSocial.next() < 0.02) this.friend[i] = this.rngSocial.int(entityCount);
    }
  }

  private move(): void {
    const reach = walkSpeed * stepSeconds;
    for (let k = 0; k < entityCount; k++) {
      const i = this.order[k]!;
      const dx = this.tx[i]! - this.x[i]!;
      const dy = this.ty[i]! - this.y[i]!;
      const dz = this.tz[i]! - this.z[i]!;
      const dist = Math.hypot(dx, dy, dz);
      if (dist <= reach) {
        this.x[i] = this.tx[i]!;
        this.y[i] = this.ty[i]!;
        this.z[i] = this.tz[i]!;
        if (this.rngMove.next() < 0.3) this.place(i, this.rngMove, false);
        continue;
      }
      const f = reach / dist;
      this.x[i]! += dx * f;
      this.y[i]! += dy * f;
      this.z[i]! += dz * f;
      this.heading[i] = Math.atan2(dx, dz);
    }
  }
}

export interface Stats {
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
  return {
    samples: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted[sorted.length - 1]!,
  };
}
