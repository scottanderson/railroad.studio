import {fromRotator, toRotationMatrix} from './Quaternion';
import {Rotator} from './Rotator';
import {Vector} from './Vector';

export type RotationMatrix = {
    forward: Vector,
    right: Vector,
    up: Vector,
};

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
export function dotProduct(v1: Vector, v2: Vector): number {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Rotates a given vector using a given rotator.
 *
 * This function uses the pitch, yaw, and roll values of the rotator to create a
 * rotation matrix. The vector is then transformed using the forward, right, and
 * up vectors of the matrix. The dot product of the vector and each of these
 * vectors is calculated and the resulting values are used as the x, y, and z
 * coordinates of the rotated vector.
 *
 * @param {Vector} vector - The vector to rotate.
 * @param {Rotator} rotator - The rotator to use for the rotation.
 * @return {Vector} The rotated vector.
 */
export function rotateVector(vector: Vector, rotator: Rotator): Vector {
    const quaternion = fromRotator(rotator);
    const {forward, right, up} = toRotationMatrix(quaternion);
    const x = dotProduct(vector, forward);
    const y = dotProduct(vector, right);
    const z = dotProduct(vector, up);
    return {x, y, z};
}
