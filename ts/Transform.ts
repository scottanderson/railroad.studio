import {Quaternion} from './Quaternion';
import {Vector} from './Vector';

export type Transform = {
    translation: Vector;
    rotation: Quaternion;
    scale3d: Vector;
};
