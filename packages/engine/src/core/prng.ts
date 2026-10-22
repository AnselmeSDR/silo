/** xoshiro128** generator with a serializable state (4 x uint32). */
export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  int(max: number): number;
  getState(): PrngState;
}

export type PrngState = readonly [number, number, number, number];

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

const splitmix32 = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
};

/** FNV-1a hash of a stable system name. */
const hashName = (name: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
};

export const createPrngFromState = (initial: PrngState): Prng => {
  let [s0, s1, s2, s3] = initial;
  const nextU32 = (): number => {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  };
  return {
    next: () => nextU32() / 4294967296,
    int: (max) => Math.floor((nextU32() / 4294967296) * max),
    getState: () => [s0, s1, s2, s3],
  };
};

/** Master seed is a 64-bit integer; each system name derives its own stream. */
export const createStream = (seed: bigint | number, name: string): Prng => {
  const master = BigInt.asUintN(64, BigInt(seed));
  const low = Number(master & 0xffffffffn);
  const high = Number(master >> 32n);
  const next = splitmix32(((low ^ hashName(name)) >>> 0) ^ Math.imul(high, 0x9e3779b1));
  return createPrngFromState([next(), next(), next(), next()]);
};

/** In-place Fisher-Yates shuffle driven by a system stream. */
export const shuffle = <T>(items: T[], prng: Prng): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = prng.int(i + 1);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
};
