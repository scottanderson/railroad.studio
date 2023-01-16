import {Rotator} from './Rotator';
import {Vector} from './Vector';

const RADIANS_PER_DEGREE = Math.PI / 180;

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
 * Computes a rotation matrix from a given rotator.
 *
 * A rotation matrix is a 3x3 matrix that is used to rotate a vector in 3D
 * space. This function takes in a rotator (which represents rotations around
 * the pitch, yaw, and roll axes) and uses trigonometric functions to calculate
 * the corresponding forward, right, and up vectors that make up the rotation
 * matrix.
 *
 * The rotator's pitch, yaw, and roll values are converted to radians and
 * trigonometric functions such as cosine and sine are used to calculate the
 * forward, right, and up vectors. The pitch rotation is around the right axis
 * (Y-axis), yaw rotation is around the up axis (Z-axis), and roll rotation is
 * around the forward axis (X-axis).
 *
 * @param {Rotator} rotator - The rotator used to calculate the rotation matrix.
 * @return {RotationMatrix} The rotation matrix that corresponds to the given rotator.
 */
export function getRotationMatrix(rotator: Rotator): RotationMatrix {
    const pitch = -rotator.pitch * RADIANS_PER_DEGREE;
    const roll = -rotator.roll * RADIANS_PER_DEGREE;
    const yaw = -rotator.yaw * RADIANS_PER_DEGREE;
    const cosPitch = Math.cos(pitch);
    const cosRoll = Math.cos(roll);
    const cosYaw = Math.cos(yaw);
    const sinPitch = Math.sin(pitch);
    const sinRoll = Math.sin(roll);
    const sinYaw = Math.sin(yaw);
    return {
        forward: {
            x: cosYaw * cosPitch,
            y: sinYaw * cosPitch,
            z: sinPitch,
        },
        right: {
            x: cosYaw * sinPitch * sinRoll - sinYaw * cosRoll,
            y: sinYaw * sinPitch * sinRoll + cosYaw * cosRoll,
            z: cosPitch * sinRoll,
        },
        up: {
            x: cosYaw * sinPitch * cosRoll + sinYaw * sinRoll,
            y: sinYaw * sinPitch * cosRoll - cosYaw * sinRoll,
            z: cosPitch * cosRoll,
        },
    };
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
    const {forward, right, up} = getRotationMatrix(rotator);
    const x = dotProduct(vector, forward);
    const y = dotProduct(vector, right);
    const z = dotProduct(vector, up);
    return {x, y, z};
}
