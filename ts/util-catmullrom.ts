import {Vector, vectorSum, vectorDifference} from './Vector';
import {BezierCurve, cubicBezierMinRadius} from './util-bezier';

export type CatmullRomSpline = {
    controlPoints: Vector[];
    segmentsVisible: boolean[];
};

export function catmullRomToBezier(spline: CatmullRomSpline, i: number): BezierCurve {
    // Select four spline points. Reflect the points at the end.
    const startPoint = spline.controlPoints[i];
    const endPoint = spline.controlPoints[i + 1];
    const reflect = (origin: Vector, p: Vector): Vector =>
        vectorSum(origin, vectorDifference(origin, p));
    const first = i === 0;
    const last = i + 1 === spline.segmentsVisible.length;
    const prevPoint = first ? reflect(startPoint, endPoint) : spline.controlPoints[i - 1];
    const nextPoint = last ? reflect(endPoint, startPoint) : spline.controlPoints[i + 2];
    // Convert catmull-rom segment to bezier form
    const b = {
        x: startPoint.x + (endPoint.x - prevPoint.x) / 6,
        y: startPoint.y + (endPoint.y - prevPoint.y) / 6,
        z: startPoint.z + (endPoint.z - prevPoint.z) / 6,
    };
    const c = {
        x: endPoint.x - (nextPoint.x - startPoint.x) / 6,
        y: endPoint.y - (nextPoint.y - startPoint.y) / 6,
        z: endPoint.z - (nextPoint.z - startPoint.z) / 6,
    };
    return [startPoint, b, c, endPoint];
}

type CatmullRomOsculatingCircle = {
    center: Vector,
    location: Vector,
    radius: number,
    t: number,
    i: number,
};

export function catmullRomMinRadius(spline: CatmullRomSpline): CatmullRomOsculatingCircle[] {
    const getSegmentResult = (i: number) => {
        const {center, location, radius, t} = cubicBezierMinRadius(catmullRomToBezier(spline, i));
        const result = {center, location, radius, t, i};
        return result;
    };
    const results = <CatmullRomOsculatingCircle[]>[];
    Object.entries(spline.segmentsVisible)
        .filter(([, b]) => b)
        .map((entry) => Number(entry[0]))
        .map(getSegmentResult)
        .filter((result, i, a) => {
            const first = (i === 0);
            const last = (i + 1 === a.length);
            // const prevResult = first ? undefined : a[i - 1];
            // const last = (i + 1 === a.length);
            if (!last && result.radius < a[i + 1].radius) {
                results.push(result);
            } else if (last && !first && result.radius < a[i - 1].radius) {
                results.push(result);
            }
        });

    return results;
}
