import {GvasString, GvasText, Vector} from './Gvas';
import {industryName, IndustryType, Railroad} from './Railroad';
import {MapLayers, RailroadMap} from './RailroadMap';
import {simplifySplines} from './splines';
import {gvasToBlob, railroadToGvas} from './exporter';

interface InputTextOptions {
    max?: string;
    min?: string;
}

/**
 * Web UI for editing a Railroad object.
 */
export class Studio {
    filename: string;
    railroad: Railroad;
    modified: boolean;
    map: RailroadMap;
    header: HTMLHeadingElement;

    constructor(filename: string, railroad: Railroad, content: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
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
            content.replaceChildren(header, studioControls, mapDiv);
            this.setTitle('Map');
        });
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
                key: 'frames',
                name: 'Frames',
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
        // Minimize segment count
        const btnReplaceSplines = document.createElement('button');
        btnReplaceSplines.textContent = 'Minimize segment count';
        btnReplaceSplines.classList.add('btn', 'btn-secondary');
        btnReplaceSplines.addEventListener('click', () => {
            const segmentCountBefore = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
            this.railroad.splines = simplifySplines(this.railroad);
            const segmentCountAfter = this.railroad.splines.reduce((a, s) => a + s.segmentsVisible.length, 0);
            if (segmentCountAfter > segmentCountBefore) {
                btnReplaceSplines.classList.replace('btn-secondary', 'btn-danger');
            } else if (segmentCountAfter < segmentCountBefore) {
                this.setTitle(`Segment count reduced from ${segmentCountBefore} to ${segmentCountAfter}`);
                btnReplaceSplines.classList.replace('btn-secondary', 'btn-success');
            }
            this.modified = true;
            setTimeout(() => this.map.refresh(), 1000);
        });
        // Delete spline tool
        const btnDeleteSpline = document.createElement('button');
        const imgDeleteSpline = document.createElement('i');
        const txtDeleteSpline = document.createTextNode(' Delete Spline Tool ');
        imgDeleteSpline.classList.add('bi', 'bi-eraser-fill');
        imgDeleteSpline.setAttribute('role', 'img');
        imgDeleteSpline.ariaLabel = 'Delete Spline Tool';
        btnDeleteSpline.classList.add('btn', 'btn-secondary');
        btnDeleteSpline.replaceChildren(imgDeleteSpline, txtDeleteSpline);
        btnDeleteSpline.addEventListener('click', () => {
            const toolEnabled = this.map.toggleDeleteTool();
            if (toolEnabled) {
                btnDeleteSpline.classList.add('active', 'btn-danger');
                btnDeleteSpline.classList.remove('btn-secondary');
            } else {
                btnDeleteSpline.classList.remove('active', 'btn-danger');
                btnDeleteSpline.classList.add('btn-secondary');
            }
        });
        // Flatten spline tool
        const btnFlattenSpline = document.createElement('button');
        const imgFlattenSpline = document.createElement('i');
        const txtFlattenSpline = document.createTextNode(' Flatten Spline Tool ');
        imgFlattenSpline.classList.add('bi', 'bi-arrows-collapse');
        imgFlattenSpline.setAttribute('role', 'img');
        imgDeleteSpline.ariaLabel = 'Flatten Spline Tool';
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
        // Map toolbar
        const mapButtons = document.createElement('div');
        mapButtons.classList.add('hstack', 'gap-2');
        mapButtons.replaceChildren(grpLayers, btnReplaceSplines, btnDeleteSpline, btnFlattenSpline);
        const mapContainer = document.createElement('div');
        mapContainer.replaceChildren(mapButtons, mapDiv);
        // Frames
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('btn', 'btn-secondary');
        btnFrames.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped', 'mt-5');
            studioControls.replaceChildren(buttons);
            content.replaceChildren(header, studioControls, table);
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
            content.replaceChildren(header, studioControls, table);
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
            content.replaceChildren(header, studioControls, table);
            this.players(table);
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
        buttons.replaceChildren(btnMap, btnFrames, btnIndustries, btnPlayers, btnDownload, btnDark);
        // Studio controls
        const studioControls = document.createElement('div');
        studioControls.classList.add('studio-controls', 'vstack', 'gap-2');
        studioControls.replaceChildren(buttons, mapButtons);
        content.replaceChildren(header, studioControls, mapDiv);
        this.map = new RailroadMap(this, mapDiv);
        layers.map((l) => l.listener)
            .filter((item): item is (() => void) => !!item)
            .forEach((l) => l());
        document.title = this.filename + ' - Railroad Studio';
        console.log(railroad);
    }

    setTitle(title: string) {
        this.header.textContent = title + ' - ' + this.filename;
    }

    frames(table: HTMLTableElement) {
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
            const pre = document.createElement('pre');
            td.appendChild(pre);
            let name: GvasText | GvasString[][] = frame.name;
            if (name && 'textFormat' in name) {
                name = name.textFormat.map((tf) => tf.values);
            }
            pre.innerText = JSON.stringify(name);
            // td.innerText = String(frame.name && 'textFormat' in frame.name ? frame.name.textFormat.map((tf)=>tf.values) : frame.name);
            tr.appendChild(td);
            // Number
            td = document.createElement('td');
            td.innerText = String(frame.number);
            tr.appendChild(td);
        }
    }

    industries(table: HTMLTableElement): void {
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

    players(table: HTMLTableElement) {
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
        }
    }

    private bootstrapIcon(className: string, label: string) {
        const i = document.createElement('i');
        i.classList.add('bi', className);
        i.setAttribute('role', 'img');
        i.ariaLabel = label;
        return i;
    }

    private editNumber(value: number, options: InputTextOptions, saveValue: (value: number) => void) {
        const span = document.createElement('span');
        span.innerText = String(value);
        span.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'number';
            if (options.max) input.max = options.max;
            if (options.min) input.min = options.min;
            input.pattern = '[0-9]+';
            input.value = String(value);
            // Save
            const btnSave = document.createElement('button');
            btnSave.classList.add('btn', 'btn-success');
            btnSave.appendChild(this.bootstrapIcon('bi-save', 'Save'));
            btnSave.addEventListener('click', () => {
                span.innerText = input.value;
                saveValue(Number(input.value));
                div.parentElement?.replaceChildren(span);
            });
            // Cancel
            const btnCancel = document.createElement('button');
            btnCancel.classList.add('btn', 'btn-danger');
            btnCancel.appendChild(this.bootstrapIcon('bi-x-circle', 'Cancel'));
            btnCancel.addEventListener('click', () => {
                if (Number(input.value) !== value) {
                    // Restore the original value
                    input.value = String(value);
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(span);
                }
            });
            // Layout
            const div = document.createElement('div');
            div.replaceChildren(input, btnSave, btnCancel);
            span.parentElement?.replaceChildren(div);
        });
        return span;
    }

    private editVector(value: Vector, saveValue: (value: Vector) => void) {
        const pre = document.createElement('pre');
        pre.innerText = JSON.stringify(value);
        pre.addEventListener('click', () => {
            const inputX = document.createElement('input');
            const inputY = document.createElement('input');
            const inputZ = document.createElement('input');
            [inputX, inputY, inputZ].forEach((input) => {
                input.type = 'string';
                input.step = 'any';
            });
            inputX.value = String(value.x);
            inputY.value = String(value.y);
            inputZ.value = String(value.z);
            // Save
            const btnSave = document.createElement('button');
            btnSave.classList.add('btn', 'btn-success');
            btnSave.appendChild(this.bootstrapIcon('bi-save', 'Save'));
            btnSave.addEventListener('click', () => {
                const newVector = {
                    x: Number(inputX.value),
                    y: Number(inputY.value),
                    z: Number(inputZ.value),
                };
                saveValue(newVector);
                div.parentElement?.replaceChildren(pre);
                pre.innerText = JSON.stringify(newVector);
            });
            // Cancel
            const btnCancel = document.createElement('button');
            btnCancel.classList.add('btn', 'btn-danger');
            btnCancel.appendChild(this.bootstrapIcon('bi-x-circle', 'Cancel'));
            btnCancel.addEventListener('click', () => {
                if (Number(inputX.value) !== value.x ||
                    Number(inputY.value) !== value.y ||
                    Number(inputZ.value) !== value.z) {
                    // Restore the original value
                    inputX.value = String(value.x);
                    inputY.value = String(value.y);
                    inputZ.value = String(value.z);
                } else {
                    // Close the edit control
                    div.parentElement?.replaceChildren(pre);
                }
            });
            // Layout
            const div = document.createElement('div');
            div.replaceChildren(inputX, inputY, inputZ, btnSave, btnCancel);
            pre.parentElement?.replaceChildren(div);
        });
        return pre;
    }

    private editIndustryType(type: IndustryType, saveValue: (value: IndustryType) => void): Node {
        // throw new Error('Method not implemented.');
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
