/* exported Studio */
/* global GvasString GvasText Railroad gvasToBlob railroadToGvas simplifySplines */

/**
 * Web UI for editing a Railroad object.
 */
class Studio {
    filename: string;
    railroad: Railroad;

    constructor(filename: string, railroad: Railroad, element: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
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
            this.filename = 'modified-' + this.filename;
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
            a.download = this.filename;
            document.body.append(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        });
        buttons.replaceChildren(btnReplaceSplines, btnFrames, btnIndustries, btnPlayers, btnExport);
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
        for (const columnHeader of ['Industry Name', 'Inputs', 'Products']) {
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
            // Inputs
            for (const input of industry.inputs) {
                td = document.createElement('td');
                td.innerText = String(input);
                tr.appendChild(td);
            }
            // Products
            for (const output of industry.outputs) {
                td = document.createElement('td');
                td.innerText = String(output);
                tr.appendChild(td);
            }
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
            td.innerText = String(player.money);
            tr.appendChild(td);
            // XP
            td = document.createElement('td');
            td.innerText = String(player.xp);
            tr.appendChild(td);
            // Location
            td = document.createElement('td');
            td.innerText = JSON.stringify(player.location);
            tr.appendChild(td);
        }
    }
}
