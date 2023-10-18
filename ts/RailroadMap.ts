import * as svgPanZoom from 'svg-pan-zoom';
// eslint-disable-next-line no-redeclare
import {Circle, Element, G, Line, Matrix, PathArrayAlias, PathCommand, Svg, Text} from '@svgdotjs/svg.js';
import {
    Frame,
    Industry,
    Player,
    Prop,
    Railroad,
    Spline,
    SplineTrack,
    SplineType,
    Switch,
    SwitchType,
    Turntable,
} from './Railroad';
import {gizmoSvgPaths, industryName, industrySvgPaths, IndustryType} from './IndustryType';
import {Studio} from './Studio';
import {Point, TreeUtil, radiusFilter} from './TreeUtil';
import {calculateGrade, calculateSteepestGrade} from './Grade';
import {gvasToString} from './Gvas';
import {Vector, scaleVector, vectorSum, distanceSquared} from './Vector';
import {MergeLimits, normalizeAngle, splineHeading, vectorHeading} from './splines';
import {flattenSpline} from './tool-flatten';
import {CargoType, cargoLimits, frameDefinitions, hasCargoLimits, isCargoType, isFrameType} from './frames';
import {handleError} from './index';
import {parallelSpline, parallelSplineTrack} from './tool-parallel';
import {asyncForEach} from './util-async';
import {
    BezierCurve,
    cubicBezier,
    cubicBezier3,
    cubicBezierLength,
    cubicBezierMinRadius,
    hermiteToBezier,
} from './util-bezier';
import {circularizeCurve} from './tool-circularize';
import {degreesToRadians} from './Rotator';
import {clamp, lerp} from './math';
import {SplineTrackType, switchSecondLeg} from './SplineTrackType';
import {localToWorld} from './HasLocationRotation';
import {catmullRomMinRadius, catmullRomToBezier} from './util-catmullrom';
import {rect} from './util-path';
import {GizmoDirection, gizmoDirection} from './Gizmo';
import {textToString, unknownProperty} from './util';

enum MapToolMode {
    pan_zoom,
    delete,
    flatten_spline,
    tree_brush,
    parallel,
    circularize,
}

interface MapOptions {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
    mergeLimits: MergeLimits;
}

export interface MapLayers {
    background: G;
    border: G;
    bridges: G,
    brush: G;
    controlPoints: G;
    frames: G;
    gizmo: G;
    grades: G;
    groundworks: G;
    groundworksHidden: G;
    industries: G;
    locator: G;
    players: G;
    props: G;
    radius: G;
    radiusSwitch: G;
    tracks: G;
    tracksHidden: G;
    trees: G;
    turntables: G;
}

type MapLayerVisibility = Record<keyof MapLayers, boolean>;

const DEFAULT_LAYER_VISIBILITY: MapLayerVisibility = {
    background: true,
    border: true,
    bridges: true,
    brush: false,
    controlPoints: false,
    frames: true,
    gizmo: false,
    grades: false,
    groundworks: true,
    groundworksHidden: false,
    industries: true,
    locator: false,
    players: false,
    props: false,
    radius: false,
    radiusSwitch: false,
    tracks: true,
    tracksHidden: false,
    trees: false,
    turntables: true,
};

/**
 * The RailroadMap class is used to create a visual representation of a Railroad
 * object on a web page and provide tools for interacting with it. It can render
 * different components of the Railroad object, such as tracks, industries, and
 * trees. It also allows for panning and zooming, selecting and deleting
 * elements, and using tools such as a tree brush or spline flattening tool.
 * Additionally, it has functions for reading and writing user preferences, such
 * as pan and zoom settings and layer visibility. The RailroadMap class uses the
 * SvgPanZoom library for panning and zooming and the svg.js library to create
 * and manipulate SVG elements.
 */
export class RailroadMap {
    private readonly railroad: Railroad;
    private readonly treeUtil: TreeUtil;
    private readonly svg: Svg;
    private panZoom: typeof svgPanZoom;
    private toolMode: MapToolMode;
    private layers: MapLayers;
    private readonly layerVisibility = DEFAULT_LAYER_VISIBILITY;
    private readonly setMapModified;
    private readonly setTitle: (title: string) => void;
    private brush?: Circle;
    private locator?: Circle;
    private remainingTreesAppender?: (trees: Vector[]) => Promise<void>;
    private readonly mergeLimits: MergeLimits;

    constructor(studio: Studio, element: HTMLElement) {
        this.setMapModified = (affectsSplines = false) => studio.setMapModified(affectsSplines);
        this.setTitle = (title) => studio.setTitle(title);
        this.railroad = studio.railroad;
        this.treeUtil = new TreeUtil(studio, async (before, after, changed, dryrun) => {
            if (this.remainingTreesAppender) await this.renderTreeArray(changed);
            if (before === after) {
                this.setTitle(`No change, ${after} cut trees`);
            } else if (before < after) {
                this.setTitle(`${dryrun ? 'Surveyed' : 'Cut'} ${after - before} trees`);
            } else {
                this.setTitle(`${dryrun ? 'Identified' : 'Replanted'} ${before - after} trees`);
            }
        });
        this.toolMode = MapToolMode.pan_zoom;
        const options = this.readOptions();
        this.mergeLimits = options.mergeLimits;
        this.svg = new Svg()
            .addClass('map-svg')
            .addTo(element);
        this.layers = this.createLayers();
        this.render();
        this.panZoom = this.initPanZoom();
        if (options.pan && options.zoom) {
            try {
                this.panZoom.zoom(options.zoom);
                this.panTo(options.pan, 0);
            } catch (e) {
                console.log(e);
            }
        }
    }

    public getMergeLimits() {
        return this.mergeLimits;
    }

    public getTreeUtil() {
        return this.treeUtil;
    }

    private animationInterval = 0;
    panTo(point: Point, animationTime = 1000) {
        if (animationTime < 1) {
            const sizes = this.panZoom.getSizes();
            const endX = (point.x * sizes.realZoom) + (sizes.width / 2);
            const endY = (point.y * sizes.realZoom) + (sizes.height / 2);
            this.panZoom.pan({x: endX, y: endY});
            return;
        }
        const startRadius = 100_00;
        const endRadius = 1_00;
        const start = this.panFrom();
        const animate = (t: number) => {
            const a = cubicBezier(t, 0, 0, 1, 1); // Ease in and out
            const x = lerp(start.x, point.x, a);
            const y = lerp(start.y, point.y, a);
            this.panTo({x, y}, 0);
            if (this.locator) {
                const r = lerp(startRadius, endRadius, t);
                this.locator
                    .center(x, y)
                    .radius(r);
            }
        };
        const animationStepTime = 15; // one frame per 30 ms
        const animationSteps = Math.ceil(animationTime / animationStepTime);
        let animationStep = 0;
        if (this.animationInterval) clearInterval(this.animationInterval);
        this.animationInterval = window.setInterval(() => {
            if (animationStep < animationSteps) {
                const t = animationStep++ / (animationSteps - 1);
                animate(t);
            } else {
                this.layers.locator.hide();
                // Cancel interval
                clearInterval(this.animationInterval);
                this.animationInterval = 0;
            }
        }, animationStepTime);
        // Animate the locator
        if (this.locator) {
            this.layers.locator.show();
            this.locator
                .show()
                .center(start.x, start.y)
                .attr('r', startRadius);
        }
    }

    panFrom(): Point {
        const sizes = this.panZoom.getSizes();
        const pan = this.panZoom.getPan();
        const x = (pan.x - (sizes.width / 2)) / sizes.realZoom;
        const y = (pan.y - (sizes.height / 2)) / sizes.realZoom;
        return {x, y};
    }

    mouseWorldLocation(me: MouseEvent) {
        const ctm = this.svg.node.getScreenCTM();
        if (!ctm) throw new Error('Missing CTM');
        return this.layers.trees
            .point(me.clientX, me.clientY)
            .transformO(new Matrix(ctm.inverse()));
    }

    mouseLocalLocation(me: MouseEvent, element: Element) {
        const ctm = this.svg.node.getScreenCTM();
        if (!ctm) throw new Error('Missing CTM');
        const {x, y} = element
            .point(me.clientX, me.clientY)
            .transformO(new Matrix(ctm.inverse()));
        return {x, y};
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

    private renderLock = false;
    async refreshSplines(): Promise<void> {
        if (this.renderLock) new Error('Map is already rendering');
        this.renderLock = true;
        this.layers.bridges.node.replaceChildren();
        this.layers.controlPoints.node.replaceChildren();
        this.layers.grades.node.replaceChildren();
        this.layers.groundworks.node.replaceChildren();
        this.layers.groundworksHidden.node.replaceChildren();
        this.layers.radius.node.replaceChildren();
        this.layers.radiusSwitch.node.replaceChildren();
        this.layers.tracks.node.replaceChildren();
        this.layers.tracksHidden.node.replaceChildren();
        this.renderSwitches();
        await this.renderSplines();
        this.renderLock = false;
    }

    private async render(): Promise<void> {
        if (this.renderLock) throw new Error('Map is already rendering');
        this.renderLock = true;
        this.renderBackground();
        this.renderBorder();
        this.renderBrush();
        this.locator = this.layers.locator
            .circle()
            .addClass('locator')
            .hide();
        this.railroad.frames.forEach(this.renderFrame, this);
        this.railroad.industries.forEach(this.renderIndustry, this);
        this.railroad.players.forEach(this.renderPlayer, this);
        this.railroad.props.forEach(this.renderProp, this);
        this.railroad.turntables.forEach(this.renderTurntable, this);
        this.renderSwitches();
        await this.renderSplines();
        await this.renderTrees();
        this.renderLock = false;
    }

    private circularizeToolRadiusFlag = false;
    toggleCircularizeTool(): boolean {
        if (this.toolMode === MapToolMode.circularize) {
            // Disable circularize tool
            this.toolMode = MapToolMode.pan_zoom;
            this.panZoom.enableDblClickZoom();
            // Hide the radius layer
            if (this.layerVisibility.radius && this.circularizeToolRadiusFlag) {
                this.toggleLayerVisibility('radius');
            }
            this.circularizeToolRadiusFlag = false;
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow delete tool while another tool is active
            return false;
        } else {
            // Enable circularize tool
            this.toolMode = MapToolMode.circularize;
            this.panZoom.disableDblClickZoom();
            // Show the radius layer
            if (!this.layerVisibility.radius) {
                this.circularizeToolRadiusFlag = true;
                this.toggleLayerVisibility('radius');
            }
            return true;
        }
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

    private flattenToolGradesFlag = false;
    toggleFlattenTool(): boolean {
        if (this.toolMode === MapToolMode.flatten_spline) {
            // Disable flatten tool
            this.toolMode = MapToolMode.pan_zoom;
            // Hide the grades layer
            if (this.layerVisibility.grades && this.flattenToolGradesFlag) {
                this.toggleLayerVisibility('grades');
            }
            this.flattenToolGradesFlag = false;
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow flatten tool while another tool is active
            return false;
        } else {
            // Enable flatten tool
            this.toolMode = MapToolMode.flatten_spline;
            // Show the grades layer
            if (!this.layerVisibility.grades) {
                this.flattenToolGradesFlag = true;
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

    private parallelToolTracksFlag = false;
    toggleParallelTool(): boolean {
        if (this.toolMode === MapToolMode.parallel) {
            // Disable parallel tool
            this.toolMode = MapToolMode.pan_zoom;
            // Hide the tracks layer
            if (this.layerVisibility.tracks && this.parallelToolTracksFlag) {
                this.toggleLayerVisibility('tracks');
            }
            this.parallelToolTracksFlag = false;
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow parallel tool while another tool is active
            return false;
        } else {
            // Enable parallel tool
            this.toolMode = MapToolMode.parallel;
            // Show the tracks layer
            if (!this.layerVisibility.tracks) {
                this.parallelToolTracksFlag = true;
                this.toggleLayerVisibility('tracks');
            }
            return true;
        }
    }

    private treeBrushTreesFlag = false;
    toggleTreeBrush(): boolean {
        if (this.toolMode === MapToolMode.tree_brush) {
            // Disable tree brush
            this.toolMode = MapToolMode.pan_zoom;
            this.panZoom
                .enableDblClickZoom()
                .enablePan()
                .enableZoom();
            // Hide the brush layer
            if (this.layerVisibility.brush) {
                this.toggleLayerVisibility('brush');
            }
            // Hide the trees layer
            if (this.layerVisibility.trees && this.treeBrushTreesFlag) {
                this.toggleLayerVisibility('trees');
            }
            this.treeBrushTreesFlag = false;
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
            // Show the brush layer
            if (!this.layerVisibility.brush) {
                this.toggleLayerVisibility('brush');
            }
            // Show the trees layer
            if (!this.layerVisibility.trees) {
                this.treeBrushTreesFlag = true;
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
        const parsed = JSON.parse(localStorage.getItem(key) ?? '{}');
        const pan = unknownProperty(parsed, 'pan');
        const x = unknownProperty(pan, 'x');
        const y = unknownProperty(pan, 'y');
        const zoom = unknownProperty(parsed, 'zoom');
        const ml = unknownProperty(parsed, 'mergeLimits');
        const bearing = unknownProperty(ml, 'bearing');
        const inclination = unknownProperty(ml, 'inclination');
        const horizontal = unknownProperty(ml, 'horizontal');
        const vertical = unknownProperty(ml, 'vertical');
        const defaultNumber = (option: unknown, n: number) => typeof option === 'undefined' ? n : Number(option);
        return {
            pan: {
                x: defaultNumber(x, 0),
                y: defaultNumber(y, 0),
            },
            zoom: defaultNumber(zoom, 1),
            mergeLimits: {
                bearing: defaultNumber(bearing, 10),
                inclination: defaultNumber(inclination, 2.5),
                horizontal: defaultNumber(horizontal, 10),
                vertical: defaultNumber(vertical, 1),
            },
        };
    }

    writeOptions() {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const options: MapOptions = {
            pan: this.panFrom(),
            zoom: this.panZoom.getZoom(),
            mergeLimits: this.mergeLimits,
        };
        localStorage.setItem(key, JSON.stringify(options));
    }

    previewSmartPlant() {
        if (!this.getLayerVisibility('trees')) this.toggleLayerVisibility('trees');
        const render = (trees: Vector[]) => this.renderTreeArray(trees);
        return this.getTreeUtil().smartCut(render, true);
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
            bridges,
            industries,
            props,
            turntables,
            tracks,
            tracksHidden,
            controlPoints,
            frames,
            grades,
            radius,
            radiusSwitch,
            gizmo,
            players,
            trees,
            brush,
            locator,
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
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
        ];
        const layers: MapLayers = {
            background,
            border,
            bridges,
            brush,
            controlPoints,
            frames,
            gizmo,
            grades,
            groundworks,
            groundworksHidden,
            industries,
            locator,
            players,
            props,
            radius,
            radiusSwitch,
            tracks,
            tracksHidden,
            trees,
            turntables,
        };
        const entries = Object.entries(layers) as [keyof MapLayers, G][];
        entries.forEach(([key, group]) => {
            group.id(key);
            if (!this.layerVisibility[key]) group.hide();
        });
        return layers;
    }

    private renderBackground(): Element {
        let image;
        let transform;
        if (this.railroad.settings.gameLevelName === 'LakeValley') {
            image = 'lakeValleyCont.png';
            transform = 'matrix(-100,0,0,-100,200000,200000)';
            // image = 'LakeValleyMap2.png';
            // transform = 'matrix(-200,0,0,-200,200000,200000)';
        } else {
            image = 'RRO_Pine_Valley_topo_map.png';
            transform = 'matrix(-116.75,0,0,-116.75,233700,231900)';
        }
        return this.layers.background
            .image(image)
            .attr('transform', transform);
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
        const beforePan = (oldPan: Point, newPan: Point) => {
            const gutterWidth = 100;
            const gutterHeight = 100;
            // Computed variables
            const sizes = this.panZoom.getSizes();
            const viewBox = sizes.viewBox as {x: number, y: number, width: number, height: number};
            const leftLimit = -((viewBox.x + viewBox.width) * sizes.realZoom) + gutterWidth;
            const rightLimit = sizes.width - gutterWidth - (viewBox.x * sizes.realZoom);
            const topLimit = -((viewBox.y + viewBox.height) * sizes.realZoom) + gutterHeight;
            const bottomLimit = sizes.height - gutterHeight - (viewBox.y * sizes.realZoom);
            const x = clamp(newPan.x, leftLimit, rightLimit);
            const y = clamp(newPan.y, topLimit, bottomLimit);
            return {x, y};
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

        let listeners: { [key: string]: (e: Event) => unknown };
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
                                const alreadyCut = (tree: Vector): boolean =>
                                    -1 !== this.railroad.removedVegetationAssets.findIndex(
                                        (t) => tree.x === t.x && tree.y === t.y && tree.z === t.z);
                                const cut = trees.filter((t) =>
                                    radiusFilter(point, t, radius) &&
                                    !alreadyCut(t));
                                if (cut.length === 0) return;
                                // console.log(`Cut ${cut.length} trees`);
                                this.setMapModified();
                                this.railroad.removedVegetationAssets =
                                    this.railroad.removedVegetationAssets.concat(cut);
                                return this.renderTreeArray(cut);
                            }).catch(handleError).finally(() => {
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
                            return this.renderTreeArray(planted);
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
                                if (mouseButton === 1) {
                                    this.panZoom.enablePan();
                                } else {
                                    treeBrush();
                                }
                            }
                        },
                        mousemove: (e) => {
                            if (this.brush) {
                                const {x, y} = this.mouseWorldLocation(e as MouseEvent);
                                this.brush.center(x, y);
                                if (this.toolMode === MapToolMode.tree_brush && mouseDown && mouseButton !== 1) {
                                    // Cut or replant
                                    treeBrush();
                                }
                            }
                        },
                        mouseup: () => {
                            mouseDown = false;
                            if (mouseButton === 1) {
                                this.panZoom.disablePan();
                            }
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
                                radius = clamp(radius, 10_00, 100_00);
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
        if (!isFrameType(frame.type)) {
            console.log(`Unknown frame type ${frame.type}`);
            return;
        }
        const definition = frameDefinitions[frame.type];
        const g = this.layers.frames.group()
            .attr('transform', makeTransform(frame.location.x, frame.location.y, frame.rotation.yaw));
        // Frame outline
        const f = g
            .rect(definition.length, definition.width ?? 250)
            .center(0, 0)
            .addClass('frame')
            .addClass(frame.type);
        if (frame.state.brakeValue > 0) {
            f.addClass('brakes-applied');
        }
        if (frame.state.freightAmount > 0) {
            f.addClass('cargo-loaded');
        }
        if (definition.engine) {
            f.addClass('engine');
        }
        if (definition.tender) {
            f.addClass('tender');
        }
        // Tooltip
        const tooltipText = [
            definition.name,
            textToString(frame.name),
            textToString(frame.number),
            cargoText(frame)]
            .filter(Boolean)
            .map(gvasToString)
            .join('\n');
        f.element('title')
            .words(tooltipText);
        // Frame text (number)
        const frameText = textToString(frame.number);
        if (frameText) {
            const yaw = normalizeAngle(frame.rotation.yaw);
            const flip = (yaw > -90) && (yaw < 90);
            const transform = flip ? 'rotate(180) translate(0 25)' : 'translate(0 25)';
            const text = g
                .text(gvasToString(frameText))
                .attr('transform', transform)
                .addClass('frame-text');
            if (definition.engine) {
                text.addClass('engine');
            }
            if (definition.tender) {
                text.addClass('tender');
            }
        }
        return g;
    }

    private gizmoDebugLine?: Line;
    private gizmoDebugText?: Text;
    private renderIndustry(industry: Industry) {
        const paths = Object.entries(industrySvgPaths[industry.type] || {});
        const groupClass = industry.type in IndustryType ? IndustryType[industry.type] : 'unknown';
        const tooltipText = industry.type in industryName ? industryName[industry.type] : `Unknown ${industry.type}`;
        const industryTransform = makeTransform(industry.location.x, industry.location.y, industry.rotation.yaw);
        const g = this.layers.industries
            .group()
            .attr('transform', industryTransform)
            .addClass('industry')
            .addClass(groupClass);
        g.element('title').words(tooltipText);
        const renderPath = (g: G) => ([className, path]: [string, PathArrayAlias]) => g.path(path).addClass(className);
        paths.forEach(renderPath(g));
        const gizmoG = this.layers.gizmo
            .group()
            .attr('transform', industryTransform)
            .addClass('gizmo');
        const gizmoPaths = Object.entries(gizmoSvgPaths);
        gizmoPaths.forEach(renderPath(gizmoG));
        const gridSize = 50;
        let capture = false;
        let captureDirection: GizmoDirection = 'none';
        gizmoG
            .on('pointerdown', (evt) => {
                const e = evt as PointerEvent;
                if (this.toolMode !== MapToolMode.pan_zoom) return;
                const direction = gizmoDirection(e);
                switch (direction) {
                    case 'x':
                    case 'y':
                    case 'z':
                        gizmoG.node.setPointerCapture(e.pointerId);
                        capture = true;
                        captureDirection = direction;
                        this.panZoom
                            .disablePan()
                            .disableDblClickZoom();
                        e.preventDefault();
                        e.stopPropagation();
                        break;
                }
            })
            .on('pointerup', (e) => {
                if (!capture) return;
                e.preventDefault();
                e.stopPropagation();
                switch (captureDirection) {
                    case 'x':
                    case 'y':
                    case 'z':
                        // TODO: Implement gizmo behavior
                        break;
                }
                capture = false;
                captureDirection = 'none';
                this.panZoom
                    .enablePan()
                    .enableDblClickZoom();
                let {x, y} = this.mouseLocalLocation(e as PointerEvent, gizmoG);
                // Snap to grid
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
                console.log([x, y]);
                // Remove the gizmo controls
                if (this.gizmoDebugLine) {
                    this.gizmoDebugLine.remove();
                    this.gizmoDebugLine = undefined;
                }
                if (this.gizmoDebugText) {
                    this.gizmoDebugText.remove();
                    this.gizmoDebugText = undefined;
                }
            })
            .on('pointermove', (e) => {
                if (!capture) return;
                e.preventDefault();
                e.stopPropagation();
                let {x, y} = this.mouseLocalLocation(e as PointerEvent, gizmoG);
                // Snap to grid
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
                // Update the gizmo
                if (this.gizmoDebugLine) this.gizmoDebugLine.remove();
                if (this.gizmoDebugText) this.gizmoDebugText.remove();
                this.gizmoDebugLine = gizmoG.line().addClass('ruler');
                this.gizmoDebugText = gizmoG.text(`[${x}, ${y}]`)
                    .attr('transform', `translate(${x} ${y}) rotate(90)`)
                    .addClass('frame-text');
                this.gizmoDebugLine.plot(0, 0, x, y);
            });
        return [g, gizmoG];
    }

    private renderPlayer(player: Player) {
        if (!player.name) return;
        if (!player.location) return;
        return this.layers.players
            .text(player.name)
            .attr('transform', makeTransform(player.location.x, player.location.y, 180))
            .addClass('player');
    }

    private renderProp(prop: Prop) {
        if (!prop.name) return;
        const string = textToString(prop.text);
        if (!string) return;
        return this.layers.props
            .text(gvasToString(string))
            .attr('transform', makeTransform(prop.transform.translation.x, prop.transform.translation.y, 180))
            .addClass('prop');
    }

    private renderSwitchLeg(sw: Switch, yawOffset: number) {
        return this.layers.tracks
            .path([
                ['m', 0, 0],
                ['v', 1888],
            ])
            .attr('transform', makeTransform(sw.location.x, sw.location.y, sw.rotation.yaw + yawOffset))
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
                    const divergesRight =
                        sw.type === SwitchType.leftSwitchRight ||
                        sw.type === SwitchType.rightSwitchRight;
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
        const splines = (this.railroad.splines as (Spline | SplineTrack)[])
            .concat(this.railroad.splineTracks);
        return asyncForEach(splines, (spline) => {
            return 'controlPoints' in spline ?
                this.renderSpline(spline) :
                this.renderSplineTrack(spline);
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
        const isGrade = spline.type === SplineType.constant_grade || spline.type === SplineType.variable_grade;
        const isBridge = !isRail && !isGrade;
        const clickHandler = () => this.onClickSpline(spline, elements);
        // Control points
        spline.controlPoints.forEach((point, i) => {
            const start = Math.max(i - 1, 0);
            const adjacentVisible = spline.segmentsVisible.slice(start, i + 1).filter(Boolean).length;
            const degrees = splineHeading(spline, i) - 90;
            let rect;
            if (isRail) {
                const r = 92;
                const radians = degreesToRadians(30);
                const h = r * Math.sin(radians);
                const l = r * Math.cos(radians);
                rect = this.layers.controlPoints
                    .polygon([
                        [0, r],
                        [l, 0 - h],
                        [64, -h],
                        [0, 0],
                        [-64, -h],
                        [-l, -h],
                    ])
                    .attr('transform', makeTransform(point.x, point.y, degrees));
            } else {
                const x = Math.round(point.x - 50);
                const y = Math.round(point.y - 50);
                rect = this.layers.controlPoints
                    .rect(100, 100)
                    .attr('transform', `translate(${x} ${y}) rotate(${degrees} 50 50)`);
            }
            rect
                .on('click', clickHandler)
                .addClass(`control-point-${adjacentVisible}`);
            elements.push(rect);
        });
        // Calculate spline paths
        const splineGroup = isRail ? this.layers.tracks : isBridge ? this.layers.bridges : this.layers.groundworks;
        const hiddenGroup = isRail ? this.layers.tracksHidden : this.layers.groundworksHidden;
        const pathAccumulator: [PathCommand[], PathCommand[]] = [[], []];
        spline.segmentsVisible.forEach((visible, i, arr) => {
            const acc = pathAccumulator[visible ? 0 : 1];
            const [a, b, c, d] = catmullRomToBezier(spline, i)
                .map((v) => ({
                    x: Math.round(v.x),
                    y: Math.round(v.y),
                }));
            if (acc.length === 0 || arr[i - 1] !== visible) {
                acc.push(['M', a.x, a.y]);
            }
            acc.push(['C', b.x, b.y, c.x, c.y, d.x, d.y]);
        });
        // Render spline paths
        for (const invisPass of [true, false]) {
            const d = pathAccumulator[invisPass ? 1 : 0];
            if (d.length === 0) continue;
            const g = invisPass ? hiddenGroup : splineGroup;
            const rect = g
                .path(d)
                .on('click', clickHandler);
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
                case SplineType.steel_truss:
                    rect.addClass('steel-truss');
                    break;
                default:
                    throw new Error(`Unknown spline type ${spline.type}`);
            }
            elements.push(rect);
        }
        const makeText = (cp0: Vector, cp1: Vector, str: string, c = 'grade-text', l = this.layers.grades) => {
            const text = l
                .text((block) => block
                    .text(str)
                    .dx(300))
                .attr('transform', makeTransformT(cp0, cp1))
                .on('click', clickHandler)
                .addClass(c);
            elements.push(text);
            return text;
        };
        // Grade
        if (isRail) {
            const c = calculateGrade(spline.controlPoints);
            for (let i = 0; i < spline.segmentsVisible.length; i++) {
                if (!spline.segmentsVisible[i]) continue;
                const percentage = 100 * c[i].grade;
                if (percentage === 0) continue;
                const cp0 = spline.controlPoints[i];
                const cp1 = spline.controlPoints[i + 1];
                const className = gradeTextClass(percentage);
                const str = percentage.toFixed(4) + '%';
                makeText(cp0, cp1, str, className);
            }
        }
        // Curvature
        const renderCurvature = (curvature: {
            center: Vector,
            location: Vector,
            radius: number,
            t: number,
            i: number,
        }) => {
            const {center, location, radius, t, i} = curvature;
            const l = this.layers.radius;
            if (radius > 120_00) return elements;
            const bezier = catmullRomToBezier(spline, i);
            const cp0 = cubicBezier3(t - 0.01, bezier);
            const cp1 = cubicBezier3(t + 0.01, bezier);
            const thresholds = [25_00, 30_00, 40_00, 50_00];
            const index = thresholds.findIndex((t) => radius < t);
            const classSuffix = (index === -1) ? '' : `-${index}`;
            // Circle
            const circle = l
                .circle(radius * 2)
                .center(center.x, center.y)
                .addClass('hidden')
                .addClass('radius' + classSuffix);
            elements.push(circle);
            // Line
            const line = l
                .line(center.x, center.y, location.x, location.y)
                .addClass('hidden')
                .addClass('radius' + classSuffix);
            elements.push(line);
            // Text
            const c = 'radius-text' + classSuffix;
            const text = (radius / 100).toFixed(0) + 'm';
            makeText(cp0, cp1, text, c, this.layers.radius)
                .on('mouseover', () => {
                    circle.removeClass('hidden');
                    line.removeClass('hidden');
                })
                .on('mouseout', () => {
                    circle.addClass('hidden');
                    line.addClass('hidden');
                });
        };
        if (isRail) {
            catmullRomMinRadius(spline)
                .forEach(renderCurvature);
        }
        return elements;
    }

    private renderSplineTrack(spline: SplineTrack) {
        const elements: Element[] = [];
        const clickHandler = () => this.onClickSplineTrack(spline, elements);
        const makePath = (group: G, classes: string[], curve: BezierCurve = bezier) => {
            const [a, b, c, d] = curve
                .map((v) => ({
                    x: Math.round(v.x),
                    y: Math.round(v.y),
                }));
            const trackPath = ['M', a.x, a.y, 'C', b.x, b.y, c.x, c.y, d.x, d.y];
            const path = group.path(trackPath);
            path.on('click', clickHandler);
            classes.forEach((c) => path.addClass(c));
            elements.push(path);
            curve.forEach((point, i, a) => {
                if (i === 3) return;
                const x = Math.round(point.x);
                const y = Math.round(point.y);
                const x1 = Math.round(a[i + 1].x);
                const y1 = Math.round(a[i + 1].y);
                const cp = this.layers.controlPoints
                    .circle(96)
                    .center(x, y)
                    .on('click', clickHandler)
                    .addClass(`control-point-${i}`);
                elements.push(cp);
                const line = this.layers.controlPoints
                    .line(x, y, x1, y1)
                    .on('click', clickHandler)
                    .addClass(`control-line-${i}`);
                elements.push(line);
            });
        };
        const makeGradeText: () => void = () => {
            const {percentage, t} = calculateSteepestGrade(spline);
            if (percentage === 0) return;
            const fixed = percentage.toFixed(1);
            if (fixed === '0.0') return;
            const c = gradeTextClass(percentage);
            return makeText(fixed + '%', t, c);
        };
        const makeRadiusText = (curve: BezierCurve = bezier, l = this.layers.radius) => {
            const {center, location, radius, t} = cubicBezierMinRadius(curve);
            if (radius > 120_00) return;
            const thresholds = [25_00, 30_00, 40_00, 50_00];
            const index = thresholds.findIndex((t) => radius < t);
            const classSuffix = (index === -1) ? '' : `-${index}`;
            // Circle
            const circle = l
                .circle(radius * 2)
                .center(center.x, center.y)
                .addClass('hidden')
                .addClass('radius' + classSuffix);
            elements.push(circle);
            // Line
            const line = l
                .line(center.x, center.y, location.x, location.y)
                .addClass('hidden')
                .addClass('radius' + classSuffix);
            elements.push(line);
            // Text
            const c = 'radius-text' + classSuffix;
            const text = (radius / 100).toFixed(0) + 'm';
            return makeText(text, t, c, l)
                .on('mouseover', () => {
                    circle.removeClass('hidden');
                    line.removeClass('hidden');
                })
                .on('mouseout', () => {
                    circle.addClass('hidden');
                    line.addClass('hidden');
                });
        };
        const makeText = (str: string, t = 0.5, c = 'grade-text', l = this.layers.grades) => {
            const startPoint = cubicBezier3(t - 0.01, bezier);
            const endPoint = cubicBezier3(t + 0.01, bezier);
            const text = l
                .text((block) => block
                    .text(str)
                    .dx(300))
                .attr('transform', makeTransformT(startPoint, endPoint))
                .on('click', clickHandler)
                .addClass(c);
            elements.push(text);
            return text;
        };
        const bezier = hermiteToBezier(spline);
        switch (spline.type) {
            case 'ballast_h01':
            case 'ballast_h05':
            case 'ballast_h10':
                makePath(this.layers.groundworks, ['grade', spline.type.substring(spline.type.length - 3)]);
                break;
            case 'rail_914':
                makePath(this.layers.tracks, ['rail']);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_bumper':
                makePath(this.layers.tracks, ['rail']);
                elements.push(this.layers.tracks
                    .path(rect(-90, -90, 180, 180))
                    .attr('transform', makeTransform(spline.endPoint.x, spline.endPoint.y, spline.rotation.yaw))
                    .addClass('bumper'));
                break;
            case 'rail_914_h01':
            case 'rail_914_h05':
            case 'rail_914_h10':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.groundworks, ['grade', spline.type.substring(spline.type.length - 3)]);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_switch_3way_left': // TODO: Render right-diverging leg
            case 'rail_914_switch_3way_left_noballast': // TODO: Render right-diverging leg
            case 'rail_914_switch_3way_right': // TODO: Render right-diverging leg
            case 'rail_914_switch_3way_right_noballast': // TODO: Render right-diverging leg
            case 'rail_914_switch_cross_45':
            case 'rail_914_switch_cross_90':
            case 'rail_914_switch_left':
            case 'rail_914_switch_left_mirror':
            case 'rail_914_switch_left_mirror_noballast':
            case 'rail_914_switch_left_noballast':
            case 'rail_914_switch_right':
            case 'rail_914_switch_right_mirror':
            case 'rail_914_switch_right_mirror_noballast':
            case 'rail_914_switch_right_noballast':
            {
                const secondLeg = switchSecondLegWorld(spline);
                if (spline.switchState === 0) {
                    makePath(this.layers.tracks, ['switch-leg', 'not-aligned'], secondLeg);
                    makePath(this.layers.tracks, ['switch-leg', 'aligned']);
                } else {
                    makePath(this.layers.tracks, ['switch-leg', 'not-aligned']);
                    makePath(this.layers.tracks, ['switch-leg', 'aligned'], secondLeg);
                }
                if (!(spline.type.endsWith('_noballast') || spline.type.includes('_cross_'))) {
                    makePath(this.layers.groundworks, ['grade']);
                    makePath(this.layers.groundworks, ['grade'], secondLeg);
                }
                makeRadiusText(bezier, this.layers.radiusSwitch);
                makeRadiusText(secondLeg, this.layers.radiusSwitch);
                break;
            }
            case 'rail_914_trestle_pile_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.bridges, [`pile-bridge-${spline.paintStyle}`]);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_trestle_steel_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.bridges, ['steel-bridge']);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_trestle_wood_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.bridges, ['wooden-bridge']);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_tunnel':
                makePath(this.layers.bridges, ['tunnel']);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_wall_01':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.bridges, ['stone-wall']);
                makeGradeText();
                makeRadiusText();
                break;
            case 'rail_914_wall_01_norail':
                makePath(this.layers.bridges, ['stone-wall']);
                makeGradeText();
                break;
            case 'rail_914_bridge_truss':
                makePath(this.layers.tracks, ['rail']);
                makePath(this.layers.bridges, ['steel-truss']);
                makeGradeText();
                makeRadiusText();
                break;
            default:
                console.log(`Unknown spline type ${spline.type}`);
                return;
        }
        return elements;
    }

    private async renderTrees(): Promise<void> {
        if (!this.layerVisibility.trees) return;
        if (this.remainingTreesAppender) return;
        await this.renderTreeArray(this.railroad.removedVegetationAssets);
    }

    private renderTreeArray(trees: Vector[]): Promise<void> {
        if (trees.length === 0) return Promise.resolve();
        if (this.remainingTreesAppender) {
            return this.remainingTreesAppender(trees);
        }
        const {appender, promise} = asyncForEach(trees, (t) => {
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
        const isCut = (tree: Vector) => -1 !== this.railroad.removedVegetationAssets.findIndex(
            (t) => t.x === tree.x && t.y === tree.y);
        const cut = isCut(tree);
        const expectCut = !this.treeUtil.treeFilter(tree);
        const element = document.getElementById(id);
        let group: G;
        if (!element) {
            group = this.layers.trees
                .group()
                .id(id);
        } else {
            group = new G(element as unknown as SVGGElement);
        }
        const treeElement = element?.querySelector(`circle.tree[cx="${x}"][cy="${y}"]`);
        if (treeElement) {
            if (cut === expectCut) {
                treeElement.parentElement?.removeChild(treeElement);
                return;
            }
            treeElement.classList[cut ? 'add' : 'remove']('cut');
            return treeElement;
        }
        if (cut === expectCut) return;
        return group
            .circle(3_00)
            .center(x, y)
            .addClass(cut ? 'cut' : 'uncut')
            .addClass('tree');
    }

    private renderTurntable(turntable: Turntable) {
        const radians = degreesToRadians(turntable.rotator.yaw - 90);
        const radius = turntable.type === 1 ? 1250 : 1600;
        const dx = radius * Math.cos(radians);
        const dy = radius * Math.sin(radians);
        const x = Math.round(turntable.location.x);
        const y = Math.round(turntable.location.y);
        const cx = Math.round(turntable.location.x + (dx * 0.5));
        const cy = Math.round(turntable.location.y + (dy * 0.5));
        const x1 = Math.round(turntable.location.x + dx);
        const y1 = Math.round(turntable.location.y + dy);
        const c = this.layers.turntables
            .circle(radius)
            .center(cx, cy)
            .addClass('turntable');
        const l = this.layers.turntables
            .line([[x, y], [x1, y1]])
            .addClass('rail');
        const elements = [c, l];
        const onClick = () => this.onClickTurntable(turntable, elements);
        elements.forEach((e) => e.on('click', onClick));
        return elements;
    }

    private onClickSpline(spline: Spline, elements: Element[]) {
        if (this.renderLock) return;
        switch (this.toolMode) {
            case MapToolMode.pan_zoom:
                console.log(spline);
                break;
            case MapToolMode.delete:
                this.railroad.splines = this.railroad.splines.filter((s) => s !== spline);
                this.setMapModified(true);
                elements.forEach((element) => element.remove());
                break;
            case MapToolMode.flatten_spline: {
                spline.controlPoints = flattenSpline(spline);
                this.setMapModified(true);
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
                this.setMapModified(true);
                parallel.forEach(this.renderSpline, this);
            }
        }
    }

    private onClickSplineTrack(spline: SplineTrack, elements: Element[]) {
        if (this.renderLock) return;
        switch (this.toolMode) {
            case MapToolMode.pan_zoom:
                {
                    const index = this.railroad.splineTracks
                        .map((v) => JSON.stringify(v))
                        .indexOf(JSON.stringify(spline));
                    const steepest = calculateSteepestGrade(spline);
                    const bezier = hermiteToBezier(spline);
                    const sharpest = cubicBezierMinRadius(bezier);
                    const length = cubicBezierLength(bezier);
                    console.log({index, sharpest, spline, steepest, length});
                }
                break;
            case MapToolMode.delete:
                this.railroad.splineTracks = this.railroad.splineTracks.filter((s) => s !== spline);
                this.setMapModified(true);
                elements.forEach((element) => element.remove());
                break;
            case MapToolMode.circularize:
            {
                const formatDistance = (cm: number) => {
                    if (cm < 100 && cm > -100) return `${cm.toFixed(0)}cm`;
                    const m = cm / 100;
                    if (m < 1000 && m > -1000) return `${m.toFixed(2)}m`;
                    const km = m / 1000;
                    return `${km.toFixed(2)}km`;
                };
                if (!spline.type || spline.type.includes('switch') || spline.type.includes('bumper')) {
                    this.setTitle(`Ignoring ${spline.type}`);
                    return;
                }
                const curve = circularizeCurve(spline);
                const before = cubicBezierMinRadius(hermiteToBezier(spline)).radius;
                const after = cubicBezierMinRadius(hermiteToBezier(curve)).radius;
                const beforeFmt = formatDistance(before);
                const afterFmt = formatDistance(after);
                if (distanceSquared(curve.startTangent, spline.startTangent) === 0 &&
                    distanceSquared(curve.endTangent, spline.endTangent) === 0) {
                    this.setTitle(`Spline already circularized, radius: ${beforeFmt}`);
                    return;
                }
                if (before > after) {
                    this.setTitle(`Abort. Radius before: ${beforeFmt}, radius after: ${afterFmt}`);
                    return;
                }
                this.setTitle(`Radius before: ${beforeFmt}, radius after: ${afterFmt}`);
                spline.startTangent = curve.startTangent;
                spline.endTangent = curve.endTangent;
                this.setMapModified(true);
                elements.forEach((element) => element.remove());
                this.renderSplineTrack(spline);
                break;
            }
            case MapToolMode.parallel: {
                const offset = 3_83; // Length of a diamond
                const keepSpline = (a: SplineTrack) =>
                    !this.railroad.splineTracks.some((b) =>
                        a !== b &&
                        a.type === b.type &&
                        [a.startPoint, a.endPoint].every((cp1) =>
                            [b.startPoint, b.endPoint].some((cp2) => {
                                const dx = cp2.x - cp1.x;
                                const dy = cp2.y - cp1.y;
                                const dz = cp2.z - cp1.z;
                                const m2 = dx * dx + dy * dy + dz * dz;
                                return m2 < 1; // Points within 1cm
                            })));
                const parallel = parallelSplineTrack(spline, offset).filter(keepSpline);
                if (parallel.length === 0) return;
                console.log(...parallel);
                this.railroad.splineTracks.push(...parallel);
                this.setMapModified(true);
                parallel.forEach(this.renderSplineTrack, this);
            }
        }
    }

    private onClickSwitch(sw: Switch, elements: Element[]) {
        if (this.renderLock) return;
        switch (this.toolMode) {
            case MapToolMode.delete:
                this.railroad.switches = this.railroad.switches.filter((s) => s !== sw);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
        }
    }

    private onClickTurntable(turntable: Turntable, elements: Element[]) {
        if (this.renderLock) return;
        switch (this.toolMode) {
            case MapToolMode.delete:
                this.railroad.turntables = this.railroad.turntables.filter((t) => t !== turntable);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
        }
    }
}

function gradeTextClass(percentage: number) {
    if (percentage < 2) return 'grade-text';
    const index = Math.min(7, Math.floor(percentage));
    return `grade-text-${index}`;
}

function cargoText(frame: Frame): string | undefined {
    if (!hasCargoLimits(frame.type)) return;
    if (!isCargoType(frame.state.freightType)) return;
    const limits: Partial<Record<CargoType, number>> = cargoLimits[frame.type];
    const limit = limits[frame.state.freightType] ?? 'unknown';
    return `${frame.state.freightType} [${frame.state.freightAmount} / ${limit}]`;
}

function treeBucket(tree: Vector) {
    const bucketX = Math.floor((tree.x + 2_005_00) / 250_00);
    const bucketY = Math.floor((tree.y + 2_005_00) / 250_00);
    return `trees_${bucketX}_${bucketY}`;
}

function switchSecondLegWorld(spline: SplineTrack): BezierCurve {
    const secondLeg = switchSecondLeg[spline.type as SplineTrackType];
    if (!secondLeg) throw new Error(`Missing second leg for ${spline.type}`);
    const world = localToWorld(spline, secondLeg);
    return hermiteToBezier(world);
}

function makeTransform(inx: number, iny: number, yaw: number) {
    const x = Math.round(inx);
    const y = Math.round(iny);
    const degrees = Math.round(normalizeAngle(yaw));
    return `translate(${x} ${y}) rotate(${degrees})`;
}

function makeTransformF(location: Point, heading: number) {
    const degrees = heading > 0 ? heading + 90 : heading - 90;
    return makeTransform(location.x, location.y, degrees);
}

function makeTransformT(startPoint: Vector, endPoint: Vector) {
    const midPoint = scaleVector(vectorSum(startPoint, endPoint), 0.5);
    const heading = vectorHeading(startPoint, endPoint);
    return makeTransformF(midPoint, heading);
}
