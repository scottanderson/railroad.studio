import {Gvas} from 'Gvas';
import {Studio} from 'Studio';
import {gvasToRailroad} from 'importer';
import {parseGvas} from 'parser';

declare global {
    interface Window {
        studio: Studio;
    }
}

window.onload = () => {
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
    const handleGvas = (gvas: Gvas) => {
        const railroad = gvasToRailroad(gvas);
        const content = document.getElementById('content');
        if (!content) throw new Error('Missing content');
        window.studio = new Studio(file.name, railroad, content);
    };
    file.arrayBuffer()
        .then(parseGvas)
        .then(handleGvas)
        .catch(handleError);
}

/**
 * Error handler. Prints a stack trace to the content div.
 * @param {Error} error
 */
function handleError(error: Error) {
    const title = document.createElement('h2');
    const titleText = document.createTextNode('Failed to load: ' + error);
    title.appendChild(titleText);
    const pre = document.createElement('pre');
    const preText = document.createTextNode(error.stack || '');
    pre.appendChild(preText);
    document.getElementById('content')!.replaceChildren(title, pre);
    throw error; // also print the stack trace with TypeScript mapped source links in the console
}
