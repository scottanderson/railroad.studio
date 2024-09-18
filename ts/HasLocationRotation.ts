import {rotateVector} from './RotationMatrix';
import {Rotator} from './Rotator';
import {HermiteCurve} from './util-bezier';
import {Vector, vectorSum} from './Vector';

export interface HasLocationRotation {
    location: Vector;
    rotation: Rotator;
}

export function localToWorld(transform: HasLocationRotation, curve: HermiteCurve): HermiteCurve {
    const {startPoint, endPoint, startTangent, endTangent} = curve;
    return {
        endPoint: vectorSum(transform.location, rotateVector(endPoint, transform.rotation)),
        endTangent: rotateVector(endTangent, transform.rotation),
        startPoint: vectorSum(transform.location, rotateVector(startPoint, transform.rotation)),
        startTangent: rotateVector(startTangent, transform.rotation),
    };
}
