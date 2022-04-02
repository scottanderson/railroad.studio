/* global SvgPanZoom */
import * as svgPanZoom from 'svg-pan-zoom';
// eslint-disable-next-line no-redeclare
import {ArrayXY, Element, G, Path, Svg} from '@svgdotjs/svg.js';
import {Industry, IndustryType, Player, Railroad, Spline, SplineType, Switch, SwitchType} from './Railroad';
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
    layerVisibility: MapLayerVisibility;
}

export interface MapLayers {
    grades: G;
    groundworkControlPoints: G;
    groundworks: G;
    groundworksHidden: G;
    industries: G;
    players: G;
    trackControlPoints: G;
    tracks: G;
    tracksHidden: G;
}

interface MapLayerVisibility {
    grades: boolean;
    groundworkControlPoints: boolean;
    groundworks: boolean;
    groundworksHidden: boolean;
    industries: boolean;
    players: boolean;
    trackControlPoints: boolean;
    tracks: boolean;
    tracksHidden: boolean;
}

export class RailroadMap {
    private railroad: Railroad;
    private svg: Svg;
    private panZoom: SvgPanZoom.Instance;
    private toolMode: MapToolMode;
    private layers: MapLayers;
    private layerVisibility: MapLayerVisibility;
    private setMapModified: () => void;
    private setTitle: (title: string) => void;

    constructor(studio: Studio, element: HTMLElement) {
        this.setMapModified = () => studio.modified = true;
        this.setTitle = (title) => studio.setTitle(title);
        this.railroad = studio.railroad;
        this.toolMode = MapToolMode.pan_zoom;
        const options = this.readOptions();
        this.layerVisibility = options.layerVisibility;
        this.svg = new Svg()
            .addClass('map-svg')
            .addTo(element);
        this.layers = this.createLayers();
        this.railroad.industries.forEach(this.renderIndustry, this);
        this.railroad.players.forEach(this.renderPlayer, this);
        this.renderSwitches();
        this.renderSplines();
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
        this.railroad.industries.forEach(this.renderIndustry, this);
        this.railroad.players.forEach(this.renderPlayer, this);
        this.renderSwitches();
        this.railroad.splines.forEach(this.renderSpline, this);
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
        } else {
            this.layers[layer].hide();
        }
        return this.layerVisibility[layer];
    }

    getLayerVisibility(layer: keyof MapLayers): boolean {
        return this.layerVisibility[layer];
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
            layerVisibility: {
                grades: Boolean(parsed?.layerVisibility?.grades),
                groundworkControlPoints: Boolean(parsed?.layerVisibility?.groundworkControlPoints),
                groundworks: true, // Boolean(parsed?.layerVisibility?.groundworks),
                groundworksHidden: Boolean(parsed?.layerVisibility?.groundworksHidden),
                industries: Boolean(parsed?.layerVisibility?.industries),
                players: Boolean(parsed?.layerVisibility?.players),
                trackControlPoints: Boolean(parsed?.layerVisibility?.trackControlPoints),
                tracks: true, // Boolean(parsed?.layerVisibility?.tracks),
                tracksHidden: Boolean(parsed?.layerVisibility?.tracksHidden),
            },
        };
    }

    private writeOptions() {
        const key = `railroadstudio.${this.railroad.saveGame.uniqueWorldId}`;
        const options: MapOptions = {
            pan: this.panZoom.getPan(),
            zoom: this.panZoom.getZoom(),
            layerVisibility: this.layerVisibility,
        };
        localStorage.setItem(key, JSON.stringify(options));
    }

    private createLayers(): MapLayers {
        const group = this.svg.group()
            .rotate(180)
            .font('family', 'sans-serif')
            .font('size', 500);
        this.renderBorder(group);
        // The z-order of these groups is the order they are created
        const [
            groundworks,
            groundworksHidden,
            groundworkControlPoints,
            grades,
            industries,
            tracks,
            tracksHidden,
            trackControlPoints,
            players,
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
        ];
        const layers: MapLayers = {
            grades: grades,
            groundworkControlPoints: groundworkControlPoints,
            groundworks: groundworks,
            groundworksHidden: groundworksHidden,
            industries: industries,
            players: players,
            trackControlPoints: trackControlPoints,
            tracks: tracks,
            tracksHidden: tracksHidden,
        };
        const entries = Object.entries(layers) as [keyof MapLayers, G][];
        entries.forEach(([key, group]) => {
            group.id(key);
            if (!this.layerVisibility[key]) group.hide();
        });
        return layers;
    }

    private renderBorder(group: G): Element {
        // Border
        return group
            .rect(4_000_00, 4_000_00)
            .translate(-2_000_00, -2_000_00)
            .radius(100_00)
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
            maxZoom: 500,
            beforePan: beforePan,
            onPan: onPanZoom,
            onZoom: onPanZoom,
        });
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
        return this.layers.tracks.path([
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
                    this.renderSwitchLeg(sw, notAlignedYaw)
                        .addClass('not-aligned');
                    this.renderSwitchLeg(sw, alignedYaw)
                        .addClass('aligned');
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
                        .rotate(Math.round(sw.rotation.yaw - 90), 0, 0)
                        .translate(Math.round(sw.location.x), Math.round(sw.location.y))
                        .addClass('diamond');
                    break;
                }
                default:
                    throw new Error(sw.type);
            }
        }
    }

    private renderSplines() {
        const splines = this.railroad.splines.concat();
        if (splines.length > 0) {
            let updateTime = 0;
            const fun = () => {
                while (splines.length > 0) {
                    const spline = splines.shift();
                    if (spline) {
                        this.renderSpline(spline);
                    }
                    const now = performance.now();
                    if (now - updateTime > 200) {
                        updateTime = now;
                        const pct = 100 * (1 - (splines.length / this.railroad.splines.length));
                        this.setTitle(`Reticulating splines... ${pct.toFixed(1)}%`);
                        setTimeout(fun, 0);
                        return;
                    }
                }
                this.setTitle('Map');
            };
            setTimeout(fun, 0);
        }
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
                    .polygon([[0, r],
                        [l, 0 - h],
                        [64, -h],
                        [0, 0],
                        [-64, -h],
                        [-l, -h]])
                    .attr('transform', `translate(${x} ${y}) rotate(${degrees})`);
            } else {
                const x = Math.round(point.x - 150);
                const y = Math.round(point.y - 150);
                rect = this.layers.groundworkControlPoints
                    .rect(300, 300)
                    .attr('transform', `translate(${x} ${y}) rotate(${degrees} 150 150)`);
            }
            rect
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
            const rect = g.path(d)
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
