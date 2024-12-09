import {
    CustomData,
    EngineVersion,
    Gvas,
    GvasHeader,
    GvasString,
    GvasText,
    GvasTextArgumentFormat,
    GvasTextBase,
    GvasTextNone,
    FormatArgumentValue,
    gvasToString,
    GvasTextAsNumber,
    FormatArgumentValueMap,
    NumberFormattingOptions,
    RoundingMode,
} from './Gvas';
import {Permission} from './Permission';
import {Quaternion} from './Quaternion';
import {Rotator} from './Rotator';
import {Transform} from './Transform';
import {Vector} from './Vector';
import {checkSaveType} from './importer';

/**
 * Parses a GVAS file stored in an ArrayBuffer and returns an object with the
 * contents of the file.
 *
 * The function first checks the magic number at the beginning of the file to
 * verify that it is a GVAS file, and then parses the header data, including the
 * engine version, custom format data, and save game type. After the header, the
 * function reads the data variables stored in the GVAS file. These variables
 * are stored as name-value pairs, where the name is a GvasString and the value
 * is a property of a specific type, such as a boolean, a float, or an array of
 * integers. The function reads the name and type of each variable, and stores
 * them in the _order and _types properties of the result object, respectively.
 * It then reads the value of the variable and stores it in the corresponding
 * property of the result object, depending on its type.
 *
 * @param {ArrayBuffer} buffer
 * @return {Gvas}
 */
export function parseGvas(buffer: ArrayBuffer): Gvas {
    // Parse the header
    const uint8View = new Uint8Array(buffer, 0, 4);
    const magic = String.fromCharCode.apply(null, [...uint8View]);
    if (magic !== 'GVAS') {
        throw new Error('Error reading file: Format doesn\'t start with GVAS.');
    }
    let uint32View = new Uint32Array(buffer, 4, 3);
    const gvasVersion = uint32View[0];
    if (gvasVersion !== 2 && gvasVersion !== 3) {
        throw new Error(`GVAS format version ${gvasVersion} is not supported`);
    }
    const structureVersion = uint32View[1];
    const unknownVersion = gvasVersion === 3 ? uint32View[2] : undefined;
    const engineVersionOffset = gvasVersion === 3 ? 16 : 12;
    let [pos, engineVersion]: [number, EngineVersion] = parseEngineVersion(buffer, engineVersionOffset);
    uint32View = new Uint32Array(buffer.slice(pos, pos + 8));
    pos += 8;
    const customFormatVersion = uint32View[0];
    const nCustomData = uint32View[1];
    const customData: CustomData[] = [];
    for (let i = 0; i < nCustomData; i++) {
        const value = new Uint32Array(buffer.slice(pos, pos + 20));
        pos += 20;
        customData[i] = {
            guid: [...value].slice(0, 4),
            value: value[4],
        };
    }
    let saveType;
    [pos, saveType] = parseString(buffer, pos);
    const header: GvasHeader = {
        customData,
        customFormatVersion,
        engineVersion,
        gvasVersion,
        saveType,
        structureVersion,
        unknownVersion,
    };
    checkSaveType(header);
    const result: Gvas = {
        _header: header,
        _order: [],
        boolArrays: {},
        bools: {},
        byteArrays: {},
        dateTimes: {},
        enumArrays: {},
        floatArrays: {},
        floats: {},
        intArrays: {},
        ints: {},
        nameArrays: {},
        permissionArrays: {},
        rotatorArrays: {},
        stringArrays: {},
        strings: {},
        textArrays: {},
        transformArrays: {},
        vectorArrays: {},
    };
    const largeWorldCoords = (gvasVersion === 3);
    while (pos < buffer.byteLength) {
        let pname;
        [pos, pname] = parseProperty(buffer, pos, result, largeWorldCoords);
        if (!pname) throw new Error('Property name is null');
        if (pname === 'None') break; // End of properties
        result._order.push(pname);
    }
    if (pos !== buffer.byteLength) {
        throw new Error(`Found extra data at EOF, pos=${pos}, byteLength=${buffer.byteLength}`);
    }
    return result;
}

function parseEngineVersion(buffer: ArrayBuffer, pos: number): [number, EngineVersion] {
    const uint16View = new Uint16Array(buffer, pos, 3);
    const engineVersionMajor = uint16View[0];
    const engineVersionMinor = uint16View[1];
    const engineVersionPatch = uint16View[2];
    pos += 6;
    const uint32View = new Uint32Array(buffer.slice(pos, pos + 4));
    const engineVersionBuild = uint32View[0];
    pos += 4;
    let engineVersionBuildID;
    [pos, engineVersionBuildID] = parseString(buffer, pos);
    const engineVersion: EngineVersion = {
        build: engineVersionBuild,
        buildID: engineVersionBuildID,
        major: engineVersionMajor,
        minor: engineVersionMinor,
        patch: engineVersionPatch,
    };
    return [pos, engineVersion];
}

function parseUint64(
    buffer: ArrayBuffer,
    pos: number,
): [number, bigint] {
    const structSize = 8;
    const values = new BigUint64Array(buffer.slice(pos, pos + structSize));
    const [result] = values;
    return [pos + structSize, result];
}

function parseQuat(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Quaternion] {
    const structSize = largeWorldCoords ? 32 : 16;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const [x, y, z, w] = values;
    const result = {w, x, y, z};
    return [pos + structSize, result];
}

function parseRotator(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Rotator] {
    const structSize = largeWorldCoords ? 24 : 12;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const [pitch, yaw, roll] = values;
    const result: Rotator = {pitch, roll, yaw};
    return [pos + structSize, result];
}

function parseString(buffer: ArrayBuffer, start: number): [number, GvasString] {
    const pos = start + 4;
    const size = new Int32Array(buffer.slice(start, pos))[0];
    if (size === 0) {
        return [pos, null];
    } else if (size > 0) {
        const uint8View = new Uint8Array(buffer, pos, size);
        const last = size - 1;
        if (uint8View[last] !== 0) throw new Error(`Expected null terminator in ${uint8View}`);
        const excludeNullTerminator = uint8View.subarray(0, last);
        const utf8Decoded = new TextDecoder().decode(excludeNullTerminator);
        return [pos + size, utf8Decoded];
    } else if (size < 0) {
        const sizeBytes = -2 * size;
        const charCodes = new Uint16Array(buffer.slice(pos, pos + sizeBytes));
        const last = -size - 1;
        if (charCodes[last] !== 0) throw new Error(`Expected null terminator in ${charCodes}`);
        const excludeNullTerminator = charCodes.subarray(0, last);
        const str = String.fromCharCode.apply(null, [...excludeNullTerminator]);
        return [pos + sizeBytes, str];
    } else {
        throw new Error(`Unexpected size ${size}`);
    }
}

function parseVector(
    buffer: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): [number, Vector] {
    const structSize = largeWorldCoords ? 24 : 12;
    const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
    const result: Vector = ({
        x: values[0], // East (need to confirm)
        y: values[1], // North (need to confirm)
        z: values[2], // Altitude
    });
    return [pos + structSize, result];
}

function parseProperty(
    b: ArrayBuffer,
    pos: number,
    target: Gvas,
    largeWorldCoords: boolean,
): [number, GvasString] {
    let pname;
    const read = readProperty(b, pos, largeWorldCoords);
    [pos, pname] = read;
    if (!pname || pname === 'None' || read.length === 2) {
        // NoneProperty, bail without storring type info
    } else if (read[2] === 'BoolProperty') {
        target.bools[pname] = read[3];
    } else if (read[2] === 'FloatProperty') {
        target.floats[pname] = read[3];
    } else if (read[2] === 'IntProperty') {
        target.ints[pname] = read[3];
    } else if (read[2] === 'StrProperty') {
        target.strings[pname] = read[3];
    } else if (read[2] === 'StructProperty' && read[3] === 'DateTime') {
        target.dateTimes[pname] = read[4];
    } else if (read[2] !== 'ArrayProperty') {
        throw new Error(`Unexpected Property type: ${read[2]}`);
    } else if (read[3] === 'BoolProperty') {
        target.boolArrays[pname] = read[4];
    } else if (read[3] === 'ByteProperty') {
        target.byteArrays[pname] = read[4];
    } else if (read[3] === 'EnumProperty') {
        target.enumArrays[pname] = read[4];
    } else if (read[3] === 'FloatProperty') {
        target.floatArrays[pname] = read[4];
    } else if (read[3] === 'IntProperty') {
        target.intArrays[pname] = read[4];
    } else if (read[3] === 'NameProperty') {
        target.nameArrays[pname] = read[4];
    } else if (read[3] === 'StrProperty') {
        target.stringArrays[pname] = read[4];
    } else if (read[3] === 'TextProperty') {
        target.textArrays[pname] = read[4];
    } else if (read[3] !== 'StructProperty') {
        throw new Error(`Unexpected ArrayProperty type: ${read[3]}`);
    } else if (read[4] === 'Permission') {
        target.permissionArrays[pname] = read[5];
    } else if (read[4] === 'Vector') {
        target.vectorArrays[pname] = read[5];
    } else if (read[4] === 'Rotator') {
        target.rotatorArrays[pname] = read[5];
    } else if (read[4] === 'Transform') {
        target.transformArrays[pname] = read[5];
    } else {
        throw new Error(`Unexpected StructProperty type: ${read[4]}`);
    }
    return [pos, pname];
}

type ParsePropertyReturnType = (
    | [number, GvasString, 'ArrayProperty', 'BoolProperty', boolean[]]
    | [number, GvasString, 'ArrayProperty', 'ByteProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'EnumProperty', GvasString[]]
    | [number, GvasString, 'ArrayProperty', 'FloatProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'IntProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'NameProperty', GvasString[]]
    | [number, GvasString, 'ArrayProperty', 'StrProperty', GvasString[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Permission', Permission[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Rotator', Rotator[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Transform', Transform[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Vector', Vector[]]
    | [number, GvasString, 'ArrayProperty', 'TextProperty', GvasText[]]
    | [number, GvasString, 'BoolProperty', boolean]
    | [number, GvasString, 'FloatProperty', number]
    | [number, GvasString, 'IntProperty', number]
    | [number, GvasString, 'NameProperty', GvasString]
    | [number, GvasString, 'StrProperty', GvasString]
    | [number, GvasString, 'StructProperty', 'DateTime', bigint]
    | [number, GvasString, 'StructProperty', 'Quat', Quaternion]
    | [number, GvasString, 'StructProperty', 'Vector', Vector]
    | [number, GvasString]
);

function readProperty(
    b: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
    earlyExit = false,
): ParsePropertyReturnType {
    // pname
    let pname;
    [pos, pname] = parseString(b, pos);
    if (earlyExit && (!pname || pname === 'None')) {
        return [pos, pname];
    }
    // ptype
    let ptype: GvasString;
    [pos, ptype] = parseString(b, pos);
    if (!pname || pname === 'None') {
        if (ptype !== null) throw new Error(`Unexpected type: ${ptype}`);
        return [pos, pname];
    }
    // plen
    const qword = new Int32Array(b.slice(pos, pos + 8));
    if (qword[1] !== 0) throw new Error(`plen too large: ${qword}`);
    const plen = qword[0];
    pos += 8;
    // ArrayProperty and StructProperty: dtype
    let dtype = null;
    if (ptype === 'ArrayProperty' || ptype === 'StructProperty') {
        [pos, dtype] = parseString(b, pos);
    }
    // BoolProperty: value
    if (ptype === 'BoolProperty') {
        if (plen !== 0) throw new Error(`BoolProperty length !== 0, ${plen}`);
        const c = new Uint8Array(b, pos, 1)[0];
        if (c !== 0 && c !== 1) throw new Error(`Unexpected BoolProperty value: ${c}`);
        pos++;
        // terminator
        const terminator = new Uint8Array(b, pos, 1)[0];
        if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
        pos++;
        // Bail early because plen is zero
        return [pos, pname, ptype, (c !== 0)];
    }
    // StructProperty: guid
    if (ptype === 'StructProperty') {
        const guid = new Uint8Array(b, pos, 16);
        if (guid.some((v) => v !== 0)) throw new Error(`guid !== 0, ${guid}`);
        pos += 16;
    }
    // terminator
    const terminator = new Uint8Array(b, pos, 1)[0];
    if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
    pos++;
    // pdata
    const pdata = b.slice(pos, pos + plen);
    pos += plen;
    if (ptype === 'FloatProperty') {
        if (plen !== 4) throw new Error(`FloatProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Float32Array(pdata)[0]];
    } else if (ptype === 'IntProperty') {
        if (plen !== 4) throw new Error(`IntProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Uint32Array(pdata)[0]];
    } else if (ptype === 'StrProperty') {
        const [len, result] = parseString(pdata, 0);
        if (plen !== len) throw new Error(`String length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, result];
    } else if (ptype === 'StructProperty') {
        if (dtype === 'DateTime') {
            const [len, result] = parseUint64(pdata, 0);
            if (plen !== len) throw new Error(`DateTime length !== ${len}, ${plen}, ${pdata}`);
            return [pos, pname, ptype, dtype, result];
        } else if (dtype === 'Quat') {
            const [len, result] = parseQuat(pdata, 0, largeWorldCoords);
            if (plen !== len) throw new Error(`Quat length !== ${len}, ${plen}, ${pdata}`);
            return [pos, pname, ptype, dtype, result];
        } else if (dtype === 'Vector') {
            const [len, result] = parseVector(pdata, 0, largeWorldCoords);
            if (plen !== len) throw new Error(`Vector length !== ${len}, ${plen}, ${pdata}`);
            return [pos, pname, ptype, dtype, result];
        } else {
            throw new Error(`Not yet implemented StructProperty:${dtype}`);
        }
    } else if (ptype !== 'ArrayProperty') {
        throw new Error(`property type for '${pname}' is not implemented ('${ptype}')`);
    } else if (dtype === 'BoolProperty') {
        const [len, result] = parseBoolArray(pdata);
        if (plen !== len) throw new Error(`BoolProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'ByteProperty') {
        return [pos, pname, ptype, dtype, [...new Uint8Array(pdata)]];
    } else if (dtype === 'IntProperty') {
        const [len, result] = parseIntArray(pdata);
        if (plen !== len) throw new Error(`IntProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'EnumProperty') {
        const [len, result] = parseStringArray(pdata);
        if (plen !== len) throw new Error(`StrProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'FloatProperty') {
        const [len, result] = parseFloatArray(pdata);
        if (plen !== len) throw new Error(`FloatProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'NameProperty') {
        const [len, result] = parseStringArray(pdata);
        if (plen !== len) throw new Error(`NameProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'StrProperty') {
        const [len, result] = parseStringArray(pdata);
        if (plen !== len) throw new Error(`StrProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else if (dtype === 'StructProperty') {
        const [stype, sdata] = parseStructArray(pdata, pname, largeWorldCoords);
        if (stype === 'Rotator') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Vector') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Transform') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Permission') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else {
            throw new Error(gvasToString(stype));
        }
    } else if (dtype === 'TextProperty') {
        const [len, result] = parseTextArray(pdata);
        if (plen !== len) throw new Error(`TextProperty array length !== ${len}, ${plen}, ${pdata}`);
        return [pos, pname, ptype, dtype, result];
    } else {
        throw new Error(`${dtype} data type for '${pname}' is not implemented`);
    }
}

function parseBoolArray(buffer: ArrayBuffer): [number, boolean[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const uint8View = new Uint8Array(buffer, 4, entryCount);
    return [4 + entryCount, [...uint8View].map(Boolean)];
}

function parseIntArray(buffer: ArrayBuffer): [number, number[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const int32View = new Int32Array(buffer, 4, entryCount);
    return [4 + (entryCount * 4), [...int32View]];
}

function parseFloatArray(buffer: ArrayBuffer): [number, number[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const floatView = new Float32Array(buffer, 4, entryCount);
    return [4 + (entryCount * 4), [...floatView]];
}

/**
 * Parse a string array from a buffer.
 * @param {ArrayBuffer} buffer
 * @return {GvasString[]}
 */
function parseStringArray(buffer: ArrayBuffer): [number, GvasString[]] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    const value = [];
    for (let i = 0; i < entryCount; i++) {
        let str;
        [pos, str] = parseString(buffer, pos);
        value.push(str);
    }
    return [pos, value];
}

type ParseStructArrayReturnType =
    | ['Rotator', Rotator[]]
    | ['Transform', Transform[]]
    | ['Vector', Vector[]]
    | ['Permission', Permission[]]
    ;

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @param {GvasString} expectPropertyName
 * @param {boolean} largeWorldCoords
 * @return {GvasStruct[]}
 */
function parseStructArray(
    buffer: ArrayBuffer,
    expectPropertyName: GvasString,
    largeWorldCoords: boolean,
): ParseStructArrayReturnType {
    // - id: entry_count
    //   type: u4
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    // - id: property_name
    //   type: string
    let propertyName;
    [pos, propertyName] = parseString(buffer, pos);
    if (propertyName !== expectPropertyName) {
        throw new Error(`Expected propertyName = ${expectPropertyName}, ${propertyName}`);
    }
    // - id: struct_property
    //   contents: [15, 0, 0, 0, "StructProperty", 0]
    let structProperty;
    [pos, structProperty] = parseString(buffer, pos);
    if (structProperty !== 'StructProperty') {
        throw new Error(`Invalid struct header: ${structProperty}`);
    }
    // - id: field_size
    //   type: u8
    const fieldSize = new Uint32Array(buffer.slice(pos, pos + 8));
    pos += 8;
    if (fieldSize[1] !== 0) {
        throw new Error(`field_size too large: ${fieldSize[1]}`);
    }
    // - id: field_name
    //   type: string
    let fieldName;
    [pos, fieldName] = parseString(buffer, pos);
    // - id: reserved
    //   size: 17
    const reserved = new Uint8Array(buffer, pos, 17);
    if (reserved.filter(Number).length > 0) {
        throw new Error(`Expected all zeroes ${reserved}`);
    }
    pos += 17;
    // - id: data
    //   size: field_size / entry_count
    //   type:
    //     switch-on: field_name.str
    //     cases:
    //       '"Vector"': vector
    //       '"Rotator"': rotator
    //   repeat: expr
    //   repeat-expr: entryCount
    const value = [];
    const startPos = pos;
    if (fieldName === 'Rotator') {
        for (let i = 0; i < entryCount; i++) {
            let result;
            [pos, result] = parseRotator(buffer, pos, largeWorldCoords);
            value.push(result);
        }
    } else if (fieldName === 'Vector') {
        for (let i = 0; i < entryCount; i++) {
            let result;
            [pos, result] = parseVector(buffer, pos, largeWorldCoords);
            value.push(result);
        }
    } else if (fieldName === 'Transform') {
        for (let i = 0; i < entryCount; i++) {
            let translation: Vector | undefined;
            let rotation: Quaternion | undefined;
            let scale3d: Vector | undefined;
            // Read transform property array.
            while (true) {
                const property = readProperty(buffer, pos, largeWorldCoords, true);
                let pname;
                [pos, pname] = property;
                if (!pname || pname === 'None' || property.length === 2) {
                    // End of property list
                    break;
                } else if (
                    property.length === 5 &&
                    property[2] === 'StructProperty' &&
                    property[3] === 'Quat'
                ) {
                    if (pname === 'Rotation') {
                        rotation = property[4];
                    } else {
                        throw new Error(`Unexpected Quat ${pname}`);
                    }
                } else if (
                    property.length === 5 &&
                    property[2] === 'StructProperty' &&
                    property[3] === 'Vector'
                ) {
                    if (pname === 'Translation') {
                        translation = property[4];
                    } else if (pname === 'Scale3D') {
                        scale3d = property[4];
                    } else {
                        throw new Error(`Unexpected Vector ${pname}`);
                    }
                } else {
                    throw new Error(`Unsupported Transform property type ${property}`);
                }
            }
            if (!translation) throw new Error('Did not find translation');
            if (!rotation) throw new Error('Did not find translation');
            if (!scale3d) throw new Error('Did not find translation');
            const transform: Transform = {rotation, scale3d, translation};
            value.push(transform);
        }
    } else if (fieldName === 'Permission') {
        for (let i = 0; i < entryCount; i++) {
            let pname;
            const read = readProperty(buffer, pos, largeWorldCoords, true);
            [pos, pname] = read;
            if (pname !== 'Values') throw new Error(`Unexpected property entry: ${pname}`);

            const none = readProperty(buffer, pos, largeWorldCoords, true);
            [pos, pname] = none;
            if (pname !== 'None') throw new Error(`Unexpected property entry: ${pname}`);

            if (read[2] !== 'ArrayProperty') throw new Error(`Unexpected Property type: ${read[2]}`);
            if (read[3] !== 'BoolProperty') throw new Error(`Unexpected ArrayProperty type: ${read[3]}`);
            const values = read[4]!;
            const permission: Permission = {values};
            value.push(permission);
        }
    } else {
        throw new Error(`Unknown field_name: ${fieldName}`);
    }
    if (fieldSize[0] !== pos - startPos) {
        console.error(`field_size !== pos - startPos: ${fieldSize}, ${pos}, ${startPos}`);
    }
    if (pos > buffer.byteLength) {
        throw new Error(
            `${propertyName} Struct[] size ${pos} greater than ArrayProperty data size ${buffer.byteLength}, ` +
            '.sav file is corrupt.');
    }
    if (pos !== buffer.byteLength) {
        console.log(`Warning: Struct[] size ${pos} does not match ArrayProperty data size ${buffer.byteLength}, ` +
            '.sav file may be corrupt. Proceed with caution.');
    }
    if (fieldName === 'Vector') {
        return [fieldName, value as Vector[]];
    } else if (fieldName === 'Rotator') {
        return [fieldName, value as Rotator[]];
    } else if (fieldName === 'Transform') {
        return [fieldName, value as Transform[]];
    } else if (fieldName === 'Permission') {
        return [fieldName, value as Permission[]];
    } else {
        throw new Error();
    }
}

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @param {number} pos
 * @return {GvasText[]}
 */
function parseTextArray(buffer: ArrayBuffer, pos = 0): [number, GvasText[]] {
    // (u32) Entry Count
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    pos += 4;
    const array: GvasText[] = [];
    for (let i = 0; i < entryCount; i++) {
        let text;
        [pos, text] = parseText(buffer, pos);
        array.push(text);
    }
    return [pos, array];
}

function parseText(buffer: ArrayBuffer, pos = 0): [number, GvasText] {
    // (u32) Flags
    const flags = new Uint32Array(buffer.slice(pos, pos + 4))[0];
    pos += 4;
    // (u8) FTextHistory type
    const componentType = new Uint8Array(buffer, pos, 1)[0];
    pos++;
    // FTextHistory
    if (componentType === 255) { // None
        const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
        pos += 4;
        const values: GvasString[] = [];
        for (let k = 0; k < count; k++) {
            let value;
            [pos, value] = parseString(buffer, pos);
            values.push(value);
        }
        const value: GvasTextNone = {flags, values};
        return [pos, value];
    } else if (componentType === 0) { // Base
        let namespace;
        let key;
        let value;
        [pos, namespace] = parseString(buffer, pos);
        [pos, key] = parseString(buffer, pos);
        [pos, value] = parseString(buffer, pos);
        const base: GvasTextBase = {flags, key, namespace, value};
        return [pos, base];
    } else if (componentType === 3) { // ArgumentFormat
        let sourceFormat;
        [pos, sourceFormat] = parseText(buffer, pos);

        // (u32) Argument Count
        const textFormatArgCount = new Uint32Array(buffer.slice(pos, pos + 4))[0];
        pos += 4;
        const args: FormatArgumentValueMap[] = [];
        for (let j = 0; j < textFormatArgCount; j++) {
            // (str) Name
            let name;
            [pos, name] = parseString(buffer, pos);
            // (text) Value
            let value;
            [pos, value] = parseFormatArgumentValue(buffer, pos);
            args.push({name, value});
        }

        const value: GvasTextArgumentFormat = {args, flags, sourceFormat};
        return [pos, value];
    } else if (componentType === 4) { // AsNumber
        // (FAV) Source Value
        let sourceValue: FormatArgumentValue;
        [pos, sourceValue] = parseFormatArgumentValue(buffer, pos);

        // (b32) Has Number Formatting Options
        let formatOptions: NumberFormattingOptions | undefined;
        const hasFormatOptions = new Uint32Array(buffer.slice(pos, pos + 4))[0];
        pos += 4;
        if (hasFormatOptions === 0) {
            // Nothing to do
        } else if (hasFormatOptions === 1) {
            // (NFO) Number Formatting Options
            [pos, formatOptions] = parseNumberFormattingOptions(buffer, pos);
        } else {
            throw new Error(`Unexpected hasFormatOptions ${hasFormatOptions}`);
        }

        // (str) Target Culture
        let targetCulture: GvasString;
        [pos, targetCulture] = parseString(buffer, pos);

        const value: GvasTextAsNumber = {flags, formatOptions, sourceValue, targetCulture};
        // array.push(value);
        return [pos, value];
    } else {
        throw new Error(`Unexpected component type ${componentType} with flags ${flags}`);
    }
}

function parseFormatArgumentValue(buffer: ArrayBuffer, pos: number): [number, FormatArgumentValue] {
    const type = new Uint8Array(buffer, pos++, 1)[0];
    if (type === 0) {
        const [value, extra] = new Int32Array(buffer.slice(pos, pos + 8));
        pos += 8;
        if (extra !== 0) throw new Error('Overflow');
        return [pos, ['Int', value]];
    } else if (type === 4) {
        let text;
        [pos, text] = parseText(buffer, pos);
        return [pos, ['Text', text]];
    } else {
        throw new Error(`Unknown FormatArgumentValue type ${type}`);
    }
}

function parseNumberFormattingOptions(buffer: ArrayBuffer, pos: number): [number, NumberFormattingOptions] {
    // (b32) Always Include Sign
    // (b32) Use Grouping
    // (e8)  Rounding Mode
    // (i32) Minimum Integral Digits
    // (i32) Maximum Integral Digits
    // (i32) Minimum Fractional Digits
    // (i32) Maximum Fractional Digits

    const uint32s = new Uint32Array(buffer.slice(pos, pos + 8));
    const u8s = new Uint8Array(buffer, pos + 8, 1);
    const int32s = new Int32Array(buffer.slice(pos + 9, pos + 25));

    if (u8s[0] > RoundingMode.ToPositiveInfinity) {
        throw new Error(`Invalid RoundingMode ${u8s[0]}`);
    }

    const alwaysIncludeSign = Boolean(uint32s[0]);
    const useGrouping = Boolean(uint32s[1]);
    const roundingMode: RoundingMode = u8s[0];
    const minimumIntegralDigits = int32s[0];
    const maximumIntegralDigits = int32s[1];
    const minimumFractionalDigits = int32s[2];
    const maximumFractionalDigits = int32s[3];

    return [pos + 25, {
        alwaysIncludeSign,
        maximumFractionalDigits,
        maximumIntegralDigits,
        minimumFractionalDigits,
        minimumIntegralDigits,
        roundingMode,
        useGrouping,
    }];
}
