/** Keep the simulation at a fixed rate without letting a slow frame create a backlog. */
export function createFixedStepClock(step, maxSteps = 5) {
  let remainder = 0

  return {
    reset() { remainder = 0 },
    get alpha() { return Math.max(0, Math.min(1, remainder / step)) },
    advance(elapsed, tick) {
      remainder += Math.min(0.25, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0))
      let steps = 0
      while (remainder + 1e-10 >= step && steps < maxSteps) {
        tick()
        remainder = Math.max(0, remainder - step)
        steps++
      }
      // Discard excess time after a stall; catching it up would make later
      // frames progressively more expensive and delay input response.
      if (remainder >= step) remainder %= step
      return steps
    },
  }
}
