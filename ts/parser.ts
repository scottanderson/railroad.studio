import {
    CustomData,
    EngineVersion,
    Gvas,
    GvasHeader,
    GvasString,
    GvasText,
    GvasTypes,
    RichTextFormat,
    gvasToString,
} from './Gvas';
import {Rotator} from './Rotator';
import {Vector} from './Vector';

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
        gvasVersion,
        structureVersion,
        unknownVersion,
        engineVersion,
        customFormatVersion,
        customData,
        saveType,
    };
    const result: Gvas = {
        _header: header,
        _order: [],
        _types: {},
        boolArrays: {},
        bools: {},
        byteArrays: {},
        floatArrays: {},
        floats: {},
        intArrays: {},
        ints: {},
        rotatorArrays: {},
        stringArrays: {},
        strings: {},
        textArrays: {},
        vectorArrays: {},
    };
    const largeWorldCoords = (gvasVersion === 3);
    while (pos < buffer.byteLength) {
        let pname; let ptype;
        [pos, pname, ptype] = parseProperty(buffer, pos, result, largeWorldCoords);
        if (!pname) throw new Error('Property name is null');
        if (pname === 'None') break; // End of properties
        result._order.push(pname);
        result._types[pname] = ptype;
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
        major: engineVersionMajor,
        minor: engineVersionMinor,
        patch: engineVersionPatch,
        build: engineVersionBuild,
        buildID: engineVersionBuildID,
    };
    return [pos, engineVersion];
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

function parseProperty(
    b: ArrayBuffer,
    pos: number,
    target: Gvas,
    largeWorldCoords: boolean,
): [number, GvasString, GvasTypes] {
    let pname;
    let ptype: GvasTypes;
    const parsed = readProperty(b, pos, largeWorldCoords);
    [pos, pname] = parsed;
    if (!pname || pname === 'None' || parsed.length === 2) {
        // NoneProperty, bail without storring type info
        return [pos, pname, []];
    } else if (parsed[2] === 'BoolProperty') {
        ptype = [parsed[2]];
        target.bools[pname] = parsed[3];
    } else if (parsed[2] === 'StrProperty') {
        ptype = [parsed[2]];
        target.strings[pname] = parsed[3];
    } else if (parsed[2] === 'FloatProperty') {
        ptype = [parsed[2]];
        target.floats[pname] = parsed[3];
    } else if (parsed[2] === 'IntProperty') {
        ptype = [parsed[2]];
        target.ints[pname] = parsed[3];
    } else if (parsed[2] !== 'ArrayProperty') {
        throw new Error(`Unexpected Property type: ${parsed[2]}`);
    } else if (parsed[3] === 'BoolProperty') {
        ptype = [parsed[2], parsed[3]];
        target.boolArrays[pname] = parsed[4];
    } else if (parsed[3] === 'IntProperty') {
        ptype = [parsed[2], parsed[3]];
        target.intArrays[pname] = parsed[4];
    } else if (parsed[3] === 'FloatProperty') {
        ptype = [parsed[2], parsed[3]];
        target.floatArrays[pname] = parsed[4];
    } else if (parsed[3] === 'StrProperty') {
        ptype = [parsed[2], parsed[3]];
        target.stringArrays[pname] = parsed[4];
    } else if (parsed[3] === 'TextProperty') {
        ptype = [parsed[2], parsed[3]];
        target.textArrays[pname] = parsed[4];
    } else if (parsed[3] === 'ByteProperty') {
        ptype = [parsed[2], parsed[3]];
        target.byteArrays[pname] = parsed[4];
    } else if (parsed[3] !== 'StructProperty') {
        throw new Error(`Unexpected ArrayProperty type: ${parsed[3]}`);
    } else if (parsed[4] === 'Vector') {
        ptype = [parsed[2], parsed[3], parsed[4]];
        target.vectorArrays[pname] = parsed[5];
    } else if (parsed[4] === 'Rotator') {
        ptype = [parsed[2], parsed[3], parsed[4]];
        target.rotatorArrays[pname] = parsed[5];
    } else {
        throw new Error(`Unhandled StructProperty type: ${parsed[4]}`);
    }
    target._types[pname] = ptype;
    return [pos, pname, ptype];
}

type ParsePropertyReturnType = (
    | [number, GvasString]
    | [number, GvasString, 'BoolProperty', boolean]
    | [number, GvasString, 'FloatProperty', number]
    | [number, GvasString, 'IntProperty', number]
    | [number, GvasString, 'StrProperty', GvasString]
    | [number, GvasString, 'ArrayProperty', 'BoolProperty', boolean[]]
    | [number, GvasString, 'ArrayProperty', 'ByteProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'FloatProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'IntProperty', number[]]
    | [number, GvasString, 'ArrayProperty', 'StrProperty', GvasString[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Rotator', Rotator[]]
    | [number, GvasString, 'ArrayProperty', 'StructProperty', 'Vector', Vector[]]
    | [number, GvasString, 'ArrayProperty', 'TextProperty', GvasText[]]
);

function readProperty(
    b: ArrayBuffer,
    pos: number,
    largeWorldCoords: boolean,
): ParsePropertyReturnType {
    // pname
    let pname;
    [pos, pname] = parseString(b, pos);
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
    // arrays only: dtype
    let dtype = null;
    const isArray = (ptype === 'ArrayProperty');
    if (isArray) {
        [pos, dtype] = parseString(b, pos);
    }
    // bool only: value
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
    // terminator
    const terminator = new Uint8Array(b, pos, 1)[0];
    if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
    pos++;
    // pdata
    const pdata = b.slice(pos, pos + plen);
    pos += plen;
    if (ptype === 'StrProperty') {
        return [pos, pname, ptype, parseString(pdata, 0)[1]];
    } else if (ptype === 'FloatProperty') {
        if (plen !== 4) throw new Error(`FloatProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Float32Array(pdata)[0]];
    } else if (ptype === 'IntProperty') {
        if (plen !== 4) throw new Error(`IntProperty length !== 4, ${plen}, ${pdata}`);
        return [pos, pname, ptype, new Uint32Array(pdata)[0]];
    } else if (ptype !== 'ArrayProperty') {
        throw new Error(`property type for '${pname}' is not implemented ('${ptype}')`);
    } else if (dtype === 'StructProperty') {
        const [stype, sdata] = parseStructArray(pdata, pname, largeWorldCoords);
        if (stype === 'Rotator') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else if (stype === 'Vector') {
            return [pos, pname, ptype, dtype, stype, sdata];
        } else {
            throw new Error(gvasToString(stype));
        }
    } else if (dtype === 'BoolProperty') {
        return [pos, pname, ptype, dtype, parseBoolArray(pdata)];
    } else if (dtype === 'IntProperty') {
        return [pos, pname, ptype, dtype, parseIntArray(pdata)];
    } else if (dtype === 'FloatProperty') {
        return [pos, pname, ptype, dtype, parseFloatArray(pdata)];
    } else if (dtype === 'StrProperty') {
        return [pos, pname, ptype, dtype, parseStringArray(pdata)];
    } else if (dtype === 'TextProperty') {
        return [pos, pname, ptype, dtype, parseTextArray(pdata)];
    } else if (dtype === 'ByteProperty') {
        return [pos, pname, ptype, dtype, [...new Uint8Array(pdata)]];
    } else {
        throw new Error(`${dtype} data type for '${pname}' is not implemented`);
    }
}

function parseBoolArray(buffer: ArrayBuffer) {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const uint8View = new Uint8Array(buffer, 4, entryCount);
    return [...uint8View].map(Boolean);
}

function parseIntArray(buffer: ArrayBuffer) {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const int32View = new Int32Array(buffer, 4, entryCount);
    return [...int32View];
}

function parseFloatArray(buffer: ArrayBuffer) {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    const floatView = new Float32Array(buffer, 4, entryCount);
    return [...floatView];
}

/**
 * Parse a string array from a buffer.
 * @param {ArrayBuffer} buffer
 * @return {GvasString[]}
 */
function parseStringArray(buffer: ArrayBuffer): GvasString[] {
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    const value = [];
    for (let i = 0; i < entryCount; i++) {
        let str;
        [pos, str] = parseString(buffer, pos);
        value.push(str);
    }
    return value;
}

type ParseStructArrayReturnType =
    | ['Rotator', Rotator[]]
    | ['Vector', Vector[]];

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
    const structSize = largeWorldCoords ? 24 : 12;
    if (fieldSize[0] !== structSize * entryCount) {
        throw new Error(`field_size !== ${structSize} * entryCount: ${fieldSize}, ${entryCount}`);
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
    for (let i = 0; i < entryCount; i++) {
        const values = new (largeWorldCoords ? Float64Array : Float32Array)(buffer.slice(pos, pos + structSize));
        pos += structSize;
        if (fieldName === 'Rotator') {
            value.push({
                pitch: values[0], // y (need to confirm)
                yaw: values[1], // Rotation around the Z axis
                roll: values[2], // x (need to confirm)
            });
        } else if (fieldName === 'Vector') {
            value.push({
                x: values[0], // East (need to confirm)
                y: values[1], // North (need to confirm)
                z: values[2], // Altitude
            });
        } else {
            throw new Error(`Unknown field_name: ${fieldName}`);
        }
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
    } else {
        throw new Error();
    }
}

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @return {GvasText[]}
 */
function parseTextArray(buffer: ArrayBuffer): GvasText[] {
    // text_array:
    //   seq:
    //     - id: entry_count
    //       type: u4
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    //     - id: body
    //       type: text
    //       repeat: expr
    //       repeat-expr: entry_count
    const array: GvasText[] = [];
    for (let i = 0; i < entryCount; i++) {
        // text:
        //   seq:
        //     - id: component_type
        //       type: u4
        const componentType = new Uint32Array(buffer.slice(pos, pos + 4))[0];
        if (componentType < 0 || componentType > 2) throw new Error(`Unexpected component type ${componentType}`);
        pos += 4;
        //     - id: indicator
        //       type: u1
        const indicator = new Uint8Array(buffer, pos, 1)[0];
        if (indicator !== [255, 3, 255][componentType]) throw new Error(`Unexpected component type ${componentType}`);
        pos++;
        //     - id: body
        //       type:
        //         switch-on: component_type
        //         cases:
        //           0: text_empty
        //           1: text_rich
        //           2: text_simple
        if (componentType === 0) {
            // text_empty:
            //   seq:
            //     - id: count
            //       contents: [0, 0, 0, 0]
            const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            if (count !== 0) throw new Error(`Expected count == 0, ${count}`);
            array.push(null);
        } else if (componentType === 1) {
            // text_rich:
            //   seq:
            //     - id: flags
            //       contents: [8, 0, 0, 0, 0, 0, 0, 0, 0]
            const numFlags = new Uint8Array(buffer, pos, 1)[0];
            if (numFlags !== 8) throw new Error(`Expected numFlags == 8, ${numFlags}`);
            const flags = new Uint32Array(buffer.slice(pos + 1, pos + 5))[0];
            if (flags !== 0) throw new Error(`Expected flags == 0, ${flags}`);
            pos += 5;
            let unknownStr;
            [pos, unknownStr] = parseString(buffer, pos);
            if (unknownStr && unknownStr.length) throw new Error(`Expected empty str, ${unknownStr}`);
            //     - id: component_guid
            //       type: string
            let componentGuid;
            [pos, componentGuid] = parseString(buffer, pos);
            //     - id: text_format_pattern
            //       type: string
            let textFormatPattern;
            [pos, textFormatPattern] = parseString(buffer, pos);
            //     - id: text_format_arg_count
            //       type: u4
            const textFormatArgCount = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            //     - id: text_format
            //       type: text_format
            //       repeat: expr
            //       repeat-expr: text_format_arg_count
            const textFormat: RichTextFormat[] = [];
            for (let j = 0; j < textFormatArgCount; j++) {
                // textFormat:
                //   seq:
                //     - id: format_key
                //       type: string
                let formatKey;
                [pos, formatKey] = parseString(buffer, pos);
                //     - id: separator
                //       contents: [4]
                const separator = new Uint8Array(buffer, pos++, 1)[0];
                if (separator !== 4) {
                    throw new Error(`Expected separator == 4, ${separator}`);
                }
                //     - id: content_type
                //       type: u4
                const contentType = new Uint32Array(buffer.slice(pos, pos + 4))[0];
                pos += 4;
                //     - id: indicator
                //       contents: [255]
                const indicator = new Uint8Array(buffer, pos++, 1)[0];
                if (indicator !== 255) {
                    throw new Error(`Expected indicator == 255, ${indicator}`);
                }
                //     - id: count
                //       type: u4
                const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
                pos += 4;
                const values = [];
                for (let k = 0; k < count; k++) {
                    // - id: value
                    //   type: string
                    //   repeat: expr
                    //   repeat-expr: count
                    let value;
                    [pos, value] = parseString(buffer, pos);
                    values.push(value);
                }
                textFormat.push({
                    formatKey: formatKey,
                    contentType: contentType,
                    values: values,
                });
            }
            array.push({
                guid: componentGuid,
                pattern: textFormatPattern,
                textFormat: textFormat,
            });
        } else if (componentType === 2) {
            // text_simple:
            //   seq:
            //     - id: count
            //       type: u4
            const count = new Uint32Array(buffer.slice(pos, pos + 4))[0];
            pos += 4;
            const values: GvasString[] = [];
            for (let k = 0; k < count; k++) {
                // - id: value
                //   type: string
                //   repeat: expr
                //   repeat-expr: count
                let value;
                [pos, value] = parseString(buffer, pos);
                values.push(value);
            }
            array.push(values);
        } else {
            throw new Error(`Unknown componentType: ${componentType}`);
        }
    }
    return array;
}
