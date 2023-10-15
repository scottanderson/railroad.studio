import {Spline, SplineTrack} from './Railroad';
import {rotateVector} from './RotationMatrix';
import {Vector, normalizeVector, vectorDifference, vectorSum} from './Vector';
import {splineHeading} from './splines';

export function parallelSpline(spline: Spline, offset: number): [Spline, Spline] {
    const mapper = (offset: number) => (cp: Vector, i: number) => {
        const radians = -splineHeading(spline, i) * Math.PI / 180;
        return {
            x: cp.x + offset * Math.sin(radians),
            y: cp.y + offset * Math.cos(radians),
            z: cp.z,
        };
    };
    const a = spline.controlPoints.map(mapper(offset));
    const b = spline.controlPoints.map(mapper(-offset));
    return [{
        segmentsVisible: spline.segmentsVisible.concat(),
        controlPoints: a,
        location: a[0],
        type: spline.type,
    }, {
        segmentsVisible: spline.segmentsVisible.concat(),
        controlPoints: b,
        location: b[0],
        type: spline.type,
    }];
}

export function parallelSplineTrack(spline: SplineTrack, offset: number): SplineTrack[] {
    const endOffset = rotateVector(normalizeVector(spline.endTangent, offset), {pitch: 0, yaw: 90, roll: 0});
    const endPointD = vectorDifference(spline.endPoint, endOffset);
    const endPointS = vectorSum(spline.endPoint, endOffset);
    const startOffset = rotateVector(normalizeVector(spline.startTangent, offset), {pitch: 0, yaw: 90, roll: 0});
    const startPointD = vectorDifference(spline.startPoint, startOffset);
    const startPointS = vectorSum(spline.startPoint, startOffset);
    // TODO: Refine tangent scale to improve the fit
    return [{
        endPoint: endPointD,
        endTangent: spline.endTangent,
        location: startPointD,
        paintStyle: spline.paintStyle,
        rotation: spline.rotation,
        startPoint: startPointD,
        startTangent: spline.startTangent,
        switchState: spline.switchState,
        type: spline.type,
    }, {
        endPoint: endPointS,
        endTangent: spline.endTangent,
        location: startPointS,
        paintStyle: spline.paintStyle,
        rotation: spline.rotation,
        startPoint: startPointS,
        startTangent: spline.startTangent,
        switchState: spline.switchState,
        type: spline.type,
    }];
}
