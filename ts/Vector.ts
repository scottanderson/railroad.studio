import {clamp} from './math';

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
 * @param {Vector} args - The vectors to be added.
 * @return {Vector} The sum of the two input vectors.
 */
export const vectorSum = (...args: Vector[]): Vector => args.reduce((a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
}));

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
    dotProduct(v, v);

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

/**
 * Projects a vector onto another vector.
 *
 * @see {@link https://en.wikipedia.org/wiki/Vector_projection}
 *
 * @param {Vector} a - The vector to project.
 * @param {Vector} b - The vector to project onto.
 * @return {Vector} The projected vector.
 */
export const projectVector = (a: Vector, b: Vector): Vector =>
    scaleVector(b, dotProduct(a, b) / vectorLengthSquared(b));

/**
 * Rejects a vector from another vector.
 *
 * @see {@link https://en.wikipedia.org/wiki/Vector_projection}
 *
 * @param {Vector} a - The vector to reject.
 * @param {Vector} b - The vector to reject from.
 * @return {Vector} The rejected vector.
*/
export const rejectVector = (a: Vector, b: Vector): Vector =>
    vectorDifference(a, projectVector(a, b));

/**
 * Calculates the angle between two vectors.
 *
 * The angle between two vectors is a value that represents the degree of
 * similarity or dissimilarity between the vectors. It can be used to
 * determine the orientation of one vector relative to another, or to
 * compare the magnitudes of the vectors and the cosine of the angle
 * between them.
 *
 * The angle between two vectors is the angle formed by the two vectors when
 * they are placed tail-to-tail. It is calculated from the identity
 * `a · b = |a| * |b| * cos(θ)`, where `a` and `b` are the two vectors,
 * `|a|` and `|b|` are the magnitudes of the vectors, and `θ` is the angle
 * between the vectors.
 *
 * @param {Vector} a - The first vector.
 * @param {Vector} b - The second vector.
 * @return {number} The angle `θ` between the two vectors in radians.
 */
export function angleBetweenVectors(a: Vector, b: Vector) {
    const product = dotProduct(a, b);
    const aLength = vectorLength(a);
    const bLength = vectorLength(b);
    const x = product / (aLength * bLength);
    const clamped = clamp(x, -1, 1);
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
    const direction = vectorDifference(p0, p1);
    const rejection = rejectVector(direction, t1);
    const distanceToLinePos = vectorLength(rejection) / dotProduct(t0, normalizeVector(rejection));
    const closestApproach = vectorDifference(p0, scaleVector(t0, distanceToLinePos));
    return closestApproach;
}
