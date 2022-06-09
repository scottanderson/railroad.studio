import {Studio} from './Studio';
import {gvasToRailroad} from './importer';
import {parseGvas} from './parser';

// Expose `window.studio` in the global context for advanced users to inspect or modify application state.
interface StudioWindow extends Window { studio: Studio; }
// eslint-disable-next-line no-redeclare
declare let window: StudioWindow;

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
            .find(Boolean) || null;
    } else if (dt.files) {
        file = Array.from(dt.files)
            .find(Boolean) || null;
    }
    if (!file) return;
    handleFile(file);
}

function handleFile(file?: File): void {
    if (!file) return;
    file.arrayBuffer()
        .then((buffer) => handleArrayBuffer(buffer, file.name))
        .catch(handleError);
}

/**
 * Handler for URL load events.
 * @param {string} url
 */
function handleUrl(url: string) {
    if (url.startsWith('https://cdn.discordapp.com/attachments/')) {
        // Workaround for CORS
        url = 'https://railroad.studio/' + url.substring(27);
    }
    const filename = url.substring(url.lastIndexOf('/') + 1);
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                console.log(response);
                throw new Error(`Fetch failed: ${url} ${response.status} ${response.statusText}`);
            }
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
            titleText.textContent = 'Importing ' + filename;
            window.setTimeout(rejectOnCatch(reject, () => {
                const railroad = gvasToRailroad(gvas);
                titleText.textContent = 'Initializing ' + filename;
                window.setTimeout(rejectOnCatch(reject, () => {
                    window.studio = new Studio(filename, railroad, header, content);
                    resolve();
                }), 10);
            }), 10);
        }), 10);
    });
}

/**
 * Error handler. Prints a stack trace to the contggnt div.
 * @param {Error} error
 */
export function handleError(error: Error) {
    const title = document.createElement('h2');
    const titleText = document.createTextNode('Failed to load: ' + error);
    title.appendChild(titleText);
    const pre = document.createElement('pre');
    const preText = document.createTextNode(error.stack || '');
    pre.appendChild(preText);
    document.getElementById('content')!.replaceChildren(title, pre);
    document.getElementById('header')!.replaceChildren();
    throw error; // also print the stack trace with TypeScript mapped source links in the console
}
