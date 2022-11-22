/* global SvgPanZoom */
import * as svgPanZoom from 'svg-pan-zoom';
// eslint-disable-next-line no-redeclare
import {ArrayXY, Circle, Element, G, Matrix, Path, PathCommand, Svg} from '@svgdotjs/svg.js';
import {Frame, Industry, IndustryType, Player, Railroad, Spline, SplineTrack, SplineType, Switch, SwitchType, Turntable} from './Railroad';
import {Studio} from './Studio';
import {radiusFilter, TreeUtil} from './TreeUtil';
import {GvasString, Vector} from './Gvas';
import {bezierCommand, svgPath} from './bezier';
import {delta2, MergeLimits, normalizeAngle, splineHeading, vectorHeading} from './splines';
import {calculateGrade, calculateSteepestGrade, flattenSpline} from './tool-flatten';
import {frameLimits} from './frames';
import {handleError} from './index';
import {parallelSpline} from './tool-parallel';
import {hermiteToBezier} from './util-bezier';

enum MapToolMode {
    pan_zoom,
    delete,
    flatten_spline,
    tree_brush,
    parallel,
}

interface MapOptions {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
    layerVisibility: MapLayerVisibility;
    mergeLimits: MergeLimits;
}

export interface MapLayers {
    background: G;
    border: G;
    brush: G;
    frameNumbers: G;
    frames: G;
    grades: G;
    groundworkControlPoints: G;
    groundworks: G;
    groundworksHidden: G;
    industries: G;
    players: G;
    trackControlPoints: G;
    tracks: G;
    tracksHidden: G;
    trees: G;
    turntables: G;
}

interface MapLayerVisibility {
    background: boolean;
    border: boolean;
    brush: boolean;
    frameNumbers: boolean;
    frames: boolean;
    grades: boolean;
    groundworkControlPoints: boolean;
    groundworks: boolean;
    groundworksHidden: boolean;
    industries: boolean;
    players: boolean;
    trackControlPoints: boolean;
    tracks: boolean;
    tracksHidden: boolean;
    trees: boolean;
    turntables: boolean;
}

export class RailroadMap {
    private railroad: Railroad;
    private treeUtil: TreeUtil;
    private svg: Svg;
    private panZoom: SvgPanZoom.Instance;
    private toolMode: MapToolMode;
    private layers: MapLayers;
    private layerVisibility: MapLayerVisibility;
    private setMapModified: () => void;
    private setTitle: (title: string) => void;
    private brush: Circle | undefined;
    private remainingTreesAppender?: (trees: Vector[]) => Promise<void>;
    private mergeLimits: MergeLimits;

    constructor(studio: Studio, element: HTMLElement) {
        this.setMapModified = () => studio.modified = true;
        this.setTitle = (title) => studio.setTitle(title);
        this.railroad = studio.railroad;
        this.treeUtil = new TreeUtil(this.railroad, (before, after) => {
            if (before === after) {
                this.setTitle(`No change, ${after} cut trees`);
            } else if (before < after) {
                this.setTitle(`Cut ${after - before} trees`);
            } else {
                this.setTitle(`Replanted ${before - after} trees`);
            }
            this.layers.trees.node.replaceChildren();
            this.renderTrees();
        });
        this.toolMode = MapToolMode.pan_zoom;
        const options = this.readOptions();
        this.layerVisibility = options.layerVisibility;
        this.mergeLimits = options.mergeLimits;
        this.svg = new Svg()
            .addClass('map-svg')
            .addTo(element);
        this.layers = this.createLayers();
        this.render();
        this.panZoom = this.initPanZoom();
        if (options.pan && options.zoom) {
            this.panZoom.zoom(options.zoom);
            this.panZoom.pan(options.pan);
        }
    }

    public getMergeLimits() {
        return this.mergeLimits;
    }

    public getTreeUtil() {
        return this.treeUtil;
    }

    refresh() {
        const pan = this.panZoom.getPan();
        const zoom = this.panZoom.getZoom();
        this.panZoom?.destroy();
        this.svg.node.replaceChildren();
        this.layers = this.createLayers();
        this.render();
        this.panZoom = this.initPanZoom();
        if (pan && zoom) {
            this.panZoom.zoom(zoom);
            this.panZoom.pan(pan);
        }
    }

    refreshSplines(): Promise<void> {
        this.layers.grades.node.replaceChildren();
        this.layers.groundworkControlPoints.node.replaceChildren();
        this.layers.groundworks.node.replaceChildren();
        this.layers.groundworksHidden.node.replaceChildren();
        this.layers.trackControlPoints.node.replaceChildren();
        this.layers.tracks.node.replaceChildren();
        this.layers.tracksHidden.node.replaceChildren();
        this.renderSwitches();
        return this.renderSplines()
            .then(() => this.renderSplineTracks())
            .catch(handleError);
    }

    private render(): Promise<void> {
        this.renderBackground();
        this.renderBorder();
        this.renderBrush();
        this.railroad.frames.forEach(this.renderFrame, this);
        this.railroad.industries.forEach(this.renderIndustry, this);
        this.railroad.players.forEach(this.renderPlayer, this);
        this.railroad.turntables.forEach(this.renderTurntable, this);
        this.renderSwitches();
        return this.renderSplines()
            .then(() => this.renderSplineTracks())
            .then(() => this.renderTrees())
            .catch(handleError);
    }

    toggleDeleteTool(): boolean {
        if (this.toolMode === MapToolMode.delete) {
            // Disable delete tool
            this.toolMode = MapToolMode.pan_zoom;
            this.panZoom.enableDblClickZoom();
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow delete tool while another tool is active
            return false;
        } else {
            // Enable delete tool
            this.toolMode = MapToolMode.delete;
            this.panZoom.disableDblClickZoom();
            return true;
        }
    }

    toggleFlattenTool(): boolean {
        if (this.toolMode === MapToolMode.flatten_spline) {
            // Disable flatten tool
            this.toolMode = MapToolMode.pan_zoom;
            if (this.layerVisibility.grades) {
                this.toggleLayerVisibility('grades');
            }
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow flatten tool while another tool is active
            return false;
        } else {
            // Enable flatten tool
            this.toolMode = MapToolMode.flatten_spline;
            if (!this.layerVisibility.grades) {
                this.toggleLayerVisibility('grades');
            }
            return true;
        }
    }

    toggleLayerVisibility(layer: keyof MapLayers): boolean {
        this.layerVisibility[layer] = !this.layerVisibility[layer];
        this.writeOptions();
        if (this.layerVisibility[layer]) {
            this.layers[layer].show();
            if (layer === 'trees') {
                this.renderTrees();
            }
        } else {
            this.layers[layer].hide();
        }
        return this.layerVisibility[layer];
    }

    toggleParallelTool(): boolean {
        if (this.toolMode === MapToolMode.parallel) {
            // Disable flatten tool
            this.toolMode = MapToolMode.pan_zoom;
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow flatten tool while another tool is active
            return false;
        } else {
            // Enable flatten tool
            this.toolMode = MapToolMode.parallel;
            if (!this.layerVisibility.tracks) {
                this.toggleLayerVisibility('tracks');
            }
            if (this.layerVisibility.tracksHidden) {
                this.toggleLayerVisibility('tracksHidden');
            }
            return true;
        }
    }

    toggleTreeBrush(): boolean {
        if (this.toolMode === MapToolMode.tree_brush) {
            // Disable tree brush
            this.toolMode = MapToolMode.pan_zoom;
            this.panZoom
                .enableDblClickZoom()
                .enablePan()
                .enableZoom();
            if (this.layerVisibility.brush) {
                this.toggleLayerVisibility('brush');
            }
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow tree brush while another tool is active
            return false;
        } else {
            // Enable tree brush
            this.toolMode = MapToolMode.tree_brush;
            this.panZoom
                .disableDblClickZoom()
                .disablePan()
                .disableZoom();
            if (!this.layerVisibility.brush) {
                this.toggleLayerVisibility('brush');
            }
            if (!this.layerVisibility.trees) {
                this.toggleLayerVisibility('trees');
            }
            return true;
        }
    }

    getLayerVisibility(layer: keyof MapLayers): boolean {
        return this.layerVisibility[layer];
    }

    private readOptions(): MapOptions {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const defaultTrue = (option: any) => typeof option === 'undefined' || Boolean(option);
        const defaultNumber = (option: any, n: number) => typeof option === 'undefined' ? n : Number(option);
        return {
            pan: {
                x: Number(parsed?.pan?.x || 0),
                y: Number(parsed?.pan?.y || 0),
            },
            zoom: Number(parsed?.zoom || 1),
            layerVisibility: {
                background: defaultTrue(parsed?.layerVisibility?.background),
                border: defaultTrue(parsed?.layerVisibility?.border),
                brush: false,
                frameNumbers: defaultTrue(parsed?.layerVisibility?.frameNumbers),
                frames: Boolean(parsed?.layerVisibility?.frames),
                grades: Boolean(parsed?.layerVisibility?.grades),
                groundworkControlPoints: Boolean(parsed?.layerVisibility?.groundworkControlPoints),
                groundworks: defaultTrue(parsed?.layerVisibility?.groundworks),
                groundworksHidden: Boolean(parsed?.layerVisibility?.groundworksHidden),
                industries: Boolean(parsed?.layerVisibility?.industries),
                players: Boolean(parsed?.layerVisibility?.players),
                trackControlPoints: Boolean(parsed?.layerVisibility?.trackControlPoints),
                tracks: defaultTrue(parsed?.layerVisibility?.tracks),
                tracksHidden: Boolean(parsed?.layerVisibility?.tracksHidden),
                trees: false,
                turntables: defaultTrue(parsed?.layerVisibility?.turntables),
            },
            mergeLimits: {
                bearing: defaultNumber(parsed?.mergeLimits?.bearing, 10),
                inclination: defaultNumber(parsed?.mergeLimits?.inclination, 2.5),
                horizontal: defaultNumber(parsed?.mergeLimits?.horizontal, 10),
                vertical: defaultNumber(parsed?.mergeLimits?.vertical, 1),
            },
        };
    }

    writeOptions() {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const options: MapOptions = {
            pan: this.panZoom.getPan(),
            zoom: this.panZoom.getZoom(),
            layerVisibility: this.layerVisibility,
            mergeLimits: this.mergeLimits,
        };
        localStorage.setItem(key, JSON.stringify(options));
    }

    private createLayers(): MapLayers {
        const group = this.svg.group()
            .rotate(180)
            .font('family', 'sans-serif')
            .font('size', 500);
        // The z-order of these groups is the order they are created
        const [
            border,
            background,
            groundworks,
            groundworksHidden,
            groundworkControlPoints,
            grades,
            industries,
            turntables,
            tracks,
            tracksHidden,
            trackControlPoints,
            frames,
            frameNumbers,
            players,
            trees,
            brush,
        ] = [
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
        ];
        const layers: MapLayers = {
            background: background,
            border: border,
            brush: brush,
            frameNumbers: frameNumbers,
            frames: frames,
            grades: grades,
            groundworkControlPoints: groundworkControlPoints,
            groundworks: groundworks,
            groundworksHidden: groundworksHidden,
            industries: industries,
            players: players,
            trackControlPoints: trackControlPoints,
            tracks: tracks,
            tracksHidden: tracksHidden,
            trees: trees,
            turntables: turntables,
        };
        const entries = Object.entries(layers) as [keyof MapLayers, G][];
        entries.forEach(([key, group]) => {
            group.id(key);
            if (!this.layerVisibility[key]) group.hide();
        });
        return layers;
    }

    private renderBackground(): Element {
        return this.layers.background
            .image('https://cdn.discordapp.com/attachments/949906083625975868/1009629576529449000/RRO_Pine_Valley_topo_map.png')
            .attr('transform', 'matrix(-116.75,0,0,-116.75,233700,231900)');
    }

    private renderBorder(): Element {
        // Border
        return this.layers.border
            .rect(4_000_00, 4_000_00)
            .translate(-2_000_00, -2_000_00)
            .radius(100_00)
            .addClass('map-border');
    }

    private renderBrush(): Element {
        // Brush
        return this.brush = this.layers.brush
            .circle(50_00)
            .center(0, 0)
            .addClass('brush');
    }

    private initPanZoom() {
        const beforePan = (oldPan: SvgPanZoom.Point, newPan: SvgPanZoom.Point) => {
            const gutterWidth = 100;
            const gutterHeight = 100;
            // Computed variables
            const sizes: any = this.panZoom.getSizes();
            const leftLimit = -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) + gutterWidth;
            const rightLimit = sizes.width - gutterWidth - (sizes.viewBox.x * sizes.realZoom);
            const topLimit = -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) + gutterHeight;
            const bottomLimit = sizes.height - gutterHeight - (sizes.viewBox.y * sizes.realZoom);
            return {
                x: Math.max(leftLimit, Math.min(rightLimit, newPan.x)),
                y: Math.max(topLimit, Math.min(bottomLimit, newPan.y)),
            };
        };

        let timeoutId = 0;
        const onPanZoom = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => this.writeOptions(), 100);
        };

        type Partitions<T> = [T[], T[]];
        function partition<T>(trees: T[], filter: (e: T) => boolean): Partitions<T> {
            return trees.reduce((p: Partitions<T>, v: T) => {
                (filter(v) ? p[0] : p[1]).push(v);
                return p;
            }, [[], []]);
        }

        let listeners: { [key: string]: (e: Event) => any };
        return svgPanZoom(this.svg.node, {
            zoomScaleSensitivity: 0.5,
            minZoom: 0.5,
            maxZoom: 500,
            beforePan: beforePan,
            customEventsHandler: {
                haltEventListeners: [],
                init: (options) => {
                    let mouseDown = false;
                    let mouseButton = 0;
                    let treeBrushAsync = false;
                    const treeBrush = () => {
                        if (treeBrushAsync) return;
                        if (this.toolMode !== MapToolMode.tree_brush) return;
                        if (!this.brush) return;
                        const point = {
                            x: this.brush.cx(),
                            y: this.brush.cy(),
                        };
                        const radius = Number(this.brush.attr('r'));
                        if (mouseButton !== 0) {
                            // Cut tree brush
                            treeBrushAsync = true;
                            return this.treeUtil.allTrees().then((trees) => {
                                const alreadyCut = (tree: Vector) => -1 !== this.railroad.removedVegetationAssets.findIndex(
                                    (t) => tree.x === t.x && tree.y === t.y && tree.z === t.z);
                                const cut = trees.filter((t) =>
                                    radiusFilter(point, t, radius) &&
                                    !alreadyCut(t));
                                if (cut.length === 0) return;
                                // console.log(`Cut ${cut.length} trees`);
                                this.setMapModified();
                                this.railroad.removedVegetationAssets = this.railroad.removedVegetationAssets.concat(cut);
                                return this.renderTreeArray(cut);
                            }).finally(() => {
                                treeBrushAsync = false;
                            });
                        } else {
                            // Replant tree brush
                            const trees = this.railroad.removedVegetationAssets;
                            const filter = (t: Vector) =>
                                radiusFilter(point, t, radius) &&
                                this.treeUtil.treeFilter(t);
                            const [planted, retained] = partition(trees, filter);
                            if (planted.length === 0) return;
                            this.railroad.removedVegetationAssets = retained;
                            // console.log(`Planted ${planted.length} trees`);
                            this.setMapModified();
                            const removedXY = planted.map((v) => [Math.round(v.x), Math.round(v.y)]);
                            const isRemoved = (e: Element) => -1 !== removedXY.findIndex(
                                (t) => Math.round(e.cx()) === t[0] && Math.round(e.cy()) === t[1]);
                            const buckets = planted.map(treeBucket)
                                .filter((value, index, self) => self.indexOf(value) === index);
                            const plantedElements = this.layers.trees
                                .children()
                                .filter((e) => buckets.includes(e.id()))
                                .flatMap((e) => e.children())
                                .filter(isRemoved);
                            plantedElements.forEach((e) => e.remove());
                        }
                    };
                    // Initialize mouse event listeners
                    listeners = {
                        contextmenu: (e) => {
                            if (this.toolMode === MapToolMode.tree_brush && this.brush) {
                                e.preventDefault();
                                return true;
                            }
                        },
                        mousedown: (e) => {
                            if (this.toolMode === MapToolMode.tree_brush && this.brush) {
                                mouseButton = (e as MouseEvent).button;
                                mouseDown = true;
                                treeBrush();
                            }
                        },
                        mousemove: (e) => {
                            if (this.brush) {
                                const ctm = this.svg.node.getScreenCTM();
                                if (!ctm) throw new Error('Missing CTM');
                                const me = e as MouseEvent;
                                const point = this.layers.trees
                                    .point(me.clientX, me.clientY)
                                    .transform(new Matrix(ctm.inverse()));
                                this.brush.center(point.x, point.y);
                                if (this.toolMode === MapToolMode.tree_brush && mouseDown) {
                                    // Cut or replant
                                    treeBrush();
                                }
                            }
                        },
                        mouseup: () => {
                            mouseDown = false;
                        },
                        wheel: (e) => {
                            if (this.toolMode === MapToolMode.tree_brush && this.brush) {
                                const dy = (e as WheelEvent).deltaY;
                                let radius = Number(this.brush.attr('r'));
                                if (dy > 0) {
                                    // Scroll down, shrink brush
                                    radius /= 1.2;
                                } else {
                                    // Scroll up, expand brush
                                    radius *= 1.2;
                                }
                                radius = Math.max(10_00, Math.min(100_00, radius));
                                this.brush.radius(radius);
                            }
                        },
                    };
                    // Register listeners
                    for (const eventName of Object.keys(listeners)) {
                        options.svgElement.addEventListener(eventName, listeners[eventName]);
                    }
                },
                destroy: () => {
                    // Unregister listeners
                    for (const eventName of Object.keys(listeners)) {
                        this.svg.node.removeEventListener(eventName, listeners[eventName]);
                    }
                },
            },
            onPan: onPanZoom,
            onZoom: onPanZoom,
        });
    }

    private renderFrame(frame: Frame) {
        if (!frame.type || !(frame.type in frameLimits)) {
            console.log(`Unknown frame type ${frame.type}`);
            return;
        }
        const limits = frameLimits[frame.type];
        const degrees = Math.round(normalizeAngle(180 + frame.rotation.yaw));
        const x = Math.round(frame.location.x);
        const y = Math.round(frame.location.y);
        const f = this.layers.frames
            .rect(limits.length, 300)
            .center(0, 0)
            .attr('transform', `translate(${x},${y}) rotate(${degrees})`)
            .addClass('frame')
            .addClass(`frame-${frame.type}`);
        if (frame.state.brakeValue > 0) {
            f.addClass('brakes-applied');
        }
        if (frame.state.freightAmount > 0) {
            f.addClass('cargo-loaded');
        }
        this.renderFrameText(
            frame.number,
            x, y,
            degrees,
            Math.round(45 - limits.length / 2), 90);
        return f;
    }

    private renderFrameText(frameText: GvasString, x: number, y: number, r: number, dx: number, dy: number) {
        if (frameText) {
            this.layers.frameNumbers
                .text(frameText.replace('<br>', '\n'))
                .attr('transform', `translate(${x},${y}) rotate(${r}), translate(${dx},${dy})`)
                .addClass('frame-text');
        }
    }

    private renderIndustry(industry: Industry): Element {
        const industryName = IndustryType[industry.type] || `Unknown industry ${industry.type}`;
        const x = industry.location.x;
        const y = industry.location.y;
        const heading = industry.rotation.yaw;
        const degrees = heading > 0 ? heading + 90 : heading - 90;
        return this.layers.industries
            .text((block) => block.text(industryName))
            .attr('transform', `translate(${Math.round(x)},${Math.round(y)}) rotate(${Math.round(degrees)})`)
            .addClass('grade-text');
    }

    private renderPlayer(player: Player) {
        if (!player.name) return;
        const x = Math.round(player.location.x);
        const y = Math.round(player.location.y);
        return this.layers.players
            .text(player.name)
            .attr('transform', `translate(${x},${y}) rotate(180)`)
            .addClass('player');
    }

    private renderSwitchLeg(sw: Switch, yawOffset: number) {
        const degrees = normalizeAngle(sw.rotation.yaw + yawOffset).toFixed(1);
        const x = Math.round(sw.location.x);
        const y = Math.round(sw.location.y);
        return this.layers.tracks
            .path([
                ['m', 0, 0],
                ['v', 1888],
            ])
            .attr('transform', `translate(${x} ${y}) rotate(${degrees})`)
            .addClass('switch-leg');
    }

    private renderSwitches() {
        for (const sw of this.railroad.switches) {
            // let rect;
            switch (sw.type) {
                case SwitchType.leftSwitchLeft: // 0
                case SwitchType.rightSwitchRight: // 1
                case SwitchType.leftSwitchRight: // 4
                case SwitchType.rightSwitchLeft: { // 5
                    const divergesRight = (sw.type === SwitchType.leftSwitchRight || sw.type === SwitchType.rightSwitchRight);
                    const divergence = divergesRight ? 5.75 : -5.75;
                    const notAlignedYaw = Boolean(sw.state) === divergesRight ? 0 : divergence;
                    const alignedYaw = Boolean(sw.state) === divergesRight ? divergence : 0;
                    const legs = [
                        this.renderSwitchLeg(sw, notAlignedYaw)
                            .addClass('not-aligned'),
                        this.renderSwitchLeg(sw, alignedYaw)
                            .addClass('aligned'),
                    ];
                    const onClick = () => this.onClickSwitch(sw, legs);
                    legs.forEach((l) => l.on('click', onClick));
                    break;
                }
                case SwitchType.diamond: { // 6
                    const d: PathCommand[] = [
                        ['m', -64, 0],
                        ['v', 128],
                        ['h', -128],
                        ['v', 128],
                        ['h', 128],
                        ['v', 128],
                        ['h', 128],
                        ['v', -128],
                        ['h', 128],
                        ['v', -128],
                        ['h', -128],
                        ['v', -128],
                        ['l', -64, 64],
                        ['l', -64, -64],
                    ];
                    const diamond = this.layers.tracks
                        .path(d)
                        .rotate(Math.round(sw.rotation.yaw - 90), 0, 0)
                        .translate(Math.round(sw.location.x), Math.round(sw.location.y))
                        .addClass('diamond');
                    diamond
                        .on('click', () => this.onClickSwitch(sw, [diamond]));
                    break;
                }
                default:
                    throw new Error(sw.type);
            }
        }
    }

    private renderSplines() {
        return asyncForEach(this.railroad.splines, (spline) => {
            this.renderSpline(spline);
        }, (r, t) => {
            const pct = 100 * (1 - (r / t));
            this.setTitle(`Reticulating splines... ${pct.toFixed(1)}%`);
        }, () => {
            this.setTitle('Map');
        }).promise;
    }

    private renderSpline(spline: Spline) {
        const elements: Element[] = [];
        const isRail = spline.type === SplineType.rail || spline.type === SplineType.rail_deck;
        // Control points
        spline.controlPoints.forEach((point, i) => {
            const start = Math.max(i - 1, 0);
            const adjacentVisible = spline.segmentsVisible.slice(start, i + 1).filter(Boolean).length;
            const degrees = normalizeAngle(splineHeading(spline, i) - 90).toFixed(1);
            let rect;
            if (isRail) {
                const r = 192;
                const h = r * Math.sin(30 * Math.PI / 180);
                const l = r * Math.cos(30 * Math.PI / 180);
                const x = Math.round(point.x);
                const y = Math.round(point.y);
                rect = this.layers.trackControlPoints
                    .polygon([
                        [0, r],
                        [l, 0 - h],
                        [64, -h],
                        [0, 0],
                        [-64, -h],
                        [-l, -h],
                    ])
                    .attr('transform', `translate(${x} ${y}) rotate(${degrees})`);
            } else {
                const x = Math.round(point.x - 150);
                const y = Math.round(point.y - 150);
                rect = this.layers.groundworkControlPoints
                    .rect(300, 300)
                    .attr('transform', `translate(${x} ${y}) rotate(${degrees} 150 150)`);
            }
            rect
                .on('click', () => this.onClickControlPoint(point))
                .addClass(`control-point-${adjacentVisible}`);
            elements.push(rect);
        });
        const splineGroup = isRail ? this.layers.tracks : this.layers.groundworks;
        const hiddenGroup = isRail ? this.layers.tracksHidden : this.layers.groundworksHidden;
        const points: ArrayXY[] = spline.controlPoints.map((cp) => [Math.round(cp.x), Math.round(cp.y)]);
        const d = svgPath(points, bezierCommand);
        // Splines
        for (const invisPass of [true, false]) {
            const g = invisPass ? hiddenGroup : splineGroup;
            const rect = g
                .path(d)
                .attr('stroke-dasharray', splineToDashArray(spline, invisPass))
                .on('click', () => this.onClickSpline(spline, rect, elements));
            if (invisPass) rect.addClass('hidden');
            switch (spline.type) {
                case SplineType.rail:
                    rect.addClass('rail');
                    break;
                case SplineType.rail_deck:
                    rect.addClass('rail-deck');
                    break;
                case SplineType.constant_grade:
                case SplineType.variable_grade:
                    rect.addClass('grade');
                    break;
                case SplineType.constant_stone_wall:
                case SplineType.variable_stone_wall:
                    rect.addClass('stone-wall');
                    break;
                case SplineType.wooden_bridge:
                    rect.addClass('wooden-bridge');
                    break;
                case SplineType.steel_bridge:
                    rect.addClass('steel-bridge');
                    break;
                default:
                    throw new Error(`Unknown spline type ${spline.type}`);
            }
            elements.push(rect);
        }
        // Grade
        if (isRail) {
            const c = calculateGrade(spline.controlPoints);
            for (let i = 0; i < spline.segmentsVisible.length; i++) {
                if (!spline.segmentsVisible[i]) continue;
                const percentage = c[i].grade;
                if (percentage === 0) continue;
                const heading = vectorHeading(spline.controlPoints[i], spline.controlPoints[i + 1]);
                const degrees = heading > 0 ? heading + 90 : heading - 90;
                const cp0 = spline.controlPoints[i];
                const cp1 = spline.controlPoints[i + 1];
                const x = (cp1.x + cp0.x) / 2;
                const y = (cp1.y + cp0.y) / 2;
                const text = this.layers.grades
                    .text((block) => block
                        .text(percentage.toFixed(4) + '%')
                        .dx(300))
                    .attr('transform', `translate(${Math.round(x)},${Math.round(y)}) rotate(${Math.round(degrees)})`)
                    .addClass('grade-text');
                elements.push(text);
            }
        }
        return elements;
    }

    private renderSplineTracks(): Promise<void> {
        return asyncForEach(this.railroad.splineTracks, (spline) => {
            this.renderSplineTrack(spline);
        }, (r, t) => {
            const pct = 100 * (1 - (r / t));
            this.setTitle(`Reticulating spline tracks... ${pct.toFixed(1)}%`);
        }, () => {
            this.setTitle('Map');
        }).promise;
    }

    private renderSplineTrack(spline: SplineTrack) {
        const elements: Element[] = [];
        const {x0, y0, x1, y1, x2, y2, x3, y3} = hermiteToBezier(spline);
        const trackPath = ['M', x0, y0, 'C', x1, y1, x2, y2, x3, y3];
        const makePath: (group: G, classes: string[]) => void = (group, classes) => {
            const path = group.path(trackPath);
            classes.forEach((c) => path.addClass(c));
            elements.push(path);
        };
        const makeGradeText: () => void = () => {
            const {steepest, startPoint, endPoint} = calculateSteepestGrade(spline);
            const percentage = steepest.grade;
            if (percentage === 0) return;
            const heading = vectorHeading(startPoint, endPoint);
            const degrees = heading > 0 ? heading + 90 : heading - 90;
            const x = (endPoint.x + startPoint.x) / 2;
            const y = (endPoint.y + startPoint.y) / 2;
            const text = this.layers.grades
                .text((block) => block
                    .text(percentage.toFixed(4) + '%')
                    .dx(300))
                .attr('transform', `translate(${Math.round(x)},${Math.round(y)}) rotate(${Math.round(degrees)})`)
                .addClass('grade-text');
            elements.push(text);
        };
        switch (spline.type) {
            case 'ballast_h01':
            case 'ballast_h05':
            case 'ballast_h10':
                makePath(this.layers.groundworks, ['grade']);
                break;
            case 'rail_914':
                makePath(this.layers.tracks, ['rail']);
                makeGradeText();
                break;
            case 'rail_914_h01':
            case 'rail_914_h05':
            case 'rail_914_h10':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['grade']);
                makeGradeText();
                break;
            case 'rail_914_switch_cross_90':
                makePath(this.layers.tracks, ['switch-leg', 'not-aligned']);
                makeGradeText();
                break;
            case 'rail_914_switch_left':
            case 'rail_914_switch_left_mirror':
            case 'rail_914_switch_left_mirror_noballast':
            case 'rail_914_switch_left_noballast':
            case 'rail_914_switch_right':
            case 'rail_914_switch_right_mirror':
            case 'rail_914_switch_right_mirror_noballast':
            case 'rail_914_switch_right_noballast':
                makePath(this.layers.tracks, ['switch-leg', 'not-aligned']);
                makeGradeText();
                // TODO: Render the other switch leg
                break;
            case 'rail_914_trestle_pile_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['wooden-bridge']); // TODO: Give this a different style
                makeGradeText();
                break;
            case 'rail_914_trestle_steel_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['steel-bridge']);
                makeGradeText();
                break;
            case 'rail_914_trestle_wood_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['wooden-bridge']);
                makeGradeText();
                break;
            case 'rail_914_wall_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['stone-wall']);
                makeGradeText();
                break;
            case 'rail_914_wall_01_norail':
                makePath(this.layers.groundworks, ['stone-wall']);
                makeGradeText();
                break;
            default:
                console.log(`Unknown spline type ${spline.type}`);
                return;
        }
        return elements;
    }

    private renderTrees(): Promise<void> {
        if (!this.layerVisibility.trees) return Promise.resolve();
        if (this.remainingTreesAppender) return Promise.resolve();
        const trees = this.treeUtil.smartPeek();
        return this.renderTreeArray(trees);
    }

    private renderTreeArray(trees: Vector[]): Promise<void> {
        if (this.remainingTreesAppender) {
            return this.remainingTreesAppender(trees);
        }
        const {appender, promise} = asyncForEach(trees.concat(), (t) => {
            this.renderTree(t);
        }, (r, t) => {
            const pct = 100 * (1 - (r / t));
            this.setTitle(`Rendering trees... ${pct.toFixed(1)}%`);
        }, () => {
            this.setTitle('Map');
        });
        this.remainingTreesAppender = appender;
        return promise;
    }

    private renderTree(tree: Vector) {
        const x = Math.round(tree.x);
        const y = Math.round(tree.y);
        const id = treeBucket(tree);
        const element = document.getElementById(id);
        let group: G;
        if (!element) {
            group = this.layers.trees
                .group()
                .id(id);
        } else {
            group = new G(element as unknown as SVGGElement);
        }
        return group
            .circle(5_00)
            .center(x, y)
            .addClass('tree');
    }

    private renderTurntable(turntable: Turntable) {
        const x = Math.round(turntable.location.x);
        const y = Math.round(turntable.location.y);
        const radians = (turntable.rotator.yaw - 90) * Math.PI / 180;
        const dx = 1250 * Math.cos(radians);
        const dy = 1250 * Math.sin(radians);
        const cx = x + dx / 2;
        const cy = y + dy / 2;
        const c = this.layers.turntables
            .circle(1250)
            .center(cx, cy)
            .addClass('turntable');
        const l = this.layers.turntables
            .line([[x, y], [x + dx, y + dy]])
            .addClass('rail');
        const elements = [c, l];
        const onClick = () => this.onClickTurntable(turntable, elements);
        elements.forEach((e) => e.on('click', onClick));
        return elements;
    }

    private onClickControlPoint(point: Vector): void {
        switch (this.toolMode) {
            case MapToolMode.pan_zoom:
                console.log(point);
                break;
        }
    }

    private onClickSpline(spline: Spline, rect: Path, elements: Element[]) {
        switch (this.toolMode) {
            case MapToolMode.pan_zoom:
                console.log(spline);
                break;
            case MapToolMode.delete:
                this.railroad.splines = this.railroad.splines.filter((s) => s !== spline);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
            case MapToolMode.flatten_spline: {
                spline.controlPoints = flattenSpline(spline);
                this.setMapModified();
                // Re-render just this spline
                elements.forEach((element) => element.remove());
                this.renderSpline(spline);
                break;
            }
            case MapToolMode.parallel: {
                const offset = 3_83; // Length of a diamond
                const keepSpline = (a: Spline) =>
                    !this.railroad.splines.some((b) =>
                        a !== b &&
                        a.type === b.type &&
                        a.controlPoints.every((cp1) =>
                            b.controlPoints.some((cp2) => {
                                const dx = cp2.x - cp1.x;
                                const dy = cp2.y - cp1.y;
                                const dz = cp2.z - cp1.z;
                                const m2 = dx * dx + dy * dy + dz * dz;
                                return m2 < 1; // Points within 1cm
                            })));
                const parallel = parallelSpline(spline, offset).filter(keepSpline);
                if (parallel.length === 0) return;
                console.log(...parallel);
                this.railroad.splines.push(...parallel);
                this.setMapModified();
                parallel.forEach(this.renderSpline, this);
            }
        }
    }

    private onClickSwitch(sw: Switch, elements: Element[]) {
        switch (this.toolMode) {
            case MapToolMode.delete:
                this.railroad.switches = this.railroad.switches.filter((s) => s !== sw);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
        }
    }

    private onClickTurntable(turntable: Turntable, elements: Element[]) {
        switch (this.toolMode) {
            case MapToolMode.delete:
                this.railroad.turntables = this.railroad.turntables.filter((t) => t !== turntable);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
        }
    }
}

function splineToDashArray(spline: Spline, invert: boolean): string | null {
    let ret: string[] | undefined;
    let dashlen = 0;
    for (let s = 0; s < spline.segmentsVisible.length; s++) {
        const previousSegmentVisible = (s > 0) && spline.segmentsVisible[s - 1];
        const segmentLength = Math.sqrt(delta2(spline.controlPoints[s], spline.controlPoints[s + 1]));
        if (previousSegmentVisible !== spline.segmentsVisible[s]) {
            if (!ret) {
                ret = previousSegmentVisible === invert ? ['0'] : [];
            }
            ret.push(String(Math.round(dashlen)));
            dashlen = segmentLength;
        } else {
            dashlen += segmentLength;
        }
    }
    if (!ret) return invert ? null : String(Math.round(dashlen));
    if (dashlen > 0) {
        ret.push(String(Math.round(dashlen)));
    }
    return ret.join(',');
}

function treeBucket(tree: Vector) {
    const bucketX = Math.floor((tree.x + 2_005_00) / 250_00);
    const bucketY = Math.floor((tree.y + 2_005_00) / 250_00);
    return `trees_${bucketX}_${bucketY}`;
}

interface AsyncForEachResult<T> {
    appender: (a: T[]) => Promise<void>;
    promise: Promise<void>;
}

function asyncForEach<T>(
    a: T[],
    func: (e: T) => void,
    updateFunc?: (remaining: number, total: number) => void,
    thenClause?: () => void,
): AsyncForEachResult<T> {
    const promise = () => new Promise<void>((resolve, reject) => {
        let updateTime = 0;
        const fun = () => {
            try {
                while (remaining.length > 0) {
                    const e = remaining.shift();
                    if (!e) continue;
                    func(e);
                    const now = performance.now();
                    if (now - updateTime > 200) {
                        updateTime = now;
                        if (updateFunc) {
                            updateFunc(remaining.length, total);
                        }
                        setTimeout(fun, 1);
                        return;
                    }
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        };
        setTimeout(fun, 1);
    }).then(thenClause);
    let remaining = a.concat();
    let total = remaining.length;
    let p = promise();
    const appender = (elements: T[]) => {
        if (remaining.length !== 0) {
            Array.prototype.push.apply(remaining, elements);
            total += elements.length;
            return p;
        }
        remaining = elements.concat();
        total = remaining.length;
        p = promise();
        return p;
    };
    return {
        appender: appender,
        promise: p,
    };
}
