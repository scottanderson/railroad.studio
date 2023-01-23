import {calculateGrade} from './Grade';
import {Spline} from './Railroad';
import {Vector} from './Vector';
import {findLastIndex, fp32} from './util';

export function flattenSpline(spline: Spline): Vector[] {
    // Find first and last visible segments
    const first = spline.segmentsVisible.findIndex(Boolean);
    const last = findLastIndex(spline.segmentsVisible, Boolean);
    return flattenSegments(spline.controlPoints, first, last + 1);
}

function flattenSegments(controlPoints: Vector[], start: number, end: number): Vector[] {
    // Calculate the run and rise of each segment
    const before = calculateGrade(controlPoints);
    const gradeIncluded = before.slice(start, end);
    const includeXY = gradeIncluded.reduce((a, d) => a + d.length, 0);
    const includeZ = gradeIncluded.reduce((a, d) => a + d.height, 0);
    const gradeBeforeStart = before.slice(0, start);
    const lengthBeforeStart = gradeBeforeStart.reduce((a, d) => a + d.length, 0);
    let cumulativeXY = -lengthBeforeStart;
    const z0 = controlPoints[start].z;
    const result = Array<Vector>(controlPoints.length);
    for (let i = 0; i < controlPoints.length; i++) {
        if (i > 0) {
            cumulativeXY += before[i - 1].length;
        }
        result[i] = {
            x: controlPoints[i].x,
            y: controlPoints[i].y,
            z: fp32(z0 + (cumulativeXY * includeZ / includeXY)),
        };
    }
    const after = calculateGrade(result);
    const maxGradeBefore = 100 * gradeIncluded.reduce((a, d) => Math.max(a, d.grade), 0);
    const maxGradeAfter = 100 * after.reduce((a, d) => Math.max(a, d.grade), 0);
    if (maxGradeBefore !== maxGradeAfter) {
        const a = start > 0 ? start : '';
        const b = end < before.length ? end + '/' + before.length : '';
        const index = (start > 0 || end < before.length) ? `(${a}..${b})` : '';
        const beforeText = maxGradeBefore.toFixed(4);
        const afterText = maxGradeAfter.toFixed(4);
        console.log(`Flattened spline${index}, max grade reduced from ${beforeText} to ${afterText}`);
    }
    return result;
}


