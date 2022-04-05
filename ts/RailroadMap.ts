/* global SvgPanZoom */
import * as svgPanZoom from 'svg-pan-zoom';
import {ArrayXY, G, Svg} from '@svgdotjs/svg.js';
import {Railroad, Spline, SplineType, Switch, SwitchType} from './Railroad';
import {Studio} from './Studio';
import {bezierCommand, svgPath} from './bezier';
import {delta2, normalizeAngle, splineHeading} from './splines';

enum MapToolMode {
    pan_zoom,
    delete_spline,
}

export class RailroadMap {
    private railroad: Railroad;
    private svg: Svg;
    private panZoom?: SvgPanZoom.Instance;
    private showControlPoints: boolean;
    private showHiddenSegments: boolean;
    private toolMode: MapToolMode;
    private setMapModified: () => void;

    constructor(studio: Studio, element: HTMLElement) {
        this.setMapModified = () => {
            studio.modified = true;
        };
        this.railroad = studio.railroad;
        this.showControlPoints = false;
        this.showHiddenSegments = false;
        this.toolMode = MapToolMode.pan_zoom;
        this.svg = new Svg().addTo(element).size('100%', '100%');
        this.svg.node.style.setProperty('position', 'fixed');
        this.refresh();
    }

    toggleDeleteTool(): boolean {
        if (this.toolMode === MapToolMode.delete_spline) {
            this.toolMode = MapToolMode.pan_zoom;
            return false;
        } else {
            this.toolMode = MapToolMode.delete_spline;
            return true;
        }
    }

    toggleShowControlPoints(): boolean {
        this.showControlPoints = !this.showControlPoints;
        this.refresh();
        return this.showControlPoints;
    }

    toggleShowHiddenSegments(): boolean {
        this.showHiddenSegments = !this.showHiddenSegments;
        this.refresh();
        return this.showHiddenSegments;
    }

    private getZoom() {
        return this.panZoom?.getZoom() || Number(localStorage.getItem(this.zoomKey()) || 1);
    }

    private getPan() {
        return this.panZoom?.getPan() || JSON.parse(localStorage.getItem(this.panKey()) || 'null');
    }

    private savePanZoom(point: SvgPanZoom.Point, scale: number) {
        if (point && scale) {
            localStorage.setItem(this.panKey(), JSON.stringify(point));
            localStorage.setItem(this.zoomKey(), String(scale));
        }
    }

    private panKey(): string {
        return `railroadstudio.${this.railroad.saveGame.uniqueWorldId}.pan`;
    }

    private zoomKey(): string {
        return `railroadstudio.${this.railroad.saveGame.uniqueWorldId}.zoom`;
    }

    refresh() {
        const pan = this.getPan();
        const zoom = this.getZoom();
        this.panZoom?.destroy();
        this.svg.node.replaceChildren();
        const group = this.svg.group().rotate(180);
        group.rect(4_000_00, 4_000_00)
            .center(0, 0)
            .addClass('map-border');

        for (const currentGroup of [[
            SplineType.variable_grade,
            SplineType.constant_grade,
            SplineType.variable_stone_wall,
            SplineType.constant_stone_wall,
            SplineType.wooden_bridge,
            SplineType.steel_bridge,
        ], [
            SplineType.rail_deck,
            SplineType.rail,
        ]]) {
            const twoPasses = this.showControlPoints || this.showHiddenSegments;
            for (const invisPass of twoPasses ? [false, true] : [false]) {
                for (const currentType of currentGroup) {
                    if (currentType === SplineType.rail && !invisPass) {
                        this.renderSwitches(group);
                    }
                    for (const spline of this.railroad.splines.filter((s) => s.type === currentType)) {
                        this.renderSpline(group, spline, invisPass);
                    }
                }
            }
        }

        const beforePan = (oldPan: SvgPanZoom.Point, newPan: SvgPanZoom.Point) => {
            const gutterWidth = 100;
            const gutterHeight = 100;
            // Computed variables
            const sizes: any = this.panZoom!.getSizes();
            const leftLimit = -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) + gutterWidth;
            const rightLimit = sizes.width - gutterWidth - (sizes.viewBox.x * sizes.realZoom);
            const topLimit = -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) + gutterHeight;
            const bottomLimit = sizes.height - gutterHeight - (sizes.viewBox.y * sizes.realZoom);
            return {
                x: Math.max(leftLimit, Math.min(rightLimit, newPan.x)),
                y: Math.max(topLimit, Math.min(bottomLimit, newPan.y)),
            };
        };

        this.panZoom = svgPanZoom(this.svg.node, {
            zoomScaleSensitivity: 0.5,
            minZoom: 0.5,
            maxZoom: 50,
            beforePan: beforePan,
            onPan: (point) => this.savePanZoom(point, this.panZoom!.getZoom()),
            onZoom: (scale) => this.savePanZoom(this.panZoom!.getPan(), scale),
        });
        if (pan && zoom) {
            this.panZoom.zoom(zoom);
            this.panZoom.pan(pan);
        }
    }

    private renderSwitchLeg(group: G, sw: Switch, yawOffset: number) {
        return group.path([
            ['m', 0, 0],
            ['v', 1888],
        ])
            .rotate(normalizeAngle(sw.rotation.yaw + yawOffset), 0, 0)
            .translate(sw.location.x, sw.location.y)
            .addClass('switch-leg');
    }

    private renderSwitches(group: G) {
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
                    this.renderSwitchLeg(group, sw, notAlignedYaw)
                        .addClass('not-aligned');
                    const aligned = this.renderSwitchLeg(group, sw, alignedYaw)
                        .addClass('aligned');
                    if (this.showHiddenSegments) {
                        aligned.addClass('xray');
                    }
                    break;
                }
                case SwitchType.diamond: { // 6
                    group.path([
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

    private renderSpline(group: G, spline: Spline, invisPass: boolean) {
        // Reverse x from west to east, and y from south to north
        const points: ArrayXY[] = spline.controlPoints.map((cp) => [cp.x, cp.y]);
        if (invisPass && this.showControlPoints) {
            const last = points.length - 1;
            for (let i = 0; i < points.length; i++) {
                let adjacentVisible = 0;
                if (i < last && spline.segmentsVisible[i]) adjacentVisible++;
                if (i > 0 && spline.segmentsVisible[i - 1]) adjacentVisible++;
                if (adjacentVisible === 0 && !this.showHiddenSegments) continue;
                let rect;
                if (spline.type === SplineType.rail || spline.type === SplineType.rail_deck) {
                    rect = group.circle(300);
                } else {
                    rect = group.rect(300, 300)
                        .rotate(splineHeading(spline, i), 150, 150);
                }
                rect
                    .translate(points[i][0] - 150, points[i][1] - 150)
                    .addClass(`control-point-${adjacentVisible}`);
            }
        }
        if (!invisPass || this.showHiddenSegments) {
            const d = svgPath(points, bezierCommand);
            const rect = group.path(d)
                .attr('stroke-dasharray', splineToDashArray(spline, invisPass))
                .on('click', () => {
                    if (this.toolMode === MapToolMode.delete_spline) {
                        this.railroad.splines = this.railroad.splines.filter((s) => s !== spline);
                        this.setMapModified();
                        if (this.showHiddenSegments || this.showControlPoints) {
                            this.refresh(); // TODO: Figure out something faster
                        } else {
                            rect.remove();
                        }
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
