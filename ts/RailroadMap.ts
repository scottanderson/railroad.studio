/* global SvgPanZoom */
import * as svgPanZoom from 'svg-pan-zoom';
// eslint-disable-next-line no-redeclare
import {ArrayXY, Element, G, Path, Svg} from '@svgdotjs/svg.js';
import {Railroad, Spline, SplineType, Switch, SwitchType} from './Railroad';
import {Studio} from './Studio';
import {bezierCommand, svgPath} from './bezier';
import {delta2, normalizeAngle, splineHeading, vectorHeading} from './splines';
import {calculateGrade, flattenControlPoints} from './tool-flatten';

enum MapToolMode {
    pan_zoom,
    delete_spline,
    flatten_spline,
}

interface MapOptions {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
    showGrades: boolean;
    showControlPoints: boolean;
    showHiddenSegments: boolean;
}

interface MapLayers {
    grades: G;
    groundworkControlPoints: G;
    groundworks: G;
    groundworksHidden: G;
    trackControlPoints: G;
    tracks: G;
    tracksHidden: G;
}

export class RailroadMap {
    private railroad: Railroad;
    private svg: Svg;
    private panZoom: SvgPanZoom.Instance;
    private showGrades: boolean;
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
        this.showGrades = options.showGrades;
        this.showControlPoints = options.showControlPoints;
        this.showHiddenSegments = options.showHiddenSegments;
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

    toggleFlattenTool(): boolean {
        if (this.toolMode === MapToolMode.flatten_spline) {
            // Disable flatten tool
            this.toolMode = MapToolMode.pan_zoom;
            if (this.showGrades) {
                this.toggleShowGrades();
            }
            return false;
        } else if (this.toolMode !== MapToolMode.pan_zoom) {
            // Don't allow flatten tool while another tool is active
            return false;
        } else {
            // Enable flatten tool
            this.toolMode = MapToolMode.flatten_spline;
            if (!this.showGrades) {
                this.toggleShowGrades();
            }
            return true;
        }
    }

    toggleShowGrades(): boolean {
        this.showGrades = !this.showGrades;
        this.writeOptions();
        if (this.showGrades) {
            this.layers.grades.show();
        } else {
            this.layers.grades.hide();
        }
        return this.showGrades;
    }

    toggleShowControlPoints(): boolean {
        this.showControlPoints = !this.showControlPoints;
        this.writeOptions();
        if (this.showControlPoints) {
            this.layers.groundworkControlPoints.show();
            this.layers.trackControlPoints.show();
        } else {
            this.layers.groundworkControlPoints.hide();
            this.layers.trackControlPoints.hide();
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

    getShowGrades(): boolean {
        return this.showGrades;
    }

    getShowControlPoints(): boolean {
        return this.showControlPoints;
    }

    getShowHiddenSegments(): boolean {
        return this.showHiddenSegments;
    }

    private readOptions(): MapOptions {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        return {
            pan: {
                x: Number(parsed?.pan?.x || 0),
                y: Number(parsed?.pan?.y || 0),
            },
            zoom: Number(parsed?.zoom || 1),
            showGrades: Boolean(parsed?.showGrades || false),
            showControlPoints: Boolean(parsed?.showControlPoints || false),
            showHiddenSegments: Boolean(parsed?.showHiddenSegments || false),
        };
    }

    private writeOptions() {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const options: MapOptions = {
            pan: this.panZoom.getPan(),
            zoom: this.panZoom.getZoom(),
            showGrades: this.showGrades,
            showControlPoints: this.showControlPoints,
            showHiddenSegments: this.showHiddenSegments,
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
            groundworkControlPoints,
            grades,
            tracks,
            tracksHidden,
            trackControlPoints,
        ] = [
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
            group.group(),
        ];
        if (!this.showControlPoints) {
            groundworkControlPoints.hide();
            trackControlPoints.hide();
        }
        if (!this.showHiddenSegments) {
            groundworksHidden.hide();
            tracksHidden.hide();
        }
        if (!this.showGrades) {
            grades.hide();
        }
        return {
            grades: grades,
            groundworkControlPoints: groundworkControlPoints,
            groundworks: groundworks,
            groundworksHidden: groundworksHidden,
            trackControlPoints: trackControlPoints,
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
        // Control points
        spline.controlPoints.forEach((point, i) => {
            const adjacentVisible = spline.segmentsVisible.slice(i - 1, i + 1).filter(Boolean).length;
            let rect;
            if (isRail) {
                rect = this.layers.trackControlPoints
                    .circle(300);
            } else {
                rect = this.layers.groundworkControlPoints
                    .rect(300, 300)
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
        // Splines
        for (const invisPass of [true, false]) {
            const d = svgPath(points, bezierCommand);
            const g = invisPass ? hiddenGroup : splineGroup;
            const rect = g.path(d)
                .attr('stroke-dasharray', splineToDashArray(spline, invisPass))
                .on('click', () => this.onClickSpline(spline, rect, elements));
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
        // Grade
        if (isRail) {
            const c = calculateGrade(spline.controlPoints);
            for (let i = 0; i < spline.segmentsVisible.length; i++) {
                if (!spline.segmentsVisible[i]) continue;
                const percentage = c[i].grade;
                const heading = vectorHeading(spline.controlPoints[i], spline.controlPoints[i + 1]);
                const degrees = heading > 0 ? heading + 90 : heading - 90;
                const cp0 = spline.controlPoints[i];
                const cp1 = spline.controlPoints[i + 1];
                const x = (cp1.x + cp0.x) / 2;
                const y = (cp1.y + cp0.y) / 2;
                const text = this.layers.grades
                    .text(percentage.toFixed(4) + '%')
                    .font({
                        family: 'Helvetica',
                        size: 500,
                    })
                    .rotate(degrees)
                    .translate(x, y);
                elements.push(text);
            }
        }
    }

    private onClickSpline(spline: Spline, rect: Path, elements: Element[]) {
        switch (this.toolMode) {
            case MapToolMode.pan_zoom:
                console.log(spline);
                break;
            case MapToolMode.delete_spline:
                this.railroad.splines = this.railroad.splines.filter((s) => s !== spline);
                this.setMapModified();
                elements.forEach((element) => element.remove());
                break;
            case MapToolMode.flatten_spline: {
                spline.controlPoints = flattenControlPoints(spline.controlPoints);
                this.setMapModified();
                // Re-render just this spline
                elements.forEach((element) => element.remove());
                this.renderSpline(spline);
                break;
            }
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
