import {Vector} from './Gvas';
import {Railroad, Spline, SplineType} from './Railroad';

/**
 * Create new splines through existing control points. There are three steps:
 * 1. Discard splines that are completely invisible.
 * 2. Split splines with hidden middle sections into separate splines. Trim every spline to have a max of one hidden segment at the head and one at the tail.
 * 3. Combine adjacent splines to make longer splines (limit 97 segments).
 * @param {Railroad} railroad - The railroad select splines from
 * @param {loggingCallback} log - Handler for logging output
 * @return {Spline[]}
 */
export function simplifySplines(railroad: Railroad): Spline[] {
    const splines = railroad.splines;
    const numControlPoints = splines.reduce((a, e) => a + e.controlPoints.length, 0);
    console.log(`Starting with ${splines.length} splines, ${numControlPoints} control points.`);
    // Step 1, discard invisible
    const visible = splines.filter((spline) => spline.segmentsVisible.some(Boolean));
    if (splines.length !== visible.length) {
        const visiblePoints = visible.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After removing invisible, ${visible.length} splines, ${visiblePoints} control points.`);
    }
    // Step 2, split and trim
    const simplified = splines.flatMap(splitSpline);
    if (visible.length !== simplified.length) {
        const simplifiedPoints = simplified.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After splitting, ${simplified.length} splines, ${simplifiedPoints} control points.`);
    }
    // Step 3, combine
    const merged = mergeSplines(simplified);
    if (merged.length !== simplified.length) {
        const mergedPoints = merged.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After merging, ${merged.length} splines, ${mergedPoints} control points.`);
        console.log(`Spline count reduced by ${(100 * (1 - (merged.length / splines.length))).toFixed(2)}%.\nControl point count reduced by ${(100 * (1 - (mergedPoints / numControlPoints))).toFixed(2)}%.`);
    }
    return merged;
}

/**
 * Split a spline with alternating visibility into multiple splines.
 * @param {Spline} spline
 * @return {Spline[]}
 */
function splitSpline(spline: Spline): Spline[] {
    const splines: Spline[] = [];
    const firstVisibleSegment = spline.segmentsVisible.findIndex(Boolean);
    let vectors: Vector[] = [];
    let visible: boolean[] = [];
    if (firstVisibleSegment === -1) {
        throw new Error('No segments are visible');
    } else if (firstVisibleSegment === 0) {
        // Spline does not have any hidden sections at its head
        // vectors.push(spline.controlPoints[0]);
        // vectors.push(spline.controlPoints[1]);
        // visible = [true];
        vectors = spline.controlPoints.slice(0, 2);
        visible = spline.segmentsVisible.slice(0, 1);
    } else {
        // Spline has a hidden section at its head
        // vectors.push(spline.controlPoints[firstVisibleSegment - 1]);
        // vectors.push(spline.controlPoints[firstVisibleSegment]);
        // vectors.push(spline.controlPoints[firstVisibleSegment + 1]);
        // visible = [false, true];
        vectors = spline.controlPoints.slice(firstVisibleSegment - 1, firstVisibleSegment + 2);
        visible = spline.segmentsVisible.slice(firstVisibleSegment - 1, firstVisibleSegment + 1);
    }
    for (let i = firstVisibleSegment + 1; i < spline.segmentsVisible.length; i++) {
        const tv = spline.segmentsVisible[i];
        const pv = spline.segmentsVisible[i - 1];
        if (pv) {
            vectors.push(spline.controlPoints[i + 1]);
            visible.push(tv);
            if (tv) {
                // Consecutive visible segments, continue the spline
            } else {
                // Previous segment was visible, end the spline
                if (!visible.some(Boolean)) throw new Error('Spline is not visible');
                splines.push({
                    controlPoints: vectors,
                    location: vectors[0],
                    segmentsVisible: visible,
                    type: spline.type,
                });
            }
        } else {
            if (tv) {
                // Create a two segment spline with invisible start
                vectors = spline.controlPoints.slice(i - 1, i + 2);
                visible = [pv, tv];
            } else {
                // Consecutive invisible segments
            }
        }
    }
    if (spline.segmentsVisible[spline.segmentsVisible.length - 1]) {
        // Spline does not have any hidden sections at its tail
        if (!visible.some(Boolean)) throw new Error('Spline is not visible');
        splines.push({
            controlPoints: vectors,
            location: vectors[0],
            segmentsVisible: visible,
            type: spline.type,
        });
    }
    // if (splines.length > 1) {
    //     console.log(`Split spline from ${spline.segmentsVisible.length} segments to ${splines.map((s) => s.segmentsVisible.length)}`);
    // }
    return splines;
}

/**
 * Attempt spline merging between every pair of splines.
 * @param {Spline[]} splines
 * @return {Spline[]}
 */
function mergeSplines(splines: Spline[]): Spline[] {
    const result: Spline[] = splines.slice();
    let replaced;
    // Repeat this loop until no more splines can be merged
    do {
        replaced = false;
        for (let i = 0; i < result.length - 1; i++) {
            for (let j = result.length - 1; j > i; j--) {
                if (typeof result[j] === 'undefined') {
                    throw new Error(`unexpected undef at idx i=${i}, j=${j}`);
                }
                const merged = mergeAdjacentSplines(result[i]!, result[j]!);
                if (merged) {
                    // console.log(`Merged splines ${i} and ${j}`);
                    result[i] = merged;
                    result.splice(j, 1);
                    replaced = true;
                }
            }
        }
    } while (replaced);
    return result;
}

/**
 * Merge two simplified splines, if they are adjacent.
 * @param {Spline} spline1
 * @param {Spline} spline2
 * @return {Spline | null} a merged spline, or null if merging failed
 */
function mergeAdjacentSplines(spline1: Spline, spline2: Spline): Spline | null {
    const limit = 10; // Max distance between control points (10cm)
    const limit2 = limit * limit; // Limit squared
    const bearingLimit = 10; // Max bearing between two adjacent splines (10 deg)
    const inclinationLimit = 2.5; // Max inclination change between two adjacent splines (2.5 deg)
    if (spline1.type !== spline2.type) return null;
    if (spline1.type === SplineType.steel_bridge) {
        // Do not add supports to short steel bridges
        if (spline1.segmentsVisible.length < 3) return null;
        if (spline2.segmentsVisible.length < 3) return null;
    }
    [spline1, spline2].forEach(enforceSimpleSpline);
    // Iterate through each permutation of spline ordering (forward, reverse).
    for (const a of [spline1, reverseSpline(spline1)]) {
        // The tail CP is the last visible segment index plus one
        const taila = tailControlPoint(a);
        const cpa = a.controlPoints[taila]!;
        for (const b of [spline2, reverseSpline(spline2)]) {
            // The head CP is the first visible segment index
            const headb = headControlPoint(b);
            const cpb = b.controlPoints[headb]!;
            // Compare the tail control point of A to the head control point of B
            const d2 = delta2(cpa, cpb);
            if (d2 > limit2) {
                // Control points are too far apart to be merged
                continue;
            }
            const ha = splineHeading(a, taila);
            const hb = splineHeading(b, headb);
            const bearing = Math.abs(normalizeAngle(ha - hb));
            if (bearing > bearingLimit) {
                // Spline headings are too far apart to be merged
                continue;
            }
            const ia = splineInclination(a, taila);
            const ib = splineInclination(b, headb);
            const di = Math.abs(normalizeAngle(ia - ib));
            if (di > inclinationLimit) {
                // Spline grades are too far apart to be merged
                continue;
            }
            const result = mergeSubSplines(a, 0, taila, b, headb, b.segmentsVisible.length);
            if (result.segmentsVisible.length > 97) {
                // Result spline has too many segments
                // const [x, y, z] = [spline1, spline2, result].map((s) => s.segmentsVisible.length);
                // console.log(`Skipping ${x} ${y} -> ${z} because segment count is too large`);
                return null;
            }
            return result;
        }
    }
    return null;
}

/**
 * Returns the square of the distance between two vectors.
 * @param {Vector} a
 * @param {Vector} b
 * @return {number}
 */
export function delta2(a: Vector, b: Vector): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const m2 = (dx * dx) + (dy * dy) + (dz * dz);
    return m2;
}

/**
 * Enforce that the spline argument has been simplified.
 * @param {Spline} spline
 * @throws {Error} if the spline is not simplified
 */
function enforceSimpleSpline(spline: Spline): void {
    const v = spline.segmentsVisible;
    if (!v.some(Boolean)) throw new Error('This spline is not visible');
    const middleSegments = v.slice(1, v.length - 1);
    if (!middleSegments.every(Boolean)) throw new Error('Spline has hidden middle sections');
}

/**
 * Reverse the order of points in a spline.
 * @param {Spline} spline
 * @return {Spline}
 */
function reverseSpline(spline: Spline): Spline {
    const controlPoints = spline.controlPoints.slice().reverse();
    const segmentsVisible = spline.segmentsVisible.slice().reverse();
    return {
        controlPoints: controlPoints,
        segmentsVisible: segmentsVisible,
        location: controlPoints[0],
        type: spline.type,
    };
}

function mergeSubSplines(spline1: Spline, starta: number, enda: number, spline2: Spline, startb: number, endb: number): Spline {
    const headControlPoints = spline1.controlPoints.slice(starta, enda); // Remove one of the shared control points
    const tailControlPoints = spline2.controlPoints.slice(startb, endb + 1);
    const controlPoints = headControlPoints.concat(tailControlPoints);
    // Replace the joined point with the midpoint of the two merged points
    controlPoints[enda] = midpoint(tailControlPoints[0], spline1.controlPoints[enda]);
    const headVisible = spline1.segmentsVisible.slice(starta, enda);
    const tailVisible = spline2.segmentsVisible.slice(startb, endb);
    const segmentsVisible = headVisible.concat(tailVisible);
    // Sanity check
    if (controlPoints.length - segmentsVisible.length !== 1) {
        throw new Error(`Segment length does not match control point length, ${controlPoints.length}, ${segmentsVisible.length}`);
    }
    const newSpline = {
        controlPoints: controlPoints,
        location: controlPoints[0],
        segmentsVisible: segmentsVisible,
        type: spline1.type,
    };
    enforceSimpleSpline(newSpline);
    return newSpline;
}

function headControlPoint(spline: Spline): number {
    return spline.segmentsVisible.findIndex(Boolean);
}

function tailControlPoint(spline: Spline): number {
    return findLastIndex(spline.segmentsVisible, Boolean) + 1;
}

function findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => unknown): number {
    const index = array.slice().reverse().findIndex(predicate);
    return (index >= 0) ? (array.length - 1 - index) : index;
}

/**
 * Returns the heading (in degrees) at the provided control point index.
 * @param {Spline} spline - the spline providing control points
 * @param {number} i - the control point index
 * @return {number}
 */
export function splineHeading(spline: Spline, i: number): number {
    const max = spline.segmentsVisible.length;
    if (i === 0) {
        // Head segment heading
        const va = spline.controlPoints[1]!;
        const vb = spline.controlPoints[0]!;
        return vectorHeading(va, vb);
    } else if (i === max) {
        // Tail segment heading
        const va = spline.controlPoints[i]!;
        const vb = spline.controlPoints[i - 1]!;
        return vectorHeading(va, vb);
    } else if (i > 0 && i < max) {
        // Average two adjacent segments
        const va = spline.controlPoints[i + 1]!;
        const vb = spline.controlPoints[i]!;
        const vc = spline.controlPoints[i - 1]!;
        const ha = vectorHeading(va, vb);
        const hb = vectorHeading(vb, vc);
        return circularMean(ha, hb);
    } else {
        throw new Error(`Illeval control point index ${i}`);
    }
}

export function splineInclination(spline: Spline, i: number): number {
    const max = spline.segmentsVisible.length;
    if (i === 0) {
        // Head segment heading
        const va = spline.controlPoints[1]!;
        const vb = spline.controlPoints[0]!;
        return vectorInclination(va, vb);
    } else if (i === max) {
        // Tail segment heading
        const va = spline.controlPoints[i]!;
        const vb = spline.controlPoints[i - 1]!;
        return vectorInclination(va, vb);
    } else if (i > 0 && i < max) {
        // Average two adjacent segments
        const va = spline.controlPoints[i + 1]!;
        const vb = spline.controlPoints[i]!;
        const vc = spline.controlPoints[i - 1]!;
        const ha = vectorInclination(va, vb);
        const hb = vectorInclination(vb, vc);
        return circularMean(ha, hb);
    } else {
        throw new Error(`Illeval control point index ${i}`);
    }
}

/**
 * Calculates the circular mean of any number of angles.
 * @param {number[]} args - an array of angles to average (in degrees)
 * @return {number} the circular mean of angles (in degrees)
 */
function circularMean(...args: number[]): number {
    // https://en.wikipedia.org/wiki/Circular_mean
    const rads = args.map((d) => d * Math.PI / 180);
    const x = rads.map(Math.sin).reduce((a, e) => a + e, 0);
    const y = rads.map(Math.cos).reduce((a, e) => a + e, 0);
    return Math.atan2(x, y) * 180 / Math.PI;
}

/**
 * Calculates the heading between the origin and target vectors.
 * @param {vector} va - origin vector
 * @param {vector} vb - target vector
 * @return {number} the heading from a to b (in degrees)
 */
function vectorHeading(va: Vector, vb: Vector) {
    const dx = (vb.x - va.x); // positive is west
    const dy = (vb.y - va.y); // positive is south
    return Math.atan2(-dy, -dx) * 180 / Math.PI;
}

/**
 * Calculates the inclination between the origin and target vectors.
 * @param {vector} va - origin vector
 * @param {vector} vb - target vector
 * @return {number} the inclination from a to b (in degrees)
 */
function vectorInclination(va: Vector, vb: Vector) {
    const dx = (vb.x - va.x); // positive is west
    const dy = (vb.y - va.y); // positive is south
    const dz = (vb.z - va.z); // positive is up
    return Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI;
}

export function normalizeAngle(angle: number): number {
    angle %= 360.0;
    if (angle > 180) return angle - 360.0;
    if (angle <= -180) return angle + 360.0;
    return angle;
}

function midpoint(arg0: Vector, arg1: Vector): Vector {
    return {
        x: (arg0.x + arg1.x) / 2,
        y: (arg0.y + arg1.y) / 2,
        z: (arg0.z + arg1.z) / 2,
    };
}
