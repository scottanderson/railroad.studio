/* exported Studio */
/* global GvasString GvasText Railroad Vector gvasToBlob railroadToGvas simplifySplines */

/**
 * Web UI for editing a Railroad object.
 */
class Studio {
    filename: string;
    railroad: Railroad;
    modified: boolean;

    constructor(filename: string, railroad: Railroad, element: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
        this.modified = false;
        const header = document.createElement('h2');
        header.innerText = 'Loaded ' + this.filename;
        const buttons = document.createElement('div');
        const btnReplaceSplines = document.createElement('button');
        btnReplaceSplines.textContent = 'Replace splines';
        btnReplaceSplines.classList.add('button');
        btnReplaceSplines.addEventListener('click', () => {
            const pre = document.createElement('pre');
            element.replaceChildren(header, buttons, pre);
            this.railroad.splines = simplifySplines(this.railroad, (data: string) => {
                pre.textContent = pre.textContent ? pre.textContent + '\n' + data : data;
            });
            this.modified = true;
        });
        const btnFrames = document.createElement('button');
        btnFrames.textContent = 'Frames';
        btnFrames.classList.add('button');
        btnFrames.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Frames';
            this.frames(table);
        });
        const btnIndustries = document.createElement('button');
        btnIndustries.textContent = 'Industries';
        btnIndustries.classList.add('button');
        btnIndustries.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Industries';
            this.industries(table);
        });
        const btnPlayers = document.createElement('button');
        btnPlayers.textContent = 'Players';
        btnPlayers.classList.add('button');
        btnPlayers.addEventListener('click', () => {
            const table = document.createElement('table');
            table.classList.add('table', 'table-striped');
            element.replaceChildren(header, buttons, table);
            header.innerText = 'Players';
            this.players(table);
        });
        const btnExport = document.createElement('button');
        btnExport.textContent = 'Export .sav file';
        btnIndustries.classList.add('button');
        btnExport.addEventListener('click', () => {
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
        const btnDark = document.createElement('button');
        btnDark.appendChild(this.bootstrapIcon('bi-lightbulb', 'Toggle dark mode'));
        btnDark.addEventListener('click', function() {
            eval('darkmode.toggleDarkMode();');
        });
        buttons.replaceChildren(btnReplaceSplines, btnFrames, btnIndustries, btnPlayers, btnExport, btnDark);
        element.replaceChildren(header, buttons);
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
