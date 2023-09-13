import {Quaternion} from './Quaternion';
import {Vector} from './Vector';

export interface Transform {
    translation: Vector
    rotation: Quaternion
    scale3d: Vector
}
