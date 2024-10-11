import {Railroad} from './Railroad';
import {Studio} from './Studio';
import {gvasToRailroad} from './importer';
import {parseGvas} from './parser';
import {activateTheme} from './themes';

// Expose `window.studio` in the global context for advanced users to inspect or modify application state.
interface StudioWindow extends Window { studio: Studio; }
// eslint-disable-next-line no-redeclare
declare let window: StudioWindow;

// Set up dark mode before doing anything else
activateTheme();

// Main app entry point
window.onload = () => {
    const url = new URLSearchParams(window.location.search).get('url');
    if (url) return handleUrl(url);
    // Configure the drop area
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        ['dragenter', 'dragover'].forEach((eventName) => {
            dropArea.addEventListener(eventName, preventDefaults, false);
            dropArea.addEventListener(eventName, highlight, false);
        });
        ['dragleave', 'drop'].forEach((eventName) => {
            dropArea.addEventListener(eventName, preventDefaults, false);
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        dropArea.addEventListener('drop', handleDrop, false);
    }
    const fileElem = document.getElementById('fileElem');
    if (fileElem) {
        fileElem.addEventListener('change', handleChange, false);
    }
};

function handleChange(event: Event) {
    const fileElem = event.target as HTMLInputElement;
    if (fileElem.files && fileElem.files.length) {
        handleFile(fileElem.files[0]);
    }
}

/**
 * Prevent default handler from handling an event.
 * @param {Event} e
 */
function preventDefaults(e: Event) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Highlight the drop area.
 */
function highlight() {
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        dropArea.classList.add('highlight');
    }
}

/**
 * Un-highlight the drop area.
 */
function unhighlight() {
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        dropArea.classList.remove('highlight');
    }
}

/**
 * Handler for drop events.
 * @param {DragEvent} e
 */
function handleDrop(e: DragEvent) {
    const dt = e.dataTransfer;
    if (!dt) return;
    let file: File | null = null;
    if (dt.items) {
        file = Array.from(dt.items)
            .filter((item: DataTransferItem) => item.kind === 'file')
            .map((item: DataTransferItem) => item.getAsFile())
            .find(Boolean) ?? null;
    } else if (dt.files) {
        file = Array.from(dt.files)
            .find(Boolean) ?? null;
    }
    if (!file) return;
    handleFile(file);
}

function handleFile(file?: File): void {
    if (!file) return;
    console.log('Parsing', file);
    file.arrayBuffer()
        .then((buffer) => handleArrayBuffer(buffer, file.name))
        .catch(handleError);
}

/**
 * Handler for URL load events.
 * @param {string} url
 */
function handleUrl(url: string) {
    const filename = url.substring(url.lastIndexOf('/') + 1);
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`Fetch failed: ${url} ${response.status} ${response.statusText}`);
            }
            console.log('Parsing', response);
            return response.arrayBuffer();
        })
        .then((buffer) => handleArrayBuffer(buffer, filename))
        .catch(handleError);
}

function handleArrayBuffer(buffer: ArrayBuffer, filename: string) {
    const header = document.getElementById('header');
    if (!header) throw new Error('Missing header');
    const content = document.getElementById('content');
    if (!content) throw new Error('Missing content');
    const title = document.createElement('h2');
    const titleText = document.createTextNode('Parsing ' + filename);
    title.appendChild(titleText);
    header.replaceChildren(title);
    content.replaceChildren();
    const rejectOnCatch = (reject: (reason: unknown) => void, func: () => void) => () => {
        try {
            func();
        } catch (e) {
            reject(e);
        }
    };
    return new Promise<void>((resolve, reject) => {
        window.setTimeout(rejectOnCatch(reject, () => {
            const gvas = parseGvas(buffer);
            console.log('Parsed', gvas);
            titleText.textContent = 'Importing ' + filename;
            window.setTimeout(rejectOnCatch(reject, () => {
                const railroad = gvasToRailroad(gvas);
                titleText.textContent = 'Initializing ' + filename;
                window.setTimeout(rejectOnCatch(reject, () => {
                    // Loaded successfully, prefix filename with player save name
                    filename = updateFilename(railroad, filename);
                    // Initialize the Studio UI
                    window.studio = new Studio(filename, railroad, header, content);
                    document.title = filename + ' - Railroad Studio';
                    console.log('Imported', railroad);
                    resolve();
                }), 10);
            }), 10);
        }), 10);
    });
}

function updateFilename(railroad: Railroad, filename: string) {
    const findPlayerName = (id: string | null, action: string) => {
        if (!id) return;
        const player = railroad.players.find((p) => id.startsWith(p.id + '_'));
        if (!player) return;
        const time = id.substring(id.indexOf('_') + 1);
        console.log(`World ${action} by ${player.name} on ${time}`);
        return player.name;
    };
    findPlayerName(railroad.saveGame.uniqueWorldId, 'created');
    const playerName = findPlayerName(railroad.saveGame.uniqueId, 'saved');
    if (!playerName) return filename;
    const simplify = (s: string) => s.toLowerCase().replace(/[\s-_]/g, '');
    if (simplify(filename).includes(simplify(playerName))) return filename;
    return `${playerName.replace(/[\s-_]/g, '')}-${filename}`;
}

/**
 * Error handler. Prints a stack trace to the contggnt div.
 * @param {unknown} error
 */
export function handleError(error: unknown) {
    const title = document.createElement('h2');
    const titleText = document.createTextNode('Failed to load: ' + error);
    title.appendChild(titleText);
    const pre = document.createElement('pre');
    const stack = error && typeof error === 'object' && 'stack' in error ? String(error.stack) : undefined;
    const preText = document.createTextNode(stack ?? 'Stack trace not available');
    pre.appendChild(preText);
    document.getElementById('content')!.replaceChildren(title, pre);
    document.getElementById('header')!.replaceChildren();
    throw error; // also print the stack trace with TypeScript mapped source links in the console
}
