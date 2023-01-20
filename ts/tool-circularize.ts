import {
    angleBetweenVectors,
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
 * the new start and end tangents to the arc-length of the ideal circular arc.
 *
 * The angle between the start and end tangents is calculated using the
 * angleBetween() function from the Vector module, which returns the angle
 * in radians between two vectors. The radius of the osculating circle is
 * calculated by dividing the distance between the start and end points by
 * twice the sine of half the angle between the start and end tangents. This
 * formula is based on the principle that the radius of the osculating circle
 * is equal to the distance between the two points on the curve divided by the
 * sine of the angle between the tangents.
 *
 * The new start and end tangents are then normalized to the arc-length of the
 * ideal circular arc, which is equal to the radius of the osculating circle
 * multiplied by the angle between the start and end tangents. This ensures
 * that the new tangents have the same length as the ideal circular arc and
 * that the new Hermite curve has the same curvature as the osculating circle.
 *
 * @param {HermiteCurve} hermite - The Hermite curve to optimize.
 * @return {HermiteCurve} A new Hermite curve with optimized curvature.
 */
export function circularizeCurve(hermite: HermiteCurve): HermiteCurve {
    const {startPoint, endPoint, startTangent, endTangent} = hermite;
    // Calculate the angle between the start and end tangent.
    const angle = angleBetweenVectors(startTangent, endTangent);
    // Calculate the straight-line length between the control points
    const length = distance(startPoint, endPoint);
    // Calculate the radius geometrically
    const radius = length / (2 * Math.sin(angle / 2));
    // Zero angle implies a straight line, otherwise calculate the circular arc length
    const tangentLength = (angle === 0) ? length : radius * angle;
    // Set the length of the new tangents. Preserve the input direction.
    const newStartTangent = fp32v(normalizeVector(startTangent, tangentLength));
    const newEndTangent = fp32v(normalizeVector(endTangent, tangentLength));
    return {startPoint, endPoint, startTangent: newStartTangent, endTangent: newEndTangent};
}
