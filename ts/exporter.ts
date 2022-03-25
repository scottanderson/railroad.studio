import {
    CustomData,
    EngineVersion,
    Gvas,
    GvasHeader,
    GvasMap,
    GvasString,
    GvasText,
    RichTextFormat,
    Rotator,
    Vector,
} from 'Gvas';
import {Railroad} from 'Railroad';

/**
 * Converts a Railroad to a Gvas for export.
 * @param {Railroad} railroad
 * @return {Gvas}
 */
export function railroadToGvas(railroad: Railroad): Gvas {
    // Flatten control points and segment arrays
    let splineControlPoints: Vector[] = [];
    const splineControlPointsIndexStart: number[] = [];
    const splineControlPointsIndexEnd: number[] = [];
    let splineSegmentVisibility: boolean[] = [];
    const splineVisibilityStart: number[] = [];
    const splineVisibilityEnd: number[] = [];
    for (let idx = 0; idx < railroad.splines.length; idx++) {
        const spline = railroad.splines[idx];
        splineControlPointsIndexStart[idx] = splineControlPoints.length;
        splineControlPoints = splineControlPoints.concat(spline.controlPoints);
        splineControlPointsIndexEnd[idx] = splineControlPoints.length - 1;
        splineVisibilityStart[idx] = splineSegmentVisibility.length;
        splineSegmentVisibility = splineSegmentVisibility.concat(spline.segmentsVisible);
        splineVisibilityEnd[idx] = splineSegmentVisibility.length - 1;
    }
    // Fill in the GvasMaps
    const boolArrays: GvasMap<boolean[]> = {};
    const floatArrays: GvasMap<number[]> = {};
    const floats: GvasMap<number> = {};
    const intArrays: GvasMap<number[]> = {};
    const stringArrays: GvasMap<GvasString[]> = {};
    const strings: GvasMap<GvasString> = {};
    const rotatorArrays: GvasMap<Rotator[]> = {};
    const vectorArrays: GvasMap<Vector[]> = {};
    const textArrays: GvasMap<GvasText[]> = {};
    const frames = railroad.frames || [];
    const sandhouses = railroad.sandhouses || [];
    const switches = railroad.switches || [];
    const turntables = railroad.turntables || [];
    const watertowers = railroad.watertowers || [];
    for (const propertyName of railroad._order) {
        switch (propertyName?.toLocaleLowerCase()) {
            case 'boilerfiretemparray': floatArrays[propertyName] = frames.map((f) => f.state.boilerFireTemp); break;
            case 'boilerfuelamountarray': floatArrays[propertyName] = frames.map((f) => f.state.boilerFuelAmount); break;
            case 'boilerpressurearray': floatArrays[propertyName] = frames.map((f) => f.state.boilerPressure); break;
            case 'boilerwaterlevelarray': floatArrays[propertyName] = frames.map((f) => f.state.boilerWaterLevel); break;
            case 'boilerwatertemparray': floatArrays[propertyName] = frames.map((f) => f.state.boilerWaterTemp); break;
            case 'brakevaluearray': floatArrays[propertyName] = frames.map((f) => f.state.brakeValue); break;
            case 'compressorairpressurearray': floatArrays[propertyName] = frames.map((f) => f.state.compressorAirPressure); break;
            case 'compressorvalvevaluearray': floatArrays[propertyName] = frames.map((f) => f.state.compressorValveValue); break;
            case 'couplerfrontstatearray': boolArrays[propertyName] = frames.map((f) => f.state.couplerFrontState); break;
            case 'couplerrearstatearray': boolArrays[propertyName] = frames.map((f) => f.state.couplerRearState); break;
            case 'framelocationarray': vectorArrays[propertyName] = frames.map((f) => f.location); break;
            case 'framenamearray': textArrays[propertyName] = frames.map((f) => f.name); break;
            case 'framenumberarray': textArrays[propertyName] = frames.map((f) => f.number); break;
            case 'framerotationarray': rotatorArrays[propertyName] = frames.map((f) => f.rotation); break;
            case 'frametypearray': stringArrays[propertyName] = frames.map((f) => f.type); break;
            case 'freightamountarray': intArrays[propertyName] = frames.map((f) => f.state.freightAmount); break;
            case 'freighttypearray': stringArrays[propertyName] = frames.map((f) => f.state.freightType); break;
            case 'generatorvalvevaluearray': floatArrays[propertyName] = frames.map((f) => f.state.generatorValveValue); break;
            case 'headlightfrontstatearray': boolArrays[propertyName] = frames.map((f) => f.state.headlightFrontState); break;
            case 'headlightrearstatearray': boolArrays[propertyName] = frames.map((f) => f.state.headlightRearState); break;
            case 'headlighttypearray': intArrays[propertyName] = frames.map((f) => f.state.headlightType); break;
            case 'industrylocationarray': vectorArrays[propertyName] = railroad.industries.map((i) => i.location); break;
            case 'industryrotationarray': rotatorArrays[propertyName] = railroad.industries.map((i) => i.rotation); break;
            case 'industrystorageeduct1array': intArrays[propertyName] = railroad.industries.map((i) => i.inputs[0]); break;
            case 'industrystorageeduct2array': intArrays[propertyName] = railroad.industries.map((i) => i.inputs[1]); break;
            case 'industrystorageeduct3array': intArrays[propertyName] = railroad.industries.map((i) => i.inputs[2]); break;
            case 'industrystorageeduct4array': intArrays[propertyName] = railroad.industries.map((i) => i.inputs[3]); break;
            case 'industrystorageproduct1array': intArrays[propertyName] = railroad.industries.map((i) => i.outputs[0]); break;
            case 'industrystorageproduct2array': intArrays[propertyName] = railroad.industries.map((i) => i.outputs[1]); break;
            case 'industrystorageproduct3array': intArrays[propertyName] = railroad.industries.map((i) => i.outputs[2]); break;
            case 'industrystorageproduct4array': intArrays[propertyName] = railroad.industries.map((i) => i.outputs[3]); break;
            case 'industrytypearray': intArrays[propertyName] = railroad.industries.map((i) => i.type); break;
            case 'markerlightscenterstatearray': intArrays[propertyName] = frames.map((f) => requireArgument(f.state.markerLightsCenterState)); break;
            case 'markerlightsfrontleftstatearray': intArrays[propertyName] = frames.map((f) => f.state.markerLightsFrontLeftState); break;
            case 'markerlightsfrontrightstatearray': intArrays[propertyName] = frames.map((f) => f.state.markerLightsFrontRightState); break;
            case 'markerlightsrearleftstatearray': intArrays[propertyName] = frames.map((f) => f.state.markerLightsRearLeftState); break;
            case 'markerlightsrearrightstatearray': intArrays[propertyName] = frames.map((f) => f.state.markerLightsRearRightState); break;
            case 'playeridarray': stringArrays[propertyName] = removeUndefinedTail(railroad.players.map((p) => p.id)); break;
            case 'playerlocationarray': vectorArrays[propertyName] = railroad.players.map((p) => p.location); break;
            case 'playermoneyarray': floatArrays[propertyName] = railroad.players.map((p) => p.money); break;
            case 'playernamearray': stringArrays[propertyName] = railroad.players.map((p) => p.name); break;
            case 'playerrotationarray': floatArrays[propertyName] = removeUndefinedTail(railroad.players.map((p) => p.rotation)); break;
            case 'playerxparray': intArrays[propertyName] = railroad.players.map((p) => p.xp); break;
            case 'regulatorvaluearray': floatArrays[propertyName] = frames.map((f) => f.state.regulatorValue); break;
            case 'removedvegetationassetsarray': vectorArrays[propertyName] = railroad.removedVegetationAssets; break;
            case 'reverservaluearray': floatArrays[propertyName] = frames.map((f) => f.state.reverserValue); break;
            case 'sanderamountarray': floatArrays[propertyName] = frames.map((f) => f.state.sanderAmount); break;
            case 'sandhouselocationarray': vectorArrays[propertyName] = sandhouses.map((s) => s.location); break;
            case 'sandhouserotationarray': rotatorArrays[propertyName] = sandhouses.map((s) => s.rotation); break;
            case 'sandhousetypearray': intArrays[propertyName] = sandhouses.map((s) => s.type); break;
            case 'savegamedate': strings[propertyName] = railroad.saveGame.date; break;
            case 'savegameuniqueid': strings[propertyName] = railroad.saveGame.uniqueId; break;
            case 'savegameuniqueworldid': strings[propertyName] = railroad.saveGame.uniqueWorldId; break;
            case 'savegameversion': strings[propertyName] = railroad.saveGame.version; break;
            case 'smokestacktypearray': intArrays[propertyName] = frames.map((f) => f.state.smokestackType); break;
            case 'splinecontrolpointsarray': vectorArrays[propertyName] = splineControlPoints; break;
            case 'splinecontrolpointsindexendarray': intArrays[propertyName] = splineControlPointsIndexEnd; break;
            case 'splinecontrolpointsindexstartarray': intArrays[propertyName] = splineControlPointsIndexStart; break;
            case 'splinelocationarray': vectorArrays[propertyName] = railroad.splines.map((s) => s.location); break;
            case 'splinesegmentsvisibilityarray': boolArrays[propertyName] = splineSegmentVisibility; break;
            case 'splinetypearray': intArrays[propertyName] = railroad.splines.map((s) => s.type); break;
            case 'splinevisibilityendarray': intArrays[propertyName] = splineVisibilityEnd; break;
            case 'splinevisibilitystartarray': intArrays[propertyName] = splineVisibilityStart; break;
            case 'switchlocationarray': vectorArrays[propertyName] = switches.map((s) => s.location); break;
            case 'switchrotationarray': rotatorArrays[propertyName] = switches.map((s) => s.rotation); break;
            case 'switchstatearray': intArrays[propertyName] = switches.map((s) => s.state); break;
            case 'switchtypearray': intArrays[propertyName] = switches.map((s) => s.type); break;
            case 'tenderfuelamountarray': floatArrays[propertyName] = frames.map((f) => f.state.tenderFuelAmount); break;
            case 'tenderwateramountarray': floatArrays[propertyName] = frames.map((f) => f.state.tenderWaterAmount); break;
            case 'turntabledeckrotationarray': rotatorArrays[propertyName] = turntables.map((t) => t.deckRotation!); break;
            case 'turntablelocationarray': vectorArrays[propertyName] = turntables.map((t) => t.location); break;
            case 'turntablerotatorarray': rotatorArrays[propertyName] = turntables.map((t) => t.rotator); break;
            case 'turntabletypearray': intArrays[propertyName] = turntables.map((t) => t.type); break;
            case 'watertowerlocationarray': vectorArrays[propertyName] = watertowers.map((w) => w.location); break;
            case 'watertowerrotationarray': rotatorArrays[propertyName] = watertowers.map((w) => w.rotation); break;
            case 'watertowertypearray': intArrays[propertyName] = watertowers.map((w) => w.type); break;
            case 'watertowerwaterlevelarray': floatArrays[propertyName] = watertowers.map((w) => w.waterlevel); break;
            default: throw new Error(`Unrecognized property: ${propertyName}`);
        }
    }
    return <Gvas>{
        _header: railroad._header,
        _order: railroad._order,
        _types: railroad._types,
        boolArrays: boolArrays,
        floatArrays: floatArrays,
        floats: floats,
        intArrays: intArrays,
        rotatorArrays: rotatorArrays,
        stringArrays: stringArrays,
        strings: strings,
        textArrays: textArrays,
        vectorArrays: vectorArrays,
    };
}

function requireArgument<T>(obj?: T | null): T {
    if (obj === null) throw new Error('argument is null');
    if (typeof obj === 'undefined') throw new Error('argument is undefined');
    return obj;
}

export function gvasToBlob(gvas: Gvas): Blob {
    // seq:
    //   - id: gvas
    //     contents: 'GVAS'
    //   - id: header
    //     type: gvas_header
    //   - id: properties
    //     type: property
    //     repeat: eos
    const gvasHeaderBlob = gvasHeaderToBlob(gvas._header);
    const data: BlobPart[] = ['GVAS', gvasHeaderBlob];
    for (const propertyName of gvas._order) {
        if (!propertyName) continue;
        data.push(propertyToBlob(gvas, propertyName));
    }
    data.push(stringToBlob('None'));
    data.push(stringToBlob(null));
    return new Blob(data, {type: 'application/octet-stream'});
}

function propertyToBlob(gvas: Gvas, propertyName: string): BlobPart {
    // property:
    //   seq:
    //     - id: property_name
    //       type: string
    //     - id: property_type
    //       type: string
    //     - id: property_size
    //       type: u8
    //       if: 'property_type.length > 0'
    //     - id: data_type
    //       type: string
    //       if: 'property_type.str == "ArrayProperty"'
    //     - id: terminator
    //       contents: [0]
    //       if: 'property_type.length > 0'
    //     - id: data
    //       size: property_size
    //       if: 'property_type.length > 0 and property_type.str != "ArrayProperty"'
    //       type:
    //         switch-on: property_type.str
    //         cases:
    //           '"FloatProperty"': f4
    //           '"StrProperty"': string
    //     - id: array
    //       size: property_size
    //       if: 'property_type.str == "ArrayProperty"'
    //       type:
    //         switch-on: data_type.str
    //         cases:
    //           '"BoolProperty"': bool_array
    //           '"FloatProperty"': float_array
    //           '"IntProperty"': int_array
    //           '"StrProperty"': str_array
    //           '"StructProperty"': struct_array
    //           '"TextProperty"': text_array
    const [propertyType, dataType, structType] = gvas._types[propertyName];
    const propertyData: BlobPart[] = [];
    switch (propertyType) {
        case 'StrProperty': {
            const str = gvas.strings[propertyName] || null;
            propertyData.push(stringToBlob(str));
            break;
        }
        case 'FloatProperty': {
            const float = gvas.floats[propertyName] || NaN;
            propertyData.push(new Float32Array([float]));
            break;
        }
        case 'ArrayProperty': {
            if (!dataType) throw new Error();
            switch (dataType) {
                case 'BoolProperty': {
                    const bools = gvas.boolArrays[propertyName] || [];
                    propertyData.push(new Uint32Array([bools.length]));
                    propertyData.push(new Uint8Array(bools.map((b) => b ? 1 : 0)));
                    break;
                }
                case 'FloatProperty': {
                    const floats = gvas.floatArrays[propertyName] || [];
                    propertyData.push(new Uint32Array([floats.length]));
                    propertyData.push(new Float32Array(floats));
                    break;
                }
                case 'IntProperty': {
                    const ints = gvas.intArrays[propertyName] || [];
                    propertyData.push(new Uint32Array([ints.length]));
                    propertyData.push(new Uint32Array(ints));
                    break;
                }
                case 'StrProperty': {
                    const strs = gvas.stringArrays[propertyName] || [];
                    propertyData.push(new Uint32Array([strs.length]));
                    propertyData.push(new Blob(strs.map(stringToBlob)));
                    break;
                }
                case 'StructProperty': {
                    propertyData.push(structPropertyToBlob(structType, gvas, propertyName));
                    break;
                }
                case 'TextProperty': {
                    // text_array:
                    //   seq:
                    //     - id: entry_count
                    //       type: u4
                    //     - id: body
                    //       type: text
                    //       repeat: expr
                    //       repeat-expr: entry_count
                    const texts = gvas.textArrays[propertyName] || [];
                    propertyData.push(new Uint32Array([texts.length]));
                    propertyData.push(new Blob(texts.map(textToBlob)));
                    break;
                }
                default:
                    throw new Error(dataType);
            }
            break;
        }
        default:
            throw new Error(`Unexpected property type ${propertyType}`);
    }
    const propertyBlob = new Blob(propertyData);
    const data: BlobPart[] = [
        stringToBlob(propertyName),
        stringToBlob(propertyType),
        new Uint32Array([propertyBlob.size, 0]),
    ];
    if (propertyType === 'ArrayProperty') {
        if (!dataType) throw new Error();
        data.push(stringToBlob(dataType));
    }
    data.push(new Uint8Array([0])); // terminator
    data.push(propertyBlob);
    return new Blob(data);
}

function structPropertyToBlob(structType: string, gvas: Gvas, propertyName: string): Blob {
    const data: BlobPart[] = [];
    let structs; let structSize;
    if (structType === 'Vector') {
        structs = gvas.vectorArrays[propertyName] || [];
        structSize = 12;
    } else if (structType === 'Rotator') {
        structs = gvas.rotatorArrays[propertyName] || [];
        structSize = 12;
    } else {
        throw new Error('Unexpected structType: ' + structType);
    }
    // struct_array:
    //   seq:
    //     - id: entry_count
    //       type: u4
    data.push(new Uint32Array([structs.length]));
    //     - id: property_name
    //       type: string
    data.push(stringToBlob(propertyName));
    //     - id: struct_property
    //       contents: [15, 0, 0, 0, "StructProperty", 0]
    data.push(stringToBlob('StructProperty'));
    //     - id: field_size
    //       type: u8
    const fieldSize = structs.length * structSize;
    data.push(new Uint32Array([fieldSize, 0]));
    //     - id: field_name
    //       type: string
    data.push(stringToBlob(structType));
    //     - id: reserved
    //       size: 17
    data.push(new Uint8Array(17));
    //     - id: data
    //       size: field_size / entry_count
    //       type:
    //         switch-on: field_name.str
    //         cases:
    //           '"Vector"': vector
    //           '"Rotator"': rotator
    //       repeat: expr
    //       repeat-expr: entry_count
    for (const struct of structs) {
        let floats: number[];
        if (structType === 'Vector') {
            const v = struct as Vector;
            floats = [v.x, v.y, v.z];
        } else if (structType === 'Rotator') {
            const r = struct as Rotator;
            floats = [r.pitch, r.yaw, r.roll];
        } else {
            throw new Error(structType);
        }
        data.push(new Float32Array(floats));
    }
    return new Blob(data);
}

function gvasHeaderToBlob(header: GvasHeader): Blob {
    // gvas_header:
    //   seq:
    //     - id: save_game_version
    //       type: u4
    //     - id: save_package_version
    //       type: u4
    //     - id: engine_version
    //       type: engine_version
    //     - id: custom
    //       type: custom_format
    //     - id: save_type
    //       type: string
    return new Blob([
        new Uint32Array([
            header.saveVersion,
            header.structureVersion]),
        engineVersionToBlob(header.engineVersion),
        customToBlob(header.customFormatVersion, header.customData),
        stringToBlob(header.saveType),
    ]);
}

function customToBlob(customFormatVersion: number, customData: CustomData[]): Blob {
    // custom_format:
    //   seq:
    //     - id: version
    //       type: u4
    //     - id: count
    //       type: u4
    //     - id: custom_data
    //       type: custom_format_entry
    //       repeat: expr
    //       repeat-expr: count
    const customBlob = customData.map(customDataToBlob);
    const data: BlobPart[] = [
        new Uint32Array([
            customFormatVersion,
            customData.length]),
    ];
    return new Blob(data.concat(customBlob));
}

function customDataToBlob(customData: CustomData): BlobPart {
    // custom_format_entry:
    //   seq:
    //     - id: guid
    //       size: 16
    //     - id: value
    //       type: u4
    const values = customData.guid.concat([customData.value]);
    const result = new Uint32Array(values);
    if (result.byteLength !== 20) throw new Error();
    return result;
}

function engineVersionToBlob(engineVersion: EngineVersion): BlobPart {
    // engine_version:
    //   seq:
    //     - id: engine_version_major
    //       type: u2
    //     - id: engine_version_minor
    //       type: u2
    //     - id: engine_version_patch
    //       type: u2
    //     - id: engine_version_build
    //       type: u4
    //     - id: engine_version_build_id
    //       type: string
    return new Blob([
        new Uint16Array([
            engineVersion.major,
            engineVersion.minor,
            engineVersion.patch]),
        new Uint32Array([
            engineVersion.build]),
        stringToBlob(engineVersion.buildID),
    ]);
}

function stringToBlob(str: GvasString): BlobPart {
    // string:
    //   seq:
    //     - id: length
    //       type: s4
    //     - id: str
    //       size: length
    //       type: strz
    //       encoding: 'UTF-8'
    if (str === null) return new Uint32Array([0]);
    if (typeof str !== 'string') throw new Error('argument must be a string');
    const bytes = new TextEncoder().encode(str + '\0');
    return new Blob([
        new Uint32Array([bytes.length]),
        bytes,
    ]);
}

function textToBlob(text: GvasText): BlobPart {
    // text:
    //   seq:
    //     - id: component_type
    //       type: u4
    //     - id: indicator
    //       type: u1
    //     - id: body
    //       type:
    //         switch-on: component_type
    //         cases:
    //           0: text_empty
    //           1: text_rich
    //           2: text_simple
    if (text === null) {
        // text_empty:
        //   seq:
        //     - id: count
        //       contents: [0, 0, 0, 0]
        return new Blob([
            new Uint32Array([0]),
            new Uint8Array([255]),
            new Uint32Array([0]),
        ]);
    } else if (!Array.isArray(text) && typeof text === 'object') {
        // text_rich:
        //   seq:
        //     - id: flags
        //       contents: [8, 0, 0, 0, 0, 0, 0, 0, 0]
        //     - id: component_guid
        //       type: string
        //     - id: text_format_pattern
        //       type: string
        //     - id: text_format_arg_count
        //       type: u4
        //     - id: text_format
        //       type: text_format
        //       repeat: expr
        //       repeat-expr: text_format_arg_count
        return new Blob([
            new Uint32Array([1]),
            new Uint8Array([3]),
            new Uint8Array([8, 0, 0, 0, 0, 0, 0, 0, 0]),
            stringToBlob(text.guid),
            stringToBlob(text.pattern),
            new Uint32Array([text.textFormat.length]),
            new Blob(text.textFormat.map(rtfToBlob)),
        ]);
    } else {
        // text_simple:
        //   seq:
        //     - id: count
        //       type: u4
        //     - id: value
        //       type: string
        //       repeat: expr
        //       repeat-expr: count
        return new Blob([
            new Uint32Array([2]),
            new Uint8Array([255]),
            new Uint32Array([text.length]),
            new Blob(text.map(stringToBlob)),
        ]);
    }
}

function rtfToBlob(rtf: RichTextFormat): BlobPart {
    // text_format:
    //   seq:
    //     - id: format_key
    //       type: string
    //     - id: separator
    //       contents: [4]
    //     - id: content_type
    //       type: u4
    //     - id: indicator
    //       contents: [255]
    //     - id: opt
    //       type: u4
    //     - id: first_line
    //       type: string
    //       if: opt == 1
    return new Blob([
        stringToBlob(rtf.formatKey),
        new Uint8Array([4]),
        new Uint32Array([rtf.contentType]),
        new Uint8Array([255]),
        new Uint32Array([rtf.values.length]),
        new Blob(rtf.values.map(stringToBlob)),
    ]);
}

function removeUndefinedTail<T>(arr: (T | undefined)[]): T[] {
    const filtered = arr.filter((x): x is T => x !== undefined);
    if (filtered.length === arr.length) return filtered;
    if (filtered === arr.slice(0, filtered.length)) return filtered;
    throw new Error('Found undefined elements before tail');
}

