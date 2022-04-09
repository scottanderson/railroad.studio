import {GvasString, GvasText, Vector} from './Gvas';
import {Railroad} from './Railroad';
import {RailroadMap} from './RailroadMap';
import {simplifySplines} from './splines';
import {gvasToBlob, railroadToGvas} from './exporter';

/**
 * Web UI for editing a Railroad object.
 */
export class Studio {
    filename: string;
    railroad: Railroad;
    modified: boolean;
    map: RailroadMap;

    constructor(filename: string, railroad: Railroad, element: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
        this.modified = false;
        const header = document.createElement('h2');
        header.textContent = 'Loaded ' + this.filename;
        const buttons = document.createElement('div');
        // Map
        const btnMap = document.createElement('button');
        btnMap.innerText = 'Map';
        btnMap.classList.add('btn', 'btn-secondary');
        const mapDiv = document.createElement('div');
        btnMap.addEventListener('click', () => {
            element.replaceChildren(header, buttons, mapButtons, mapDiv);
        });
        // Show control points
        const btnTogglePoints = document.createElement('button');
        const imgTogglePoints = document.createElement('i');
        const txtTogglePoints = document.createTextNode(' Show control points ');
        imgTogglePoints.classList.add('bi', 'bi-toggle-off');
        btnTogglePoints.classList.add('btn', 'btn-secondary');
        btnTogglePoints.replaceChildren(imgTogglePoints, txtTogglePoints);
        const togglePointsListener = (): void => {
            if (this.map.getShowControlPoints()) {
                btnTogglePoints.classList.add('active', 'btn-primary');
                btnTogglePoints.classList.remove('btn-secondary');
                imgTogglePoints.classList.replace('bi-toggle-off', 'bi-toggle-on');
                txtTogglePoints.textContent = ' Hide control points ';
            } else {
                btnTogglePoints.classList.remove('active', 'btn-primary');
                btnTogglePoints.classList.add('btn-secondary');
                imgTogglePoints.classList.replace('bi-toggle-on', 'bi-toggle-off');
                txtTogglePoints.textContent = ' Show control points ';
            }
        };
        btnTogglePoints.addEventListener('click', () => {
            this.map.toggleShowControlPoints();
            togglePointsListener();
        });
        // Show hidden segments
        const btnToggleSegments = document.createElement('button');
        const imgToggleSegments = document.createElement('i');
        const txtToggleSegments = document.createTextNode(' Show hidden segments ');
        imgToggleSegments.classList.add('bi', 'bi-toggle-off');
        btnToggleSegments.classList.add('btn', 'btn-secondary');
        btnToggleSegments.replaceChildren(imgToggleSegments, txtToggleSegments);
        const toggleSegmentsListener = () => {
            if (this.map.getShowHiddenSegments()) {
                btnToggleSegments.classList.add('active', 'btn-primary');
                btnToggleSegments.classList.remove('btn-secondary');
                imgToggleSegments.classList.replace('bi-toggle-off', 'bi-toggle-on');
                txtToggleSegments.textContent = ' Hide hidden segments ';
            } else {
                btnToggleSegments.classList.remove('active', 'btn-primary');
                btnToggleSegments.classList.add('btn-secondary');
                imgToggleSegments.classList.replace('bi-toggle-on', 'bi-toggle-off');
                txtToggleSegments.textContent = ' Show hidden segments ';
            }
        };
        btnToggleSegments.addEventListener('click', () => {
            this.map.toggleShowHiddenSegments();
            toggleSegmentsListener();
        });
        // Minimize segment count
        const btnReplaceSplines = document.createElement('button');
        btnReplaceSplines.textContent = 'Minimize segment count';
        btnReplaceSplines.classList.add('btn', 'btn-secondary');
        btnReplaceSplines.addEventListener('click', () => {
            this.railroad.splines = simplifySplines(this.railroad);
            this.modified = true;
            this.map.refresh();
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
        // Map toolbar
        const mapButtons = document.createElement('div');
        mapButtons.replaceChildren(btnTogglePoints, btnToggleSegments, btnReplaceSplines, btnDeleteSpline);
        const mapContainer = document.createElement('div');
        mapContainer.replaceChildren(mapButtons, mapDiv);
        // Frames
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('btn', 'btn-secondary');
        btnFrames.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Frames';
            this.frames(table);
        });
        // Industries
        const btnIndustries = document.createElement('button');
        btnIndustries.textContent = 'Industries';
        btnIndustries.classList.add('btn', 'btn-secondary');
        btnIndustries.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Industries';
            this.industries(table);
        });
        // Players
        const btnPlayers = document.createElement('button');
        btnPlayers.textContent = 'Players';
        btnPlayers.classList.add('btn', 'btn-secondary');
        btnPlayers.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Players';
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
        element.replaceChildren(header, buttons, mapContainer);
        this.map = new RailroadMap(this, mapDiv);
        togglePointsListener();
        toggleSegmentsListener();
        document.title = this.filename + ' - Railroad Studio';
        console.log(railroad);
    }

    frames(table: HTMLTableElement) {
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
        const industryNames: { [key: number]: string } = {};
        industryNames[1] = 'Logging Camp';
        industryNames[2] = 'Sawmill';
        industryNames[3] = 'Smelter';
        industryNames[4] = 'Ironworks';
        industryNames[5] = 'Oil Field';
        industryNames[6] = 'Refinery';
        industryNames[7] = 'Coal Mine';
        industryNames[8] = 'Iron Mine';
        industryNames[9] = 'Freight Depot';
        const thead = document.createElement('thead');
        table.appendChild(thead);
        let tr = document.createElement('tr');
        thead.appendChild(tr);
        for (const columnHeader of ['Industry Name', 'Inputs', 'Products', 'Location']) {
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
            if (industry.type > 9) continue;
            tr = document.createElement('tr');
            tbody.appendChild(tr);
            // Industry name
            let td = document.createElement('td');
            td.innerText = industryNames[industry.type];
            tr.appendChild(td);
            industry.inputs.forEach((input, i) => {
                td = document.createElement('td');
                td.appendChild(this.editNumber(input, '0', (input) => industry.inputs[i] = input));
                tr.appendChild(td);
            });
            // Products
            industry.outputs.forEach((output, i) => {
                td = document.createElement('td');
                td.appendChild(this.editNumber(output, '0', (output) => industry.outputs[i] = output));
                tr.appendChild(td);
            });
            // Location
            td = document.createElement('td');
            td.replaceChildren(this.editVector(industry.location, (location) => industry.location = location));
            tr.appendChild(td);
        }
    }

    players(table: HTMLTableElement) {
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
            td.appendChild(this.editNumber(player.money, '0', (money) => player.money = money));
            tr.appendChild(td);
            // XP
            td = document.createElement('td');
            td.appendChild(this.editNumber(player.xp, '0', (xp) => player.xp = xp));
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

    private editNumber(value: number, min: string, saveValue: (value: number) => void) {
        const span = document.createElement('span');
        span.innerText = String(value);
        span.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = min;
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
}
