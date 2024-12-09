import {FormatArgumentValueMap, GvasString, GvasText, GvasTextArgumentFormat} from './Gvas';
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
    const [w, x, y, z] = new Float32Array([q.w, q.x, q.y, q.z]);
    return {w, x, y, z};
}

export function fp32r(r: Rotator): Rotator {
    const [pitch, roll, yaw] = new Float32Array([r.pitch, r.roll, r.yaw]);
    return {pitch, roll, yaw};
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
        args: lines.map((line, i) => ({
            name: String(i),
            value: ['Text', {
                flags: 2,
                values: line ? [line] : [],
            }],
        } satisfies FormatArgumentValueMap)),
        flags: 1,
        sourceFormat: {
            flags: 8,
            key: RRO_TEXT_GUID,
            namespace: '',
            value: lines.map((_, i) => '{' + i + '}').join('<br>'),
        },
    } satisfies GvasTextArgumentFormat;
}

export function textToString(value: GvasText): GvasString {
    if (value === null) return null;
    if ('key' in value) {
        // Base (0)
        if (value.namespace !== '') throw new Error(`Unexpected unknown value: ${value.namespace}`);
        return value.value;
    } else if ('args' in value) {
        // ArgumentFormat (3)
        const sourceFormat = value.sourceFormat;
        if (!('key' in sourceFormat)) throw new Error('Unexpected sourceFormat');
        switch (sourceFormat.key) {
            case RRO_TEXT_GUID:
            case '1428110346E6AD292230C4AA503E3FE9':
            case '69981E2B47B2AABC01CE39842FB03A96':
                break;
            default:
                throw new Error(`Unexpected GUID: ${sourceFormat.key}`);
        }
        const pattern = sourceFormat.value;
        if (pattern === null) throw new Error('Null pattern');
        return pattern.replace(/{(\d+)}/g,
            (_, i) => {
                const v = value.args[Number(i)].value;
                if (v[0] !== 'Text') throw new Error('Unexpected formatArgumentValue');
                return textToString(v[1]) ?? '';
            });
    } else if ('sourceValue' in value) {
        // AsNumber (4)
        if (value.sourceValue[0] === 'Int') {
            return String(value.sourceValue[1]);
        } else if (value.sourceValue[0] === 'Text') {
            return textToString(value.sourceValue[1]);
        } else {
            throw new Error(`Unknown Source Value ${value}`);
        }
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
