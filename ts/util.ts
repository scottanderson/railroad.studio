import {GvasString, GvasText} from './Gvas';
import {Quaternion} from './Quaternion';
import {Rotator} from './Rotator';
import {Vector} from './Vector';

const RRO_TEXT_GUID = '56F8D27149CC5E2D12103BBEBFCA9097';

export function findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => unknown): number {
    const index = array.slice().reverse().findIndex(predicate);
    return (index >= 0) ? (array.length - 1 - index) : index;
}

export function fp32(n: number): number {
    const float = new Float32Array(1);
    float[0] = n;
    return float[0];
}

export function fp32q(q: Quaternion): Quaternion {
    const [x, y, z, w] = new Float32Array([q.x, q.y, q.z, q.w]);
    return {x, y, z, w};
}

export function fp32r(r: Rotator): Rotator {
    const [roll, pitch, yaw] = new Float32Array([r.roll, r.pitch, r.yaw]);
    return {roll, pitch, yaw};
}

export function fp32v(v: Vector): Vector {
    const [x, y, z] = new Float32Array([v.x, v.y, v.z]);
    return {x, y, z};
}

export function stringToText(str: GvasString): GvasText {
    if (str === null) return {flags: 0, values: []};
    const lines = str.split('<br>');
    if (lines.length === 0) return {flags: 0, values: []};
    if (lines.length === 1) return {flags: 0, values: [str]};
    return {
        flags: 1,
        guid: RRO_TEXT_GUID,
        pattern: lines.map((line, i) => '{' + i + '}').join('<br>'),
        args: lines.map((line, i) => ({
            name: String(i),
            contentType: 2,
            values: line ? [line] : [],
        })),
    };
}

export function textToString(value: GvasText): GvasString {
    if (value === null) return null;
    if ('pattern' in value) {
        // ArgumentFormat
        switch (value.guid) {
            case RRO_TEXT_GUID:
            case '69981E2B47B2AABC01CE39842FB03A96':
                break;
            default:
                throw new Error(`Unexpected GUID: ${value.guid}`);
        }
        if (value.pattern === null) throw new Error('Null pattern');
        return value.pattern.replace(/{(\d+)}/g,
            (m, i) => value.args[Number(i)].values[0] ?? '');
    } else if ('key' in value) {
        // Base
        if (value.namespace !== '') throw new Error(`Unexpected unknown value: ${value.namespace}`);
        return value.value;
    } else {
        // None
        if (0 === value.values.length) return null;
        if (1 !== value.values.length) throw new Error('Expected single entry in simple GvasText');
        if (value.values[0] === null) throw new Error('Null in simple text');
        return value.values[0];
    }
}

export function unknownProperty(unknownObject: unknown, propertyName: string): unknown {
    if (typeof unknownObject === 'undefined') return;
    if (!unknownObject) return;
    if (typeof unknownObject !== 'object') return;
    if (!(propertyName in unknownObject)) return;
    return (unknownObject as Record<string, unknown>)[propertyName];
}
