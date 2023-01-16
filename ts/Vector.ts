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
