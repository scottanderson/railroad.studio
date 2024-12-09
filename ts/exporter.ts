/* global BlobPart */
import {
    CustomData,
    EngineVersion,
    FormatArgumentValue,
    Gvas,
    GvasHeader,
    GvasString,
    GvasText,
    GvasTypes,
    NumberFormattingOptions,
} from './Gvas';
import {Permission} from './Permission';
import {Quaternion} from './Quaternion';
import {Railroad} from './Railroad';
import {Rotator} from './Rotator';
import {Transform} from './Transform';
import {Vector} from './Vector';
import {checkSaveType} from './importer';

const exportKeys = [
    'AnimateTimeOfDay',
    'BinaryTexture',
    'BoilerFireTempArray',
    'BoilerFuelAmountArray',
    'BoilerPressureArray',
    'BoilerWaterLevelArray',
    'BoilerWaterTempArray',
    'BrakeValueArray',
    'CompressorairPressureArray',
    'CompressorValveValueArray',
    'CouplerFrontStateArray',
    'CouplerrearStateArray',
    'DayLength',
    'FrameLocationArray',
    'FrameNameArray',
    'FrameNumberArray',
    'FrameRotationArray',
    'FrameTypeArray',
    'FreightAmountArray',
    'FreightTypeArray',
    'FreightTypes',
    'GameLevelName',
    'GeneratorValveValueArray',
    'HeadlightFrontStateArray',
    'HeadlightrearStateArray',
    'HeadlightTypeArray',
    'IndustryLocationArray',
    'IndustryNameArray',
    'IndustryRotationArray',
    'IndustryStorageEduct1Array',
    'IndustryStorageEduct2Array',
    'IndustryStorageEduct3Array',
    'IndustryStorageEduct4Array',
    'IndustryStorageProduct1Array',
    'IndustryStorageProduct2Array',
    'IndustryStorageProduct3Array',
    'IndustryStorageProduct4Array',
    'IndustryTypeArray',
    'MarkerLightsCenterStateArray',
    'MarkerLightsFrontLeftStateArray',
    'MarkerLightsFrontRightStateArray',
    'MarkerLightsRearLeftStateArray',
    'MarkerLightsRearRightStateArray',
    'NightLength',
    'Permissions',
    'PlayerIDArray',
    'PlayerLocationArray',
    'PlayerMoneyArray',
    'PlayerNameArray',
    'PlayerRotationArray',
    'PlayerXPArray',
    'PropsTextArray',
    'PropsTransformArray',
    'RegulatorValueArray',
    'RemovedVegetationAssetsArray',
    'ReverserValueArray',
    'SanderAmountArray',
    'SandhouseLocationArray',
    'SandhouseRotationArray',
    'SandhouseTypeArray',
    'SaveGameDate',
    'SaveGameUniqueID',
    'SaveGameUniqueWorldID',
    'SaveGameVersion',
    'ServerOwnerPlayerIndex',
    'SmokestackTypeArray',
    'SplineControlPointsArray',
    'SplineControlPointsindexendArray',
    'SplineControlPointsindexstartArray',
    'SplineLocationArray',
    'SplineSegmentsVisibilityArray',
    'SplineTrackEndPointArray',
    'SplineTrackEndTangentArray',
    'SplineTrackIds',
    'SplineTrackLocationArray',
    'SplineTrackPaintStyleArray',
    'SplineTrackRotationArray',
    'SplineTrackStartPointArray',
    'SplineTrackStartTangentArray',
    'SplineTrackSwitchStateArray',
    'SplineTrackTypeArray',
    'SplineTypeArray',
    'SplineVisibilityendArray',
    'SplineVisibilitystartArray',
    'SwitchLocationArray',
    'SwitchRotationArray',
    'SwitchStateArray',
    'SwitchTypeArray',
    'TenderFuelAmountArray',
    'TenderWaterAmountArray',
    'TimeOfDay',
    'TurntableDeckRotationArray',
    'TurntableLocationArray',
    'TurntableRotatorArray',
    'TurntableTypeArray',
    'TurntableTypes',
    'VegetationInstanceIndexArray',
    'VegetationISMCompNameArray',
    'WatertowerLocationArray',
    'WatertowerRotationArray',
    'WatertowerTypeArray',
    'WatertowerWaterLevelArray',
    'WeatherChangeIntervalMax',
    'WeatherChangeIntervalMin',
    'WeatherTransitionTime',
    'WeatherType',
];

/**
 * Converts a Railroad object into a Gvas object, which can be exported to a
 * file in the GVAS format.
 *
 * The function first flattens the spline control points and segment arrays, so
 * that they are stored in a single list rather than being split up into
 * multiple arrays. It then iterates over all the elements of the Railroad
 * object and stores their properties into the appropriate fields in the Gvas
 * object. Finally, it constructs the GvasHeader object and returns the Gvas
 * object.
 *
 * The Gvas object is a representation of the data in a GVAS file, with
 * properties for each of the different types of data that can be stored in a
 * GVAS file (e.g. strings, integers, arrays of vectors). The Railroad object,
 * on the other hand, is a higher-level representation of a train game, with
 * objects representing different types of game elements (e.g. frames, splines,
 * industries).
 * @param {Railroad} railroad
 * @return {Gvas}
 */
export function railroadToGvas(railroad: Railroad): Gvas {
    const isNovemberUpdate = checkSaveType(railroad._header);
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
    const boolArrays: Record<string, boolean[]> = {};
    const bools: Record<string, boolean> = {};
    const byteArrays: Record<string, number[]> = {};
    const dateTimes: Record<string, bigint> = {};
    const enumArrays: Record<string, GvasString[]> = {};
    const floatArrays: Record<string, number[]> = {};
    const floats: Record<string, number> = {};
    const intArrays: Record<string, number[]> = {};
    const ints: Record<string, number> = {};
    const nameArrays: Record<string, GvasString[]> = {};
    const permissionArrays: Record<string, Permission[]> = {};
    const rotatorArrays: Record<string, Rotator[]> = {};
    const stringArrays: Record<string, GvasString[]> = {};
    const strings: Record<string, GvasString> = {};
    const textArrays: Record<string, GvasText[]> = {};
    const transformArrays: Record<string, Transform[]> = {};
    const vectorArrays: Record<string, Vector[]> = {};
    const orderLowerCase = railroad._order.map((s) => s.toLowerCase());
    // Add missing keys to railroad._order
    for (const propertyName of exportKeys) {
        const lowerCase = propertyName.toLowerCase();
        if (!orderLowerCase.includes(lowerCase)) {
            railroad._order.push(propertyName);
        }
    }
    // Fill in the properties, preserving name capitalization
    for (const propertyName of railroad._order) {
        switch (propertyName.toLowerCase()) {
            case 'animatetimeofday':
                if (typeof railroad.settings.animateTimeOfDay !== 'undefined') {
                    bools[propertyName] = railroad.settings.animateTimeOfDay;
                }
                break;
            case 'binarytexture':
                byteArrays[propertyName] = railroad.settings.binaryTexture;
                break;
            case 'boilerfiretemparray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.boilerFireTemp);
                break;
            case 'boilerfuelamountarray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.boilerFuelAmount);
                break;
            case 'boilerpressurearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.boilerPressure);
                break;
            case 'boilerwaterlevelarray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.boilerWaterLevel);
                break;
            case 'boilerwatertemparray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.boilerWaterTemp);
                break;
            case 'brakevaluearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.brakeValue);
                break;
            case 'compressorairpressurearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.compressorAirPressure);
                break;
            case 'compressorvalvevaluearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.compressorValveValue);
                break;
            case 'couplerfrontstatearray':
                boolArrays[propertyName] = railroad.frames.map((f) => f.state.couplerFrontState);
                break;
            case 'couplerrearstatearray':
                boolArrays[propertyName] = railroad.frames.map((f) => f.state.couplerRearState);
                break;
            case 'daylength':
                if (typeof railroad.settings.dayLength !== 'undefined') {
                    floats[propertyName] = railroad.settings.dayLength;
                }
                break;
            case 'framelocationarray':
                vectorArrays[propertyName] = railroad.frames.map((f) => f.location);
                break;
            case 'framenamearray':
                textArrays[propertyName] = railroad.frames.map((f) => f.name);
                break;
            case 'framenumberarray':
                textArrays[propertyName] = railroad.frames.map((f) => f.number);
                break;
            case 'framerotationarray':
                rotatorArrays[propertyName] = railroad.frames.map((f) => f.rotation);
                break;
            case 'frametypearray':
                stringArrays[propertyName] = railroad.frames.map((f) => f.type);
                break;
            case 'freightamountarray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.freightAmount);
                break;
            case 'freighttypearray':
                if (isNovemberUpdate) break;
                stringArrays[propertyName] = railroad.frames.map((f) => f.state.freightType);
                break;
            case 'freighttypes':
                if (!isNovemberUpdate) break;
                enumArrays[propertyName] = railroad.frames.map((f) => f.state.freightType);
                break;
            case 'gamelevelname':
                strings[propertyName] = railroad.settings.gameLevelName;
                break;
            case 'generatorvalvevaluearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.generatorValveValue);
                break;
            case 'headlightfrontstatearray':
                boolArrays[propertyName] = railroad.frames.map((f) => f.state.headlightFrontState);
                break;
            case 'headlightrearstatearray':
                boolArrays[propertyName] = railroad.frames.map((f) => f.state.headlightRearState);
                break;
            case 'headlighttypearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.headlightType);
                break;
            case 'industrylocationarray':
                vectorArrays[propertyName] = railroad.industries.map((i) => i.location);
                break;
            case 'industrynamearray':
                if (!isNovemberUpdate) break;
                nameArrays[propertyName] = railroad.industries.map((i) => {
                    if (typeof i.type !== 'string') throw new Error(`Unexpected type ${i.type}`);
                    return i.type;
                });
                break;
            case 'industryrotationarray':
                rotatorArrays[propertyName] = railroad.industries.map((i) => i.rotation);
                break;
            case 'industrystorageeduct1array':
                intArrays[propertyName] = railroad.industries.map((i) => i.inputs[0]);
                break;
            case 'industrystorageeduct2array':
                intArrays[propertyName] = railroad.industries.map((i) => i.inputs[1]);
                break;
            case 'industrystorageeduct3array':
                intArrays[propertyName] = railroad.industries.map((i) => i.inputs[2]);
                break;
            case 'industrystorageeduct4array':
                intArrays[propertyName] = railroad.industries.map((i) => i.inputs[3]);
                break;
            case 'industrystorageproduct1array':
                intArrays[propertyName] = railroad.industries.map((i) => i.outputs[0]);
                break;
            case 'industrystorageproduct2array':
                intArrays[propertyName] = railroad.industries.map((i) => i.outputs[1]);
                break;
            case 'industrystorageproduct3array':
                intArrays[propertyName] = railroad.industries.map((i) => i.outputs[2]);
                break;
            case 'industrystorageproduct4array':
                intArrays[propertyName] = railroad.industries.map((i) => i.outputs[3]);
                break;
            case 'industrytypearray':
                if (isNovemberUpdate) break;
                intArrays[propertyName] = railroad.industries.map((i) => {
                    if (typeof i.type !== 'number') throw new Error(`Unexpected type ${i.type}`);
                    return i.type;
                });
                break;
            case 'markerlightscenterstatearray':
                intArrays[propertyName] = removeUndefinedTail(
                    railroad.frames.map((f) => f.state.markerLightsCenterState));
                break;
            case 'markerlightsfrontleftstatearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.markerLightsFrontLeftState);
                break;
            case 'markerlightsfrontrightstatearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.markerLightsFrontRightState);
                break;
            case 'markerlightsrearleftstatearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.markerLightsRearLeftState);
                break;
            case 'markerlightsrearrightstatearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.markerLightsRearRightState);
                break;
            case 'nightlength':
                if (typeof railroad.settings.nightLength !== 'undefined') {
                    floats[propertyName] = railroad.settings.nightLength;
                }
                break;
            case 'painttypearray':
                intArrays[propertyName] = removeUndefinedTail(
                    railroad.frames.map((f) => f.state.paintType));
                break;
            case 'permissions':
                permissionArrays[propertyName] = removeUndefinedTail(
                    railroad.players.map((p) => p.permissions));
                break;
            case 'playeridarray':
            case 'playerids':
                stringArrays[propertyName] = removeUndefinedTail(
                    railroad.players.map((p) => p.id));
                break;
            case 'playerlocationarray':
                vectorArrays[propertyName] = removeUndefinedTail(
                    railroad.players.map((p) => p.location));
                break;
            case 'playermoneyarray':
                floatArrays[propertyName] = railroad.players.map((p) => p.money);
                break;
            case 'playernamearray':
                stringArrays[propertyName] = railroad.players.map((p) => p.name);
                break;
            case 'playerrotationarray':
                floatArrays[propertyName] = removeUndefinedTail(
                    railroad.players.map((p) => p.rotation));
                break;
            case 'playerxparray':
                intArrays[propertyName] = railroad.players.map((p) => p.xp);
                break;
            case 'propsnamearray':
                stringArrays[propertyName] = railroad.props.map((p) => p.name);
                break;
            case 'propsnames':
                nameArrays[propertyName] = railroad.props.map((p) => p.name);
                break;
            case 'propstextarray':
                textArrays[propertyName] = railroad.props.map((p) => p.text);
                break;
            case 'propstransformarray':
                transformArrays[propertyName] = railroad.props.map((p) => p.transform);
                break;
            case 'regulatorvaluearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.regulatorValue);
                break;
            case 'removedvegetationassetsarray':
                vectorArrays[propertyName] = railroad.removedVegetationAssets;
                break;
            case 'reverservaluearray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.reverserValue);
                break;
            case 'sanderamountarray':
                floatArrays[propertyName] = removeUndefinedTail(
                    railroad.frames.map((f) => f.state.sanderAmount));
                break;
            case 'sandhouselocationarray':
                vectorArrays[propertyName] = railroad.sandhouses.map((s) => s.location);
                break;
            case 'sandhouserotationarray':
                rotatorArrays[propertyName] = railroad.sandhouses.map((s) => s.rotation);
                break;
            case 'sandhousetypearray':
                intArrays[propertyName] = railroad.sandhouses.map((s) => s.type);
                break;
            case 'savegamedate':
                strings[propertyName] = railroad.saveGame.date;
                break;
            case 'savegameuniqueid':
                strings[propertyName] = railroad.saveGame.uniqueId;
                break;
            case 'savegameuniqueworldid':
                strings[propertyName] = railroad.saveGame.uniqueWorldId;
                break;
            case 'savegameversion':
                strings[propertyName] = railroad.saveGame.version;
                break;
            case 'serverownerplayerindex':
                if (typeof railroad.settings.serverOwnerPlayerIndex !== 'undefined') {
                    ints[propertyName] = railroad.settings.serverOwnerPlayerIndex;
                }
                break;
            case 'smokestacktypearray':
                intArrays[propertyName] = railroad.frames.map((f) => f.state.smokestackType);
                break;
            case 'splinecontrolpointsarray':
                vectorArrays[propertyName] = splineControlPoints;
                break;
            case 'splinecontrolpointsindexendarray':
                intArrays[propertyName] = splineControlPointsIndexEnd;
                break;
            case 'splinecontrolpointsindexstartarray':
                intArrays[propertyName] = splineControlPointsIndexStart;
                break;
            case 'splinelocationarray':
                vectorArrays[propertyName] = railroad.splines.map((s) => s.location);
                break;
            case 'splinesegmentsvisibilityarray':
                boolArrays[propertyName] = splineSegmentVisibility;
                break;
            case 'splinetrackendpointarray':
                vectorArrays[propertyName] = railroad.splineTracks.map((st) => st.endPoint);
                break;
            case 'splinetrackendspline1idarray':
                intArrays[propertyName] = removeUndefinedTail(
                    railroad.splineTracks.map((st) => st.endSpline1Id));
                break;
            case 'splinetrackendspline2idarray':
                intArrays[propertyName] = removeUndefinedTail(
                    railroad.splineTracks.map((st) => st.endSpline2Id));
                break;
            case 'splinetrackendtangentarray':
                vectorArrays[propertyName] = railroad.splineTracks.map((st) => st.endTangent);
                break;
            case 'splinetrackids':
                if (!isNovemberUpdate) break;
                nameArrays[propertyName] = railroad.splineTracks.map((st) => st.type);
                break;
            case 'splinetracklocationarray':
                vectorArrays[propertyName] = railroad.splineTracks.map((st) => st.location);
                break;
            case 'splinetrackpaintstylearray':
                intArrays[propertyName] = railroad.splineTracks.map((st) => st.paintStyle);
                break;
            case 'splinetrackrotationarray':
                rotatorArrays[propertyName] = railroad.splineTracks.map((st) => st.rotation);
                break;
            case 'splinetrackstartpointarray':
                vectorArrays[propertyName] = railroad.splineTracks.map((st) => st.startPoint);
                break;
            case 'splinetrackstartsplineidarray':
                intArrays[propertyName] = removeUndefinedTail(
                    railroad.splineTracks.map((st) => st.startSplineId));
                break;
            case 'splinetrackstarttangentarray':
                vectorArrays[propertyName] = railroad.splineTracks.map((st) => st.startTangent);
                break;
            case 'splinetrackswitchstatearray':
                intArrays[propertyName] = railroad.splineTracks.map((st) => st.switchState);
                break;
            case 'splinetracktypearray':
                if (isNovemberUpdate) break;
                stringArrays[propertyName] = railroad.splineTracks.map((st) => st.type);
                break;
            case 'splinetypearray':
                intArrays[propertyName] = railroad.splines.map((s) => s.type);
                break;
            case 'splinevisibilityendarray':
                intArrays[propertyName] = splineVisibilityEnd;
                break;
            case 'splinevisibilitystartarray':
                intArrays[propertyName] = splineVisibilityStart;
                break;
            case 'switchlocationarray':
                vectorArrays[propertyName] = railroad.switches.map((s) => s.location);
                break;
            case 'switchrotationarray':
                rotatorArrays[propertyName] = railroad.switches.map((s) => s.rotation);
                break;
            case 'switchstatearray':
                intArrays[propertyName] = railroad.switches.map((s) => s.state);
                break;
            case 'switchtypearray':
                intArrays[propertyName] = railroad.switches.map((s) => s.type);
                break;
            case 'tenderfuelamountarray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.tenderFuelAmount);
                break;
            case 'tenderwateramountarray':
                floatArrays[propertyName] = railroad.frames.map((f) => f.state.tenderWaterAmount);
                break;
            case 'timeofday':
                switch (typeof railroad.settings.timeOfDay) {
                    case 'number':
                        floats[propertyName] = railroad.settings.timeOfDay;
                        break;
                    case 'bigint':
                        dateTimes[propertyName] = railroad.settings.timeOfDay;
                        break;
                    case 'undefined':
                        break;
                    default:
                        throw new Error('Unexpected timeOfDay type');
                }
                break;
            case 'turntabledeckrotationarray':
                rotatorArrays[propertyName] = removeUndefinedTail(
                    railroad.turntables.map((t) => t.deckRotation));
                break;
            case 'turntablelocationarray':
                vectorArrays[propertyName] = railroad.turntables.map((t) => t.location);
                break;
            case 'turntablerotatorarray':
                rotatorArrays[propertyName] = railroad.turntables.map((t) => t.rotator);
                break;
            case 'turntabletypearray':
                if (isNovemberUpdate) break;
                intArrays[propertyName] = railroad.turntables.map((t) => {
                    if (typeof t.type !== 'number') throw new Error(`Unexpected type ${t.type}`);
                    return t.type;
                });
                break;
            case 'turntabletypes':
                if (!isNovemberUpdate) break;
                nameArrays[propertyName] = railroad.turntables.map((t) => {
                    if (typeof t.type !== 'string') throw new Error(`Unexpected type ${t.type}`);
                    return t.type;
                });
                break;
            case 'vegetationismcompnamearray':
                stringArrays[propertyName] = railroad.vegetation.map((v) => v.ismCompName);
                break;
            case 'vegetationinstanceindexarray':
                intArrays[propertyName] = railroad.vegetation.map((v) => v.instanceIndex);
                break;
            case 'watertowerlocationarray':
                vectorArrays[propertyName] = railroad.watertowers.map((w) => w.location);
                break;
            case 'watertowerrotationarray':
                rotatorArrays[propertyName] = railroad.watertowers.map((w) => w.rotation);
                break;
            case 'watertowertypearray':
                intArrays[propertyName] = railroad.watertowers.map((w) => w.type);
                break;
            case 'watertowerwaterlevelarray':
                floatArrays[propertyName] = railroad.watertowers.map((w) => w.waterlevel);
                break;
            case 'weatherchangeintervalmax':
                if (typeof railroad.settings.weatherChangeIntervalMax !== 'undefined') {
                    floats[propertyName] = railroad.settings.weatherChangeIntervalMax;
                }
                break;
            case 'weatherchangeintervalmin':
                if (typeof railroad.settings.weatherChangeIntervalMin !== 'undefined') {
                    floats[propertyName] = railroad.settings.weatherChangeIntervalMin;
                }
                break;
            case 'weathertransitiontime':
                if (typeof railroad.settings.weatherTransitionTime !== 'undefined') {
                    floats[propertyName] = railroad.settings.weatherTransitionTime;
                }
                break;
            case 'weathertype':
                if (typeof railroad.settings.weatherType !== 'undefined') {
                    ints[propertyName] = railroad.settings.weatherType;
                }
                break;
            default:
                throw new Error(`Unrecognized property: ${propertyName}`);
        }
    }
    return {
        _header: railroad._header,
        _order: railroad._order,
        boolArrays,
        bools,
        byteArrays,
        dateTimes,
        enumArrays,
        floatArrays,
        floats,
        intArrays,
        ints,
        nameArrays,
        permissionArrays,
        rotatorArrays,
        stringArrays,
        strings,
        textArrays,
        transformArrays,
        vectorArrays,
    };
}

function getPropertyType(gvas: Gvas, propertyName: string): GvasTypes {
    switch (propertyName.toLowerCase()) {
        case 'animatetimeofday': return ['BoolProperty'];
        case 'binarytexture': return ['ArrayProperty', 'ByteProperty'];
        case 'boilerfiretemparray': return ['ArrayProperty', 'FloatProperty'];
        case 'boilerfuelamountarray': return ['ArrayProperty', 'FloatProperty'];
        case 'boilerpressurearray': return ['ArrayProperty', 'FloatProperty'];
        case 'boilerwaterlevelarray': return ['ArrayProperty', 'FloatProperty'];
        case 'boilerwatertemparray': return ['ArrayProperty', 'FloatProperty'];
        case 'brakevaluearray': return ['ArrayProperty', 'FloatProperty'];
        case 'compressorairpressurearray': return ['ArrayProperty', 'FloatProperty'];
        case 'compressorvalvevaluearray': return ['ArrayProperty', 'FloatProperty'];
        case 'couplerfrontstatearray': return ['ArrayProperty', 'BoolProperty'];
        case 'couplerrearstatearray': return ['ArrayProperty', 'BoolProperty'];
        case 'daylength': return ['FloatProperty'];
        case 'framelocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'framenamearray': return ['ArrayProperty', 'TextProperty'];
        case 'framenumberarray': return ['ArrayProperty', 'TextProperty'];
        case 'framerotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'frametypearray': return ['ArrayProperty', 'StrProperty'];
        case 'freightamountarray': return ['ArrayProperty', 'IntProperty'];
        case 'freighttypearray': return ['ArrayProperty', 'StrProperty'];
        case 'freighttypes': return ['ArrayProperty', 'EnumProperty'];
        case 'gamelevelname': return ['StrProperty'];
        case 'generatorvalvevaluearray': return ['ArrayProperty', 'FloatProperty'];
        case 'headlightfrontstatearray': return ['ArrayProperty', 'BoolProperty'];
        case 'headlightrearstatearray': return ['ArrayProperty', 'BoolProperty'];
        case 'headlighttypearray': return ['ArrayProperty', 'IntProperty'];
        case 'industrylocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'industrynamearray': return ['ArrayProperty', 'NameProperty'];
        case 'industryrotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'industrystorageeduct1array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageeduct2array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageeduct3array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageeduct4array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageproduct1array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageproduct2array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageproduct3array': return ['ArrayProperty', 'IntProperty'];
        case 'industrystorageproduct4array': return ['ArrayProperty', 'IntProperty'];
        case 'industrytypearray': return ['ArrayProperty', 'IntProperty'];
        case 'markerlightscenterstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'markerlightsfrontleftstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'markerlightsfrontrightstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'markerlightsrearleftstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'markerlightsrearrightstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'nightlength': return ['FloatProperty'];
        case 'painttypearray': return ['ArrayProperty', 'IntProperty'];
        case 'permissions': return ['ArrayProperty', 'StructProperty', 'Permission'];
        case 'playeridarray': return ['ArrayProperty', 'StrProperty'];
        case 'playerids': return ['ArrayProperty', 'StrProperty'];
        case 'playerlocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'playermoneyarray': return ['ArrayProperty', 'FloatProperty'];
        case 'playernamearray': return ['ArrayProperty', 'StrProperty'];
        case 'playerrotationarray': return ['ArrayProperty', 'FloatProperty'];
        case 'playerxparray': return ['ArrayProperty', 'IntProperty'];
        case 'propsnamearray': return ['ArrayProperty', 'StrProperty'];
        case 'propsnames': return ['ArrayProperty', 'NameProperty'];
        case 'propstextarray': return ['ArrayProperty', 'TextProperty'];
        case 'propstransformarray': return ['ArrayProperty', 'StructProperty', 'Transform'];
        case 'regulatorvaluearray': return ['ArrayProperty', 'FloatProperty'];
        case 'removedvegetationassetsarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'reverservaluearray': return ['ArrayProperty', 'FloatProperty'];
        case 'sanderamountarray': return ['ArrayProperty', 'FloatProperty'];
        case 'sandhouselocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'sandhouserotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'sandhousetypearray': return ['ArrayProperty', 'IntProperty'];
        case 'savegamedate': return ['StrProperty'];
        case 'savegameuniqueid': return ['StrProperty'];
        case 'savegameuniqueworldid': return ['StrProperty'];
        case 'savegameversion': return ['StrProperty'];
        case 'smokestacktypearray': return ['ArrayProperty', 'IntProperty'];
        case 'splinecontrolpointsarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'serverownerplayerindex': return ['IntProperty'];
        case 'splinecontrolpointsindexendarray': return ['ArrayProperty', 'IntProperty'];
        case 'splinecontrolpointsindexstartarray': return ['ArrayProperty', 'IntProperty'];
        case 'splinelocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinesegmentsvisibilityarray': return ['ArrayProperty', 'BoolProperty'];
        case 'splinetrackendpointarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinetrackendtangentarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinetrackids': return ['ArrayProperty', 'NameProperty'];
        case 'splinetracklocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinetrackpaintstylearray': return ['ArrayProperty', 'IntProperty'];
        case 'splinetrackrotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'splinetrackstartpointarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinetrackstarttangentarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'splinetrackswitchstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'splinetracktypearray': return ['ArrayProperty', 'StrProperty'];
        case 'splinetypearray': return ['ArrayProperty', 'IntProperty'];
        case 'splinevisibilityendarray': return ['ArrayProperty', 'IntProperty'];
        case 'splinevisibilitystartarray': return ['ArrayProperty', 'IntProperty'];
        case 'switchlocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'switchrotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'switchstatearray': return ['ArrayProperty', 'IntProperty'];
        case 'switchtypearray': return ['ArrayProperty', 'IntProperty'];
        case 'tenderfuelamountarray': return ['ArrayProperty', 'FloatProperty'];
        case 'tenderwateramountarray': return ['ArrayProperty', 'FloatProperty'];
        case 'timeofday': return typeof gvas.floats[propertyName] !== 'undefined' ?
            ['FloatProperty'] :
            ['StructProperty', 'DateTime'];
        case 'turntabledeckrotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'turntablelocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'turntablerotatorarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'turntabletypearray': return ['ArrayProperty', 'IntProperty'];
        case 'turntabletypes': return ['ArrayProperty', 'NameProperty'];
        case 'vegetationismcompnamearray': return ['ArrayProperty', 'StrProperty'];
        case 'vegetationinstanceindexarray': return ['ArrayProperty', 'IntProperty'];
        case 'watertowerlocationarray': return ['ArrayProperty', 'StructProperty', 'Vector'];
        case 'watertowerrotationarray': return ['ArrayProperty', 'StructProperty', 'Rotator'];
        case 'watertowertypearray': return ['ArrayProperty', 'IntProperty'];
        case 'watertowerwaterlevelarray': return ['ArrayProperty', 'FloatProperty'];
        case 'weatherchangeintervalmax': return ['FloatProperty'];
        case 'weatherchangeintervalmin': return ['FloatProperty'];
        case 'weathertransitiontime': return ['FloatProperty'];
        case 'weathertype': return ['IntProperty'];
        default: throw new Error(`Unknown property name ${propertyName}`);
    }
}

export function gvasToBlob(gvas: Gvas): Blob {
    // Gvas:
    // (u32) 'GVAS'
    // (...) GvasHeader
    // (...) GvasProperty Array
    // (str) "None"
    // (str) Null
    const gvasHeaderBlob = gvasHeaderToBlob(gvas._header);
    const data: BlobPart[] = ['GVAS', gvasHeaderBlob];
    for (const propertyName of gvas._order) {
        if (!propertyName) continue;
        const blob = propertyToBlob(gvas, propertyName);
        if (!blob) continue;
        data.push(blob);
    }
    data.push(stringToBlob('None'));
    data.push(stringToBlob(null));
    return new Blob(data, {type: 'application/octet-stream'});
}

function propertyToBlob(gvas: Gvas, propertyName: string): BlobPart | void {
    const [propertyType, dataType, structType] = getPropertyType(gvas, propertyName);
    const propertyData: BlobPart[] = [];
    switch (propertyType) {
        case 'ArrayProperty': {
            if (!dataType) throw new Error();
            switch (dataType) {
                case 'BoolProperty': {
                    const bools = gvas.boolArrays[propertyName] || [];
                    if (bools.length === 0) return;
                    // (u32) BoolProperty Count
                    // (u8*) BoolProperty Array
                    propertyData.push(new Uint32Array([bools.length]));
                    propertyData.push(new Uint8Array(bools.map((b) => b ? 1 : 0)));
                    break;
                }
                case 'ByteProperty': {
                    const bytes = gvas.byteArrays[propertyName] || [];
                    if (bytes.length === 0) return;
                    // (u8*) ByteProperty Array
                    propertyData.push(new Uint8Array(bytes));
                    break;
                }
                case 'EnumProperty': {
                    const strs = gvas.enumArrays[propertyName] || [];
                    if (strs.length === 0) return;
                    // (u32)  EnumProperty Count
                    // (str*) EnumProperty Array
                    propertyData.push(new Uint32Array([strs.length]));
                    propertyData.push(new Blob(strs.map(stringToBlob)));
                    break;
                }
                case 'FloatProperty': {
                    const floats = gvas.floatArrays[propertyName] || [];
                    if (floats.length === 0) return;
                    // (u32)  FloatProperty Count
                    // (f32*) FloatProperty Array
                    propertyData.push(new Uint32Array([floats.length]));
                    propertyData.push(new Float32Array(floats));
                    break;
                }
                case 'NameProperty': {
                    const strs = gvas.nameArrays[propertyName] || [];
                    if (strs.length === 0) return;
                    // (u32)  NameProperty Count
                    // (str*) NameProperty Array
                    propertyData.push(new Uint32Array([strs.length]));
                    propertyData.push(new Blob(strs.map(stringToBlob)));
                    break;
                }
                case 'IntProperty': {
                    const ints = gvas.intArrays[propertyName] || [];
                    if (ints.length === 0) return;
                    // (u32)  IntProperty Count
                    // (u32*) IntProperty Array
                    propertyData.push(new Uint32Array([ints.length]));
                    propertyData.push(new Uint32Array(ints));
                    break;
                }
                case 'StrProperty': {
                    const strs = gvas.stringArrays[propertyName] || [];
                    if (strs.length === 0) return;
                    // (u32)  StrProperty Count
                    // (str*) StrProperty Array
                    propertyData.push(new Uint32Array([strs.length]));
                    propertyData.push(new Blob(strs.map(stringToBlob)));
                    break;
                }
                case 'StructProperty': {
                    const blob = structPropertyToBlob(structType, gvas, propertyName);
                    if (!blob) return;
                    // (...) StructProperty Array
                    propertyData.push(blob);
                    break;
                }
                case 'TextProperty': {
                    const texts = gvas.textArrays[propertyName] || [];
                    if (texts.length === 0) return;
                    const largeWorldCoords = (gvas._header.gvasVersion > 2);
                    // (u32) TextProperty Count
                    // (...) TextProperty Array
                    propertyData.push(new Uint32Array([texts.length]));
                    propertyData.push(new Blob(texts.map((t) => textToBlob(t, largeWorldCoords))));
                    break;
                }
                default:
                    throw new Error(dataType);
            }

            // ArrayProperty:
            // (str) Property Name
            // (str) "ArrayProperty"
            // (u64) Property Value Size
            // (str) Array Data Type
            // (u8)  Terminator
            // (u8*) Property Value
            const propertyBlob = new Blob(propertyData);
            const data: BlobPart[] = [
                stringToBlob(propertyName),
                stringToBlob(propertyType),
                new Uint32Array([propertyBlob.size, 0]),
            ];
            data.push(stringToBlob(dataType));
            data.push(new Uint8Array([0])); // terminator
            data.push(propertyBlob);
            return new Blob(data);
        }
        case 'BoolProperty': {
            if (!(propertyName in gvas.bools)) return;
            const bool = gvas.bools[propertyName];

            // BoolProperty:
            // (str) BoolProperty Name
            // (str) "BoolProperty"
            // (u64) 0
            // (u8)  BoolProperty Value
            // (u8)  Terminator
            const data: BlobPart[] = [
                stringToBlob(propertyName),
                stringToBlob(propertyType),
                new Uint32Array([0, 0]),
            ];
            data.push(new Uint8Array([bool ? 1 : 0]));
            data.push(new Uint8Array([0])); // terminator
            return new Blob(data);
        }
        case 'FloatProperty': {
            if (!(propertyName in gvas.floats)) return;
            const float = gvas.floats[propertyName] || NaN;
            // (f32) FloatProperty Value
            propertyData.push(new Float32Array([float]));
            break;
        }
        case 'IntProperty': {
            if (!(propertyName in gvas.ints)) return;
            const int = gvas.ints[propertyName];
            // (u32) IntProperty Value
            propertyData.push(new Uint32Array([int]));
            break;
        }
        case 'StrProperty': {
            const str = gvas.strings[propertyName] ?? null;
            if (!str) return;
            // (str) StrProperty Value
            propertyData.push(stringToBlob(str));
            break;
        }
        case 'StructProperty': {
            switch (dataType) {
                case 'DateTime': {
                    if (!(propertyName in gvas.dateTimes)) return;
                    const dateTime = gvas.dateTimes[propertyName];
                    if (typeof dateTime !== 'bigint') throw new Error('Unexpected dateTime type');
                    propertyData.push(dateTimeToBlob(dateTime));
                    break;
                }
                default:
                    throw new Error(`Unexpected data type ${dataType}`);
            }
            // Property:
            // (str)  Property Name
            // (str)  Property Type
            // (u64)  Property Value Size
            // (str)  Data Type
            // (u128) GUID (0)
            // (u8)   Terminator
            // (u8*)  Property Value
            const propertyBlob = new Blob(propertyData);
            const data: BlobPart[] = [
                stringToBlob(propertyName),
                stringToBlob(propertyType),
                new Uint32Array([propertyBlob.size, 0]),
                stringToBlob(dataType),
                new Uint32Array([0, 0, 0, 0]),
            ];
            data.push(new Uint8Array([0])); // terminator
            data.push(propertyBlob);
            return new Blob(data);
        }
        default:
            throw new Error(`Unexpected property type ${propertyType}`);
    }

    // Property:
    // (str) Property Name
    // (str) Property Type
    // (u64) Property Value Size
    // (u8)  Terminator
    // (u8*) Property Value
    const propertyBlob = new Blob(propertyData);
    const data: BlobPart[] = [
        stringToBlob(propertyName),
        stringToBlob(propertyType),
        new Uint32Array([propertyBlob.size, 0]),
    ];
    data.push(new Uint8Array([0])); // terminator
    data.push(propertyBlob);
    return new Blob(data);
}

function structPropertyToBlob(structType: string, gvas: Gvas, propertyName: string): void | Blob {
    const data: BlobPart[] = [];
    let structs; let structSize;
    const largeWorldCoords = (gvas._header.gvasVersion > 2);
    if (structType === 'Rotator') {
        structs = gvas.rotatorArrays[propertyName] || [];
        structSize = largeWorldCoords ? 24 : 12;
    } else if (structType === 'Transform') {
        structs = gvas.transformArrays[propertyName] || [];
        structSize = largeWorldCoords ? 293 : 253;
    } else if (structType === 'Vector') {
        structs = gvas.vectorArrays[propertyName] || [];
        structSize = largeWorldCoords ? 24 : 12;
    } else if (structType === 'Permission') {
        structs = gvas.permissionArrays[propertyName] || [];
        structSize = 76;
    } else {
        throw new Error('Unexpected structType: ' + structType);
    }
    // Omit empty properties
    if (structs.length === 0) return;
    // (u32) entry count
    data.push(new Uint32Array([structs.length]));
    // (str) property name
    data.push(stringToBlob(propertyName));
    // (str) StructProperty
    data.push(stringToBlob('StructProperty'));
    // (u64) length
    const fieldSize = structs.length * structSize;
    data.push(new Uint32Array([fieldSize, 0]));
    // (str) data type
    data.push(stringToBlob(structType));
    // (u128) guid
    // (u8) terminator
    data.push(new Uint8Array(17));
    for (const struct of structs) {
        if (structType === 'Rotator') {
            const r = struct as Rotator;
            // Rotator
            data.push(rotatorToBlob(largeWorldCoords, r));
        } else if (structType === 'Transform') {
            const t = struct as Transform;
            // Transform:
            // (StructProperty) Rotation Quat
            // (StructProperty) Translation Vector
            // (StructProperty) Scale3D Vector
            // (str)            "None"
            data.push(stringToBlob('Rotation'));
            data.push(stringToBlob('StructProperty'));
            data.push(new Uint32Array([largeWorldCoords ? 32 : 16, 0]));
            data.push(stringToBlob('Quat'));
            data.push(new Uint8Array(17)); // guid, terminator
            data.push(quatToBlob(largeWorldCoords, t.rotation));
            // Translation
            data.push(stringToBlob('Translation'));
            data.push(stringToBlob('StructProperty'));
            data.push(new Uint32Array([largeWorldCoords ? 24 : 12, 0]));
            data.push(stringToBlob('Vector'));
            data.push(new Uint8Array(17)); // guid, terminator
            data.push(vectorToBlob(largeWorldCoords, t.translation));
            // Scale3D
            data.push(stringToBlob('Scale3D'));
            data.push(stringToBlob('StructProperty'));
            data.push(new Uint32Array([largeWorldCoords ? 24 : 12, 0]));
            data.push(stringToBlob('Vector'));
            data.push(new Uint8Array(17)); // guid, terminator
            data.push(vectorToBlob(largeWorldCoords, t.scale3d));
            // End of properties list
            data.push(stringToBlob('None'));
        } else if (structType === 'Vector') {
            const v = struct as Vector;
            // Vector
            data.push(vectorToBlob(largeWorldCoords, v));
        } else if (structType === 'Permission') {
            const v = struct as Permission;
            // Values
            data.push(stringToBlob('Values'));
            data.push(stringToBlob('ArrayProperty'));
            data.push(new Uint32Array([4 + v.values.length, 0]));
            data.push(stringToBlob('BoolProperty'));
            data.push(new Uint8Array([0]));
            data.push(new Uint32Array([v.values.length]));
            data.push(new Uint8Array(v.values.map((v) => v ? 1 : 0)));
            // End of properties list
            data.push(stringToBlob('None'));
        } else {
            throw new Error(structType);
        }
    }
    return new Blob(data);
}

function gvasHeaderToBlob(header: GvasHeader): Blob {
    // GvasHeader:
    // (u32) Version A
    // (u32) Version B
    // (u32) Version C (GVAS v3 only)
    // (...) Engine Version
    // (...) Custom Data
    // (str) Save Type
    const versions = [
        header.gvasVersion,
        header.structureVersion,
    ];

    const unknown = header.unknownVersion;
    if (typeof unknown !== 'undefined') {
        versions.push(unknown);
    }

    return new Blob([
        new Uint32Array(versions),
        engineVersionToBlob(header.engineVersion),
        customToBlob(header.customFormatVersion, header.customData),
        stringToBlob(header.saveType),
    ]);
}

function customToBlob(customFormatVersion: number, customData: CustomData[]): Blob {
    // Custom:
    // (u32) Custom Version
    // (u32) Custom Data Count
    // (...) Custom Data Array
    const customBlob = customData.map(customDataToBlob);
    const data: BlobPart[] = [
        new Uint32Array([
            customFormatVersion,
            customData.length]),
    ];
    return new Blob(data.concat(customBlob));
}

function customDataToBlob(customData: CustomData): BlobPart {
    // Custom Data:
    // (u128) Custom GUID
    // (u32)  Custom Value
    const values = customData.guid.concat([customData.value]);
    const result = new Uint32Array(values);
    if (result.byteLength !== 20) throw new Error();
    return result;
}

function engineVersionToBlob(engineVersion: EngineVersion): BlobPart {
    // Engine Version:
    // (u16) Engine Version Major
    // (u16) Engine Version Minor
    // (u16) Engine Version Patch
    // (u32) Engine Version Build
    // (str) Engine Version Build ID
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

function isAsciiString(str: string): boolean {
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        const c = str.charCodeAt(i);
        if (c !== (c & 0x007F)) {
            return false;
        }
    }
    return true;
}

function encodeUtf16(str: string): Uint16Array {
    const utf16 = new Uint16Array(str.length);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        utf16[i] = str.charCodeAt(i);
    }
    return utf16;
}

function stringToBlob(str: GvasString): BlobPart {
    // Null String:
    // (u32) Zero Length
    if (str === null) return new Uint32Array([0]);
    if (typeof str !== 'string') throw new Error('argument must be a string');

    // Unicode String:
    // (u32)  Negative Length
    // (u16*) UTF-16 Encoded String
    if (!isAsciiString(str)) {
        const words = encodeUtf16(str + '\0');
        return new Blob([
            new Uint32Array([-words.length]),
            words,
        ]);
    }

    // ASCII String:
    // (u32) Postive Length
    // (u8*) ASCII String
    const bytes = new TextEncoder().encode(str + '\0');
    return new Blob([
        new Uint32Array([bytes.length]),
        bytes,
    ]);
}

function textToBlob(text: GvasText, largeWorldCoords: boolean): BlobPart {
    if ('values' in text) {
        if (text.values.length > 1) throw new Error('Only zero or one values are allowed');
        // (u32)  Flags
        // (u8)   Component Type (None = 255)
        // (b32)  Has Culture Invariant String
        // (str?) Culture Invariant String
        return new Blob([
            new Uint32Array([text.flags]),
            new Uint8Array([255]),
            new Uint32Array([text.values.length]),
            new Blob(text.values.map(stringToBlob)),
        ]);
    } else if ('key' in text) {
        // (u32) Flags
        // (u8)  Component Type (Base = 0)
        // (str) Namespace
        // (str) Key
        // (str) Source String
        return new Blob([
            new Uint32Array([text.flags]),
            new Uint8Array([0]),
            new Blob([text.namespace, text.key, text.value].map(stringToBlob)),
        ]);
    } else if ('args' in text) {
        // (u32) Flags
        // (u8)  Component Type (ArgumentFormat = 3)
        // (txt) Source Format
        // (u32) TextFormat Count
        // (...) TextFormat Array
        return new Blob([
            new Uint32Array([text.flags]),
            new Uint8Array([3]),
            textToBlob(text.sourceFormat, largeWorldCoords),
            new Uint32Array([text.args.length]),
            new Blob(text.args.map((favm) => new Blob([
                stringToBlob(favm.name),
                formatArgumentValueToBlob(favm.value),
            ]))),
        ]);
    } else if ('targetCulture' in text) {
        // (u32) Flags
        // (u8)  Component Type (AsNumber = 4)
        // (FAV) Source Value
        // (b32) Has Number Formatting Options
        // (NFO?) Number Formatting Options
        // (str) Target Culture
        const formatOptions = [text.formatOptions]
            .filter(Boolean)
            .map(numberFormattingOptionsToBlob);
        return new Blob([
            new Uint32Array([text.flags]),
            new Uint8Array([4]),
            formatArgumentValueToBlob(text.sourceValue),
            new Uint32Array([formatOptions.length]),
            ...formatOptions,
            stringToBlob(text.targetCulture),
        ]);
    } else {
        throw new Error('Unexpected text type');
    }
}

function formatArgumentValueToBlob(value: FormatArgumentValue): BlobPart {
    const largeWorldCoords = true; // FIXME
    if (value[0] === 'Int') {
        // Int (0)
        return new Blob([
            new Uint8Array([0]),
            new Int32Array([value[1], 0]),
        ]);
    } else if (value[0] === 'Text') {
        // Text (4)
        return new Blob([
            new Uint8Array([4]),
            textToBlob(value[1], largeWorldCoords),
        ]);
    } else {
        throw new Error(`Unexpected FormatArgumentValue ${value}`);
    }
}

function numberFormattingOptionsToBlob(value: NumberFormattingOptions): BlobPart {
    return new Blob([
        new Uint32Array([
            value.alwaysIncludeSign ? 1 : 0,
            value.useGrouping ? 1 : 0,
        ]),
        new Uint8Array([
            value.roundingMode,
        ]),
        new Int32Array([
            value.minimumIntegralDigits,
            value.maximumIntegralDigits,
            value.minimumFractionalDigits,
            value.maximumFractionalDigits,
        ]),
    ]);
}

function dateTimeToBlob(dateTime: bigint): BlobPart {
    return new BigUint64Array([dateTime]);
}

function quatToBlob(largeWorldCoords: boolean, q: Quaternion): BlobPart {
    return new (largeWorldCoords ? Float64Array : Float32Array)([
        q.x, q.y, q.z, q.w,
    ]);
}

function rotatorToBlob(largeWorldCoords: boolean, r: Rotator): BlobPart {
    return new (largeWorldCoords ? Float64Array : Float32Array)([
        r.pitch, r.yaw, r.roll,
    ]);
}

function vectorToBlob(largeWorldCoords: boolean, v: Vector): BlobPart {
    return new (largeWorldCoords ? Float64Array : Float32Array)([
        v.x, v.y, v.z,
    ]);
}

function removeUndefinedTail<T>(arr: (T | undefined)[]): T[] {
    const filtered = arr.filter((x): x is T => x !== undefined);
    if (filtered.length === arr.length) return filtered;
    if (filtered.every((v, i) => v === arr[i])) return filtered;
    throw new Error('Found undefined elements before tail');
}
