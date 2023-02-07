/**
 * Linear interpolation between two values.
 *
 * @param {number} a - The starting value.
 * @param {number} b - The ending value.
 * @param {number} alpha - The interpolation factor (0-1).
 * @return {number} The interpolated value.
 */
export const lerp = (a: number, b: number, alpha: number) =>
    a + (b - a) * alpha;

/**
 * Clamps a value between a minimum and maximum range.
 *
 * @param {number} x - The value to be clamped.
 * @param {number} [min=0] - The minimum range.
 * @param {number} [max=1] - The maximum range.
 * @return {number} The clamped value.
 */
export const clamp = (x: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, x));

/**
 * Inverse linear interpolation of a value within a range.
 *
 * @param {number} a - The starting value of the range.
 * @param {number} b - The ending value of the range.
 * @param {number} value - The value to be inverse interpolated.
 * @return {number} The inverse interpolated value.
 */
export const inverseLerp = (a: number, b: number, value: number) =>
    clamp((value - a) / (b - a));

/**
 * Converts a value from one range to another.
 *
 * @param {number} x1 - The starting value of the first range.
 * @param {number} y1 - The ending value of the first range.
 * @param {number} x2 - The starting value of the second range.
 * @param {number} y2 - The ending value of the second range.
 * @param {number} a - The value to be converted.
 * @return {number} The converted value.
 */
export const range = (x1: number, y1: number, x2: number, y2: number, a: number) =>
    lerp(x2, y2, inverseLerp(x1, y1, a));
