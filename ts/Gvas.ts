import {Rotator} from './Rotator';
import {Vector} from './Vector';

/**
 * Stores the data from a GVAS '.sav' file.
 */
export interface Gvas {
    _order: string[];
    _types: Record<string, GvasTypes>;
    _header: GvasHeader;
    boolArrays: Record<string, boolean[]>;
    byteArrays: Record<string, number[]>;
    floatArrays: Record<string, number[]>;
    floats: Record<string, number>;
    intArrays: Record<string, number[]>;
    stringArrays: Record<string, GvasString[]>;
    strings: Record<string, GvasString>;
    vectorArrays: Record<string, Vector[]>;
    rotatorArrays: Record<string, Rotator[]>;
    textArrays: Record<string, GvasText[]>;
}

export type GvasTypes =
    | []
    | ['FloatProperty']
    | ['StrProperty']
    | ['ArrayProperty', 'BoolProperty']
    | ['ArrayProperty', 'ByteProperty']
    | ['ArrayProperty', 'FloatProperty']
    | ['ArrayProperty', 'IntProperty']
    | ['ArrayProperty', 'StrProperty']
    | ['ArrayProperty', 'StructProperty', 'Rotator']
    | ['ArrayProperty', 'StructProperty', 'Vector']
    | ['ArrayProperty', 'TextProperty'];

export type GvasString = string | null;

export function gvasToString(gs: GvasString): string {
    return (gs === null) ? 'null' : (gs.replace(/<br>/g, '\n').trimEnd() || '[blank]');
}

export interface GvasHeader {
    gvasVersion: number;
    structureVersion: number;
    unknownVersion?: number;
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

export type GvasText = null | RichText | GvasString[];

export interface RichText {
    guid: GvasString;
    pattern: GvasString;
    textFormat: RichTextFormat[];
}

export interface RichTextFormat {
    formatKey: GvasString;
    contentType: number;
    values: GvasString[];
}
