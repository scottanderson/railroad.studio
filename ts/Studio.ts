import {Railroad} from 'Railroad';
import {
    gvasToBlob,
    railroadToGvas,
} from 'exporter';
import {simplifySplines} from 'splines';

/**
 * Web UI for editing a Railroad object.
 */
export class Studio {
    filename: string;
    railroad: Railroad;
    header: HTMLHeadingElement;
    pre: HTMLPreElement;

    constructor(filename: string, railroad: Railroad, element: HTMLElement) {
        this.filename = filename;
        this.railroad = railroad;
        this.header = document.createElement('h2');
        this.header.innerText = 'Loaded ' + this.filename;
        this.pre = document.createElement('pre');
        const buttons = document.createElement('div');
        const button1 = document.createElement('button');
        button1.textContent = 'Replace splines';
        button1.addEventListener('click', () => {
            this.railroad.splines = simplifySplines(this.railroad, (data: string) => {
                this.pre.textContent = this.pre.textContent ? this.pre.textContent + '\n' + data : data;
            });
            this.filename = 'modified-' + this.filename;
        });
        const button2 = document.createElement('button');
        button2.textContent = 'Export .sav file';
        button2.addEventListener('click', () => {
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
        buttons.replaceChildren(button1, button2);
        element.replaceChildren(this.header, this.pre, buttons);
        document.title = this.filename + ' - Railroad Studio';
        console.log(railroad);
    }
}
