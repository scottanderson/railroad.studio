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
    if (str === null) return null;
    const lines = str.split('<br>');
    if (lines.length === 0) return [];
    if (lines.length === 1) return [str];
    return {
        guid: RRO_TEXT_GUID,
        pattern: lines.map((line, i) => '{' + i + '}').join('<br>'),
        textFormat: lines.map((line, i) => ({
            formatKey: String(i),
            contentType: 2,
            values: line ? [line] : [],
        })),
    };
}

export function textToString(value: GvasText): GvasString {
    if (value === null) return null;
    const notSimple = !Array.isArray(value) && typeof value === 'object';
    if (notSimple && 'pattern' in value) {
        // Rich text
        if (value.guid !== RRO_TEXT_GUID) throw new Error(`Unexpected GUID: ${value.guid}`);
        if (value.pattern === null) throw new Error('Null pattern');
        return value.pattern.replace(/{(\d+)}/g,
            (m, i) => value.textFormat[Number(i)].values[0] ?? '');
    } else if (notSimple) {
        // Type 8
        if (value.unknown !== '') throw new Error(`Unexpected unknown value: ${value.unknown}`);
        return value.value;
    } else {
        // Simple text
        if (0 === value.length) {
            // console.log(`Warning: GvasText contains zero-length string array, converting to null`);
            return null;
        }
        if (1 !== value.length) throw new Error('Expected single entry in simple GvasText');
        if (value[0] === null) throw new Error('Null in simple text');
        return value[0];
    }
}

export function unknownProperty(unknownObject: unknown, propertyName: string): unknown {
    if (typeof unknownObject === 'undefined') return;
    if (!unknownObject) return;
    if (typeof unknownObject !== 'object') return;
    if (!(propertyName in unknownObject)) return;
    return (unknownObject as Record<string, unknown>)[propertyName];
}
