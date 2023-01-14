import {SplineTrack} from './Railroad';
import {Vector} from './Gvas';

export function hermiteToBezier(spline: SplineTrack) {
    const x0 = spline.startPoint.x;
    const y0 = spline.startPoint.y;
    const x3 = spline.endPoint.x;
    const y3 = spline.endPoint.y;
    // Convert hermite to bezier form
    const x1 = x0 + spline.startTangent.x / 3;
    const y1 = y0 + spline.startTangent.y / 3;
    const x2 = x3 - spline.endTangent.x / 3;
    const y2 = y3 - spline.endTangent.y / 3;
    return {x0, y0, x1, y1, x2, y2, x3, y3};
}

export function hermiteToBezierZ(spline: SplineTrack) {
    const z0 = spline.startPoint.z;
    const z3 = spline.endPoint.z;
    const z1 = z0 + spline.startTangent.z / 3;
    const z2 = z3 - spline.endTangent.z / 3;
    return {z0, z1, z2, z3};
}

/**
 * Evaluates a cubic Bezier curve at a given position.
 *
 * A cubic Bezier curve is a smooth curve defined by four control points. The
 * curve starts at the first control point and ends at the fourth control point,
 * and the shape of the curve is influenced by the positions of the other two
 * control points, which determine the tangents at the start and end points and
 * the overall curvature of the curve. The curve can be used to approximate a
 * variety of shapes, such as straight lines, arcs, and loops.
 *
 * This function computes a point on a cubic Bezier curve, given the curve's
 * four control points `a`, `b`, `c`, `d`, and a parameter `t` that determines
 * the position of the point on the curve. The position `t` is a value between 0
 * and 1, where 0 corresponds to the start of the curve and 1 corresponds to the
 * end. As t ranges from 0 to 1, the point on the curve moves from the start
 * point to the end point.
 *
 * The function uses the formula for a cubic Bezier curve in Bernstein form,
 * which is commonly used to evaluate Bezier curves because it allows for
 * efficient computation and good numerical stability.
 *
 * @param {number} t - The position along the curve to evaluate.
 * @param {number} a - The first control point of the curve.
 * @param {number} b - The second control point of the curve.
 * @param {number} c - The third control point of the curve.
 * @param {number} d - The fourth control point of the curve.
 * @return {number} The value of the curve at the given position.
 */
export function cubicBezier(t: number, a: number, b: number, c: number, d: number) {
    const t2 = t * t;
    const t3 = t2 * t;
    const a3 = 3 * a;
    const b3 = 3 * b;
    const c3 = 3 * c;
    const b6 = b3 + b3;
    return a +
        (b3 - a3) * t +
        (a3 - b6 + c3) * t2 +
        (-a + b3 - c3 + d) * t3;
}

function cubicBezierDerivative(t: number, a: number, b: number, c: number, d: number) {
    const t2 = t * t;
    const a3 = 3 * a;
    const b3 = 3 * b;
    const c3 = 3 * c;
    const b6 = b3 + b3;
    return (b3 - a3) +
        2 * (a3 - b6 + c3) * t +
        3 * (-a + b3 - c3 + d) * t2;
}

function cubicBezierSecondDerivative(t: number, a: number, b: number, c: number, d: number) {
    const a3 = 3 * a;
    const b3 = 3 * b;
    const c3 = 3 * c;
    const b6 = b3 + b3;
    return 2 * (a3 - b6 + c3) +
        6 * (-a + b3 - c3 + d) * t;
}

const call3d = (
    fn: (t: number, a: number, b: number, c: number, d: number) => number,
    t: number, a: Vector, b: Vector, c: Vector, d: Vector): Vector => ({
    x: fn(t, a.x, b.x, c.x, d.x),
    y: fn(t, a.y, b.y, c.y, d.y),
    z: fn(t, a.z, b.z, c.z, d.z)});

export const cubicBezier3 = (t: number, a: Vector, b: Vector, c: Vector, d: Vector): Vector =>
    call3d(cubicBezier, t, a, b, c, d);

const cubicBezierDerivative3 = (t: number, a: Vector, b: Vector, c: Vector, d: Vector): Vector =>
    call3d(cubicBezierDerivative, t, a, b, c, d);

const cubicBezierSecondDerivative3 = (t: number, a: Vector, b: Vector, c: Vector, d: Vector): Vector =>
    call3d(cubicBezierSecondDerivative, t, a, b, c, d);

export function cubicBezierRadius(t: number, a: Vector, b: Vector, c: Vector, d: Vector): number {
    const tangent = cubicBezierDerivative3(t, a, b, c, d);
    const derivativeTangent = cubicBezierSecondDerivative3(t, a, b, c, d);
    const sumSquares = (v: Vector) => v.x * v.x + v.y * v.y + v.z * v.z;
    const numerator = Math.pow(sumSquares(tangent), 1.5);
    const denominator = sumSquares(derivativeTangent);
    return numerator / denominator;
}

export function cubicBezierMinRadius(a: Vector, b: Vector, c: Vector, d: Vector) {
    let minRadius = Infinity;
    let minRadiusT = 0;
    for (let t = 0; t <= 1; t += 0.01) {
        const radius = cubicBezierRadius(t, a, b, c, d);
        if (radius < minRadius) {
            minRadius = radius;
            minRadiusT = t;
        }
    }
    return {radius: minRadius, t: minRadiusT};
}
