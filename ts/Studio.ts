import {GvasString, gvasToString} from './Gvas';
import {IndustryType, industryName, industryProductInputLabels, industryProductOutputLabels} from './IndustryType';
import {Frame, NumericFrameStateKeys, Railroad} from './Railroad';
import {MapLayers, RailroadMap} from './RailroadMap';
import {Rotator} from './Rotator';
import {Vector} from './Vector';
import {simplifySplines} from './splines';
import {gvasToBlob, railroadToGvas} from './exporter';
import {cargoLimits, frameDefinitions, frameStateMetadata} from './frames';

interface InputTextOptions {
    max?: string;
    min?: string;
    step?: string;
}

type Quadruplet<T> = [T, T, T, T];

const OLDEST_TESTED_SAVE_GAME_VERSION = 220127;
const NEWEST_TESTED_SAVE_GAME_VERSION = 221006;

/**
 * Web UI for editing a Railroad object.
 */
export class Studio {
    filename: string;
    railroad: Railroad;
    modified: boolean;
    map: RailroadMap;
    header: HTMLHeadingElement;
    originalSegmentCount: number;

    constructor(filename: string, railroad: Railroad, headerElement: HTMLElement, content: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
        this.originalSegmentCount = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
        this.modified = false;
        const header = document.createElement('h2');
        this.header = header;
        header.textContent = 'Loaded ' + this.filename;
        const buttons = document.createElement('div');
        buttons.classList.add('hstack', 'gap-2');
        // Map
        const btnMap = document.createElement('button');
        btnMap.innerText = 'Map';
        btnMap.classList.add('btn', 'btn-secondary');
        const mapDiv = document.createElement('div');
        btnMap.addEventListener('click', () => {
            studioControls.replaceChildren(buttons, mapButtons);
            content.replaceChildren(mapDiv);
            this.setTitle('Map');
        });
        content.replaceChildren(mapDiv);
        this.map = new RailroadMap(this, mapDiv);
        // Layers dropdown
        const txtLayers = document.createTextNode(' Layers ');
        const imgLayers = this.bootstrapIcon('bi-layers', 'Layers Dropdown');
        const btnLayers = document.createElement('button');
        btnLayers.id = 'btnLayers';
        btnLayers.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnLayers.setAttribute('aria-expanded', 'false');
        btnLayers.setAttribute('data-bs-auto-close', 'outside');
        btnLayers.setAttribute('data-bs-toggle', 'dropdown');
        btnLayers.replaceChildren(imgLayers, txtLayers);
        const lstLayers = document.createElement('ul');
        lstLayers.classList.add('dropdown-menu');
        const grpLayers = document.createElement('div');
        grpLayers.setAttribute('aria-labelledby', btnLayers.id);
        grpLayers.classList.add('dropdown');
        grpLayers.replaceChildren(btnLayers, lstLayers);
        let layers: {
            key: keyof MapLayers;
            name: string;
            listener?: () => void;
        }[] = [
            {
                key: 'border',
                name: 'World Border',
            },
            {
                key: 'background',
                name: 'Topographical Map',
            },
            {
                key: 'controlPoints',
                name: 'Control Points',
            },
            {
                key: 'frames',
                name: 'Frames',
            },
            {
                key: 'frameNumbers',
                name: 'Frame Numbers',
            },
            {
                key: 'grades',
                name: 'Grade %',
            },
            {
                key: 'radius',
                name: 'Curve radius',
            },
            {
                key: 'radiusSwitch',
                name: 'Switch turnout radius',
            },
            {
                key: 'groundworks',
                name: 'Groundwork and Bridges',
            },
            {
                key: 'groundworksHidden',
                name: 'Groundwork and Bridge Hidden Segments',
            },
            {
                key: 'industries',
                name: 'Industries',
            },
            {
                key: 'players',
                name: 'Players',
            },
            {
                key: 'tracks',
                name: 'Tracks',
            },
            {
                key: 'tracksHidden',
                name: 'Track Hidden Segments',
            },
            {
                key: 'trees',
                name: 'Trees',
            },
            {
                key: 'turntables',
                name: 'Turntables',
            },
        ];
        if (railroad.splines.length === 0) {
            // Hide layers that only apply to old splines
            layers = layers.filter((layer) => {
                switch (layer.key) {
                    case 'groundworksHidden':
                    case 'tracksHidden':
                        return false;
                }
                return true;
            });
        }
        lstLayers.replaceChildren(...layers.map((layer) => {
            const btnToggleLayer = document.createElement('button');
            const imgToggleLayer = document.createElement('i');
            const txtToggleLayer = document.createTextNode(` ${layer.name} `);
            imgToggleLayer.classList.add('bi', 'bi-toggle-off');
            btnToggleLayer.classList.add('dropdown-item', 'text-nowrap');
            btnToggleLayer.replaceChildren(imgToggleLayer, txtToggleLayer);
            layer.listener = () => {
                if (this.map.getLayerVisibility(layer.key)) {
                    imgToggleLayer.classList.replace('bi-toggle-off', 'bi-toggle-on');
                } else {
                    imgToggleLayer.classList.replace('bi-toggle-on', 'bi-toggle-off');
                }
            };
            btnToggleLayer.addEventListener('click', () => {
                this.map.toggleLayerVisibility(layer.key);
                if (layer.listener) {
                    layer.listener();
                }
            });
            return btnToggleLayer;
        }));
        // Find rolling stock dropdown
        const txtFrameList = document.createTextNode(' Frames ');
        const imgFrameList = this.bootstrapIcon('bi-car-front-fill', 'Find rolling stock');
        const btnFrameList = document.createElement('button');
        btnFrameList.id = 'btnFrameList';
        btnFrameList.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnFrameList.setAttribute('aria-expanded', 'false');
        btnFrameList.setAttribute('data-bs-auto-close', 'outside');
        btnFrameList.setAttribute('data-bs-toggle', 'dropdown');
        btnFrameList.replaceChildren(imgFrameList, txtFrameList);
        const lstFrameList = document.createElement('ul');
        lstFrameList.classList.add('dropdown-menu');
        lstFrameList.style.maxHeight = '50rem';
        lstFrameList.style.overflowY = 'auto';
        const grpFrameList = document.createElement('div');
        grpFrameList.setAttribute('aria-labelledby', btnFrameList.id);
        grpFrameList.classList.add('dropdown');
        grpFrameList.replaceChildren(btnFrameList, lstFrameList);
        lstFrameList.replaceChildren(...railroad.frames.map((frame) => {
            const btnFrame = document.createElement('button');
            const imgFrame = document.createElement('i');
            const text =
                (frame.type ? frameDefinitions[frame.type].name + ' ' : '') +
                (frame.number ? '#' + gvasToString(frame.number) + ' ' : '') +
                (frame.name ? gvasToString(frame.name) : '');
            const txtFrame = document.createTextNode(` ${text} `);
            imgFrame.classList.add('bi', 'bi-geo');
            btnFrame.classList.add('dropdown-item', 'text-nowrap');
            btnFrame.replaceChildren(imgFrame, txtFrame);
            btnFrame.addEventListener('click', () => {
                // Center vewport on frame location
                this.map.panTo(frame.location);
            });
            return btnFrame;
        }));
        // Trees dropdown
        const txtTrees = document.createTextNode(' Trees ');
        const imgTrees = this.bootstrapIcon('bi-tree', 'Trees Dropdown');
        const btnTrees = document.createElement('button');
        btnTrees.id = 'btnTrees';
        btnTrees.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
        btnTrees.setAttribute('aria-expanded', 'false');
        btnTrees.setAttribute('data-bs-auto-close', 'true');
        btnTrees.setAttribute('data-bs-toggle', 'dropdown');
        btnTrees.replaceChildren(imgTrees, txtTrees);
        const lstTrees = document.createElement('ul');
        lstTrees.classList.add('dropdown-menu');
        const grpTrees = document.createElement('div');
        grpTrees.setAttribute('aria-labelledby', btnTrees.id);
        grpTrees.classList.add('dropdown');
        grpTrees.replaceChildren(btnTrees, lstTrees);
        const treeActions: {
            name: string;
            onClick: () => void;
        }[] = [
            {
                name: 'Cut All Trees (increases save file size)',
                onClick: () => this.map.getTreeUtil().cutAll(),
            },
            {
                name: 'Replant all trees (dangerous!)',
                onClick: () => this.map.getTreeUtil().replantAll(),
            },
            {
                name: 'Smart replant',
                onClick: () => this.map.getTreeUtil().smartReplant(),
            },
        ];
        lstTrees.replaceChildren(...treeActions.map((action) => {
            const btnAction = document.createElement('button');
            const txtAction = document.createTextNode(` ${action.name} `);
            btnAction.classList.add('dropdown-item', 'text-nowrap');
            btnAction.replaceChildren(txtAction);
            btnAction.addEventListener('click', action.onClick);
            return btnAction;
        }));
        // Tree brush
        const btnTreeBrush = document.createElement('button');
        const imgTreeBrush = this.bootstrapIcon('bi-tree-fill', 'Tree Brush');
        const txtTreeBrush = document.createTextNode(' Tree Brush ');
        btnTreeBrush.classList.add('btn', 'btn-secondary');
        btnTreeBrush.replaceChildren(imgTreeBrush, txtTreeBrush);
        btnTreeBrush.setAttribute('data-bs-toggle', 'tooltip');
        btnTreeBrush.title = '[LMB] Plant trees\n[RMB] Cut trees\n[MMB] Pan\n[Scroll wheel] Change brush size';
        btnTreeBrush.addEventListener('click', () => {
            const toolEnabled = this.map.toggleTreeBrush();
            if (toolEnabled) {
                btnTreeBrush.classList.add('active', 'btn-danger');
                btnTreeBrush.classList.remove('btn-secondary');
            } else {
                btnTreeBrush.classList.remove('active', 'btn-danger');
                btnTreeBrush.classList.add('btn-secondary');
            }
        });
        // Delete tool
        const btnDelete = document.createElement('button');
        const imgDelete = this.bootstrapIcon('bi-eraser-fill', 'Delete Tool');
        const txtDelete = document.createTextNode(' Delete Tool ');
        btnDelete.classList.add('btn', 'btn-secondary');
        btnDelete.replaceChildren(imgDelete, txtDelete);
        btnDelete.addEventListener('click', () => {
            const toolEnabled = this.map.toggleDeleteTool();
            if (toolEnabled) {
                btnDelete.classList.add('active', 'btn-danger');
                btnDelete.classList.remove('btn-secondary');
            } else {
                btnDelete.classList.remove('active', 'btn-danger');
                btnDelete.classList.add('btn-secondary');
            }
        });
        // Flatten spline tool
        const btnFlattenSpline = document.createElement('button');
        const imgFlattenSpline = this.bootstrapIcon('bi-arrows-collapse', 'Flatten Spline Tool');
        const txtFlattenSpline = document.createTextNode(' Flatten Spline Tool ');
        btnFlattenSpline.classList.add('btn', 'btn-secondary');
        btnFlattenSpline.replaceChildren(imgFlattenSpline, txtFlattenSpline);
        btnFlattenSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleFlattenTool();
            if (toolEnabled) {
                btnFlattenSpline.classList.add('active', 'btn-danger');
                btnFlattenSpline.classList.remove('btn-secondary');
            } else {
                btnFlattenSpline.classList.remove('active', 'btn-danger');
                btnFlattenSpline.classList.add('btn-secondary');
            }
        });
        // Parallel spline tool
        const btnParallelSpline = document.createElement('button');
        const imgParallelSpline = this.bootstrapIcon('bi-distribute-horizontal', 'Parallel Spline Tool');
        const txtParallelSpline = document.createTextNode(' Parallel Spline Tool ');
        btnParallelSpline.classList.add('btn', 'btn-secondary');
        btnParallelSpline.replaceChildren(imgParallelSpline, txtParallelSpline);
        btnParallelSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleParallelTool();
            if (toolEnabled) {
                btnParallelSpline.classList.add('active', 'btn-danger');
                btnParallelSpline.classList.remove('btn-secondary');
            } else {
                btnParallelSpline.classList.remove('active', 'btn-danger');
                btnParallelSpline.classList.add('btn-secondary');
            }
        });
        // Circularize spline tool
        const btnCircularizeSpline = document.createElement('button');
        const imgCircularizeSpline = this.bootstrapIcon('bi-rainbow', 'Circularize Spline Tool');
        const txtCircularizeSpline = document.createTextNode(' Circularize Spline Tool ');
        btnCircularizeSpline.classList.add('btn', 'btn-secondary');
        btnCircularizeSpline.replaceChildren(imgCircularizeSpline, txtCircularizeSpline);
        btnCircularizeSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleCircularizeTool();
            if (toolEnabled) {
                btnCircularizeSpline.classList.add('active', 'btn-danger');
                btnCircularizeSpline.classList.remove('btn-secondary');
            } else {
                btnCircularizeSpline.classList.remove('active', 'btn-danger');
                btnCircularizeSpline.classList.add('btn-secondary');
            }
        });
        // Minimize segment count
        const btnMinimizeSegments = document.createElement('button');
        const imgMinimizeSegments = this.bootstrapIcon('bi-binoculars', 'Minimize segment count');
        const txtMinimizeSegments = document.createTextNode(' Minimize segment count ');
        btnMinimizeSegments.classList.add('btn', 'btn-secondary');
        btnMinimizeSegments.replaceChildren(imgMinimizeSegments, txtMinimizeSegments);
        const fmtPercent = (n: number, d: number) => {
            if (n === d) return `unchanged (${n})`;
            const pct = Math.abs(100 * (1 - (n / d))).toFixed(2);
            return (n > d) ? `increased from ${d} to ${n} (+${pct}%)` : `decreased from ${d} to ${n} (-${pct}%)`;
        };
        btnMinimizeSegments.addEventListener('click', () => {
            this.railroad.splines = simplifySplines(this.railroad, this.map.getMergeLimits());
            const segmentCountAfter = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
            if (segmentCountAfter > this.originalSegmentCount) {
                btnMinimizeSegments.classList.replace('btn-secondary', 'btn-danger');
            } else if (segmentCountAfter < this.originalSegmentCount) {
                this.setTitle(`Segment count ${fmtPercent(segmentCountAfter, this.originalSegmentCount)}`);
                btnMinimizeSegments.classList.replace('btn-secondary', 'btn-success');
            }
            this.modified = true;
            this.map.refreshSplines().then(() => {
                if (segmentCountAfter < this.originalSegmentCount) {
                    this.setTitle(`Segment count ${fmtPercent(segmentCountAfter, this.originalSegmentCount)}`);
                }
            });
        });
        // Minimize segment count configuration dropdown
        const grpMinimizeSegments = document.createElement('div');
        {
            const drpMinimizeSegments = document.createElement('button');
            drpMinimizeSegments.classList.add('btn', 'btn-secondary', 'dropdown-toggle', 'dropdown-toggle-split');
            drpMinimizeSegments.setAttribute('aria-expanded', 'false');
            drpMinimizeSegments.setAttribute('data-bs-auto-close', 'outside');
            drpMinimizeSegments.setAttribute('data-bs-toggle', 'dropdown');
            const makeInput = (id: string, type: string, value: string, cb: (ev: Event) => any) => {
                const cfgInput = document.createElement('input');
                cfgInput.id = id;
                cfgInput.min = '0';
                cfgInput.step = 'any';
                cfgInput.type = type;
                cfgInput.classList.add('form-control');
                cfgInput.value = value;
                cfgInput.addEventListener('input', cb);
                return cfgInput;
            };
            const inputBearing = makeInput(
                'inputBearing',
                'number',
                String(this.map.getMergeLimits().bearing),
                (ev) => {
                    this.map.getMergeLimits().bearing = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputInclination = makeInput(
                'inputInclination',
                'number',
                String(this.map.getMergeLimits().inclination),
                (ev) => {
                    this.map.getMergeLimits().inclination = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputHorizontal = makeInput(
                'inputHorizontal',
                'number',
                String(this.map.getMergeLimits().horizontal),
                (ev) => {
                    this.map.getMergeLimits().horizontal = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const inputVertical = makeInput(
                'inputVertical',
                'number',
                String(this.map.getMergeLimits().vertical),
                (ev) => {
                    this.map.getMergeLimits().vertical = Number((ev.target as HTMLInputElement).value);
                    this.map.writeOptions();
                },
            );
            const btnDefaults = document.createElement('button');
            btnDefaults.type = 'button';
            btnDefaults.classList.add('btn', 'btn-warning');
            btnDefaults.innerText = 'Load defaults';
            btnDefaults.addEventListener('click', () => {
                inputBearing.value = '10';
                inputInclination.value = '2.5';
                inputHorizontal.value = '10';
                inputVertical.value = '1';
            });
            const wrapInput = (cfgInput: HTMLInputElement, label: string, text: string) => {
                const cfgLabel = document.createElement('label');
                cfgLabel.setAttribute('for', cfgInput.id);
                cfgLabel.classList.add('form-label');
                cfgLabel.innerText = label;
                const cfgText = document.createElement('div');
                cfgText.classList.add('form-text');
                cfgText.innerText = text;
                const frmDivOne = document.createElement('div');
                frmDivOne.classList.add('mb-3');
                frmDivOne.replaceChildren(cfgLabel, cfgInput, cfgText);
                return frmDivOne;
            };
            const frmMinimizeSegments = document.createElement('form');
            frmMinimizeSegments.classList.add('px-4', 'py-3');
            frmMinimizeSegments.replaceChildren(
                wrapInput(inputBearing, 'Bearing limit',
                    'Maximum difference between segment headings for spline merging, in degrees.'),
                wrapInput(inputInclination, 'Inclination limit',
                    'Maximum difference between segment inclinations for spline merging, in degrees.'),
                wrapInput(inputHorizontal, 'Horizontal limit',
                    'Maximum distance between control points for spline merging, in centimeters.'),
                wrapInput(inputVertical, 'Vertical limit',
                    'Maximum distance between control points for spline merging, in centimeters.'),
                btnDefaults,
            );
            const mnuMinimizeSegments = document.createElement('div');
            mnuMinimizeSegments.classList.add('dropdown-menu', 'dropdown-menu-end');
            mnuMinimizeSegments.replaceChildren(frmMinimizeSegments);
            grpMinimizeSegments.classList.add('btn-group');
            grpMinimizeSegments.replaceChildren(btnMinimizeSegments, drpMinimizeSegments, mnuMinimizeSegments);
        }
        // Map toolbar
        const mapButtons = document.createElement('div');
        mapButtons.classList.add('hstack', 'gap-2');
        mapButtons.replaceChildren(
            grpLayers,
            grpFrameList,
            grpTrees,
            btnTreeBrush,
            btnDelete,
        );
        if (railroad.splines.length > 0) {
            // Enable tools that only work for old splines
            [
                btnFlattenSpline,
                btnParallelSpline,
                grpMinimizeSegments,
            ].forEach((e) => mapButtons.appendChild(e));
        }
        if (railroad.splineTracks.length > 0) {
            // Enable tools that only work for new splines
            [
                btnCircularizeSpline,
            ].forEach((e) => mapButtons.appendChild(e));
        }
        // Frames
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('btn', 'btn-secondary');
        btnFrames.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.frames(table);
        });
        // Industries
        const btnIndustries = document.createElement('button');
        btnIndustries.textContent = 'Industries';
        btnIndustries.classList.add('btn', 'btn-secondary');
        btnIndustries.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.industries(table);
        });
        // Players
        const btnPlayers = document.createElement('button');
        btnPlayers.textContent = 'Players';
        btnPlayers.classList.add('btn', 'btn-secondary');
        btnPlayers.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.players(table);
        });
        // Spline Tracks
        const btnSplineTracks = document.createElement('button');
        btnSplineTracks.textContent = 'Spline Tracks';
        btnSplineTracks.classList.add('btn', 'btn-secondary');
        btnSplineTracks.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5', 'mb-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.splineTracks(table);
        });
        // Export
        const btnDownload = document.createElement('button');
        const imgDownload = this.bootstrapIcon('bi-download', 'Download');
        btnDownload.appendChild(imgDownload);
        btnDownload.classList.add('btn', 'btn-secondary');
        btnDownload.addEventListener('click', () => {
            const gvas = railroadToGvas(this.railroad);
            const blob = gvasToBlob(gvas);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.modified ? 'modified-' + this.filename : this.filename;
            document.body.append(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        });
        // Toggle dark mode
        const btnDark = document.createElement('button');
        btnDark.classList.add('btn', 'btn-secondary');
        btnDark.appendChild(this.bootstrapIcon('bi-lightbulb', 'Toggle dark mode'));
        btnDark.addEventListener('click', function() {
            eval('darkmode.toggleDarkMode();');
        });
        buttons.replaceChildren(btnMap, btnFrames, btnIndustries, btnPlayers, btnSplineTracks, btnDownload, btnDark);
        // Studio controls
        const studioControls = document.createElement('div');
        studioControls.classList.add('studio-controls', 'vstack', 'gap-2');
        studioControls.replaceChildren(buttons, mapButtons);
        headerElement.replaceChildren(header, studioControls);
        layers
            .map((l) => l.listener)
            .filter((item): item is (() => void) => !!item)
            .forEach((l) => l());
        // Version warning
        const saveGameVersionNumber = Number(railroad.saveGame.version);
        const showSaveVersionWarning =
            saveGameVersionNumber < OLDEST_TESTED_SAVE_GAME_VERSION ||
            saveGameVersionNumber > NEWEST_TESTED_SAVE_GAME_VERSION;
        if (showSaveVersionWarning) {
            const warning = `Warning: Save game version ${railroad.saveGame.version} has not been tested.`;
            console.log(warning);
            const headerWarning = document.createElement('h4');
            headerWarning.innerText = warning;
            headerWarning.classList.add('text-warning');
            headerElement.insertBefore(headerWarning, studioControls);
            // headerElement.replaceChildren(header, headerWarning, studioControls);
        }
        // Print world information
        const printWorldInfo = (id: string | null, action: string) => {
            if (!id) return;
            const player = railroad.players.find((p) => id.startsWith(p.id + '_'));
            if (!player) return;
            const time = id.substring(id.indexOf('_') + 1);
            console.log(`World ${action} by ${player.name} on ${time}`);
        };
        printWorldInfo(railroad.saveGame.uniqueWorldId, 'created');
        printWorldInfo(railroad.saveGame.uniqueId, 'saved');
    }

    setTitle(title: string) {
        this.header.textContent = title + ' - ' + this.filename;
    }

    private splineTracks(table: HTMLTableElement): void {
        this.setTitle('Spline Tracks');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of [
            'ID',
            'Location',
            'Start Point',
            'End Point',
            'Start Tangent',
            'End Tangent',
            'Paint style',
            'Rotation',
            'Switch State',
            'Type',
        ]) {
            const th = document.createElement('th');
            th.innerText = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        const trackCount = this.railroad.splineTracks.length;
        for (let idx = 0; idx < trackCount; idx++) {
            const track = this.railroad.splineTracks[idx];
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // ID
            let td = document.createElement('td');
            td.innerText = String(idx);
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            const setTrackLocation = (location: Vector) => track.location = location;
            td.replaceChildren(this.editVector(track.location, setTrackLocation));
            tr.appendChild(td);
            // Start point
            td = document.createElement('td');
            const setTrackStartPoint = (startPoint: Vector) => track.startPoint = startPoint;
            td.replaceChildren(this.editVector(track.startPoint, setTrackStartPoint));
            tr.appendChild(td);
            // End point
            td = document.createElement('td');
            const setTrackEndPoint = (endPoint: Vector) => track.endPoint = endPoint;
            td.replaceChildren(this.editVector(track.endPoint, setTrackEndPoint));
            tr.appendChild(td);
            // Start tangent
            td = document.createElement('td');
            const setTrackStartTangent = (startTangent: Vector) => track.startTangent = startTangent;
            td.replaceChildren(this.editVector(track.startTangent, setTrackStartTangent));
            tr.appendChild(td);
            // End tangent
            td = document.createElement('td');
            const setTrackEndTangent = (endTangent: Vector) => track.endTangent = endTangent;
            td.replaceChildren(this.editVector(track.endTangent, setTrackEndTangent));
            tr.appendChild(td);
            // Paint style
            td = document.createElement('td');
            const setTrackPaintStyle = (paintStyle: number) => track.paintStyle = paintStyle;
            td.replaceChildren(this.editNumber(track.paintStyle, {min: '0'}, setTrackPaintStyle));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            const setTrackRotation = (rotation: Rotator) => track.rotation = rotation;
            td.replaceChildren(this.editRotator(track.rotation, setTrackRotation));
            tr.appendChild(td);
            // Switch state
            td = document.createElement('td');
            const setTrackSwitchState = (switchState: number) => track.switchState = switchState;
            td.replaceChildren(this.editNumber(track.switchState, {min: '0'}, setTrackSwitchState));
            tr.appendChild(td);
            // Type
            td = document.createElement('td');
            const setTrackType = (type: GvasString) => track.type = type;
            td.replaceChildren(this.editString(track.type, setTrackType));
            tr.appendChild(td);
        }
    }

    private frames(table: HTMLTableElement): void {
        this.setTitle('Frames');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        ['Type', 'Name', 'Number', 'State'].forEach((columnHeader, i) => {
            const th = document.createElement('th');
            th.classList.add((i < 3) ? 'col-1' : 'col-auto');
            th.innerText = columnHeader;
            tr.appendChild(th);
        });
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const frame of this.railroad.frames) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Type
            let td = document.createElement('td');
            td.innerText = frame.type ? frameDefinitions[frame.type].name : '';
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            const setFrameName = (name: GvasString) => frame.name = name;
            td.appendChild(this.editString(frame.name, setFrameName));
            tr.appendChild(td);
            // Number
            td = document.createElement('td');
            const setFrameNumber = (frameNo: GvasString) => frame.number = frameNo;
            td.appendChild(this.editString(frame.number, setFrameNumber));
            tr.appendChild(td);
            // State table
            td = document.createElement('td');
            tr.appendChild(td);
            const table2 = document.createElement('table');
            table2.classList.add('table', 'mb-0');
            td.appendChild(table2);
            const tbody2 = document.createElement('tbody');
            table2.appendChild(tbody2);
            const addStat = (text: string, input: Node, title?: string, rowClass?: string) => {
                tr = document.createElement('tr');
                if (rowClass) {
                    tr.classList.add(rowClass);
                }
                td = document.createElement('td');
                td.classList.add('col-2', 'text-nowrap');
                td.innerText = text;
                if (title) td.title = title;
                tr.appendChild(td);
                td = document.createElement('td');
                td.classList.add('col-auto');
                td.appendChild(input);
                tr.appendChild(td);
                tbody2.append(tr);
            };
            // Location
            const setFrameLocation = (location: Vector) => frame.location = location;
            addStat('Location', this.editVector(frame.location, setFrameLocation));
            // Rotation
            const setFrameRotation = (rotation: Rotator) => frame.rotation = rotation;
            addStat('Rotation', this.editRotator(frame.rotation, setFrameRotation));
            // Frame state
            if (frame.type && frame.type in frameDefinitions) {
                const {max, min} = frameDefinitions[frame.type];
                const editNumericState = (frame: Frame, key: NumericFrameStateKeys) => {
                    if (typeof frame.state[key] === 'undefined') return;
                    const meta = frameStateMetadata[key];
                    if (!meta) return;
                    const maxValue = (max ? max[key] : undefined) || 0;
                    const minValue = (min ? min[key] : undefined) || 0;
                    const value = Number(frame.state[key]);
                    if (value === minValue && value === maxValue) return;
                    if (value === 0 && minValue === 1) return;
                    let c: string | undefined = undefined;
                    let tooltip: string = key;
                    if (value < minValue || value > maxValue) {
                        c = 'table-danger';
                        tooltip = `Expected ${key} to in range [${minValue}, ${maxValue}]`;
                    }
                    const options: InputTextOptions = {
                        min: String(minValue),
                        max: String(maxValue),
                        step: meta.step ? String(meta.step) : undefined,
                    };
                    const displayValue = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
                    const saveValue = (value: number) => frame.state[key] = value;
                    const formatValue = (value: number) => {
                        let result = displayValue(value);
                        if (value !== maxValue && maxValue !== 1) {
                            result += ` / ${maxValue}`;
                        }
                        if (meta.unit) {
                            result += ` ${meta.unit}`;
                        }
                        if (meta.type === 'slider') {
                            const percent = 100 * value / maxValue;
                            const display = displayValue(percent).padStart(6) + '%';
                            if (!meta.unit && (maxValue === 1 || maxValue === 100)) {
                                return display;
                            }
                            return `${display} (${result})`;
                        }
                        return result;
                    };
                    let form: Node;
                    if (!meta.type) {
                        form = this.editNumber(value, options, saveValue, formatValue);
                    } else if (meta.type === 'slider') {
                        form = this.editSlider(value, options, saveValue, formatValue);
                    } else {
                        const options: string[] = meta.type;
                        const formatNumber = (n: number) => options[n];
                        form = this.editDropdown(value, options, saveValue, formatNumber);
                    }
                    addStat(meta.name, form, tooltip, c);
                };
                // Configuration
                editNumericState(frame, 'headlightType');
                editNumericState(frame, 'paintType');
                editNumericState(frame, 'smokestackType');
                // Cab controls
                editNumericState(frame, 'regulatorValue');
                editNumericState(frame, 'reverserValue');
                editNumericState(frame, 'brakeValue');
                editNumericState(frame, 'generatorValveValue');
                editNumericState(frame, 'compressorValveValue');
                // Physical state
                editNumericState(frame, 'boilerFireTemp');
                editNumericState(frame, 'boilerFuelAmount');
                editNumericState(frame, 'boilerPressure');
                editNumericState(frame, 'boilerWaterLevel');
                editNumericState(frame, 'boilerWaterTemp');
                editNumericState(frame, 'compressorAirPressure');
                editNumericState(frame, 'sanderAmount');
                editNumericState(frame, 'tenderFuelAmount');
                editNumericState(frame, 'tenderWaterAmount');
                // Marker lights
                editNumericState(frame, 'markerLightsCenterState');
                editNumericState(frame, 'markerLightsFrontLeftState');
                editNumericState(frame, 'markerLightsFrontRightState');
                editNumericState(frame, 'markerLightsRearLeftState');
                editNumericState(frame, 'markerLightsRearRightState');
            }
            // Freight
            const freightType = frame.state.freightType;
            if (frame.type && freightType && freightType in cargoLimits[frame.type]) {
                const limit = cargoLimits[frame.type][freightType];
                const setFreight = (freight: number) => frame.state.freightAmount = freight;
                const options = {min: '0', max: String(limit)};
                addStat(`Freight (${freightType})`, this.editNumber(frame.state.freightAmount, options, setFreight));
            }
        }
    }

    private industries(table: HTMLTableElement): void {
        this.setTitle('Industries');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Industry Type', 'Inputs', 'Outputs', 'Location', 'Rotation']) {
            const th = document.createElement('th');
            th.innerText = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const industry of this.railroad.industries) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Industry type
            let td = document.createElement('td');
            const setIndustryType = (type: IndustryType) => industry.type = type;
            td.replaceChildren(this.editIndustryType(industry.type, setIndustryType));
            tr.appendChild(td);
            // Inputs
            td = document.createElement('td');
            const setIndustryInputs = (inputs: number[]) => industry.inputs = inputs as Quadruplet<number>;
            const inputLabels = industryProductInputLabels(industry.type);
            td.appendChild(this.editIndustryProducts('Input', inputLabels, industry.inputs, setIndustryInputs));
            tr.appendChild(td);
            // Outputs
            td = document.createElement('td');
            const setIndustryOutputs = (outputs: number[]) => industry.outputs = outputs as Quadruplet<number>;
            const outputLabels = industryProductOutputLabels(industry.type);
            td.appendChild(this.editIndustryProducts('Output', outputLabels, industry.outputs, setIndustryOutputs));
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            const setIndustryLocation = (location: Vector) => industry.location = location;
            td.replaceChildren(this.editVector(industry.location, setIndustryLocation));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            const setIndustryRotation = (rotation: Rotator) => industry.rotation = rotation;
            td.replaceChildren(this.editRotator(industry.rotation, setIndustryRotation));
            tr.appendChild(td);
        }
    }

    private players(table: HTMLTableElement): void {
        this.setTitle('Players');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Steam ID', 'Name', 'Money', 'XP', 'Location']) {
            const th = document.createElement('th');
            th.innerText = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const player of this.railroad.players) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // ID
            let td = document.createElement('td');
            td.innerText = String(player.id);
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            td.innerText = String(player.name);
            tr.appendChild(td);
            // Money
            td = document.createElement('td');
            td.appendChild(this.editNumber(player.money, {min: '0'}, (money) => player.money = money));
            tr.appendChild(td);
            // XP
            td = document.createElement('td');
            td.appendChild(this.editNumber(player.xp, {min: '0'}, (xp) => player.xp = xp));
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            if (player.location) {
                const setPlayerLocation = (location: Vector): Vector => player.location = location;
                td.appendChild(this.editVector(player.location, setPlayerLocation));
            }
            tr.appendChild(td);
            // Rotation
            if (player.rotation) {
                td = document.createElement('td');
                const setPlayerRotation = (r: number) => player.rotation = r;
                td.replaceChildren(this.editNumber(player.rotation, {min: '-180', max: '180'}, setPlayerRotation));
                tr.appendChild(td);
            }
        }
    }

    private bootstrapIcon(className: string, label: string) {
        const i = document.createElement('i');
        i.classList.add('bi', className);
        i.setAttribute('role', 'img');
        i.ariaLabel = label;
        return i;
    }

    private saveContext(
        input: Node,
        saveAction: () => void,
        cancelAction: () => boolean,
        formatValue: () => string,
    ): Node {
        const pre = document.createElement('pre');
        pre.innerText = formatValue();
        pre.addEventListener('click', () => {
            pre.parentElement?.replaceChildren(div);
        });
        // Save
        const btnSave = document.createElement('button');
        btnSave.classList.add('btn', 'btn-success');
        btnSave.appendChild(this.bootstrapIcon('bi-save', 'Save'));
        btnSave.addEventListener('click', () => {
            saveAction();
            this.modified = true;
            pre.innerText = formatValue();
            div.parentElement?.replaceChildren(pre);
        });
        // Cancel
        const btnCancel = document.createElement('button');
        btnCancel.classList.add('btn', 'btn-danger');
        btnCancel.appendChild(this.bootstrapIcon('bi-x-circle', 'Cancel'));
        btnCancel.addEventListener('click', () => {
            if (cancelAction()) return;
            // Close the edit control
            div.parentElement?.replaceChildren(pre);
        });
        // Layout
        const div = document.createElement('div');
        div.classList.add('hstack');
        div.replaceChildren(input, btnSave, btnCancel);
        return pre;
    }

    private editNumber(
        value: number,
        options: InputTextOptions,
        saveValue: (value: number) => void,
        customFormatValue?: (value: number) => string,
    ) {
        const formatValue = customFormatValue ? () => customFormatValue(value) : () => {
            const num = Number.isInteger(value) ? String(value) : value.toFixed(2);
            return options.max ? `${num} / ${options.max}` : num;
        };
        const input = document.createElement('input');
        input.type = 'number';
        input.classList.add('form-control');
        if (options.max) input.max = options.max;
        if (options.min) input.min = options.min;
        if (options.step) input.step = options.step;
        input.pattern = '[0-9]+';
        input.value = String(value);
        const onSaveValue = () => {
            value = Number(input.value);
            saveValue(value);
        };
        const onCancel = () => {
            if (Number(input.value) !== value) {
                // Restore the original value
                input.value = String(value);
                return true;
            }
            // Close the edit control
            return false;
        };
        return this.saveContext(input, onSaveValue, onCancel, formatValue);
    }

    private editSlider(
        value: number,
        options: InputTextOptions,
        saveValue: (value: number) => void,
        customFormatValue: (value: number) => string,
    ) {
        const formatValue = () => customFormatValue(value);
        const input = document.createElement('input');
        input.type = 'range';
        input.classList.add('form-range');
        if (options.max) input.max = options.max;
        if (options.min) input.min = options.min;
        if (options.step) input.step = options.step;
        input.value = String(value);
        const onSaveValue = () => {
            value = Number(input.value);
            saveValue(value);
        };
        const onCancel = () => {
            if (Number(input.value) !== value) {
                // Restore the original value
                input.value = String(value);
                return true;
            }
            // Close the edit control
            return false;
        };
        return this.saveContext(input, onSaveValue, onCancel, formatValue);
    }

    private editString(value: GvasString, saveValue: (value: GvasString) => void) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = 'Null';
        checkbox.checked = (value === null);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        const onSave = () => {
            value = checkbox.checked ? null : input.value;
            saveValue(value);
        };
        const onCancel = () => {
            const newValue = checkbox.checked ? null : input.value;
            if (newValue !== value) {
                // Restore the original value
                checkbox.checked = (value === null);
                input.value = value || '';
                return true;
            }
            // Close the edit control
            return false;
        };
        // Layout
        const form = document.createElement('form');
        form.replaceChildren(checkbox, input);
        const formatValue = () => gvasToString(value);
        return this.saveContext(form, onSave, onCancel, formatValue);
    }

    private editNumbers(
        labels: string[],
        value: number[],
        display: (value: number[]) => string,
        saveValue: (value: number[]) => void,
        options?: InputTextOptions,
    ) {
        const formatValue = () => display(value);
        const vstack = document.createElement('div');
        vstack.classList.add('vstack');
        const inputs: HTMLInputElement[] = [];
        value.forEach((v, i) => {
            const input = document.createElement('input');
            inputs.push(input);
            input.type = 'number';
            input.step = 'any';
            input.value = String(value[i]);
            if (options) {
                if (options.min) input.min = options.min;
                if (options.max) input.max = options.max;
            }
            input.pattern = '[0-9]+';
            input.classList.add('form-control');
            const div = document.createElement('div');
            div.classList.add('form-floating', 'mb-3');
            const label = document.createElement('label');
            label.innerText = labels[i];
            div.replaceChildren(input, label);
            vstack.appendChild(div);
        });
        const onSave = () => {
            value = inputs.map((i) => Number(i.value));
            saveValue(value);
        };
        const onCancel = () => {
            if (!value.every((v, i) => v === Number(inputs[i].value))) {
                // Restore the original values
                inputs.forEach((input, i) => input.value = String(value[i]));
                return true;
            }
            // Close the edit control
            return false;
        };
        return this.saveContext(vstack, onSave, onCancel, formatValue);
    }

    private editIndustryProducts(
        type: string,
        labels: [string, string, string, string],
        values: [number, number, number, number],
        saveValue: (value: number[]) => void,
    ): Node {
        const display = (value: number[]) => {
            const zeroPredicate = (v: number): boolean => v === 0;
            if (value.every(zeroPredicate)) return '[Empty]';
            return String(value).replace(/(,0)+$/g, '');
        };
        return this.editNumbers(labels, values, display, saveValue, {min: '0'});
    }

    private editRotator(value: Rotator, saveValue: (value: Rotator) => void) {
        const encode = (r: Rotator): number[] => [r.roll, r.yaw, r.pitch];
        const decode = (t: number[]): Rotator => ({roll: t[0], yaw: t[1], pitch: t[2]});
        const display = (t: number[]) => {
            if (t[0] === 0 && t[2] === 0) {
                return Number.isInteger(t[1]) ? String(t[1]) : t[1].toFixed(2);
            }
            return '[Rotator]';
        };
        const labels = ['roll', 'yaw', 'pitch'];
        return this.editNumbers(labels, encode(value), display, (t) => saveValue(decode(t)));
    }

    private editVector(value: Vector, saveValue: (value: Vector) => void) {
        const encode = (v: Vector): number[] => [v.x, v.y, v.z];
        const decode = (t: number[]): Vector => ({x: t[0], y: t[1], z: t[2]});
        const display = (t: number[]) => {
            const z0 = t[0] === 0;
            const z1 = t[1] === 0;
            const z2 = t[2] === 0;
            if (z0 && z1 && z2) return '{0,0,0}';
            if (z1 && z2) return (t[0] > 0) ? `X+${t[0].toFixed(2)}` : `X${t[0].toFixed(2)}`;
            if (z0 && z2) return (t[1] > 0) ? `Y+${t[1].toFixed(2)}` : `Y${t[1].toFixed(2)}`;
            if (z0 && z1) return (t[2] > 0) ? `Z+${t[2].toFixed(2)}` : `Z${t[2].toFixed(2)}`;
            if (t.every(Number.isInteger)) return `{${t[0]},${t[1]},${t[2]}}`;
            return '[Vector]';
        };
        const labels = ['x', 'y', 'z'];
        return this.editNumbers(labels, encode(value), display, (t) => saveValue(decode(t)));
    }

    private editIndustryType(type: IndustryType, saveValue: (value: IndustryType) => void): Node {
        const options: {[key: string]: string} = {};
        for (let i = 1; i < 17; i++) {
            if (i === 15) continue;
            options[String(i)] = industryName(i);
        }
        return this.editDropdown(type, options, saveValue, industryName);
    }

    private editDropdown(
        value: number,
        options: {[key: number]: string},
        saveValue: (value: number) => void,
        formatNumber: (value: number) => string,
    ): Node {
        const select = document.createElement('select');
        for (const [i, text] of Object.entries(options)) {
            const option = document.createElement('option');
            option.value = i;
            option.innerText = text;
            select.appendChild(option);
        }
        select.value = String(value);
        const onSave = () => {
            value = Number(select.value);
            saveValue(value);
        };
        const onCancel = () => {
            if (Number(select.value) !== value) {
                // Restore the original value
                select.value = String(value);
                return true;
            }
            // Close the edit control
            return false;
        };
        const formatValue = () => formatNumber(value);
        return this.saveContext(select, onSave, onCancel, formatValue);
    }
}
