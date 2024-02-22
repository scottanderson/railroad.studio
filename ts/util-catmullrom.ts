import {Vector, vectorSum, vectorDifference, scaleVector} from './Vector';
import {cubicBezierMinRadius, HermiteCurve, hermiteToBezier} from './util-bezier';

export type CatmullRomSpline = {
    controlPoints: Vector[];
    segmentsVisible: boolean[];
};

export function catmullRomToHermite(spline: CatmullRomSpline, i: number, scale = 0.5): HermiteCurve {
    if (i < 0 || i + 1 > spline.segmentsVisible.length) throw new Error(`Invalid segment id ${i}`);
    const startPoint = spline.controlPoints[i];
    const endPoint = spline.controlPoints[i + 1];
    const reflect = (origin: Vector, p: Vector): Vector => vectorSum(origin, vectorDifference(origin, p));
    const first = i === 0;
    const last = i + 1 === spline.segmentsVisible.length;
    const prevPoint = first ? reflect(startPoint, endPoint) : spline.controlPoints[i - 1];
    const nextPoint = last ? reflect(endPoint, startPoint) : spline.controlPoints[i + 2];
    // Convert catmull-rom segment to hermite form
    const startTangent = scaleVector(vectorDifference(endPoint, prevPoint), scale);
    const endTangent = scaleVector(vectorDifference(nextPoint, startPoint), scale);
    return {startPoint, startTangent, endPoint, endTangent};
}

export const catmullRomToBezier = (spline: CatmullRomSpline, i: number) =>
    hermiteToBezier(catmullRomToHermite(spline, i));

type CatmullRomOsculatingCircle = {
    center: Vector;
    location: Vector;
    radius: number;
    t: number;
    i: number;
};

export function catmullRomMinRadius(spline: CatmullRomSpline): CatmullRomOsculatingCircle[] {
    const getSegmentResult = (i: number) => {
        const bezier = catmullRomToBezier(spline, i);
        const {center, location, radius, t} = cubicBezierMinRadius(bezier);
        const result = {center, location, radius, t, i};
        return result;
    };
    return Object.entries(spline.segmentsVisible)
        .filter(([, b]) => b)
        .map((entry) => Number(entry[0]))
        .map(getSegmentResult)
        .filter((result, i, a) => {
            const first = (i === 0);
            const last = (i + 1 === a.length);
            // Only include local minima
            if (!last && result.radius < a[i + 1].radius) {
                return true;
            } else if (last && !first && result.radius < a[i - 1].radius) {
                return true;
            }
            return false;
        });
}
