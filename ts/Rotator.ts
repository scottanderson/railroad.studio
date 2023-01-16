/**
 * A Rotator struct from Unreal Engine.
 *
 * {@link https://docs.unrealengine.com/4.26/en-US/API/Runtime/Core/Math/FRotator/}
 */
export interface Rotator {
    /**
     * Rotation around the right axis (around Y axis), Looking up and down (0=Straight Ahead, +Up, -Down)
     */
    pitch: number;
    /**
     * Rotation around the up axis (around Z axis), Running in circles 0=East, +North, -South.
     */
    yaw: number;
    /**
     * Rotation around the forward axis (around X axis), Tilting your head, 0=Straight, +Clockwise, -CCW.
     */
    roll: number;
}
