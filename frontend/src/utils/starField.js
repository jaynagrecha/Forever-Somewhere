/** Deterministic star positions — stable across renders (no Math.random in component body). */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildStarField(count = 100, seed = 0x7f6576) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, id) => ({
    id,
    top: `${rand() * 100}%`,
    left: `${rand() * 100}%`,
    size: rand() * 2.5 + 1,
    opacity: rand() * 0.6 + 0.2,
    duration: 2 + rand() * 4,
  }));
}

export const BACKGROUND_STARS = buildStarField();
