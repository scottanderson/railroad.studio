import {Permission} from './Permission';
import {Rotator} from './Rotator';
import {Transform} from './Transform';
import {Vector} from './Vector';

/**
 * Stores the data from a GVAS '.sav' file.
 */
export interface Gvas {
    _header: GvasHeader;
    _order: string[];
    boolArrays: Record<string, boolean[]>;
    bools: Record<string, boolean>;
    byteArrays: Record<string, number[]>;
    dateTimes: Record<string, bigint>;
    enumArrays: Record<string, GvasString[]>;
    floatArrays: Record<string, number[]>;
    floats: Record<string, number>;
    intArrays: Record<string, number[]>;
    ints: Record<string, number>;
    nameArrays: Record<string, GvasString[]>;
    permissionArrays: Record<string, Permission[]>;
    rotatorArrays: Record<string, Rotator[]>;
    stringArrays: Record<string, GvasString[]>;
    strings: Record<string, GvasString>;
    textArrays: Record<string, GvasText[]>;
    transformArrays: Record<string, Transform[]>;
    vectorArrays: Record<string, Vector[]>;
}

export type GvasTypes =
    | ['ArrayProperty', 'BoolProperty']
    | ['ArrayProperty', 'ByteProperty']
    | ['ArrayProperty', 'EnumProperty']
    | ['ArrayProperty', 'FloatProperty']
    | ['ArrayProperty', 'IntProperty']
    | ['ArrayProperty', 'NameProperty']
    | ['ArrayProperty', 'StrProperty']
    | ['ArrayProperty', 'StructProperty', 'Permission']
    | ['ArrayProperty', 'StructProperty', 'Rotator']
    | ['ArrayProperty', 'StructProperty', 'Transform']
    | ['ArrayProperty', 'StructProperty', 'Vector']
    | ['ArrayProperty', 'TextProperty']
    | ['BoolProperty']
    | ['FloatProperty']
    | ['IntProperty']
    | ['NameProperty']
    | ['StrProperty']
    | ['StructProperty', 'DateTime']
    | []
    ;

export type GvasString = string | null;

export function gvasToString(gs: GvasString): string {
    return (gs === null) ? 'null' : (gs.replace(/<br>/g, '\n').trimEnd() || '[blank]');
}

export interface GvasHeader {
    gvasVersion: number;
    structureVersion: number;
    unknownVersion?: number | undefined;
    engineVersion: EngineVersion;
    customFormatVersion: number;
    customData: CustomData[];
    saveType: GvasString;
}

export interface EngineVersion {
    major: number;
    minor: number;
    patch: number;
    build: number;
    buildID: GvasString;
}

export interface CustomData {
    guid: number[];
    value: number;
}

export type GvasText = GvasTextNone | GvasTextArgumentFormat | GvasTextBase;

// Component type 255
export interface GvasTextNone {
    flags: number;
    values: GvasString[];
}

// Component type 0
export interface GvasTextBase {
    flags: number;
    namespace: GvasString;
    key: GvasString;
    value: GvasString;
}

// Component type 3
export interface GvasTextArgumentFormat {
    flags: number;
    guid: GvasString;
    pattern: GvasString;
    args: FormatArgumentValue[];
}

export interface FormatArgumentValue {
    name: GvasString;
    contentType: number;
    values: GvasString[];
}
