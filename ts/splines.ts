/* exported simplifySplines */
/* global Railroad Spline Vector */

/**
 * @callback loggingCallback
 * @param {string} log - The message to log
 * @returns {void}
 */

/**
 * Create new splines through existing control points. There are three steps:
 * 1. Discard splines that are completely invisible.
 * 2. Split splines with hidden middle sections into separate splines. Trim every spline to have a max of one hidden segment at the head and one at the tail.
 * 3. Combine adjacent splines to make longer splines (limit 97 segments).
 * @param {Railroad} railroad - The railroad select splines from
 * @param {loggingCallback} log - Handler for logging output
 * @return {Spline[]}
 */
function simplifySplines(railroad: Railroad, log?: (data: string) => void): Spline[] {
    const splines = railroad.splines;
    const numControlPoints = splines.reduce((a, e) => a + e.controlPoints.length, 0);
    if (log) log(`Starting with ${splines.length} splines, ${numControlPoints} control points.`);
    // Step 1, discard invisible
    const visible = splines.filter((spline) => spline.segmentsVisible.some(Boolean));
    if (log && splines.length !== visible.length) {
        const visiblePoints = visible.reduce((a, e) => a + e.controlPoints.length, 0);
        log(`After removing invisible, ${visible.length} splines, ${visiblePoints} control points.`);
    }
    // Step 2, split and trim
    const simplified = splitSplines(visible);
    if (log && visible.length !== simplified.length) {
        const simplifiedPoints = simplified.reduce((a, e) => a + e.controlPoints.length, 0);
        log(`After simplification, ${simplified.length} splines, ${simplifiedPoints} control points.`);
    }
    // Step 3, combine
    const merged = mergeSplines(simplified);
    if (log && merged.length !== simplified.length) {
        const mergedPoints = merged.reduce((a, e) => a + e.controlPoints.length, 0);
        log(`After merging, ${merged.length} splines, ${mergedPoints} control points.`);
        log(`Spline count reduced by ${(100 * (1 - (merged.length / splines.length))).toFixed(2)}%.\nControl point count reduced by ${(100 * (1 - (mergedPoints / numControlPoints))).toFixed(2)}%.`);
    }
    return merged;
}

/**
 * Split splines with alternating visibility into multiple splines.
 * @param {Spline[]} splines
 * @return {Spline[]}
 */
function splitSplines(splines: Spline[]): Spline[] {
    let result: Spline[] = [];
    for (const spline of splines) {
        result = result.concat(splitSpline(spline));
    }
    return result;
}

/**
 * Split a spline with alternating visibility into multiple splines.
 * @param {Spline} spline
 * @return {Spline[]}
 */
function splitSpline(spline: Spline): Spline[] {
    // if (!spline.segmentsVisible.some(Boolean)) return [];
    const splines: Spline[] = [];
    const firstVisibleSegment = spline.segmentsVisible.findIndex(Boolean);
    let vectors: Vector[] = [];
    let visible: boolean[] = [];
    if (firstVisibleSegment === -1) {
        throw new Error('No segments are visible');
    } else if (firstVisibleSegment === 0) {
        // Spline does not have any hidden sections at its head
        vectors.push(spline.controlPoints[0]);
        vectors.push(spline.controlPoints[1]);
        visible = [true];
    } else {
        // Spline has a hidden section at its head
        vectors.push(spline.controlPoints[firstVisibleSegment - 1]);
        vectors.push(spline.controlPoints[firstVisibleSegment]);
        vectors.push(spline.controlPoints[firstVisibleSegment + 1]);
        visible = [false, true];
    }
    for (let i = firstVisibleSegment + 1; i < spline.segmentsVisible.length; i++) {
        const tv = spline.segmentsVisible[i];
        const pv = spline.segmentsVisible[i - 1];
        if (pv) {
            if (tv) {
                // Consecutive visible segments, extend the spline
                vectors.push(spline.controlPoints[i + 1]);
                visible.push(true);
            } else {
                // Previous segment was visible, end the spline
                vectors.push(spline.controlPoints[i + 1]);
                visible.push(false);
                if (!visible.some(Boolean)) throw new Error('Spline is not visible');
                splines.push(<Spline>{
                    controlPoints: vectors,
                    location: vectors[0],
                    segmentsVisible: visible,
                    type: spline.type,
                });
            }
        } else {
            if (tv) {
                // Create a two segment spline with invisible start
                vectors = spline.controlPoints.slice(i - 2, i + 1);
                visible = [pv, tv];
            } else {
                // Consecutive invisible segments
            }
        }
    }
    if (spline.segmentsVisible[spline.segmentsVisible.length - 1]) {
        // Spline does not have any hidden sections at its tail
        if (!visible.some(Boolean)) throw new Error('Spline is not visible');
        splines.push(<Spline>{
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
    const nowhere: Vector = {x: NaN, y: NaN, z: NaN};
    const placeholder: Spline = {controlPoints: [nowhere], location: nowhere, segmentsVisible: [], type: NaN};
    const result: Spline[] = splines.slice();
    for (let i = 0; i < splines.length - 1; i++) {
        for (let j = i + 1; j < splines.length; j++) {
            const merged = mergeAdjacentSplines(result[i]!, result[j]!);
            if (merged) {
                // console.log(`Merged splines ${i} and ${j}`);
                result[i] = merged;
                result[j] = placeholder;
            }
        }
    }
    return result.filter((s) => s !== placeholder);
}

/**
 * Merge two simplified splines, if they are adjacent.
 * @param {Spline} spline1
 * @param {Spline} spline2
 * @return {Spline | null} a merged spline, or null if merging failed
 */
function mergeAdjacentSplines(spline1: Spline, spline2: Spline): Spline | null {
    const limit = 0.01; // Max distance between control points (1cm, in meters)
    const limit2 = limit * limit; // Limit squared
    if (spline1.type !== spline2.type) return null;
    [spline1, spline2].forEach(enforceSimpleSpline);
    // Iterate through each permutation of spline ordering (forward, reverse).
    for (const a of [spline1, reverseSpline(spline1)]) {
        const taila = tailControlPoint(a);
        const cpa = a.controlPoints[taila]!;
        for (const b of [spline2, reverseSpline(spline2)]) {
            const headb = headControlPoint(b);
            const cpb = b.controlPoints[headb]!;
            // Compare the tail control point of A to the head control point of B
            const d2 = delta2(cpa, cpb);
            if (d2 > limit2) {
                // Control points are too far apart to be merged
                continue;
            }
            const ha = splineHeading(a, taila - 1);
            const hb = splineHeading(b, headb);
            const dh = Math.abs(normalizeAngle(ha - hb));
            if (dh > 10) {
                // Spline headings are too far apart to be merged
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
function delta2(a: Vector, b: Vector): number {
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
    return <Spline>{
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
    const headVisible = spline1.segmentsVisible.slice(starta, enda);
    const tailVisible = spline2.segmentsVisible.slice(startb, endb);
    const segmentsVisible = headVisible.concat(tailVisible);
    // Sanity check
    if (controlPoints.length - segmentsVisible.length !== 1) {
        throw new Error(`Segment length does not match control point length, ${controlPoints.length}, ${segmentsVisible.length}`);
    }
    const newSpline = <Spline>{
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

function normalizeAngle(angle: number): number {
    angle %= 360.0;
    if (angle > 180) return angle - 360.0;
    if (angle <= -180) return angle + 360.0;
    return angle;
}

function difference(a: Vector, b: Vector): Vector {
    return <Vector>{
        x: b.x - a.x,
        y: b.y - a.y,
        z: b.z - a.z,
    };
}

function splineHeading(spline: Spline, i: number): number {
    const len = spline.segmentsVisible.length;
    if (i < 0 || i > len) throw new Error(`Illeval i ${i}`);
    if (i === 0) {
        i = 1;
    }
    const va = spline.controlPoints[i]!;
    const vb = spline.controlPoints[i - 1]!;
    const dv = difference(va, vb);
    const hdg = Math.atan2(dv.y, dv.x);
    return hdg * 180 / Math.PI;
}
