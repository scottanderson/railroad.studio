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

export type GvasText =
    | GvasTextNone
    | GvasTextBase
    | GvasTextArgumentFormat
    | GvasTextAsNumber
    ;

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
    sourceFormat: GvasText;
    args: FormatArgumentValueMap[];
}

// Component type 4
export interface GvasTextAsNumber {
    flags: number;
    sourceValue: FormatArgumentValue;
    formatOptions?: NumberFormattingOptions | undefined;
    targetCulture: GvasString;
}

export interface FormatArgumentValueMap {
    name: GvasString;
    value: FormatArgumentValue;
}

export type FormatArgumentValue =
    | ['Int', number]
    | ['Text', GvasText]
    ;

export interface NumberFormattingOptions {
    alwaysIncludeSign: boolean;
    useGrouping: boolean;
    roundingMode: RoundingMode;
    minimumIntegralDigits: number;
    maximumIntegralDigits: number;
    minimumFractionalDigits: number;
    maximumFractionalDigits: number;
}

export enum RoundingMode {
    HalfToEven = 0,
    HalfFromZero = 1,
    HalfToZero = 2,
    FromZero = 3,
    ToZero = 4,
    ToNegativeInfinity = 5,
    ToPositiveInfinity = 6,
}
