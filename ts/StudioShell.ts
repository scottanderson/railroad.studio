import {el, icon} from './dom';
import {toggleDarkMode} from './themes';

const COLLAPSED_KEY = 'rs.sidebar-collapsed';
const NARROW_WINDOW = 768;
const SAVE_FOLDER = '%localappdata%\\arr\\saved\\savegames';
const GITHUB_URL = 'https://github.com/scottanderson/railroad.studio';

export type SectionKey = 'map' | 'frames' | 'bulkFrames' | 'industries' | 'players' | 'props' | 'splineTracks';

type SectionInfo = {
    hint: string;
    icon: string;
    label: string;
};

/** The order the sections are listed in. */
const sectionOrder: SectionKey[] = ['map', 'frames', 'bulkFrames', 'industries', 'players', 'props', 'splineTracks'];

const sections: Record<SectionKey, SectionInfo> = {
    bulkFrames: {hint: 'Change every frame at once', icon: 'bi-ui-checks-grid', label: 'Bulk Frames'},
    frames: {hint: 'Locomotives and rolling stock', icon: 'bi-train-freight-front', label: 'Frames'},
    industries: {hint: 'Industries and facilities', icon: 'bi-buildings', label: 'Industries'},
    map: {hint: 'Tracks, rolling stock and scenery', icon: 'bi-map', label: 'Map'},
    players: {hint: 'Money, XP and permissions', icon: 'bi-people', label: 'Players'},
    props: {hint: 'Placed props', icon: 'bi-signpost-2', label: 'Props'},
    splineTracks: {hint: 'Track pieces', icon: 'bi-bezier2', label: 'Spline Tracks'},
};

export type SectionHandler = {
    count?: number | undefined;
    onSelect: () => void;
};

export type SaveState = 'none' | 'clean' | 'unsaved' | 'downloaded';

export type Sidebar = {
    /** Show which file is open, or that none is. */
    setFile: (name: string | undefined, detail: string, busy?: boolean) => void;
    setSaveState: (state: SaveState) => void;
    /** Enable the sections a save has. The first one becomes the current section. */
    setSections: (handlers: Partial<Record<SectionKey, SectionHandler>>, onDownload: () => void) => void;
};

const saveStateLabels: Record<SaveState, string> = {
    clean: 'No changes',
    downloaded: 'Changes downloaded',
    none: 'No save open',
    unsaved: 'Unsaved changes',
};

function readCollapsed(): boolean {
    try {
        const stored = localStorage.getItem(COLLAPSED_KEY);
        if (stored !== null) return stored === 'true';
    } catch (e) {
        console.log(e);
    }
    return window.innerWidth < NARROW_WINDOW;
}

function writeCollapsed(collapsed: boolean): void {
    try {
        localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch (e) {
        console.log(e);
    }
}

/**
 * A button whose text disappears when the sidebar is collapsed to icons.
 * @param {string} className
 * @param {string} iconName
 * @param {string} text
 * @return {HTMLButtonElement}
 */
function sidebarButton(className: string, iconName: string, text: string): HTMLButtonElement {
    const button = el('button', className);
    button.type = 'button';
    button.title = text;
    button.append(icon(iconName), el('span', 'sidebar-label', text));
    return button;
}

/**
 * Build the sidebar. It is part of every screen: before a save is open it
 * lists the sections that will become available.
 * @return {Sidebar}
 */
export function mountSidebar(): Sidebar {
    const element = document.getElementById('sidebar') ??
        document.body.insertBefore(el('nav', 'studio-sidebar'), document.body.firstChild);
    element.setAttribute('aria-label', 'Railroad Studio');
    document.body.classList.toggle('sidebar-collapsed', readCollapsed());
    // Brand and collapse toggle
    const head = el('div', 'sidebar-head');
    const toggle = el('button', 'btn btn-sm sidebar-toggle');
    toggle.type = 'button';
    toggle.append(icon('bi-layout-sidebar'));
    const syncToggle = () => {
        const collapsed = document.body.classList.contains('sidebar-collapsed');
        toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        toggle.setAttribute('aria-label', toggle.title);
        toggle.setAttribute('aria-expanded', String(!collapsed));
    };
    toggle.addEventListener('click', () => {
        writeCollapsed(document.body.classList.toggle('sidebar-collapsed'));
        syncToggle();
    });
    syncToggle();
    head.append(toggle, el('span', 'sidebar-brand sidebar-label', 'Railroad Studio'));
    // Which save is open
    const file = el('div', 'sidebar-file');
    const fileIcon = el('span', 'sidebar-file-icon');
    const fileName = el('div', 'sidebar-file-name');
    const fileDetail = el('div', 'small text-body-secondary');
    const fileText = el('div', 'sidebar-label sidebar-file-text');
    fileText.append(fileName, fileDetail);
    file.append(fileIcon, fileText);
    const setFile = (name: string | undefined, detail: string, busy = false) => {
        const spinner = el('span', 'spinner-border spinner-border-sm');
        spinner.setAttribute('aria-hidden', 'true');
        fileIcon.replaceChildren(busy ? spinner : icon(name ? 'bi-file-earmark-binary' : 'bi-file-earmark'));
        fileName.textContent = name ?? 'No save open';
        fileDetail.textContent = detail;
        file.title = name ? `${name} — ${detail}` : detail;
    };
    // Sections
    const list = el('ul', 'nav nav-pills flex-column sidebar-nav');
    const links: HTMLButtonElement[] = [];
    const select = (active: HTMLButtonElement) => links.forEach((link) => {
        link.classList.toggle('active', link === active);
        if (link === active) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    const addLink = (link: HTMLButtonElement) => {
        links.push(link);
        const li = el('li', 'nav-item');
        li.append(link);
        list.append(li);
    };
    // Opening a save starts over, so that nothing from the previous one lingers
    const open = sidebarButton('nav-link', 'bi-folder2-open', 'Open save');
    const openLabel = open.querySelector('.sidebar-label');
    open.addEventListener('click', () => {
        if (document.getElementById('drop-area')) return;
        window.location.assign(window.location.pathname);
    });
    addLink(open);
    list.append(el('li', 'sidebar-divider'));
    const sectionLinks = new Map<SectionKey, HTMLButtonElement>();
    const countFormat = new Intl.NumberFormat('en-US');
    let handlers: Partial<Record<SectionKey, SectionHandler>> = {};
    for (const key of sectionOrder) {
        const info = sections[key];
        const link = sidebarButton('nav-link', info.icon, info.label);
        link.append(el('span', 'sidebar-label sidebar-count'));
        link.addEventListener('click', () => {
            const handler = handlers[key];
            if (!handler) return;
            select(link);
            handler.onSelect();
        });
        sectionLinks.set(key, link);
        addLink(link);
    }
    const syncSections = (loaded: boolean) => {
        for (const key of sectionOrder) {
            const info = sections[key];
            const link = sectionLinks.get(key);
            const count = link?.querySelector('.sidebar-count');
            if (!link || !count) continue;
            const handler = handlers[key];
            link.disabled = !handler;
            count.textContent = typeof handler?.count === 'undefined' ? '' : countFormat.format(handler.count);
            if (handler) {
                link.title = `${info.label} — ${info.hint}`;
            } else {
                link.title = loaded ? `${info.label} — none in this save` : `${info.label} — open a save first`;
            }
        }
    };
    // Save state and download
    const foot = el('div', 'sidebar-foot');
    const state = el('div', 'sidebar-state small');
    state.setAttribute('role', 'status');
    const stateText = el('span', 'sidebar-label');
    state.append(el('span', 'sidebar-state-dot'), stateText);
    const download = sidebarButton('btn btn-secondary sidebar-download', 'bi-download', 'Download save');
    let onDownload: (() => void) | undefined;
    download.addEventListener('click', () => onDownload?.());
    const setSaveState = (next: SaveState) => {
        state.setAttribute('data-state', next);
        state.title = saveStateLabels[next];
        stateText.textContent = saveStateLabels[next];
        download.disabled = next === 'none';
        download.classList.toggle('btn-warning', next === 'unsaved');
        download.classList.toggle('btn-secondary', next !== 'unsaved');
        if (next === 'none') {
            download.title = 'Open a save first';
        } else if (next === 'unsaved') {
            download.title = 'Download the save file with your changes';
        } else {
            download.title = 'Download the save file';
        }
    };
    const setSections = (next: Partial<Record<SectionKey, SectionHandler>>, nextOnDownload: () => void) => {
        handlers = next;
        onDownload = nextOnDownload;
        syncSections(true);
        if (openLabel) openLabel.textContent = 'Open another save';
        open.title = 'Open another save';
        const first = sectionOrder.map((key) => handlers[key] && sectionLinks.get(key)).find(Boolean);
        if (first) select(first);
    };
    // Everything else
    const extras = el('div', 'sidebar-extras');
    const theme = sidebarButton('btn btn-sm btn-quiet', 'bi-moon-stars', 'Theme');
    theme.title = 'Toggle dark mode';
    theme.addEventListener('click', toggleDarkMode);
    const github = el('a', 'btn btn-sm btn-quiet');
    github.href = GITHUB_URL;
    github.target = '_blank';
    github.rel = 'noopener noreferrer';
    github.title = 'Railroad Studio on GitHub';
    github.append(icon('bi-github'), el('span', 'sidebar-label', 'GitHub'));
    extras.append(theme, github);
    foot.append(state, download, extras);
    // Start out with no save open
    setFile(undefined, 'Open a .sav file to begin');
    syncSections(false);
    select(open);
    setSaveState('none');
    element.replaceChildren(head, file, list, foot);
    return {setFile, setSaveState, setSections};
}

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
    const copy = el('button', 'btn btn-sm btn-quiet', 'Copy folder path');
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
