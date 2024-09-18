import {cubicBezier3, HermiteCurve, hermiteToBezier} from './util-bezier';
import {Vector} from './Vector';

interface Grade {
    length: number;
    height: number;
    grade: number;
}

/**
 * Calculates the grade of a spline represented by a set of control points.
 *
 * Grade is a measure of the steepness of a right of way, calculated as the
 * ratio of elevation change to horizontal distance. This function takes in an
 * array of control points and returns an array of grade objects, each
 * containing the length, height, and grade of a segment of the spline between
 * consecutive control points.
 *
 * The length of each segment is calculated using the Pythagorean theorem, with
 * the distance between the x and y coordinates of the two control points
 * forming the hypotenuse of a right triangle.
 *
 * The height of each segment is calculated as the difference between the z
 * coordinates of the two control points.
 *
 * The grade of each segment is calculated as the ratio of the height to the
 * length.
 *
 * @param {Vector[]} controlPoints - The control points of the spline.
 * @return {Grade[]} An array of objects containing the length, height, and
 * grade of each segment of the spline.
 */
export function calculateGrade(controlPoints: Vector[]): Grade[] {
    return controlPoints.slice(0, controlPoints.length - 1).map((cp, i) => {
        const dx = controlPoints[i + 1].x - cp.x;
        const dy = controlPoints[i + 1].y - cp.y;
        const dz = controlPoints[i + 1].z - cp.z;
        const length = Math.sqrt((dx * dx) + (dy * dy));
        const grade = Math.abs(dz) / length;
        return {grade, height: dz, length};
    });
}

/**
 * Calculates the grade of a Hermite curve.
 *
 * This function samples the curve at a specified number of points, and then
 * calculates the grade of each segment between consecutive samples.
 *
 * @param {HermiteCurve} hermite - The Hermite curve to calculate the grade of.
 * @param {number} samples - The number of samples to take from the curve.
 * @return {Grade[]} An array of objects containing the length, height, and grade of each segment of the curve.
 */
function calculateGradeHermite(hermite: HermiteCurve, samples: number): Grade[] {
    // Convert the Hermite curve to Bezier form for sampling
    const bezier = hermiteToBezier(hermite);
    const controlPoints: Vector[] = [];
    // Calculate one extra control point, so we end with `samples` segments
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = cubicBezier3(t, bezier);
        controlPoints.push(p);
    }
    // Calculate the grade of each segment using the control points
    const grades = calculateGrade(controlPoints);
    return grades;
}

type SteepestGradeReturnType = {
    percentage: number;
    t: number;
};

/**
 * Calculates the steepest grade of a Hermite curve.
 *
 * This function samples the curve at a specified number of points, calculates
 * the grade of each segment, and returns the segment with the steepest grade
 * along with the percentage of grade.
 *
 * @param {HermiteCurve} hermite - The curve to calculate the steepest grade of.
 * @param {number} [samples=10] - The number of samples to take from the curve.
 * @return {SteepestGradeReturnType} An object containing the percentage and
 * position of the steepest grade in the curve.
 */
export function calculateSteepestGrade(hermite: HermiteCurve, samples = 10): SteepestGradeReturnType {
    const grades = calculateGradeHermite(hermite, samples);
    let steepestIndex = 0;
    for (let i = 1; i < samples; i++) {
        if (grades[i].grade > grades[steepestIndex].grade) {
            steepestIndex = i;
        }
    }
    const percentage = 100 * grades[steepestIndex].grade;
    const t = steepestIndex / samples;
    return {percentage, t};
}
