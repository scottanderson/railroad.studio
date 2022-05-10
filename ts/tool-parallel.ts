import {Vector} from './Gvas';
import {Spline} from './Railroad';
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
