import {HermiteCurve} from './util-bezier';

export enum SplineTrackType {
    BALLAST_H01 = 'ballast_h01',
    BALLAST_H05 = 'ballast_h05',
    BALLAST_H10 = 'ballast_h10',
    RAIL_914 = 'rail_914',
    RAIL_914_BRIDGE_TRUSS = 'rail_914_bridge_truss',
    RAIL_914_BUMPER = 'rail_914_bumper',
    RAIL_914_H01 = 'rail_914_h01',
    RAIL_914_H05 = 'rail_914_h05',
    RAIL_914_H10 = 'rail_914_h10',
    RAIL_914_SWITCH_3WAY_LEFT = 'rail_914_switch_3way_left',
    RAIL_914_SWITCH_3WAY_LEFT_NOBALLAST = 'rail_914_switch_3way_left_noballast',
    RAIL_914_SWITCH_3WAY_RIGHT = 'rail_914_switch_3way_right',
    RAIL_914_SWITCH_3WAY_RIGHT_NOBALLAST = 'rail_914_switch_3way_right_noballast',
    RAIL_914_SWITCH_CROSS_45 = 'rail_914_switch_cross_45',
    RAIL_914_SWITCH_CROSS_90 = 'rail_914_switch_cross_90',
    RAIL_914_SWITCH_LEFT = 'rail_914_switch_left',
    RAIL_914_SWITCH_LEFT_MIRROR = 'rail_914_switch_left_mirror',
    RAIL_914_SWITCH_LEFT_MIRROR_NOBALLAST = 'rail_914_switch_left_mirror_noballast',
    RAIL_914_SWITCH_LEFT_NOBALLAST = 'rail_914_switch_left_noballast',
    RAIL_914_SWITCH_RIGHT = 'rail_914_switch_right',
    RAIL_914_SWITCH_RIGHT_MIRROR = 'rail_914_switch_right_mirror',
    RAIL_914_SWITCH_RIGHT_MIRROR_NOBALLAST = 'rail_914_switch_right_mirror_noballast',
    RAIL_914_SWITCH_RIGHT_NOBALLAST = 'rail_914_switch_right_noballast',
    RAIL_914_TRESTLE_PILE_01 = 'rail_914_trestle_pile_01',
    RAIL_914_TRESTLE_STEEL_01 = 'rail_914_trestle_steel_01',
    RAIL_914_TRESTLE_WOOD_01 = 'rail_914_trestle_wood_01',
    RAIL_914_TUNNEL = 'rail_914_tunnel',
    RAIL_914_WALL_01 = 'rail_914_wall_01',
    RAIL_914_WALL_01_NORAIL = 'rail_914_wall_01_norail',
}

const secondLegSwitchLeft = {
    startPoint: {x: 0, y: 0, z: 0},
    startTangent: {x: 1879.3, y: 0, z: 0},
    endPoint: {x: 1879.3, y: 0, z: 0},
    endTangent: {x: 1879.3, y: 0, z: 0},
};

const secondLegSwitchRight = {
    startPoint: {x: 0, y: 0, z: 0},
    startTangent: {x: 2153.67, y: 0, z: 0},
    endPoint: {x: 1863.4, y: 184.8, z: 0},
    endTangent: {x: 2125.36, y: 348.04, z: 0},
};

export const switchExtraLegs: Partial<Record<SplineTrackType, HermiteCurve[]>> = {
    [SplineTrackType.RAIL_914_SWITCH_3WAY_LEFT]: [secondLegSwitchLeft, secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_3WAY_LEFT_NOBALLAST]: [secondLegSwitchLeft, secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_3WAY_RIGHT]: [secondLegSwitchLeft, secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_3WAY_RIGHT_NOBALLAST]: [secondLegSwitchLeft, secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_CROSS_45]: [{
        startPoint: {x: 87.9, y: 212.1, z: 0},
        startTangent: {x: 424.2, y: -424.2, z: 0},
        endPoint: {x: 512.1, y: -212.1, z: 0},
        endTangent: {x: 424.2, y: -424.2, z: 0},
    }],
    [SplineTrackType.RAIL_914_SWITCH_CROSS_90]: [{
        startPoint: {x: 191.2, y: -191.2, z: 0},
        startTangent: {x: 0, y: 382.4, z: 0},
        endPoint: {x: 191.2, y: 191.2, z: 0},
        endTangent: {x: 0, y: 382.4, z: 0},
    }],
    [SplineTrackType.RAIL_914_SWITCH_LEFT]: [secondLegSwitchLeft],
    [SplineTrackType.RAIL_914_SWITCH_LEFT_MIRROR]: [secondLegSwitchLeft],
    [SplineTrackType.RAIL_914_SWITCH_LEFT_MIRROR_NOBALLAST]: [secondLegSwitchLeft],
    [SplineTrackType.RAIL_914_SWITCH_LEFT_NOBALLAST]: [secondLegSwitchLeft],
    [SplineTrackType.RAIL_914_SWITCH_RIGHT]: [secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_RIGHT_MIRROR]: [secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_RIGHT_MIRROR_NOBALLAST]: [secondLegSwitchRight],
    [SplineTrackType.RAIL_914_SWITCH_RIGHT_NOBALLAST]: [secondLegSwitchRight],
};
