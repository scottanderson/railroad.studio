import {CustomData, EngineVersion, Gvas, GvasHeader, GvasString, GvasText, GvasTypes, RichTextFormat, Rotator, Vector} from './Gvas';

/**
 * Parse a GVAS file from an ArrayBuffer.
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
    let uint32View = new Uint32Array(buffer, 4, 2);
    const saveVersion = uint32View[0];
    const structureVersion = uint32View[1];
    let [pos, engineVersion]: [number, EngineVersion] = parseEngineVersion(buffer, 12);
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
        saveVersion: saveVersion,
        structureVersion: structureVersion,
        engineVersion: engineVersion,
        customFormatVersion: customFormatVersion,
        customData: customData,
        saveType: saveType,
    };
    const result: Gvas = {
        _header: header,
        _order: [],
        _types: {},
        boolArrays: {},
        floatArrays: {},
        floats: {},
        intArrays: {},
        rotatorArrays: {},
        stringArrays: {},
        strings: {},
        textArrays: {},
        vectorArrays: {},
    };
    while (pos < buffer.byteLength) {
        let pname; let ptype;
        [pos, pname, ptype] = parseProperty(buffer, pos, result);
        if (!pname) throw new Error('Property name is null');
        if (pname === 'None') break; // End of properties
        result._order.push(pname);
        result._types[pname] = ptype;
    }
    if (pos !== buffer.byteLength) throw new Error(`Found extra data at EOF, pos=${pos}, byteLength=${buffer.byteLength}`);
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

function parseProperty(b: ArrayBuffer, pos: number, target: Gvas): [number, GvasString, GvasTypes] {
    // pname
    let pname;
    [pos, pname] = parseString(b, pos);
    // ptype
    let ptype: GvasString;
    [pos, ptype] = parseString(b, pos);
    if (!pname || pname === 'None') {
        if (ptype !== null) throw new Error(`Unexpected type: ${ptype}`);
        return [pos, pname, []];
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
    // terminator
    const terminator = new Uint8Array(b, pos, 1)[0];
    if (terminator !== 0) throw new Error(`terminator !== 0, ${terminator}`);
    pos++;
    // pdata
    const pdata = b.slice(pos, pos + plen);
    pos += plen;
    if (ptype === 'StrProperty') {
        target.strings[pname] = parseString(pdata, 0)[1];
        const type: GvasTypes = [ptype];
        target._types[pname] = type;
        return [pos, pname, type];
    } else if (ptype === 'FloatProperty') {
        if (plen !== 4) throw new Error(`FloatProperty length !== 4, ${plen}, ${pdata}`);
        target.floats[pname] = new Float32Array(pdata)[0];
        const type: GvasTypes = [ptype];
        target._types[pname] = type;
        return [pos, pname, type];
    } else if (ptype !== 'ArrayProperty') {
        throw new Error(`property type for '${pname}' is not implemented ('${ptype}')`);
    } else if (dtype === 'StructProperty') {
        const [stype, structs] = parseStructArray(pdata, pname);
        if (stype === 'Rotator') {
            target.rotatorArrays[pname] = structs as Rotator[];
        } else if (stype === 'Vector') {
            target.vectorArrays[pname] = structs as Vector[];
        } else {
            throw new Error(stype || '');
        }
        const type: GvasTypes = [ptype, dtype, stype];
        target._types[pname] = type;
        return [pos, pname, type];
    } else if (dtype === 'BoolProperty') {
        target.boolArrays[pname] = parseBoolArray(pdata);
    } else if (dtype === 'IntProperty') {
        target.intArrays[pname] = parseIntArray(pdata);
    } else if (dtype === 'FloatProperty') {
        target.floatArrays[pname] = parseFloatArray(pdata);
    } else if (dtype === 'StrProperty') {
        target.stringArrays[pname] = parseStringArray(pdata);
    } else if (dtype === 'TextProperty') {
        target.textArrays[pname] = parseTextArray(pdata);
    } else {
        throw new Error(`${dtype} data type for '${pname}' is not implemented`);
    }
    const type: GvasTypes = [ptype, dtype];
    target._types[pname] = type;
    return [pos, pname, type];
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

/**
 * Parse a struct array from a buffer.
 * @param {ArrayBuffer} buffer
 * @param {GvasString} expectPropertyName
 * @return {GvasStruct[]}
 */
function parseStructArray(buffer: ArrayBuffer, expectPropertyName: GvasString): [GvasString, (Rotator | Vector)[]] {
    // - id: entry_count
    //   type: u4
    const entryCount = new Uint32Array(buffer, 0, 1)[0];
    let pos = 4;
    // - id: property_name
    //   type: string
    let propertyName;
    [pos, propertyName] = parseString(buffer, pos);
    if (propertyName !== expectPropertyName) throw new Error(`Expected propertyName = ${expectPropertyName}, ${propertyName}`);
    // - id: struct_property
    //   contents: [15, 0, 0, 0, "StructProperty", 0]
    let structProperty;
    [pos, structProperty] = parseString(buffer, pos);
    if (structProperty !== 'StructProperty') throw new Error(`Invalid struct header: ${structProperty}`);
    // - id: field_size
    //   type: u8
    const fieldSize = new Uint32Array(buffer.slice(pos, pos + 8));
    pos += 8;
    if (fieldSize[1] !== 0) {
        throw new Error(`field_size too large: ${fieldSize[1]}`);
    }
    if (fieldSize[0] !== 12 * entryCount) {
        throw new Error(`field_size !== 12 * entryCount: ${fieldSize}, ${entryCount}`);
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
        const values = new Float32Array(buffer.slice(pos, pos + 12));
        pos += 12;
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
        throw new Error(`${propertyName} Struct[] size ${pos} greater than ArrayProperty data size ${buffer.byteLength}, .sav file is corrupt.`);
    }
    if (pos !== buffer.byteLength) {
        console.log(`Warning: Struct[] size ${pos} does not match ArrayProperty data size ${buffer.byteLength}, .sav file may be corrupt. Proceed with caution.`);
    }
    return [fieldName, value];
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
            const flags = [...new Uint32Array(buffer.slice(pos + 1, pos + 9))];
            if (flags[0] !== 0 || flags[1] !== 0) throw new Error(`Expected flags == [0, 0], ${flags}`);
            pos += 9;
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
