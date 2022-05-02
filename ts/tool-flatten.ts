import {Vector} from './Gvas';

interface Grade {
    length: number;
    height: number;
    grade: number;
}

function fp32(n: number): number {
    const float = new Float32Array(1);
    float[0] = n;
    return float[0];
}

export function flattenControlPoints(controlPoints: Vector[]): Vector[] {
    const result = controlPoints.slice();
    const cp0 = controlPoints[0];
    const last = controlPoints.length - 1;
    const before = calculateGrade(controlPoints);
    const totalXY = before.reduce((a, d) => a + d.length, 0);
    const totalZ = before.reduce((a, d) => a + d.height, 0);
    let cumulativeXY = 0;
    // Loop through the control points, skipping first and last
    for (let i = 1; i < last; i++) {
        cumulativeXY += before[i - 1].length;
        result[i] = {
            x: controlPoints[i].x,
            y: controlPoints[i].y,
            z: fp32(cp0.z + (totalZ * cumulativeXY / totalXY)),
        };
    }
    const after = calculateGrade(result);
    const maxGradeBefore = before.reduce((a, d) => Math.max(a, d.grade), 0);
    const maxGradeAfter = after.reduce((a, d) => Math.max(a, d.grade), 0);
    if (maxGradeBefore !== maxGradeAfter) {
        console.log(`Flattened spline, max grade reduced from ${maxGradeBefore.toFixed(4)} to ${maxGradeAfter.toFixed(4)}`);
    }
    return result;
}

export function calculateGrade(controlPoints: Vector[]): Grade[] {
    return controlPoints.slice(0, controlPoints.length - 1).map((cp, i) => {
        const dx = controlPoints[i + 1].x - cp.x;
        const dy = controlPoints[i + 1].y - cp.y;
        const height = controlPoints[i + 1].z - cp.z;
        const length = Math.sqrt((dx * dx) + (dy * dy));
        return {
            length: length,
            height: height,
            grade: 100 * Math.abs(height) / length,
        };
    });
}
