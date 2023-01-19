/**
 * A Vector struct from Unreal Engine.
 *
 * {@link https://docs.unrealengine.com/4.26/en-US/API/Runtime/Core/Math/FVector/}
 */
export interface Vector {
    /**
     * Centimeters west of the origin.
     */
    x: number;
    /**
     * Centimeters south of the origin.
     */
    y: number;
    /**
     * Centimeters above the origin.
     */
    z: number;
}

/**
 * Calculates the sum of two vectors by adding their corresponding x, y and z values.
 *
 * @param {Vector} a - The first vector to be added.
 * @param {Vector} b - The second vector to be added.
 * @return {Vector} The sum of the two input vectors.
 */
export const vectorSum = (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
});

export const vectorDifference = (a: Vector, b: Vector): Vector => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
});

export const scaleVector = (a: Vector, b: number): Vector => ({
    x: a.x * b,
    y: a.y * b,
    z: a.z * b,
});

export const vectorLengthSquared = (v: Vector) =>
    v.x * v.x + v.y * v.y + v.z * v.z;

export const vectorLength = (v: Vector) =>
    Math.sqrt(vectorLengthSquared(v));

export const normalizeVector = (v: Vector, length = 1) =>
    scaleVector(v, length / vectorLength(v));

export const distance = (startPoint: Vector, endPoint: Vector) =>
    vectorLength(vectorDifference(startPoint, endPoint));

export const distanceSquared = (startPoint: Vector, endPoint: Vector) =>
    vectorLengthSquared(vectorDifference(startPoint, endPoint));

/**
 * Computes the dot product of two vectors.
 *
 * The dot product of two vectors is a scalar value that represents the cosine
 * of the angle between the two vectors. It can also be interpreted as the
 * projection of one vector onto the other, or the product of the magnitudes of
 * the vectors and the cosine of the angle between them. In 2D space, it is
 * equivalent to the area of a trapezoid formed by the two vectors.
 *
 * @param {Vector} v1 - The first vector.
 * @param {Vector} v2 - The second vector.
 * @return {number} The dot product of the two vectors.
 */
export const dotProduct = (v1: Vector, v2: Vector): number =>
    v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

export const crossProduct = (a: Vector, b: Vector): Vector => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});

export function angleBetween(a: Vector, b: Vector) {
    const product = dotProduct(a, b);
    const aLength = vectorLength(a);
    const bLength = vectorLength(b);
    const x = product / (aLength * bLength);
    const clamped = Math.max(Math.min(x, 1), -1);
    return Math.acos(clamped);
}

/**
 * Given two lines defined by a point and a vector, this function finds the
 * point where the two lines are closest to each other. This point is also known
 * as the point of closest approach.
 * @param {Vector} p0 - A point on the first line.
 * @param {Vector} t0 - The vector defining the direction of the first line.
 * @param {Vector} p1 - A point on the second line.
 * @param {Vector} t1 - The vector defining the direction of the second line.
 * @return {Vector} The point of closest approach between the two lines.
*/
export function closestApproach(p0: Vector, t0: Vector, p1: Vector, t1: Vector): Vector {
    const a = vectorDifference(t1, t0);
    const b = vectorDifference(p0, p1);
    const t = dotProduct(a, b) / dotProduct(a, a);
    return vectorSum(p0, scaleVector(t0, t));
}