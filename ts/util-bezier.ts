import {Vector} from './Vector';

export type HermiteCurve = {
    endPoint: Vector;
    endTangent: Vector;
    startPoint: Vector;
    startTangent: Vector;
};

export type BezierCurve = [Vector, Vector, Vector, Vector];

/**
 * Converts a Hermite curve to a Bezier curve.
 *
 * Hermite curves are defined by their start and end points, as well as their
 * start and end tangents. Bezier curves, on the other hand, are defined by four
 * control points. This function takes in a Hermite curve, extracts the start
 * and end points and tangents, and uses them to calculate the four control
 * points of the equivalent Bezier curve.
 *
 * The conversion process involves dividing the start and end tangents by 3,
 * and then adding and subtracting the resulting values from the start and end
 * points, respectively. This results in four control points that can be used
 * to evaluate a Bezier curve that has the same shape as the input Hermite
 * curve.
 *
 * @param {HermiteCurve} spline - The Hermite curve to convert to a Bezier curve.
 * @return {BezierCurve} The equivalent Bezier curve.
 */
export function hermiteToBezier(spline: HermiteCurve): BezierCurve {
    const {x: x0, y: y0, z: z0} = spline.startPoint;
    const {x: x3, y: y3, z: z3} = spline.endPoint;
    // Convert hermite to bezier form
    const x1 = x0 + spline.startTangent.x / 3;
    const y1 = y0 + spline.startTangent.y / 3;
    const z1 = z0 + spline.startTangent.z / 3;
    const x2 = x3 - spline.endTangent.x / 3;
    const y2 = y3 - spline.endTangent.y / 3;
    const z2 = z3 - spline.endTangent.z / 3;
    const b = {x: x1, y: y1, z: z1};
    const c = {x: x2, y: y2, z: z2};
    return [spline.startPoint, b, c, spline.endPoint];
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

/**
 * Computes the tangent vector of a cubic Bezier curve at a given position.
 *
 * @param {number} t - The position along the curve to evaluate.
 * @param {number} a - The first control point of the curve.
 * @param {number} b - The second control point of the curve.
 * @param {number} c - The third control point of the curve.
 * @param {number} d - The fourth control point of the curve.
 * @return {Vector} The tangent vector of the curve at the given position.
 */
function cubicBezierTangent(t: number, a: number, b: number, c: number, d: number) {
    const t2 = t * t;
    const a3 = 3 * a;
    const b3 = 3 * b;
    const c3 = 3 * c;
    const b6 = b3 + b3;
    return (b3 - a3) +
        2 * (a3 - b6 + c3) * t +
        3 * (-a + b3 - c3 + d) * t2;
}

/**
 * Computes the acceleration of a cubic Bezier curve at a given position.
 *
 * @param {number} t - The position along the curve to evaluate.
 * @param {Vector} a - The first control point of the curve.
 * @param {Vector} b - The second control point of the curve.
 * @param {Vector} c - The third control point of the curve.
 * @param {Vector} d - The fourth control point of the curve.
 * @return {Vector} The acceleration of the curve at the given position.
 */
function cubicBezierAcceleration(t: number, a: number, b: number, c: number, d: number) {
    const a3 = 3 * a;
    const b3 = 3 * b;
    const c3 = 3 * c;
    const b6 = b3 + b3;
    return 2 * (a3 - b6 + c3) +
        6 * (-a + b3 - c3 + d) * t;
}

/**
 * A utility function to apply a scalar function to the x, y and z properties of a vector.
 *
 * @param {function} fn - The scalar function to be applied.
 * @param {number} t - The parameter for the scalar function.
 * @param {BezierCurve} bezier - The four vectors to be passed to the scalar function.
 * @return {Vector} The output of the scalar function for the x, y and z properties of the input vectors.
 */
const scalar3 = (
    fn: (t: number, a: number, b: number, c: number, d: number) => number,
    t: number, bezier: BezierCurve): Vector => ({
    x: fn(t, bezier[0].x, bezier[1].x, bezier[2].x, bezier[3].x),
    y: fn(t, bezier[0].y, bezier[1].y, bezier[2].y, bezier[3].y),
    z: fn(t, bezier[0].z, bezier[1].z, bezier[2].z, bezier[3].z)});

/**
 * Computes the 3D vector of a point on a cubic Bezier curve at a given position.
 *
 * @param {number} t - The position along the curve to evaluate.
 * @param {BezierCurve} bezier - The four control points of the curve.
 * @return {Vector} The 3D vector of the point on the curve at the given position.
 */
export const cubicBezier3 = (t: number, bezier: BezierCurve): Vector =>
    scalar3(cubicBezier, t, bezier);

const cubicBezierTangent3 = (t: number, bezier: BezierCurve): Vector =>
    scalar3(cubicBezierTangent, t, bezier);

const cubicBezierAcceleration3 = (t: number, bezier: BezierCurve): Vector =>
    scalar3(cubicBezierAcceleration, t, bezier);

/**
 * Computes the radius of the osculating circle of a cubic Bezier curve at a
 * given position. The osculating circle is a theoretical circle that is tangent
 * to the curve at the given position and whose radius represents the curvature
 * of the curve at that point. A smaller radius indicates a tighter curve while
 * a larger radius indicates a flatter curve. This function takes in the four
 * control points of a cubic Bezier curve a, b, c, d, and a parameter t that
 * determines the position of the point on the curve for which to compute the
 * radius. The position t is a value between 0 and 1, where 0 corresponds to the
 * start of the curve and 1 corresponds to the end.
 *
 * @param {number} t - The position along the curve for which to compute the radius.
 * @param {BezierCurve} bezier - The four control points of the curve.
 * @return {number} The radius of the osculating circle in centimeters.
*/
export function cubicBezierRadius(t: number, bezier: BezierCurve): number {
    const tangent = cubicBezierTangent3(t, bezier);
    const acceleration = cubicBezierAcceleration3(t, bezier);
    const sumSquares = (v: Vector) => v.x * v.x + v.y * v.y + v.z * v.z;
    const numerator = Math.pow(sumSquares(tangent), 1.5);
    const denominator = sumSquares(acceleration);
    return numerator / denominator;
}

/**
 * Computes the minimum radius of the osculating circle of a cubic Bezier curve,
 * given the curve's four control points a, b, c, d. The function will evaluate
 * smallest radius found. The radius of the osculating circle is a measure of
 * the curvature of the curve at a given point. A smaller radius indicates a
 * the radius at multiple positions on the curve between 0 and 1 and return the
 * tighter curvature and a larger radius indicates a more gradual curvature.
 *
 * @param {BezierCurve} curve - The four control points of the curve.
 * @return {number} The minimum radius of the osculating circle of the curve at all positions between 0 and 1.
 */
export function cubicBezierMinRadius(curve: BezierCurve) {
    let minRadius = Infinity;
    let minRadiusT = 0;
    for (let t = 0; t <= 1; t += 0.01) {
        const radius = cubicBezierRadius(t, curve);
        if (radius < minRadius) {
            minRadius = radius;
            minRadiusT = t;
        }
    }
    return {radius: minRadius, t: minRadiusT};
}
