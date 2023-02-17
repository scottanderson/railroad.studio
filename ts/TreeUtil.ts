import {IndustryType} from './IndustryType';
import {Industry, Railroad, Sandhouse, Spline, SplineTrack, Switch, Turntable, Watertower} from './Railroad';
import {Studio} from './Studio';
import {Vector, vectorSum} from './Vector';
import {VectorSet} from './VectorSet';
import {handleError} from './index';
import {clamp} from './math';
import {asyncFilter} from './util-async';
import {cubicBezier3, hermiteToBezier} from './util-bezier';
import {rotateVector} from './RotationMatrix';

type Callback<T> = (value: T) => any;

type OnTreesChangedCallback = (before: number, after: number, trees: Vector[], dryrun?: boolean) => Promise<any>;

export interface Point {
    x: number;
    y: number;
}

export class TreeUtil {
    private readonly railroad: Railroad;
    private trees?: Vector[];
    private treePromises: [Callback<Vector[]>, Callback<any>][] = [];
    private readonly onTreesChanged;
    private readonly setMapModified;
    private readonly setTitle;

    constructor(studio: Studio, onTreesChanged: OnTreesChangedCallback) {
        this.railroad = studio.railroad;
        this.onTreesChanged = onTreesChanged;
        this.setMapModified = () => studio.setMapModified();
        this.setTitle = (title: string) => studio.setTitle(title);
    }

    private fetchTrees() {
        // Tree list created by Aikawa#2539 and Sharidan#4609
        const url = 'AllTrees.dat';
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
        if (this.trees && this.trees.length > 0) {
            return Promise.resolve(this.trees.slice());
        } else {
            return new Promise((resolve, reject) => {
                this.treePromises.push([resolve, reject]);
            });
        }
    }

    async cutAll() {
        const trees = await this.allTrees();
        const before = this.railroad.removedVegetationAssets.length;
        this.railroad.removedVegetationAssets = trees;
        this.setMapModified();
        return this.onTreesChanged(before, trees.length, trees);
    }

    async plantAll() {
        const before = this.railroad.removedVegetationAssets.length;
        if (before === 0) return;
        const treesBefore = this.railroad.removedVegetationAssets;
        this.railroad.removedVegetationAssets = [];
        this.setMapModified();
        return this.onTreesChanged(before, 0, treesBefore);
    }

    async smartCut(renderFunc?: (trees: Vector[]) => void, dryrun = false) {
        const cutSet = new VectorSet(this.railroad.removedVegetationAssets);
        const before = cutSet.size();
        const predicate = (tree: Vector) => !cutSet.has(tree) && !this.treeFilter(tree);
        const updateFunc = (r: number, t: number): void => {
            const pct = 100 * (1 - (r / t));
            this.setTitle(`${dryrun ? 'Surveying' : 'Cutting'} trees ${pct.toFixed(1)}%...`);
        };
        const allTrees = await this.allTrees();
        const smartCut = await asyncFilter(allTrees, predicate, undefined, updateFunc, renderFunc);
        const result = this.railroad.removedVegetationAssets.concat(smartCut);
        const after = result.length;
        if (!dryrun) {
            this.setMapModified();
            this.railroad.removedVegetationAssets = result;
        }
        return this.onTreesChanged(before, after, smartCut, dryrun);
    }

    async smartPlant(dryrun = false) {
        const before = this.railroad.removedVegetationAssets.length;
        const updateFunc = (r: number, t: number): void => {
            const pct = 100 * (1 - (r / t));
            this.setTitle(`Planting trees ${pct.toFixed(1)}%...`);
        };
        const result = await asyncFilter(
            this.railroad.removedVegetationAssets,
            (tree) => !this.treeFilter(tree), undefined,
            updateFunc,
        );
        const after = result.length;
        const resultSet = new VectorSet(result);
        const modified = this.railroad.removedVegetationAssets.filter((v) => !resultSet.has(v));
        if (!dryrun) {
            this.setMapModified();
            this.railroad.removedVegetationAssets = result;
        }
        return this.onTreesChanged(before, after, modified, dryrun);
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

function dist2(v: Point, w: Point) {
    const dx = v.x - w.x;
    const dy = v.y - w.y;
    return dx * dx + dy * dy;
}

function distToSegment2(p: Point, v: Point, w: Point) {
    const l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    const t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    const n = clamp(t, 0, 1);
    const x = v.x + n * (w.x - v.x);
    const y = v.y + n * (w.y - v.y);
    return dist2(p, {x: x, y: y});
}

function pillFilter(tree: Vector, p0: Vector, p1: any, limit: number): boolean {
    return distToSegment2(tree, p0, p1) < limit ** 2;
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
        {
            const p0local = {x: 500, y: 0, z: 0};
            const p1local = {x: 1500, y: 0, z: 0};
            const p0 = vectorSum(industry.location, rotateVector(p0local, industry.rotation));
            const p1 = vectorSum(industry.location, rotateVector(p1local, industry.rotation));
            return pillFilter(tree, p0, p1, 10_00);
        }
        case IndustryType.telegraph_office:
            return radiusFilter(industry.location, tree, 10_00); // 10m
        default:
            console.log(`Unknown industry type ${industry.type}`);
            return false;
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
    const bezier = hermiteToBezier(spline);
    const bx = bezier.map((v) => v.x);
    const by = bezier.map((v) => v.y);
    const fastFilter = rectFilter(
        Math.min.apply(null, bx) - limit, Math.max.apply(null, bx) + limit,
        Math.min.apply(null, by) - limit, Math.max.apply(null, by) + limit,
        tree);
    if (!fastFilter) return false;
    let pp = {x: NaN, y: NaN};
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = cubicBezier3(t, bezier);
        if (i > 0) {
            const d2 = distToSegment2(tree, pp, p);
            if (d2 < limit2) return true;
        }
        pp = p;
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
