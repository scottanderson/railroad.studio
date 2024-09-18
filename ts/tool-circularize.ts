import {angleBetweenVectors, distance, normalizeVector} from './Vector';
import {HermiteCurve, cubicBezierMinRadius, hermiteToBezier} from './util-bezier';
import {fp32v} from './util';

/**
 * Given a Hermite curve, returns a new Hermite curve that represents a circular
 * shape that is tangent to the given curve at its start and end points.
 *
 * This function optimizes the tangent length of a curve, ensuring that it is as
 * circular as possible. It does this by using the idea that a circular curve
 * has equal tangent lengths at all points and using the golden section search
 * method to search for the optimal tangent length.
 *
 * @param {HermiteCurve} hermite - The Hermite curve to be circularized.
 * @return {HermiteCurve} A new Hermite curve that represents a circular shape
 * tangent to the given curve at its start and end points.
 */
export function circularizeCurve(hermite: HermiteCurve): HermiteCurve {
    const {startPoint, endPoint, startTangent, endTangent} = hermite;
    const withTangentLength = (tangentLength: number) => ({
        endPoint,
        endTangent: fp32v(normalizeVector(endTangent, tangentLength)),
        startPoint,
        startTangent: fp32v(normalizeVector(startTangent, tangentLength)),
    });
    // Calculate the angle between the start and end tangent.
    const angle = angleBetweenVectors(startTangent, endTangent);
    // Calculate the straight-line length between the control points
    const length = distance(startPoint, endPoint);
    // Zero angle implies a straight line
    if (angle === 0) return withTangentLength(length);
    // Use the golden section search method to optimize tangent length
    const tangentLength = goldenSection(length / 2, length * 3, (tangentLength: number) => {
        const h = withTangentLength(tangentLength);
        const b = hermiteToBezier(h);
        const r = cubicBezierMinRadius(b);
        // Distance from circle center to start and end points should equal radius
        const d1 = Math.abs(distance(h.startPoint, r.center) - r.radius);
        const d2 = Math.abs(distance(h.endPoint, r.center) - r.radius);
        return d1 + d2;
    });
    // Set the length of the new tangents. Preserve the input direction.
    return withTangentLength(tangentLength);
}

/**
 * Finds the minimum value of a given function within a given range, using
 * golden section search.
 *
 * Golden section search is an optimization algorithm that finds the minimum
 * value of a unimodal function (a function that has a single minimum) within a
 * given range. The algorithm starts by dividing the range into three parts and
 * then repeatedly narrows in on the optimal range, until the desired tolerance
 * is achieved.
 *
 * @param {number} a - The lower bound of the search range.
 * @param {number} b - The upper bound of the search range.
 * @param {function} f - The function to be optimized.
 * @param {number} [tolerance=1e-7] - The desired accuracy of the optimization.
 * The smaller the tolerance, the more accurate the result.
 * @param {number} [maxIterations=50] - The maximum number of iterations to
 * perform before giving up.
 * @return {number} The minimum value of the function within the given range.
 */
export function goldenSection(
    a: number,
    b: number,
    f: (x: number) => number,
    tolerance = 1e-7,
    maxIterations = 50,
): number {
    const phi = (1 + Math.sqrt(5)) / 2; // 1.618033988749895
    const resphi = 2 - phi; // 0.3819660112501051
    let x1 = a + resphi * (b - a);
    let x2 = b - resphi * (b - a);
    let f1 = f(x1);
    let f2 = f(x2);
    for (let iterations = 0; iterations < maxIterations && b - a > tolerance; iterations++) {
        if (f1 < f2) {
            [b, x2, f2] = [x2, x1, f1];
            x1 = a + resphi * (b - a);
            f1 = f(x1);
        } else {
            [a, x1, f1] = [x1, x2, f2];
            x2 = b - resphi * (b - a);
            f2 = f(x2);
        }
        // console.log([iterations, b - a, a, b]);
    }
    return (a + b) / 2;
}
