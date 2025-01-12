import {Vector, vectorSum} from './Vector';
import {HermiteCurve} from './util-bezier';
import {Rotator} from './Rotator';
import {rotateVector} from './RotationMatrix';

export type HasLocationRotation = {
    location: Vector;
    rotation: Rotator;
};

export function localToWorld(transform: HasLocationRotation, curve: HermiteCurve): HermiteCurve {
    const {startPoint, endPoint, startTangent, endTangent} = curve;
    return {
        endPoint: vectorSum(transform.location, rotateVector(endPoint, transform.rotation)),
        endTangent: rotateVector(endTangent, transform.rotation),
        startPoint: vectorSum(transform.location, rotateVector(startPoint, transform.rotation)),
        startTangent: rotateVector(startTangent, transform.rotation),
    };
}
