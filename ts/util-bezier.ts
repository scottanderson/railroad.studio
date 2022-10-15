import {SplineTrack} from './Railroad';

export function hermiteToBezier(spline: SplineTrack) {
    const x0 = spline.startPoint.x;
    const y0 = spline.startPoint.y;
    const x3 = spline.endPoint.x;
    const y3 = spline.endPoint.y;
    // Convert hermite to bezier form
    const x1 = x0 + spline.startTangent.x / 3;
    const y1 = y0 + spline.startTangent.y / 3;
    const x2 = x3 - spline.endTangent.x / 3;
    const y2 = y3 - spline.endTangent.y / 3;
    return {x0, y0, x1, y1, x2, y2, x3, y3};
}

export function cubicBezier(t: number, a: number, b: number, c: number, d: number) {
    const t2 = t * t;
    const t3 = t2 * t;
    return a +
        (-a * 3 + t * (3 * a - a * t)) * t +
        (3 * b + t * (-6 * b + b * 3 * t)) * t +
        (c * 3 - c * 3 * t) * t2 +
        d * t3;
}
