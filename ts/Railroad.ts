import {GvasHeader, GvasString, GvasText} from './Gvas';
import {IndustryType} from './industries';
import {Permission} from './Permission';
import {Rotator} from './Rotator';
import {Transform} from './Transform';
import {Vector} from './Vector';

/**
 * A simplified save state that can be modified in Railroad Studio.
 *
 * Can be created from or converted to a {@link Gvas} for serializaiton.
 */
export type Railroad = {
    _header: GvasHeader;
    _order: string[];
    frames: Frame[];
    industries: Industry[];
    players: Player[];
    props: Prop[];
    removedVegetationAssets: Vector[];
    sandhouses: Sandhouse[];
    saveGame: {
        date: GvasString;
        uniqueId: GvasString;
        uniqueWorldId: GvasString;
        version: GvasString;
    };
    settings: {
        animateTimeOfDay: boolean | undefined;
        binaryTexture: number[];
        dayLength: number | undefined;
        gameLevelName: GvasString;
        nightLength: number | undefined;
        serverOwnerPlayerIndex: number | undefined;
        timeOfDay: number | bigint | undefined;
        weatherChangeIntervalMax: number | undefined;
        weatherChangeIntervalMin: number | undefined;
        weatherTransitionTime: number | undefined;
        weatherType: number | undefined;
    };
    splineTracks: SplineTrack[];
    splines: Spline[];
    switches: Switch[];
    turntables: Turntable[];
    vegetation: Vegetation[];
    watertowers: Watertower[];
};

export type Frame = {
    location: Vector;
    name: GvasText;
    number: GvasText;
    rotation: Rotator;
    type: GvasString;
    state: FrameState;
};

export type FrameState = {
    couplerFrontState: boolean;
    couplerRearState: boolean;
    freightAmount: number;
    freightType: GvasString;
    headlightFrontState: boolean;
    headlightRearState: boolean;
} & NumericFrameState;

export type NumericFrameState = {
    boilerFireTemp: number;
    boilerFuelAmount: number;
    boilerPressure: number;
    boilerWaterLevel: number;
    boilerWaterTemp: number;
    brakeValue: number;
    compressorAirPressure: number;
    compressorValveValue: number;
    generatorValveValue: number;
    headlightType: number;
    markerLightsCenterState?: number | undefined;
    markerLightsFrontLeftState: number;
    markerLightsFrontRightState: number;
    markerLightsRearLeftState: number;
    markerLightsRearRightState: number;
    paintType?: number | undefined;
    regulatorValue: number;
    reverserValue: number;
    sanderAmount?: number | undefined;
    smokestackType: number;
    tenderFuelAmount: number;
    tenderWaterAmount: number;
};

export type Quadruplet<T> = [T, T, T, T];

export type Industry = {
    location: Vector;
    rotation: Rotator;
    inputs: Quadruplet<number>;
    outputs: Quadruplet<number>;
    type: IndustryType | GvasString;
};

export type Player = {
    id?: GvasString | undefined;
    name: GvasString;
    location?: Vector | undefined;
    rotation?: number | undefined;
    money: number;
    xp: number;
    permissions?: Permission | undefined;
};

export type Prop = {
    name: GvasString;
    text: GvasText;
    transform: Transform;
};

export type Sandhouse = {
    location: Vector;
    rotation: Rotator;
    type: SandhouseType;
};

export enum SandhouseType {
    sandhouse = 0,
}

export type Spline = {
    controlPoints: Vector[];
    location: Vector;
    segmentsVisible: boolean[];
    type: SplineType;
};

export type SplineTrack = {
    endPoint: Vector;
    endSpline1Id?: number | undefined;
    endSpline2Id?: number | undefined;
    endTangent: Vector;
    location: Vector;
    paintStyle: number;
    rotation: Rotator;
    startPoint: Vector;
    startSplineId?: number | undefined;
    startTangent: Vector;
    switchState: number;
    type: GvasString;
};

export enum SplineType {
    rail = 0,
    variable_grade = 1,
    constant_grade = 2,
    wooden_bridge = 3,
    rail_deck = 4,
    variable_stone_wall = 5,
    constant_stone_wall = 6,
    steel_bridge = 7,
    steel_truss = 8,
}

export type Switch = {
    location: Vector;
    rotation: Rotator;
    state: number;
    type: SwitchType;
};

export enum SwitchType {
    leftSwitchLeft = 0,
    rightSwitchRight = 1,
    leftSwitchRight = 4,
    rightSwitchLeft = 5,
    diamond = 6,
}

export type Turntable = {
    deckRotation?: Rotator | undefined;
    location: Vector;
    rotator: Rotator;
    type: TurntableType | GvasString;
};

export enum TurntableType {
    dark = 0,
    light = 1,
}

export type Vegetation = {
    instanceIndex: number;
    ismCompName: GvasString;
};

export type Watertower = {
    location: Vector;
    rotation: Rotator;
    waterlevel: number;
    type: number;
};
