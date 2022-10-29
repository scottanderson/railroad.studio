import {Gvas, GvasMap} from './Gvas';
import {Frame, Industry, Player, Railroad, Sandhouse, Spline, SplineTrack, Switch, Turntable, Watertower} from './Railroad';
import {textToString} from './util';

/**
 * Convert a raw Gvas object into a Railroad
 * @param {Gvas} gvas
 * @return {Railroad}
 */
export function gvasToRailroad(gvas: Gvas): Railroad {
    if (gvas._header.saveType !== '/Script/arr.arrSaveGame') throw new Error(`Unsupported saveType: ${gvas._header.saveType}`);
    // Read save game data
    const saveGameVersion = optionalMap(gvas.strings, 'SaveGameVersion');
    const saveGameDate = optionalMap(gvas.strings, 'SaveGameDate');
    const saveGameUniqueID = optionalMap(gvas.strings, 'SaveGameUniqueID');
    const saveGameUniqueWorldID = optionalMap(gvas.strings, 'SaveGameUniqueWorldID');
    // Read frames
    const boilerFireTemp = optionalMap(gvas.floatArrays, 'BoilerFireTempArray');
    const boilerFuelAmount = optionalMap(gvas.floatArrays, 'BoilerFuelAmountArray');
    const boilerPressure = optionalMap(gvas.floatArrays, 'BoilerPressureArray');
    const boilerWaterLevel = optionalMap(gvas.floatArrays, 'BoilerWaterLevelArray');
    const boilerWaterTemp = optionalMap(gvas.floatArrays, 'BoilerWaterTempArray');
    const brakeValue = optionalMap(gvas.floatArrays, 'BrakeValueArray');
    const compressorAirPressure = optionalMap(gvas.floatArrays, 'CompressorAirPressureArray');
    const compressorValveValue = optionalMap(gvas.floatArrays, 'CompressorValveValueArray');
    const couplerFrontState = optionalMap(gvas.boolArrays, 'CouplerFrontStateArray');
    const couplerRearState = optionalMap(gvas.boolArrays, 'CouplerRearStateArray');
    const frameLocation = optionalMap(gvas.vectorArrays, 'FrameLocationArray');
    const frameName = optionalMap(gvas.textArrays, 'FrameNameArray');
    const frameNumber = optionalMap(gvas.textArrays, 'FrameNumberArray');
    const frameRotation = optionalMap(gvas.rotatorArrays, 'FrameRotationArray');
    const frameType = optionalMap(gvas.stringArrays, 'FrameTypeArray');
    const freightAmount = optionalMap(gvas.intArrays, 'FreightAmountArray');
    const freightType = optionalMap(gvas.stringArrays, 'FreightTypeArray');
    const generatorValveValue = optionalMap(gvas.floatArrays, 'GeneratorValveValueArray');
    const headlightFrontState = optionalMap(gvas.boolArrays, 'HeadlightFrontStateArray');
    const headlightRearState = optionalMap(gvas.boolArrays, 'HeadlightRearStateArray');
    const headlightType = optionalMap(gvas.intArrays, 'HeadlightTypeArray');
    const markerLightsCenterState = optionalMap(gvas.intArrays, 'MarkerLightsCenterStateArray');
    const markerLightsFrontLeftState = optionalMap(gvas.intArrays, 'MarkerLightsFrontLeftStateArray');
    const markerLightsFrontRightState = optionalMap(gvas.intArrays, 'MarkerLightsFrontRightStateArray');
    const markerLightsRearLeftState = optionalMap(gvas.intArrays, 'MarkerLightsRearLeftStateArray');
    const markerLightsRearRightState = optionalMap(gvas.intArrays, 'MarkerLightsRearRightStateArray');
    const paintType = optionalMap(gvas.intArrays, 'PaintTypeArray');
    const regulatorValue = optionalMap(gvas.floatArrays, 'RegulatorValueArray');
    const reverserValue = optionalMap(gvas.floatArrays, 'ReverserValueArray');
    const sanderAmount = optionalMap(gvas.floatArrays, 'SanderAmountArray');
    const smokestackType = optionalMap(gvas.intArrays, 'SmokestackTypeArray');
    const tenderFuelAmount = optionalMap(gvas.floatArrays, 'TenderFuelAmountArray');
    const tenderWaterAmount = optionalMap(gvas.floatArrays, 'TenderWaterAmountArray');
    const frames: Frame[] = [];
    if (boilerFireTemp || boilerFuelAmount || boilerPressure || boilerWaterLevel || boilerWaterTemp ||
        brakeValue || compressorAirPressure || compressorValveValue || couplerFrontState || couplerRearState ||
        frameLocation || frameName || frameNumber || frameRotation || frameType || freightAmount || freightType ||
        generatorValveValue || headlightFrontState || headlightRearState || headlightType ||
        markerLightsFrontLeftState || markerLightsFrontRightState || markerLightsRearLeftState || markerLightsRearRightState ||
        regulatorValue || reverserValue || sanderAmount || smokestackType || tenderFuelAmount || tenderWaterAmount) {
        if (!boilerFireTemp || !boilerFuelAmount || !boilerPressure || !boilerWaterLevel || !boilerWaterTemp ||
            !brakeValue || !compressorAirPressure || !compressorValveValue || !couplerFrontState || !couplerRearState ||
            !frameLocation || !frameName || !frameNumber || !frameRotation || !frameType || !freightAmount || !freightType ||
            !generatorValveValue || !headlightFrontState || !headlightRearState || !headlightType ||
            !markerLightsFrontLeftState || !markerLightsFrontRightState || !markerLightsRearLeftState || !markerLightsRearRightState ||
            !regulatorValue || !reverserValue || !smokestackType || !tenderFuelAmount || !tenderWaterAmount) {
            throw new Error('Some frame values are missing');
        }
        enforceEqualLengths([
            boilerFireTemp, boilerFuelAmount, boilerPressure, boilerWaterLevel, boilerWaterTemp,
            brakeValue,
            compressorAirPressure, compressorValveValue,
            couplerFrontState, couplerRearState,
            frameLocation, frameName, frameNumber, frameRotation, frameType,
            freightAmount, freightType,
            generatorValveValue,
            headlightFrontState, headlightRearState, headlightType,
            markerLightsFrontLeftState, markerLightsFrontRightState, markerLightsRearLeftState, markerLightsRearRightState,
            regulatorValue, reverserValue,
            smokestackType,
            tenderFuelAmount, tenderWaterAmount,
        ]);
        for (let i = 0; i < frameLocation.length; i++) {
            const frame: Frame = {
                location: frameLocation[i],
                name: textToString(frameName[i]),
                number: textToString(frameNumber[i]),
                rotation: frameRotation[i],
                type: frameType[i],
                state: {
                    boilerFireTemp: boilerFireTemp[i],
                    boilerFuelAmount: boilerFuelAmount[i],
                    boilerPressure: boilerPressure[i],
                    boilerWaterLevel: boilerWaterLevel[i],
                    boilerWaterTemp: boilerWaterTemp[i],
                    brakeValue: brakeValue[i],
                    compressorAirPressure: compressorAirPressure[i],
                    compressorValveValue: compressorValveValue[i],
                    couplerFrontState: couplerFrontState[i],
                    couplerRearState: couplerRearState[i],
                    freightAmount: freightAmount[i],
                    freightType: freightType[i],
                    generatorValveValue: generatorValveValue[i],
                    headlightFrontState: headlightFrontState[i],
                    headlightRearState: headlightRearState[i],
                    headlightType: headlightType[i],
                    markerLightsCenterState: optionalIndex(markerLightsCenterState, i),
                    markerLightsFrontLeftState: markerLightsFrontLeftState[i],
                    markerLightsFrontRightState: markerLightsFrontRightState[i],
                    markerLightsRearLeftState: markerLightsRearLeftState[i],
                    markerLightsRearRightState: markerLightsRearRightState[i],
                    paintType: optionalIndex(paintType, i),
                    regulatorValue: regulatorValue[i],
                    reverserValue: reverserValue[i],
                    sanderAmount: optionalIndex(sanderAmount, i),
                    smokestackType: smokestackType[i],
                    tenderFuelAmount: tenderFuelAmount[i],
                    tenderWaterAmount: tenderWaterAmount[i],
                },
            };
            frames.push(frame);
        }
    }
    // Read industries
    const industries: Industry[] = [];
    const industryLocation = optionalMap(gvas.vectorArrays, 'IndustryLocationArray');
    const industryRotation = optionalMap(gvas.rotatorArrays, 'IndustryRotationArray');
    const industryStorageEduct1 = optionalMap(gvas.intArrays, 'IndustryStorageEduct1Array');
    const industryStorageEduct2 = optionalMap(gvas.intArrays, 'IndustryStorageEduct2Array');
    const industryStorageEduct3 = optionalMap(gvas.intArrays, 'IndustryStorageEduct3Array');
    const industryStorageEduct4 = optionalMap(gvas.intArrays, 'IndustryStorageEduct4Array');
    const industryStorageProduct1 = optionalMap(gvas.intArrays, 'IndustryStorageProduct1Array');
    const industryStorageProduct2 = optionalMap(gvas.intArrays, 'IndustryStorageProduct2Array');
    const industryStorageProduct3 = optionalMap(gvas.intArrays, 'IndustryStorageProduct3Array');
    const industryStorageProduct4 = optionalMap(gvas.intArrays, 'IndustryStorageProduct4Array');
    const industryType = optionalMap(gvas.intArrays, 'IndustryTypeArray');
    if (industryLocation || industryRotation ||
        industryStorageEduct1 || industryStorageEduct2 || industryStorageEduct3 || industryStorageEduct4 ||
        industryStorageProduct1 || industryStorageProduct2 || industryStorageProduct3 || industryStorageProduct4 ||
        industryType) {
        if (!industryLocation || !industryRotation ||
            !industryStorageEduct1 || !industryStorageEduct2 || !industryStorageEduct3 || !industryStorageEduct4 ||
            !industryStorageProduct1 || !industryStorageProduct2 || !industryStorageProduct3 || !industryStorageProduct4 ||
            !industryType) {
            throw new Error('Some industry values are missing');
        }
        enforceEqualLengths([industryLocation, industryRotation,
            industryStorageEduct1, industryStorageEduct2, industryStorageEduct3, industryStorageEduct4,
            industryStorageProduct1, industryStorageProduct2, industryStorageProduct3, industryStorageProduct4,
            industryType]);
        for (let i = 0; i < industryLocation.length; i++) {
            const industry: Industry = {
                location: industryLocation[i],
                rotation: industryRotation[i],
                inputs: [industryStorageEduct1[i], industryStorageEduct2[i], industryStorageEduct3[i], industryStorageEduct4[i]],
                outputs: [industryStorageProduct1[i], industryStorageProduct2[i], industryStorageProduct3[i], industryStorageProduct4[i]],
                type: industryType[i],
            };
            industries.push(industry);
        }
    }
    // Read players
    const players: Player[] = [];
    const playerId = optionalMap(gvas.stringArrays, 'playeridarray');
    const playerLocation = optionalMap(gvas.vectorArrays, 'PlayerLocationArray');
    const playerMoney = optionalMap(gvas.floatArrays, 'PlayerMoneyArray');
    const playerName = optionalMap(gvas.stringArrays, 'PlayerNameArray');
    const playerRotation = optionalMap(gvas.floatArrays, 'PlayerRotationArray');
    const playerXp = optionalMap(gvas.intArrays, 'PlayerXPArray');
    if (playerId || playerLocation || playerMoney || playerName || playerXp) {
        if (!playerLocation || !playerMoney || !playerName || !playerXp) {
            throw new Error('Some player values are missing');
        }
        enforceEqualLengths([playerName, playerLocation, playerMoney, playerXp]);
        if (playerId && playerId.length !== playerName.length) {
            console.log('Warning: playerId array does not match other player arrays', playerId, playerName);
        }
        if (playerRotation && playerRotation.length !== playerName.length) {
            console.log('Warning: playerRotation array does not match other player arrays', playerRotation, playerName);
        }
        for (let i = 0; i < playerName.length; i++) {
            const player: Player = {
                id: optionalIndex(playerId, i),
                name: playerName[i],
                location: playerLocation[i],
                money: playerMoney[i],
                rotation: optionalIndex(playerRotation, i),
                xp: playerXp[i],
            };
            players.push(player);
        }
    }
    // Read sandhouses
    const sandhouses: Sandhouse[] = [];
    const sandhouseLocation = optionalMap(gvas.vectorArrays, 'SandhouseLocationArray');
    const sandhouseRotation = optionalMap(gvas.rotatorArrays, 'SandhouseRotationArray');
    const sandhouseType = optionalMap(gvas.intArrays, 'SandhouseTypeArray');
    if (sandhouseLocation || sandhouseRotation || sandhouseType) {
        if (!sandhouseLocation || !sandhouseRotation || !sandhouseType) {
            throw new Error('Some sandhouse values are missing');
        }
        enforceEqualLengths([sandhouseLocation, sandhouseRotation, sandhouseType]);
        for (let i = 0; i < sandhouseLocation.length; i++) {
            const sandhouse: Sandhouse = {
                location: sandhouseLocation[i],
                rotation: sandhouseRotation[i],
                type: sandhouseType[i],
            };
            sandhouses.push(sandhouse);
        }
    }
    // Read switches
    const switches: Switch[] = [];
    const switchLocation = optionalMap(gvas.vectorArrays, 'SwitchLocationArray');
    const switchRotation = optionalMap(gvas.rotatorArrays, 'SwitchRotationArray');
    const switchState = optionalMap(gvas.intArrays, 'SwitchStateArray');
    const switchType = optionalMap(gvas.intArrays, 'SwitchTypeArray');
    if (switchLocation || switchRotation || switchState || switchType) {
        if (!switchLocation || !switchRotation || !switchState || !switchType) {
            throw new Error('Some switch values are missing');
        }
        enforceEqualLengths([switchLocation, switchRotation, switchState, switchType]);
        for (let i = 0; i < switchLocation.length; i++) {
            const sw: Switch = {
                location: switchLocation[i],
                rotation: switchRotation[i],
                state: switchState[i],
                type: switchType[i],
            };
            switches.push(sw);
        }
    }
    // Read turntables
    const turntables: Turntable[] = [];
    const turntableDeckRotationArray = optionalMap(gvas.rotatorArrays, 'TurntableDeckRotationArray');
    const turntableLocation = optionalMap(gvas.vectorArrays, 'TurntableLocationArray');
    const turntableRotator = optionalMap(gvas.rotatorArrays, 'TurntableRotatorArray');
    const turntableType = optionalMap(gvas.intArrays, 'TurntableTypeArray');
    if (turntableDeckRotationArray || turntableLocation || turntableRotator || turntableType) {
        if (!turntableLocation || !turntableRotator || !turntableType) {
            throw new Error('Some turntable values are missing');
        }
        enforceEqualLengths([turntableLocation, turntableRotator, turntableType]);
        if (turntableDeckRotationArray) enforceEqualLengths([turntableDeckRotationArray, turntableLocation]);
        for (let i = 0; i < turntableLocation.length; i++) {
            const t: Turntable = {
                location: turntableLocation[i],
                rotator: turntableRotator[i],
                type: turntableType[i],
            };
            if (turntableDeckRotationArray) {
                t.deckRotation = turntableDeckRotationArray[i];
            }
            turntables.push(t);
        }
    }
    // Read watertowers
    const watertowers: Watertower[] = [];
    const watertowerLocation = optionalMap(gvas.vectorArrays, 'WatertowerLocationArray');
    const watertowerRotation = optionalMap(gvas.rotatorArrays, 'WatertowerRotationArray');
    const watertowerType = optionalMap(gvas.intArrays, 'WatertowerTypeArray');
    const watertowerWaterlevel = optionalMap(gvas.floatArrays, 'WatertowerWaterlevelArray');
    if (watertowerLocation || watertowerRotation || watertowerType || watertowerWaterlevel) {
        if (!watertowerLocation || !watertowerRotation || !watertowerType || !watertowerWaterlevel) {
            throw new Error('Some watertower values are missing');
        }
        enforceEqualLengths([watertowerLocation, watertowerRotation, watertowerType, watertowerWaterlevel]);
        for (let i = 0; i < watertowerLocation.length; i++) {
            const w: Watertower = {
                location: watertowerLocation[i],
                rotation: watertowerRotation[i],
                type: watertowerType[i],
                waterlevel: watertowerWaterlevel[i],
            };
            watertowers.push(w);
        }
    }
    // Read splines
    const splines: Spline[] = [];
    const splineControlPoints = optionalMap(gvas.vectorArrays, 'SplineControlPointsArray');
    const splineControlPointsIndexEnd = optionalMap(gvas.intArrays, 'SplineControlPointsIndexEndArray');
    const splineControlPointsIndexStart = optionalMap(gvas.intArrays, 'SplineControlPointsIndexStartArray');
    const splineLocation = optionalMap(gvas.vectorArrays, 'SplineLocationArray');
    const splineSegmentsVisibility = optionalMap(gvas.boolArrays, 'SplineSegmentsVisibilityArray');
    const splineType = optionalMap(gvas.intArrays, 'SplineTypeArray');
    const splineVisibilityEnd = optionalMap(gvas.intArrays, 'SplineVisibilityEndArray');
    const splineVisibilityStart = optionalMap(gvas.intArrays, 'SplineVisibilityStartArray');
    if (splineControlPoints ||
        splineControlPointsIndexEnd ||
        splineControlPointsIndexStart ||
        splineLocation ||
        splineSegmentsVisibility ||
        splineType ||
        splineVisibilityEnd ||
        splineVisibilityStart) {
        if (!splineControlPoints ||
            !splineControlPointsIndexEnd ||
            !splineControlPointsIndexStart ||
            !splineLocation ||
            !splineSegmentsVisibility ||
            !splineType ||
            !splineVisibilityEnd ||
            !splineVisibilityStart) {
            throw new Error('Some spline values are missing');
        }
        enforceEqualLengths([
            splineControlPointsIndexEnd,
            splineControlPointsIndexStart,
            splineLocation,
            splineType,
            splineVisibilityEnd,
            splineVisibilityStart,
        ]);
        for (let i = 0; i < splineLocation.length; i++) {
            const controlPointStart = splineControlPointsIndexStart[i];
            const controlPointEnd = splineControlPointsIndexEnd[i];
            const controlPoints = splineControlPoints.slice(controlPointStart, controlPointEnd + 1);
            const visibilityStart = splineVisibilityStart[i];
            const visibilityEnd = splineVisibilityEnd[i];
            const segmentsVisible = splineSegmentsVisibility.slice(visibilityStart, visibilityEnd + 1);
            // Sanity check
            if (controlPoints.length - segmentsVisible.length !== 1) {
                throw new Error(`Segment length does not match control point length, ${controlPoints.length}, ${segmentsVisible.length}`);
            }
            const spline: Spline = {
                controlPoints: controlPoints,
                location: splineLocation[i],
                segmentsVisible: segmentsVisible,
                type: splineType[i],
            };
            splines.push(spline);
        }
    }
    // Read spline tracks
    const splineTracks: SplineTrack[] = [];
    const splineTrackEndPoint = optionalMap(gvas.vectorArrays, 'SplineTrackEndPointArray');
    const splineTrackEndSpline1Id = optionalMap(gvas.intArrays, 'SplineTrackEndSpline1IDArray');
    const splineTrackEndSpline2Id = optionalMap(gvas.intArrays, 'SplineTrackEndSpline2IDArray');
    const splineTrackEndTangent = optionalMap(gvas.vectorArrays, 'SplineTrackEndTangentArray');
    const splineTrackLocation = optionalMap(gvas.vectorArrays, 'SplineTrackLocationArray');
    const splineTrackPaintStyle = optionalMap(gvas.intArrays, 'SplineTrackPaintStyleArray');
    const splineTrackRotation = optionalMap(gvas.rotatorArrays, 'SplineTrackRotationArray');
    const splineTrackStartPoint = optionalMap(gvas.vectorArrays, 'SplineTrackStartPointArray');
    const splineTrackStartSplineId = optionalMap(gvas.intArrays, 'SplineTrackStartSplineIDArray');
    const splineTrackStartTangent = optionalMap(gvas.vectorArrays, 'SplineTrackStartTangentArray');
    const splineTrackSwitchState = optionalMap(gvas.intArrays, 'SplineTrackSwitchStateArray');
    const splineTrackType = optionalMap(gvas.stringArrays, 'SplineTrackTypeArray');
    if (splineTrackEndPoint ||
        splineTrackEndSpline1Id ||
        splineTrackEndSpline2Id ||
        splineTrackEndTangent ||
        splineTrackLocation ||
        splineTrackPaintStyle ||
        splineTrackRotation ||
        splineTrackStartPoint ||
        splineTrackStartSplineId ||
        splineTrackStartTangent ||
        splineTrackSwitchState ||
        splineTrackType) {
        if (!splineTrackEndPoint ||
            !splineTrackEndTangent ||
            !splineTrackLocation ||
            !splineTrackPaintStyle ||
            !splineTrackRotation ||
            !splineTrackStartPoint ||
            !splineTrackStartTangent ||
            !splineTrackSwitchState ||
            !splineTrackType) {
            throw new Error('Some spline track values are missing');
        }
        enforceEqualLengths([
            splineTrackEndPoint,
            splineTrackEndTangent,
            splineTrackLocation,
            splineTrackPaintStyle,
            splineTrackRotation,
            splineTrackStartPoint,
            splineTrackStartTangent,
            splineTrackSwitchState,
            splineTrackType,
        ]);
        for (let i = 0; i < splineTrackType.length; i++) {
            const splineTrack: SplineTrack = {
                endPoint: splineTrackEndPoint[i],
                endSpline1Id: optionalIndex(splineTrackEndSpline1Id, i),
                endSpline2Id: optionalIndex(splineTrackEndSpline2Id, i),
                endTangent: splineTrackEndTangent[i],
                location: splineTrackLocation[i],
                paintStyle: splineTrackPaintStyle[i],
                rotation: splineTrackRotation[i],
                startPoint: splineTrackStartPoint[i],
                startSplineId: optionalIndex(splineTrackStartSplineId, i),
                startTangent: splineTrackStartTangent[i],
                switchState: splineTrackSwitchState[i],
                type: splineTrackType[i],
            };
            splineTracks.push(splineTrack);
        }
    }
    // Read cut trees
    const removedVegetationAssets = optionalMap(gvas.vectorArrays, 'RemovedVegetationAssetsArray') || [];
    // Import complete, build the railroad
    const railroad: Railroad = {
        _header: gvas._header,
        _order: gvas._order,
        _types: gvas._types,
        frames: frames,
        industries: industries,
        players: players,
        removedVegetationAssets: removedVegetationAssets,
        sandhouses: sandhouses,
        saveGame: {
            date: saveGameDate,
            uniqueId: saveGameUniqueID,
            uniqueWorldId: saveGameUniqueWorldID,
            version: saveGameVersion,
        },
        splines: splines,
        splineTracks: splineTracks,
        switches: switches,
        turntables: turntables,
        watertowers: watertowers,
    };
    return railroad;
}

function optionalIndex<T>(arr: T[] | null, i: number): (T | undefined) {
    return arr && arr.length > i ? arr[i] : undefined;
}

/**
 * Read a case-insensitive key from a GvasMap
 * @param {GvasMap<T>} map
 * @param {string} key
 * @return {T} Returns the map entry, or null.
 */
function optionalMap<T>(map: GvasMap<T>, key: string): T | null {
    if (key in map) return map[key];
    const lowerKey = key.toLowerCase();
    const matchingKeys = Object.keys(map).filter((k) => k.toLowerCase() === lowerKey);
    if (matchingKeys.length === 0) return null;
    return map[matchingKeys[0]];
}

// function simplifyText(text: GvasText): GvasString[] | null {
//     if (text === null) return null;
//     if (Array.isArray(text)) return text;
//     if (text.guid !== '56F8D27149CC5E2D12103BBEBFCA9097') throw new Error(`Unexpected guid ${text.guid}`);
//     if (text.pattern !== '{0}<br>{1}') throw new Error(`Unexpected format pattern ${text.pattern}`);
//     if (text.textFormat.length !== 2) throw new Error(`TextFormat entry_count > 1, is not supported, ${text.textFormat.length}`);
//     const simplified = text.textFormat.map((tf, i) => {
//         if (tf.contentType !== 2) throw new Error('Unexpected content type');
//         if (String(i) !== tf.formatKey) throw new Error('Unexpected format key');
//         if (tf.values.length === 0) return null;
//         if (tf.values.length !== 1) throw new Error('Unexpected length');
//         return tf.values[0];
//     });
//     if (simplified.length !== 2) throw new Error('Unexpected length');
//     return simplified;
// }

function enforceEqualLengths(arrays: any[][]): void {
    if (!arrays.every((e, _i, a) => e.length === a[0].length)) {
        throw new Error(`Array lengths to not match: ${arrays.map((a) => a.length)}`);
    }
}
