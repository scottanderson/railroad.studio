/* global SvgPanZoom */
import * as svgPanZoom from 'svg-pan-zoom';
// eslint-disable-next-line no-redeclare
import {ArrayXY, Element, G, Svg} from '@svgdotjs/svg.js';
import {Railroad, Spline, SplineType, Switch, SwitchType} from './Railroad';
import {Studio} from './Studio';
import {bezierCommand, svgPath} from './bezier';
import {delta2, normalizeAngle, splineHeading} from './splines';

enum MapToolMode {
    pan_zoom,
    delete_spline,
}

interface MapOptions {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
    showPoints: boolean;
    showSegments: boolean;
}

interface MapLayers {
    controlPoints: G;
    groundworks: G;
    groundworksHidden: G;
    tracks: G;
    tracksHidden: G;
}

export class RailroadMap {
    private railroad: Railroad;
    private svg: Svg;
    private panZoom: SvgPanZoom.Instance;
    private showControlPoints: boolean;
    private showHiddenSegments: boolean;
    private toolMode: MapToolMode;
    private layers: MapLayers;
    private setMapModified: () => void;

    constructor(studio: Studio, element: HTMLElement) {
        this.setMapModified = () => {
            studio.modified = true;
        };
        this.railroad = studio.railroad;
        this.toolMode = MapToolMode.pan_zoom;
        const options = this.readOptions();
        this.showControlPoints = options.showPoints;
        this.showHiddenSegments = options.showSegments;
        this.svg = new Svg().addTo(element).size('100%', '100%');
        this.svg.node.style.setProperty('position', 'fixed');
        this.layers = this.createLayers();
        this.renderSwitches();
        for (const spline of this.railroad.splines) {
            this.renderSpline(spline);
        }
        this.panZoom = this.initPanZoom();
        if (options.pan && options.zoom) {
            this.panZoom.zoom(options.zoom);
            this.panZoom.pan(options.pan);
        }
    }

    refresh() {
        const pan = this.panZoom.getPan();
        const zoom = this.panZoom.getZoom();
        this.panZoom?.destroy();
        this.svg.node.replaceChildren();
        this.layers = this.createLayers();
        this.renderSwitches();
        for (const spline of this.railroad.splines) {
            this.renderSpline(spline);
        }
        this.panZoom = this.initPanZoom();
        if (pan && zoom) {
            this.panZoom.zoom(zoom);
            this.panZoom.pan(pan);
        }
    }

    toggleDeleteTool(): boolean {
        if (this.toolMode === MapToolMode.delete_spline) {
            // Disable delete tool
            this.toolMode = MapToolMode.pan_zoom;
            this.panZoom.enableDblClickZoom();
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow delete tool while another tool is active
            return false;
        } else {
            // Enable delete tool
            this.toolMode = MapToolMode.delete_spline;
            this.panZoom.disableDblClickZoom();
            return true;
        }
    }

    toggleShowControlPoints(): boolean {
        this.showControlPoints = !this.showControlPoints;
        this.writeOptions();
        if (this.showControlPoints) {
            this.layers.controlPoints.show();
        } else {
            this.layers.controlPoints.hide();
        }
        return this.showControlPoints;
    }

    toggleShowHiddenSegments(): boolean {
        this.showHiddenSegments = !this.showHiddenSegments;
        this.writeOptions();
        if (this.showHiddenSegments) {
            this.layers.groundworksHidden.show();
            this.layers.tracksHidden.show();
        } else {
            this.layers.groundworksHidden.hide();
            this.layers.tracksHidden.hide();
        }
        return this.showHiddenSegments;
    }

    getShowControlPoints() {
        return this.showControlPoints;
    }

    getShowHiddenSegments() {
        return this.showHiddenSegments;
    }

    private readOptions(): MapOptions {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const options: MapOptions = {
            pan: {
                x: Number(parsed?.pan?.x || 0),
                y: Number(parsed?.pan?.y || 0),
            },
            zoom: Number(parsed?.zoom || 1),
            showPoints: Boolean(parsed?.showPoints || false),
            showSegments: Boolean(parsed?.showSegments || false),
        };
        return options;
    }

    private writeOptions() {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const options: MapOptions = {
            pan: this.panZoom.getPan(),
            zoom: this.panZoom.getZoom(),
            showPoints: this.showControlPoints,
            showSegments: this.showHiddenSegments,
        };
        localStorage.setItem(key, JSON.stringify(options));
    }

    private createLayers(): MapLayers {
        const group = this.svg.group().rotate(180);
        this.renderBorder(group);
        // The z-order of these groups is the order they are created
        const [
            groundworks,
            groundworksHidden,
            tracks,
            tracksHidden,
            controlPoints,
        ] = [
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
        ];
        if (!this.showControlPoints) {
            controlPoints.hide();
        }
        if (!this.showHiddenSegments) {
            groundworksHidden.hide();
            tracksHidden.hide();
        }
        return {
            controlPoints: controlPoints,
            groundworks: groundworks,
            groundworksHidden: groundworksHidden,
            tracks: tracks,
            tracksHidden: tracksHidden,
        };
    }

    private renderBorder(group: G) {
        // Border
        group.rect(400000, 400000)
            .center(0, 0)
            .addClass('map-border');
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

        const onPanZoom = () => {
            this.writeOptions();
        };

        return svgPanZoom(this.svg.node, {
            zoomScaleSensitivity: 0.5,
            minZoom: 0.5,
            maxZoom: 50,
            beforePan: beforePan,
            onPan: onPanZoom,
            onZoom: onPanZoom,
        });
    }

    private renderSwitchLeg(sw: Switch, yawOffset: number) {
        return this.layers.tracks.path([
            ['m', 0, 0],
            ['v', 1888],
        ])
            .rotate(normalizeAngle(sw.rotation.yaw + yawOffset), 0, 0)
            .translate(sw.location.x, sw.location.y)
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
                    this.renderSwitchLeg(sw, notAlignedYaw)
                        .addClass('not-aligned');
                    const aligned = this.renderSwitchLeg(sw, alignedYaw)
                        .addClass('aligned');
                    if (this.showHiddenSegments) {
                        aligned.addClass('xray');
                    }
                    break;
                }
                case SwitchType.diamond: { // 6
                    this.layers.tracks.path([
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
                    ])
                        .rotate(sw.rotation.yaw - 90, 0, 0)
                        .translate(sw.location.x, sw.location.y)
                        .fill('yellow')
                        .opacity(this.showHiddenSegments ? 0.9 : 1.0);
                    break;
                }
                default:
                    throw new Error(sw.type);
            }
        }
    }

    private renderSpline(spline: Spline) {
        const elements: Element[] = [];
        const isRail = spline.type === SplineType.rail || spline.type === SplineType.rail_deck;
        const group = this.layers.controlPoints;
        spline.controlPoints.forEach((point, i) => {
            const adjacentVisible = spline.segmentsVisible.slice(i - 1, i + 1).filter(Boolean).length;
            let rect;
            if (isRail) {
                rect = group.circle(300);
            } else {
                rect = group.rect(300, 300)
                    .rotate(splineHeading(spline, i), 150, 150);
            }
            rect
                .translate(point.x - 150, point.y - 150)
                .addClass(`control-point-${adjacentVisible}`);
            elements.push(rect);
        });
        const splineGroup = isRail ? this.layers.tracks : this.layers.groundworks;
        const hiddenGroup = isRail ? this.layers.tracksHidden : this.layers.groundworksHidden;
        const points: ArrayXY[] = spline.controlPoints.map((cp) => [cp.x, cp.y]);
        for (const invisPass of [true, false]) {
            const d = svgPath(points, bezierCommand);
            const g = invisPass ? hiddenGroup : splineGroup;
            const rect = g.path(d)
                .attr('stroke-dasharray', splineToDashArray(spline, invisPass))
                .on('click', () => {
                    if (this.toolMode === MapToolMode.delete_spline) {
                        this.railroad.splines = this.railroad.splines.filter((s) => s !== spline);
                        this.setMapModified();
                        elements.forEach((element) => element.remove());
                    } else {
                        console.log(spline);
                    }
                });
            if (invisPass) rect.addClass('hidden');
            else if (this.showHiddenSegments) rect.addClass('xray');
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
            ret.push(String(dashlen));
            dashlen = segmentLength;
        } else {
            dashlen += segmentLength;
        }
    }
    if (!ret) return invert ? null : String(dashlen);
    if (dashlen > 0) {
        ret.push(String(dashlen));
    }
    return ret.join(',');
}
