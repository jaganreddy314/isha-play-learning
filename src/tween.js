// Tiny frame-driven tween runner. Tweens advance with the render loop, so they pause with it.
const tweens = new Set();

export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  back: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

export function tween(duration, fn, e = ease.inOut, delay = 0) {
  return new Promise((resolve) => tweens.add({ t: -delay, duration: Math.max(duration, 1e-3), fn, e, resolve }));
}

export const wait = (seconds) => tween(seconds, () => {}, ease.linear);

export function updateTweens(dt) {
  for (const tw of tweens) {
    tw.t += dt;
    if (tw.t < 0) continue;
    const k = Math.min(1, tw.t / tw.duration);
    tw.fn(tw.e(k));
    if (k >= 1) {
      tweens.delete(tw);
      tw.resolve();
    }
  }
}
