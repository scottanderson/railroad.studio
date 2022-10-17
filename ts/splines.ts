import {Vector} from './Gvas';
import {Railroad, Spline, SplineType} from './Railroad';
import {findLastIndex} from './util';

export type MergeLimits = {
    /** Bearing limit for merging control points (degrees). */
    bearing: number;
    /** Inclination limit for merging control points (degrees). */
    inclination: number;
    /** Horizontal limit for merging control points (centimeters). */
    horizontal: number;
    /** Vertical limit for merging control points (centimeters). */
    vertical: number;
};

/**
 * Create new splines through existing control points. There are three steps:
 * 1. Hide overlapping segments, and discard splines that are completely invisible.
 * 2. Split splines with hidden middle sections into separate splines. Trim every spline to have a max of one hidden segment at the head and one at the tail.
 * 3. Combine adjacent splines to make longer splines (limit 97 segments).
 * @param {Railroad} railroad - The railroad select splines from
 * @param {MergeLimits} limits
 * @return {Spline[]}
 */
export function simplifySplines(railroad: Railroad, limits: MergeLimits): Spline[] {
    const splines = railroad.splines;
    const numControlPoints = splines.reduce((a, e) => a + e.controlPoints.length, 0);
    console.log(`Starting with ${splines.length} splines, ${numControlPoints} control points, ${trackLength(splines)}.`);
    // Step 1, hide overlapping segments, discard invisible
    const visible = removeOverlappedSegments(splines);
    if (splines.length !== visible.length) {
        const visiblePoints = visible.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After removing overlaps, ${visible.length} splines, ${visiblePoints} control points, ${trackLength(visible)}.`);
    }
    // Step 2, split and trim
    const simplified = visible.flatMap(splitSpline);
    if (visible.length !== simplified.length) {
        const simplifiedPoints = simplified.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After splitting, ${simplified.length} splines, ${simplifiedPoints} control points.`);
    }
    // Step 3, combine
    const merged = mergeSplines(simplified, limits);
    if (merged.length !== simplified.length || merged.length !== splines.length) {
        const mergedPoints = merged.reduce((a, e) => a + e.controlPoints.length, 0);
        console.log(`After merging, ${merged.length} splines, ${mergedPoints} control points.`);
        const fmtPercent = (n: number, d: number) => {
            if (n === d) return `unchanged (${n})`;
            const pct = Math.abs(100 * (1 - (n / d))).toFixed(2);
            return (n > d) ? `increased from ${d} to ${n} (+${pct}%)` : `decreased from ${d} to ${n} (-${pct}%)`;
        };
        console.log(`Spline count ${fmtPercent(merged.length, splines.length)}.\n` +
            `Control point count ${fmtPercent(mergedPoints, numControlPoints)}.\n` +
            `Segment count ${fmtPercent(mergedPoints - merged.length, numControlPoints - splines.length)}.`);
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
    splines.forEach(enforceSimpleSpline);
    const splitLength = splines.map(splineLength).reduce((a, l) => a + l, 0);
    const origLength = splineLength(spline);
    if (Math.abs(splitLength - origLength) > 0.01) {
        console.log(spline, splines);
        throw new Error(`split spline length ${splitLength} is not same length as original ${origLength}`);
    }
    return splines;
}

function trackLength(splines: Spline[]): string {
    const len = splines
        .filter((s) => s.type === SplineType.rail || s.type === SplineType.rail_deck)
        .map(splineLength)
        .reduce((a, l) => a + l, 0);
    if (len < 100) return (len).toFixed(2) + 'cm';
    if (len < 1000_00) return (len / 100).toFixed(2) + 'm';
    return (len / 1000_00).toFixed(2) + 'km';
}

export function splineLength(spline: Spline): number {
    let result = 0;
    for (let i = 0; i < spline.segmentsVisible.length; i++) {
        if (spline.segmentsVisible[i]) {
            const a = spline.controlPoints[i];
            const b = spline.controlPoints[i + 1];
            result += Math.sqrt(delta2(a, b));
        }
    }
    return result;
}

/**
 * Remove (by hiding) any spline segments which are overlapping another spline segment.
 * @param {Spline[]} splines
 * @return {Spline[]}
 */
function removeOverlappedSegments(splines: Spline[]): Spline[] {
    // Make a deep copy of segment visibility
    const result: Spline[] = splines.slice();
    result.forEach((s) => s.segmentsVisible = s.segmentsVisible.slice());
    let numHidden = 0;
    const typesHidden: { [key: number]: number } = {};
    for (let ai = 0; ai < result.length - 1; ai++) {
        for (let bi = result.length - 1; bi > ai; bi--) {
            const a = result[ai];
            const b = result[bi];
            if (a.type !== b.type) continue;
            for (let j = 0; j < b.segmentsVisible.length; j++) {
                if (!b.segmentsVisible[j]) continue;
                for (let i = 0; i < a.segmentsVisible.length; i++) {
                    if (!a.segmentsVisible[i]) continue;
                    if (segmentsOverlap(a, i, b, j)) {
                        // Segments overlap, hide one of them
                        b.segmentsVisible[j] = false;
                        numHidden++;
                        typesHidden[a.type] = (typesHidden[a.type] || 0) + 1;
                    }
                }
            }
        }
    }
    if (numHidden > 0) {
        console.log(`Hiding ${numHidden} duplicate spline segments:`,
            Object.entries(typesHidden).map(([t, n]) => `${SplineType[Number(t)]}: ${n}`).join(', '));
    }
    // Filter out completely invisible splines
    return result.filter((s) => s.segmentsVisible.some(Boolean));
}

/**
 * Returns true if the spline segments overlap.
 * @param {Spline} a - provides first spline segment (index i)
 * @param {number} i - segment index for a
 * @param {Spline} b - provides second spline segment (index j)
 * @param {number} j - segment index for b
 * @return {boolean}
 */
function segmentsOverlap(a: Spline, i: number, b: Spline, j: number): boolean {
    const cpa0 = a.controlPoints[i];
    const cpa1 = a.controlPoints[i + 1];
    const cpb0 = b.controlPoints[j];
    const cpb1 = b.controlPoints[j + 1];
    const limit2 = 10 * 10; // 10cm
    const pointsAdjacent = (a: Vector, b: Vector) => delta2(a, b) < limit2;
    return false ||
        (pointsAdjacent(cpa0, cpb0) && pointsAdjacent(cpa1, cpb1)) ||
        (pointsAdjacent(cpa0, cpb1) && pointsAdjacent(cpa1, cpb0));
}

/**
 * Attempt spline merging between every pair of splines.
 * @param {Spline[]} splines
 * @param {MergeLimits} limits
 * @return {Spline[]}
 */
function mergeSplines(splines: Spline[], limits: MergeLimits): Spline[] {
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
                const merged = mergeAdjacentSplines(result[i]!, result[j]!, limits);
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
 * @param {MergeLimits} limits
 * @return {Spline | null} a merged spline, or null if merging failed
 */
function mergeAdjacentSplines(spline1: Spline, spline2: Spline, limits: MergeLimits): Spline | null {
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
        for (const b of [spline2, reverseSpline(spline2)]) {
            // The head CP is the first visible segment index
            const headb = headControlPoint(b);
            if (!splinesAdjacent(a, taila, b, headb, limits)) {
                // Conditions for merging not met, continue checking other points
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
 * Returns true if control points a[taila] and b[headb] are within the various limits for spline merging.
 * @param {Spline} a - the spline to beocme the new head
 * @param {number} enda - end control point index for a
 * @param {Spline} b - the spline to become the new tail
 * @param {number} startb - start control point index for b
 * @param {MergeLimits} limits
 * @return {boolean} true if splines can be merged.
 */
function splinesAdjacent(a: Spline, enda: number, b: Spline, startb: number, limits: MergeLimits): boolean {
    const cpa = a.controlPoints[enda]!;
    const cpb = b.controlPoints[startb]!;
    // Compare the tail control point of A to the head control point of B
    if (!pointsAdjacent(cpa, cpb, limits)) {
        // Control points are too far apart to be merged
        return false;
    }
    const ha = splineHeading(a, enda);
    const hb = splineHeading(b, startb);
    const bearing = Math.abs(normalizeAngle(ha - hb));
    if (bearing > limits.bearing) {
        // Spline headings are too far apart to be merged
        return false;
    }
    const ia = splineInclination(a, enda);
    const ib = splineInclination(b, startb);
    const di = Math.abs(normalizeAngle(ia - ib));
    if (di > limits.inclination) {
        // Spline grades are too far apart to be merged
        return false;
    }
    return true;
}

function pointsAdjacent(a: Vector, b: Vector, limits: MergeLimits) {
    const hlimit2 = limits.horizontal * limits.horizontal; // Horizontal limit squared
    const vlimit2 = limits.vertical * limits.vertical; // Vertical limit squared
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const h2 = dx * dx + dy * dy;
    const v2 = dz * dz;
    if (h2 > hlimit2 || v2 > vlimit2) {
        // Control points are too far apart to be merged
        return false;
    }
    return true;
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
    const m2 = dx * dx + dy * dy + dz * dz;
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
export function vectorHeading(va: Vector, vb: Vector) {
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
