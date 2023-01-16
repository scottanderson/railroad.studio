import {RotationMatrix} from './RotationMatrix';
import {Rotator} from './Rotator';

/**
 * A quaternion is a mathematical object that extends the concept of complex
 * numbers. It is defined by four components: a scalar (real) component and a
 * vector (imaginary) component. Quaternions are often used to represent
 * rotations in 3D space, as they are more efficient and numerically stable than
 * other methods such as Euler angles or rotation matrices.
 */
export interface Quaternion {
    w: number;
    x: number;
    y: number;
    z: number;
}

const RADIANS_PER_DEGREE = Math.PI / 180;

export function fromRotator(rotator: Rotator): Quaternion {
    const pitch = -rotator.pitch * RADIANS_PER_DEGREE * 0.5;
    const roll = -rotator.roll * RADIANS_PER_DEGREE * 0.5;
    const yaw = -rotator.yaw * RADIANS_PER_DEGREE * 0.5;
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const sinRoll = Math.sin(roll);
    const cosRoll = Math.cos(roll);
    return {
        w: cosRoll * cosPitch * cosYaw + sinRoll * sinPitch * sinYaw,
        x: sinRoll * cosPitch * cosYaw - cosRoll * sinPitch * sinYaw,
        y: cosRoll * sinPitch * cosYaw + sinRoll * cosPitch * sinYaw,
        z: cosRoll * cosPitch * sinYaw - sinRoll * sinPitch * cosYaw,
    };
}

export function toRotationMatrix(q: Quaternion): RotationMatrix {
    const forward = {
        x: 1 - 2 * q.y * q.y - 2 * q.z * q.z,
        y: 2 * q.x * q.y + 2 * q.w * q.z,
        z: 2 * q.x * q.z - 2 * q.w * q.y,
    };
    const right = {
        x: 2 * q.x * q.y - 2 * q.w * q.z,
        y: 1 - 2 * q.x * q.x - 2 * q.z * q.z,
        z: 2 * q.y * q.z + 2 * q.w * q.x,
    };
    const up = {
        x: 2 * q.x * q.z + 2 * q.w * q.y,
        y: 2 * q.y * q.z - 2 * q.w * q.x,
        z: 1 - 2 * q.x * q.x - 2 * q.y * q.y,
    };
    return {forward, right, up};
}
