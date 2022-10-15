import {Industry, IndustryType, Railroad, Sandhouse, Spline, SplineTrack, Switch, Turntable, Watertower} from './Railroad';
import {Vector} from './Gvas';
import {handleError} from './index';
import {cubicBezier, hermiteToBezier} from './util-bezier';

type Callback<T> = (value: T) => void;

export class TreeUtil {
    private railroad: Railroad;
    private trees?: Vector[];
    private treePromises: [Callback<Vector[]>, Callback<any>][] = [];
    private onTreesChanged: (before: number, after: number) => void;

    constructor(railroad: Railroad, onTreesChanged: (before: number, after: number) => void) {
        this.railroad = railroad;
        this.onTreesChanged = onTreesChanged;
    }

    private fetchTrees() {
        // Tree list created by Aikawa#2539 and Sharidan#4609
        const url = 'https://railroad.studio/attachments/953456918834343976/963223327965585498/AllTrees.dat';
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    console.log(response);
                    throw new Error(`Fetch failed: ${url} ${response.status} ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(parseTrees)
            .then((trees) => {
                this.trees = trees;
                this.treePromises.forEach((resolve) => resolve[0](trees.slice()));
                this.treePromises = [];
            })
            .catch((error) => {
                this.treePromises.forEach((resolve) => resolve[1](error));
                this.treePromises = [];
                handleError(error);
            });
    }

    allTrees(): Promise<Vector[]> {
        if (!this.trees) {
            this.trees = [];
            this.fetchTrees();
        }
        return new Promise((resolve, reject) => {
            if (this.trees && this.trees.length > 0) {
                resolve(this.trees.slice());
            } else {
                this.treePromises.push([resolve, reject]);
            }
        });
    }

    cutAll() {
        this.allTrees()
            .then((trees) => {
                const before = this.railroad.removedVegetationAssets.length;
                this.railroad.removedVegetationAssets = trees;
                this.onTreesChanged(before, trees.length);
            })
            .catch(handleError);
    }

    replantAll() {
        const before = this.railroad.removedVegetationAssets.length;
        this.railroad.removedVegetationAssets = [];
        this.onTreesChanged(before, 0);
    }

    smartReplant() {
        const before = this.railroad.removedVegetationAssets.length;
        this.railroad.removedVegetationAssets = this.railroad.removedVegetationAssets
            .filter((tree) => !this.treeFilter(tree));
        const after = this.railroad.removedVegetationAssets.length;
        this.onTreesChanged(before, after);
    }

    smartPeek() {
        return this.railroad.removedVegetationAssets
            .filter((tree) => this.treeFilter(tree));
    }

    treeFilter(tree: Vector) {
        return !spawnFilter(tree) && undefined === (
            this.railroad.industries.find((i) => industryFilter(i, tree)) ||
            this.railroad.sandhouses.find((s) => sandhouseFilter(s, tree)) ||
            this.railroad.splines.find((s) => splineFilter(s, tree)) ||
            this.railroad.splineTracks.find((s) => splineTrackFilter(s, tree)) ||
            this.railroad.switches.find((s) => switchFilter(s, tree)) ||
            this.railroad.turntables.find((t) => turntableFilter(t, tree)) ||
            this.railroad.watertowers.find((w) => watertowerFilter(w, tree)));
    }
}

function parseTrees(buffer: ArrayBuffer) {
    const vectors: Vector[] = [];
    const length = new Uint32Array(buffer, 0, 1)[0];
    if (buffer.byteLength !== 4 + 12 * length) {
        throw new Error(`byteLength=${buffer.byteLength}, length=${length}`);
    }
    const floats = new Float32Array(buffer, 4, length * 3);
    for (let pos = 0; pos < 3 * length; pos += 3) {
        vectors.push({
            x: floats[pos + 0],
            y: floats[pos + 1],
            z: floats[pos + 2],
        });
    }
    return vectors;
}

type Point = {
    x: number;
    y: number;
};

function dist2(v: Point, w: Point) {
    const dx = v.x - w.x;
    const dy = v.y - w.y;
    return dx * dx + dy * dy;
}

function distToSegment2(p: Point, v: Point, w: Point) {
    const l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    const t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    const n = Math.max(0, Math.min(1, t));
    const x = v.x + n * (w.x - v.x);
    const y = v.y + n * (w.y - v.y);
    return dist2(p, {x: x, y: y});
}

export function radiusFilter(obstacle: Point, tree: Point, radius: number): boolean {
    return dist2(obstacle, tree) <= radius * radius;
}

function rectFilter(x0: number, x1: number, y0: number, y1: number, tree: Point) {
    return tree.x >= x0 && tree.x <= x1 && tree.y >= y0 && tree.y <= y1;
}

function industryFilter(industry: Industry, tree: Vector): boolean {
    switch (industry.type) {
        case IndustryType.logging_camp:
            return radiusFilter(industry.location, tree, 45_00); // 45m
        case IndustryType.sawmill:
            return radiusFilter(industry.location, tree, 60_00); // 60m
        case IndustryType.smelter:
            return radiusFilter(industry.location, tree, 40_00); // 40m
        case IndustryType.ironworks:
            return radiusFilter(industry.location, tree, 40_00); // 40m
        case IndustryType.oil_field:
            return radiusFilter(industry.location, tree, 100_00); // 100m
        case IndustryType.refinery:
            return radiusFilter(industry.location, tree, 45_00); // 45m
        case IndustryType.coal_mine:
            return radiusFilter(industry.location, tree, 40_00); // 40m
        case IndustryType.iron_mine:
            return radiusFilter(industry.location, tree, 30_00); // 30m
        case IndustryType.freight_depot:
            return radiusFilter(industry.location, tree, 35_00); // 35m
        case IndustryType.firewood_camp:
            return radiusFilter(industry.location, tree, 15_00); // 15m
        case IndustryType.engine_house_lightblue:
        case IndustryType.engine_house_gold:
        case IndustryType.engine_house_red:
        case IndustryType.engine_house_brown:
            return radiusFilter(industry.location, tree, 15_00); // 15m
        default:
            throw new Error(`Unknown industry type ${industry.type}`);
    }
}

function sandhouseFilter(sandhouse: Sandhouse, tree: Vector): boolean {
    return radiusFilter(sandhouse.location, tree, 10_00); // 10m
}

function spawnFilter(tree: Vector): boolean {
    return rectFilter(674, 2000, 3056, 8513, tree) ||
        radiusFilter({x: 1250, y: -2300}, tree, 50_00) || // 50m
        radiusFilter({x: -6600, y: -1200}, tree, 20_00); // 20m
}

function splineFilter(spline: Spline, tree: Vector): boolean {
    const limit = 4_50; // 4.5m
    const limit2 = limit * limit;
    for (let i = 0; i < spline.segmentsVisible.length; i++) {
        if (!spline.segmentsVisible[i]) continue;
        const d2 = distToSegment2(tree, spline.controlPoints[i], spline.controlPoints[i + 1]);
        if (d2 < limit2) return true;
    }
    return false;
}

function splineTrackFilter(spline: SplineTrack, tree: Vector): boolean {
    const limit = 4_50; // 4.5m
    const limit2 = limit * limit;
    const samples = 10;
    const {x0, y0, x1, y1, x2, y2, x3, y3} = hermiteToBezier(spline);
    let px = NaN;
    let py = NaN;
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = cubicBezier(t, x0, x1, x2, x3);
        const y = cubicBezier(t, y0, y1, y2, y3);
        if (i > 0) {
            const d2 = distToSegment2(tree, {x: px, y: py}, {x, y});
            if (d2 < limit2) return true;
        }
        px = x;
        py = y;
    }
    return false;
}

function switchFilter(sw: Switch, tree: Vector): boolean {
    return radiusFilter(sw.location, tree, 6_00); // 6m
}

function turntableFilter(turntable: Turntable, tree: Vector): boolean {
    return radiusFilter(turntable.location, tree, 15_00); // 15m
}

function watertowerFilter(watertower: Watertower, tree: Vector): boolean {
    return radiusFilter(watertower.location, tree, 10_00); // 10m
}
