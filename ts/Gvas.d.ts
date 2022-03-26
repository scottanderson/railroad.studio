/**
 * Stores the data from a GVAS '.sav' file.
 */
interface Gvas {
    _order: string[];
    _types: GvasMap<GvasTypes>;
    _header: GvasHeader;
    boolArrays: GvasMap<boolean[]>;
    floatArrays: GvasMap<number[]>;
    floats: GvasMap<number>;
    intArrays: GvasMap<number[]>;
    stringArrays: GvasMap<GvasString[]>;
    strings: GvasMap<GvasString>;
    vectorArrays: GvasMap<Vector[]>;
    rotatorArrays: GvasMap<Rotator[]>;
    textArrays: GvasMap<GvasText[]>;
}

type GvasTypes = (
    [] |
    ['FloatProperty'] |
    ['StrProperty'] |
    ['ArrayProperty', 'BoolProperty'] |
    ['ArrayProperty', 'FloatProperty'] |
    ['ArrayProperty', 'IntProperty'] |
    ['ArrayProperty', 'StrProperty'] |
    ['ArrayProperty', 'StructProperty', 'Rotator'] |
    ['ArrayProperty', 'StructProperty', 'Vector'] |
    ['ArrayProperty', 'TextProperty']);

type GvasMap<V> = {
    [key: string]: V;
};

type GvasString = string | null;

interface GvasHeader {
    saveVersion: number;
    structureVersion: number;
    engineVersion: EngineVersion
    customFormatVersion: number;
    customData: CustomData[];
    saveType: GvasString;
}

interface EngineVersion {
    major: number;
    minor: number;
    patch: number;
    build: number;
    buildID: GvasString;
}

interface CustomData {
    guid: number[];
    value: number;
}

/**
 * A Vector struct from Unreal Engine.
 *
 * {@link https://docs.unrealengine.com/4.26/en-US/API/Runtime/Core/Math/FVector/}
 */
interface Vector {
    /**
     * Meters east of the origin.
     */
    x: number;
    /**
     * Meters south of the origin.
     */
    y: number;
    /**
     * Meters above the origin.
     */
    z: number;
}

/**
 * A Rotator struct from Unreal Engine.
 *
 * {@link https://docs.unrealengine.com/4.26/en-US/API/Runtime/Core/Math/FRotator/}
 */
interface Rotator {
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

type GvasText = null | RichText | GvasString[];

interface RichText {
    guid: GvasString;
    pattern: GvasString,
    textFormat: RichTextFormat[],
}

interface RichTextFormat {
    formatKey: GvasString;
    contentType: number;
    values: GvasString[];
}

