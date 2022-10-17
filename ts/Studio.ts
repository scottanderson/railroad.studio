import {GvasString, Rotator, Vector} from './Gvas';
import {industryName, IndustryType, Railroad} from './Railroad';
import {MapLayers, RailroadMap} from './RailroadMap';
import {simplifySplines} from './splines';
import {gvasToBlob, railroadToGvas} from './exporter';

interface InputTextOptions {
    max?: string;
    min?: string;
}

type Triplet<T> = [T, T, T];

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
        const imgLayers = document.createElement('i');
        imgLayers.classList.add('bi', 'bi-layers');
        imgLayers.setAttribute('role', 'img');
        imgLayers.ariaLabel = 'Layers Dropdown';
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const layers: {
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
                key: 'groundworkControlPoints',
                name: 'Groundwork and Bridge Control Points',
            },
            {
                key: 'groundworks',
                name: 'Groundwork and Bridge Segments',
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
                key: 'trackControlPoints',
                name: 'Track Control Points',
            },
            {
                key: 'tracks',
                name: 'Track Segments',
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
        // Trees dropdown
        const txtTrees = document.createTextNode(' Trees ');
        const imgTrees = document.createElement('i');
        imgTrees.classList.add('bi', 'bi-tree');
        imgTrees.setAttribute('role', 'img');
        imgTrees.ariaLabel = 'Trees Dropdown';
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
        const imgTreeBrush = document.createElement('i');
        const txtTreeBrush = document.createTextNode(' Tree Brush ');
        imgTreeBrush.classList.add('bi', 'bi-tree-fill');
        imgTreeBrush.setAttribute('role', 'img');
        imgTreeBrush.ariaLabel = 'Tree Brush';
        btnTreeBrush.classList.add('btn', 'btn-secondary');
        btnTreeBrush.replaceChildren(imgTreeBrush, txtTreeBrush);
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
        const imgDelete = document.createElement('i');
        const txtDelete = document.createTextNode(' Delete Tool ');
        imgDelete.classList.add('bi', 'bi-eraser-fill');
        imgDelete.setAttribute('role', 'img');
        imgDelete.ariaLabel = 'Delete Tool';
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
        const imgFlattenSpline = document.createElement('i');
        const txtFlattenSpline = document.createTextNode(' Flatten Spline Tool ');
        imgFlattenSpline.classList.add('bi', 'bi-arrows-collapse');
        imgFlattenSpline.setAttribute('role', 'img');
        imgFlattenSpline.ariaLabel = 'Flatten Spline Tool';
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
        const imgParallelSpline = document.createElement('i');
        const txtParallelSpline = document.createTextNode(' Parallel Spline Tool ');
        imgParallelSpline.classList.add('bi', 'bi-distribute-horizontal');
        imgParallelSpline.setAttribute('role', 'img');
        imgParallelSpline.ariaLabel = 'Parallel Spline Tool';
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
        // Minimize segment count
        const btnMinimizeSegments = document.createElement('button');
        const imgMinimizeSegments = document.createElement('i');
        const txtMinimizeSegments = document.createTextNode(' Minimize segment count ');
        imgMinimizeSegments.classList.add('bi', 'bi-binoculars');
        imgMinimizeSegments.setAttribute('role', 'img');
        imgMinimizeSegments.ariaLabel = 'Minimize segment count';
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
                wrapInput(inputBearing, 'Bearing limit', 'Maximum difference between segment headings for spline merging, in degrees.'),
                wrapInput(inputInclination, 'Inclination limit', 'Maximum difference between segment inclinations for spline merging, in degrees.'),
                wrapInput(inputHorizontal, 'Horizontal limit', 'Maximum distance between control points for spline merging, in centimeters.'),
                wrapInput(inputVertical, 'Vertical limit', 'Maximum distance between control points for spline merging, in centimeters.'),
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
            grpTrees,
            btnTreeBrush,
            btnDelete,
            btnFlattenSpline,
            btnParallelSpline,
            grpMinimizeSegments,
        );
        // Frames
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('btn', 'btn-secondary');
        btnFrames.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5');
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
            table.classList.add('table', 'table-striped', 'mt-5');
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
            table.classList.add('table', 'table-striped', 'mt-5');
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
            table.classList.add('table', 'table-striped', 'mt-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(table);
            this.splineTracks(table);
        });
        // Export
        const btnDownload = document.createElement('button');
        const imgDownload = document.createElement('i');
        imgDownload.classList.add('bi', 'bi-download');
        imgDownload.setAttribute('role', 'img');
        imgDownload.ariaLabel = 'Download';
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
        document.title = this.filename + ' - Railroad Studio';
        console.log(railroad);
        // Version warning
        const saveGameVersionNumber = Number(railroad.saveGame.version);
        const showSaveVersionWarning =
            saveGameVersionNumber < OLDEST_TESTED_SAVE_GAME_VERSION ||
            saveGameVersionNumber > NEWEST_TESTED_SAVE_GAME_VERSION;
        if (showSaveVersionWarning) {
            const warning = `Warning: Save game version ${railroad.saveGame.version} has not been tested. Proceed with caution.`;
            console.log(warning);
            const headerWarning = document.createElement('h4');
            headerWarning.innerText = warning;
            headerWarning.classList.add('text-warning');
            headerElement.insertBefore(headerWarning, studioControls);
            // headerElement.replaceChildren(header, headerWarning, studioControls);
        }
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
            td.replaceChildren(this.editVector(track.location, (location) => track.location = location));
            tr.appendChild(td);
            // Start point
            td = document.createElement('td');
            td.replaceChildren(this.editVector(track.startPoint, (startPoint) => track.startPoint = startPoint));
            tr.appendChild(td);
            // End point
            td = document.createElement('td');
            td.replaceChildren(this.editVector(track.endPoint, (endPoint) => track.endPoint = endPoint));
            tr.appendChild(td);
            // Start tangent
            td = document.createElement('td');
            td.replaceChildren(this.editVector(track.startTangent, (startTangent) => track.startTangent = startTangent));
            tr.appendChild(td);
            // End tangent
            td = document.createElement('td');
            td.replaceChildren(this.editVector(track.endTangent, (endTangent) => track.endTangent = endTangent));
            tr.appendChild(td);
            // Paint style
            td = document.createElement('td');
            td.replaceChildren(this.editNumber(track.paintStyle, {min: '0'}, (paintStyle) => track.paintStyle = paintStyle));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            td.replaceChildren(this.editRotator(track.rotation, (rotation) => track.rotation = rotation));
            tr.appendChild(td);
            // Switch state
            td = document.createElement('td');
            td.replaceChildren(this.editNumber(track.switchState, {min: '0'}, (switchState) => track.switchState = switchState));
            tr.appendChild(td);
            // Type
            td = document.createElement('td');
            td.replaceChildren(this.editString(track.type, (type) => track.type = type));
            tr.appendChild(td);
        }
    }

    private frames(table: HTMLTableElement): void {
        this.setTitle('Frames');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Type', 'Name', 'Number']) {
            const th = document.createElement('th');
            th.innerText = columnHeader;
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const frame of this.railroad.frames) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Type
            let td = document.createElement('td');
            td.innerText = String(frame.type);
            tr.appendChild(td);
            // Name
            td = document.createElement('td');
            td.appendChild(this.editString(frame.name, (name) => frame.name = name));
            tr.appendChild(td);
            // Number
            td = document.createElement('td');
            td.appendChild(this.editString(frame.number, (frameNo) => frame.number = frameNo));
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            td.appendChild(this.editVector(frame.location, (location) => frame.location = location));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            td.appendChild(this.editRotator(frame.rotation, (rotation) => frame.rotation = rotation));
            tr.appendChild(td);
        }
    }

    private industries(table: HTMLTableElement): void {
        this.setTitle('Industries');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Industry Name', 'Inputs', 'Products', 'Location', 'Rotation']) {
            const th = document.createElement('th');
            th.innerText = columnHeader;
            if (['Inputs', 'Products'].includes(columnHeader)) {
                th.colSpan = 4;
            }
            tr.appendChild(th);
        }
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (const industry of this.railroad.industries) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Industry name
            let td = document.createElement('td');
            td.replaceChildren(this.editIndustryType(industry.type, (type) => industry.type = type));
            tr.appendChild(td);
            // Inputs
            industry.inputs.forEach((input, i) => {
                td = document.createElement('td');
                td.appendChild(this.editNumber(input, {min: '0'}, (input) => industry.inputs[i] = input));
                tr.appendChild(td);
            });
            // Products
            industry.outputs.forEach((output, i) => {
                td = document.createElement('td');
                td.appendChild(this.editNumber(output, {min: '0'}, (output) => industry.outputs[i] = output));
                tr.appendChild(td);
            });
            // Location
            td = document.createElement('td');
            td.replaceChildren(this.editVector(industry.location, (location) => industry.location = location));
            tr.appendChild(td);
            // Rotation
            td = document.createElement('td');
            td.replaceChildren(this.editNumber(industry.rotation.yaw, {min: '-180', max: '180'}, (yaw) => industry.rotation.yaw = yaw));
            tr.appendChild(td);
        }
    }

    private players(table: HTMLTableElement): void {
        this.setTitle('Players');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['ID', 'Name', 'Money', 'XP', 'Location']) {
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
            td.appendChild(this.editVector(player.location, (location) => player.location = location));
            tr.appendChild(td);
            // Rotation
            if (player.rotation) {
                td = document.createElement('td');
                td.replaceChildren(this.editNumber(player.rotation, {min: '-180', max: '180'}, (r) => player.rotation = r));
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

    private saveContext(input: Node, saveAction: () => void, cancelAction: () => void): Node {
        // Save
        const btnSave = document.createElement('button');
        btnSave.classList.add('btn', 'btn-success');
        btnSave.appendChild(this.bootstrapIcon('bi-save', 'Save'));
        btnSave.addEventListener('click', saveAction);
        // Cancel
        const btnCancel = document.createElement('button');
        btnCancel.classList.add('btn', 'btn-danger');
        btnCancel.appendChild(this.bootstrapIcon('bi-x-circle', 'Cancel'));
        btnCancel.addEventListener('click', cancelAction);
        // Layout
        const div = document.createElement('div');
        div.classList.add('hstack');
        div.replaceChildren(input, btnSave, btnCancel);
        return div;
    }

    private editNumber(value: number, options: InputTextOptions, saveValue: (value: number) => void) {
        const span = document.createElement('span');
        span.innerText = Number.isInteger(value) ? String(value) : value.toFixed(2);
        span.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'number';
            if (options.max) input.max = options.max;
            if (options.min) input.min = options.min;
            input.pattern = '[0-9]+';
            input.value = String(value);
            const saveAction = () => {
                value = Number(input.value);
                span.innerText = Number.isInteger(value) ? String(value) : value.toFixed(2);
                saveValue(value);
                this.modified = true;
                div.parentElement?.replaceChildren(span);
            };
            const cancelAction = () => {
                if (Number(input.value) !== value) {
                    // Restore the original value
                    input.value = String(value);
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(span);
                }
            };
            const div = this.saveContext(input, saveAction, cancelAction);
            span.parentElement?.replaceChildren(div);
        });
        return span;
    }

    private editString(value: GvasString, saveValue: (value: GvasString) => void) {
        const span = document.createElement('span');
        span.innerText = (value === null) ? '[null]' : value || '[blank]';
        span.addEventListener('click', () => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = 'Null';
            checkbox.checked = (value === null);
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            const onSave = () => {
                value = checkbox.checked ? null : input.value;
                span.innerText = (value === null) ? '[null]' : value || '[blank]';
                saveValue(value);
                this.modified = true;
                div.parentElement?.replaceChildren(span);
            };
            const onCancel = () => {
                const newValue = checkbox.checked ? null : input.value;
                if (newValue !== value) {
                    // Restore the original value
                    checkbox.checked = (value === null);
                    input.value = value || '';
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(span);
                }
            };
            // Layout
            const form = document.createElement('form');
            form.replaceChildren(checkbox, input);
            const div = this.saveContext(form, onSave, onCancel);
            span.parentElement?.replaceChildren(div);
        });
        return span;
    }

    private editThreeNumbers(
        value: Triplet<number>,
        display: (value: Triplet<number>) => string,
        saveValue: (value: Triplet<number>) => void,
    ) {
        const pre = document.createElement('pre');
        pre.innerText = display(value);
        pre.addEventListener('click', () => {
            const input0 = document.createElement('input');
            const input1 = document.createElement('input');
            const input2 = document.createElement('input');
            [input0, input1, input2].forEach((input, i) => {
                input.type = 'text';
                input.step = 'any';
                input.value = String(value[i]);
            });
            const onSave = () => {
                value = [
                    Number(input0.value),
                    Number(input1.value),
                    Number(input2.value),
                ];
                pre.innerText = display(value);
                saveValue(value);
                this.modified = true;
                div.parentElement?.replaceChildren(pre);
            };
            const onCancel = () => {
                if (Number(input0.value) !== value[0] ||
                    Number(input1.value) !== value[1] ||
                    Number(input2.value) !== value[2]) {
                    // Restore the original value
                    input0.value = String(value[0]);
                    input1.value = String(value[1]);
                    input2.value = String(value[2]);
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(pre);
                }
            };
            // Layout
            const vstack = document.createElement('div');
            vstack.classList.add('vstack');
            vstack.replaceChildren(input0, input1, input2);
            const div = this.saveContext(vstack, onSave, onCancel);
            pre.parentElement?.replaceChildren(div);
        });
        return pre;
    }

    private editRotator(value: Rotator, saveValue: (value: Rotator) => void) {
        const encode = (r: Rotator): Triplet<number> => [r.roll, r.yaw, r.pitch];
        const decode = (t: Triplet<number>) => {
            return {roll: t[0], yaw: t[1], pitch: t[2]};
        };
        const display = (t: Triplet<number>) => {
            if (t[0] === 0 && t[2] === 0) {
                return Number.isInteger(t[1]) ? String(t[1]) : t[1].toFixed(2);
            }
            return '[Rotator]';
        };
        return this.editThreeNumbers(encode(value), display, (t) => saveValue(decode(t)));
    }

    private editVector(value: Vector, saveValue: (value: Vector) => void) {
        const encode = (v: Vector): Triplet<number> => [v.x, v.y, v.z];
        const decode = (t: Triplet<number>) => {
            return {x: t[0], y: t[1], z: t[2]};
        };
        const display = (t: Triplet<number>) => {
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
        return this.editThreeNumbers(encode(value), display, (t) => saveValue(decode(t)));
    }

    private editIndustryType(type: IndustryType, saveValue: (value: IndustryType) => void): Node {
        const pre = document.createElement('pre');
        pre.innerText = industryName(type);
        pre.addEventListener('click', () => {
            const select = document.createElement('select');
            for (let i = 1; i < 15; i++) {
                const option = document.createElement('option');
                option.value = String(i);
                option.innerText = industryName(i);
                select.appendChild(option);
            }
            select.value = String(type);
            // Save
            const btnSave = document.createElement('button');
            btnSave.classList.add('btn', 'btn-success');
            btnSave.appendChild(this.bootstrapIcon('bi-save', 'Save'));
            btnSave.addEventListener('click', () => {
                const newType = Number(select.value);
                saveValue(newType);
                this.modified = true;
                div.parentElement?.replaceChildren(pre);
                pre.innerText = industryName(newType);
            });
            // Cancel
            const btnCancel = document.createElement('button');
            btnCancel.classList.add('btn', 'btn-danger');
            btnCancel.appendChild(this.bootstrapIcon('bi-x-circle', 'Cancel'));
            btnCancel.addEventListener('click', () => {
                if (Number(select.value) !== type) {
                    // Restore the original value
                    select.value = String(type);
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(pre);
                }
            });
            // Layout
            const div = document.createElement('div');
            div.replaceChildren(select, btnSave, btnCancel);
            pre.parentElement?.replaceChildren(div);
        });
        return pre;
    }
}
