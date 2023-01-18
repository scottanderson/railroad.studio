import {
    angleBetween,
    distance,
    normalizeVector,
} from './Vector';
import {HermiteCurve} from './util-bezier';
import {fp32v} from './util';

/**
 * Takes a Hermite curve and optimizes the curvature by adjusting the start and
 * end tangents to match the radius of the osculating circle at that point. The
 * function calculates the angle between the start and end tangents, uses it to
 * calculate the radius of the osculating circle, and normalizes the length of
 * the new start and end tangents to the arc-length of the ideal circuar arc.
 *
 * @param {HermiteCurve} hermite - The Hermite curve to optimize.
 * @return {HermiteCurve} A new Hermite curve with optimized curvature.
 */
export function circularizeCurve(hermite: HermiteCurve): HermiteCurve {
    const {startPoint, endPoint, startTangent, endTangent} = hermite;
    const angle = angleBetween(startTangent, endTangent);
    const radius = distance(startPoint, endPoint) / (2 * Math.sin(angle / 2));
    const tangentLength = (radius === Infinity) ? distance(startPoint, endPoint) : radius * angle;
    const newStartTangent = fp32v(normalizeVector(startTangent, tangentLength));
    const newEndTangent = fp32v(normalizeVector(endTangent, tangentLength));
    return {startPoint, endPoint, startTangent: newStartTangent, endTangent: newEndTangent};
}
