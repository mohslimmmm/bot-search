// ============================================================
// Src/Utils/Delay.js — Human-like timing helpers
// ============================================================

/**
 * Returns a random integer between range.min and range.max (inclusive).
 * @param {{ min: number, max: number }} range
 */
export function randomDelay(range) {
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Async sleep for a given number of milliseconds.
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep for a random duration within a range.
 * Convenience wrapper: randomSleep(Config.delays.afterSearch)
 * @param {{ min: number, max: number }} range
 */
export async function randomSleep(range) {
  await sleep(randomDelay(range));
}
