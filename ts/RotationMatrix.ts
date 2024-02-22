import {fromRotator, toRotationMatrix} from './Quaternion';
import {Rotator} from './Rotator';
import {Vector, dotProduct} from './Vector';

export type RotationMatrix = {
    forward: Vector;
    right: Vector;
    up: Vector;
};

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
