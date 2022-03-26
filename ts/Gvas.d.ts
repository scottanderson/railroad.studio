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

interface Vector {
    x: number;
    y: number;
    z: number;
}

interface Rotator {
    pitch: number;
    yaw: number;
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

