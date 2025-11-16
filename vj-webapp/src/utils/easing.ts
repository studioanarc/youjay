/**
 * Easing Functions
 *
 * Provides various easing functions for smooth animations.
 * All functions take a normalized value (0-1) and return an eased value (0-1).
 */

export type EasingFn = (t: number) => number;

/**
 * Linear easing - no acceleration
 */
export const linear: EasingFn = (t: number): number => t;

/**
 * Ease In - accelerating from zero velocity
 */
export const easeIn: EasingFn = (t: number): number => t * t;

/**
 * Ease Out - decelerating to zero velocity
 */
export const easeOut: EasingFn = (t: number): number => t * (2 - t);

/**
 * Ease In-Out - acceleration until halfway, then deceleration
 */
export const easeInOut: EasingFn = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

/**
 * Ease In Cubic - stronger acceleration
 */
export const easeInCubic: EasingFn = (t: number): number => t * t * t;

/**
 * Ease Out Cubic - stronger deceleration
 */
export const easeOutCubic: EasingFn = (t: number): number => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

/**
 * Ease In-Out Cubic - stronger acceleration/deceleration
 */
export const easeInOutCubic: EasingFn = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
};

/**
 * Ease In Quad
 */
export const easeInQuad: EasingFn = (t: number): number => t * t;

/**
 * Ease Out Quad
 */
export const easeOutQuad: EasingFn = (t: number): number => t * (2 - t);

/**
 * Ease In-Out Quad
 */
export const easeInOutQuad: EasingFn = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

/**
 * Ease In Quart
 */
export const easeInQuart: EasingFn = (t: number): number => t * t * t * t;

/**
 * Ease Out Quart
 */
export const easeOutQuart: EasingFn = (t: number): number => {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
};

/**
 * Ease In-Out Quart
 */
export const easeInOutQuart: EasingFn = (t: number): number => {
  const t1 = t - 1;
  return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1;
};

/**
 * Ease In Expo
 */
export const easeInExpo: EasingFn = (t: number): number => {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
};

/**
 * Ease Out Expo
 */
export const easeOutExpo: EasingFn = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Ease In-Out Expo
 */
export const easeInOutExpo: EasingFn = (t: number): number => {
  if (t === 0 || t === 1) return t;

  if (t < 0.5) {
    return 0.5 * Math.pow(2, 20 * t - 10);
  }

  return 0.5 * (2 - Math.pow(2, -20 * t + 10));
};

/**
 * Ease In Circ
 */
export const easeInCirc: EasingFn = (t: number): number => {
  return 1 - Math.sqrt(1 - t * t);
};

/**
 * Ease Out Circ
 */
export const easeOutCirc: EasingFn = (t: number): number => {
  const t1 = t - 1;
  return Math.sqrt(1 - t1 * t1);
};

/**
 * Ease In-Out Circ
 */
export const easeInOutCirc: EasingFn = (t: number): number => {
  if (t < 0.5) {
    return 0.5 * (1 - Math.sqrt(1 - 4 * t * t));
  }

  const t1 = 2 * t - 2;
  return 0.5 * (Math.sqrt(1 - t1 * t1) + 1);
};

/**
 * Cubic Bezier - custom bezier curve
 */
export const cubicBezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): EasingFn => {
  // Simplified cubic bezier implementation
  // For production, consider using a library like bezier-easing
  return (t: number): number => {
    // Newton-Raphson iteration
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
    const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    // Solve for t given x
    let t2 = t;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - t;
      if (Math.abs(x2) < 1e-6) break;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }

    return sampleCurveY(t2);
  };
};

/**
 * Get easing function by name
 */
export const getEasingFunction = (name: string): EasingFn => {
  const easings: Record<string, EasingFn> = {
    linear,
    'ease-in': easeIn,
    'ease-out': easeOut,
    'ease-in-out': easeInOut,
    'ease-in-cubic': easeInCubic,
    'ease-out-cubic': easeOutCubic,
    'ease-in-out-cubic': easeInOutCubic,
    'ease-in-quad': easeInQuad,
    'ease-out-quad': easeOutQuad,
    'ease-in-out-quad': easeInOutQuad,
    'ease-in-quart': easeInQuart,
    'ease-out-quart': easeOutQuart,
    'ease-in-out-quart': easeInOutQuart,
    'ease-in-expo': easeInExpo,
    'ease-out-expo': easeOutExpo,
    'ease-in-out-expo': easeInOutExpo,
    'ease-in-circ': easeInCirc,
    'ease-out-circ': easeOutCirc,
    'ease-in-out-circ': easeInOutCirc,
    'cubic-bezier': cubicBezier(0.42, 0, 0.58, 1), // Default cubic-bezier
  };

  return easings[name] || linear;
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Map value from one range to another
 */
export const map = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};
