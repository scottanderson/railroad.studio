import {el, icon} from './dom';

const SAVE_FOLDER = '%localappdata%\\arr\\saved\\savegames';

/**
 * Tell the person what to do with the file they just downloaded.
 * @param {string} downloaded - The name the browser saved the file under.
 * @param {string} originalFilename - The name of the file that was opened.
 */
export function showDownloadNotice(downloaded: string, originalFilename: string): void {
    document.querySelector('.studio-notice')?.remove();
    const notice = el('div', 'studio-notice card shadow');
    notice.setAttribute('role', 'status');
    const body = el('div', 'card-body');
    const close = el('button', 'btn-close float-end ms-2');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => notice.remove());
    const title = el('h6', 'card-title');
    title.append(icon('bi-check-circle-fill text-success'), ' Downloaded');
    const name = el('div', 'small font-monospace text-break mb-2', downloaded);
    const steps = el('ol', 'small ps-3 mb-2');
    const step = (...nodes: (Node | string)[]) => {
        const li = el('li');
        li.append(...nodes);
        steps.append(li);
    };
    step('Back up your original save.');
    step('Move the download into ', el('code', '', SAVE_FOLDER), '.');
    if (downloaded !== originalFilename) {
        step('To replace your existing save, rename it to ', el('code', '', originalFilename), '.');
    }
    const copy = el('button', 'btn btn-sm btn-secondary', 'Copy folder path');
    copy.type = 'button';
    copy.addEventListener('click', () => {
        navigator.clipboard.writeText(SAVE_FOLDER)
            .then(() => copy.textContent = 'Copied')
            .catch(console.error);
    });
    body.append(close, title, name, steps, copy);
    notice.append(body);
    document.body.append(notice);
}
