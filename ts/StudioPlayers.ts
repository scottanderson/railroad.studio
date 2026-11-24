import {Permission, permissionLabels} from './Permission';
import {el, icon, iconButton} from './dom';
import {Player} from './Railroad';
import {Studio} from './Studio';
import {Vector} from './Vector';
import {toFloatingPointVec} from './util';

/** Money is stored as a 32-bit float, XP as a signed 32-bit integer. Stay well inside both. */
const MAX_MONEY = 1_000_000_000;
const MAX_XP = 2_000_000_000;

type StatKey = 'money' | 'xp';

type Stat = {
    icon: string;
    integer: boolean;
    key: StatKey;
    label: string;
    max: number;
    prefix: string;
    steps: [string, number][];
};

const STATS: Stat[] = [
    {
        icon: 'bi-cash-coin',
        integer: false,
        key: 'money',
        label: 'Money',
        max: MAX_MONEY,
        prefix: '$',
        steps: [['+1k', 1e3], ['+10k', 1e4], ['+100k', 1e5]],
    },
    {
        icon: 'bi-star-fill',
        integer: true,
        key: 'xp',
        label: 'XP',
        max: MAX_XP,
        prefix: '',
        steps: [['+1k', 1e3], ['+10k', 1e4], ['+100k', 1e5]],
    },
];

type Snapshot = {
    location: Vector | undefined;
    money: number;
    permissions: boolean[] | undefined;
    rotation: number | undefined;
    xp: number;
};

/** The values each player had when the save was loaded, used for undo and for the "Edited" badge. */
const snapshots = new WeakMap<Player, Snapshot>();

type Card = {
    element: HTMLElement;
    sync: (force?: boolean) => void;
};

const numberFormat = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
const formatStat = (stat: Stat, value: number) => stat.prefix + numberFormat.format(value);
const plural = (n: number, noun: string) => `${numberFormat.format(n)} ${noun}${n === 1 ? '' : 's'}`;

let nextId = 0;
const uniqueId = (prefix: string) => `${prefix}-${nextId++}`;

/**
 * Parse an amount typed by a person. Accepts thousands separators, a leading
 * currency symbol, and k / m / b suffixes ("25k", "1.5m").
 * @param {string} text
 * @param {Stat} stat
 * @return {number | string} The parsed amount, or a message explaining why it was rejected.
 */
export function parseAmount(text: string, stat: Stat): number | string {
    const cleaned = text.replace(/[\s,$_]/g, '');
    const match = /^(\d+\.?\d*|\.\d+)([kmb])?$/i.exec(cleaned);
    if (!match) return 'Enter a number, like 25000 or 25k';
    const suffix = (match[2] ?? '').toLowerCase();
    const scale = suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : 1;
    const scaled = Number(match[1]) * scale;
    const amount = stat.integer ? Math.round(scaled) : Math.round(scaled * 100) / 100;
    if (!Number.isFinite(amount)) return 'Enter a number, like 25000 or 25k';
    if (amount > stat.max) return `The most this can hold is ${formatStat(stat, stat.max)}`;
    return amount;
}

function takeSnapshot(player: Player): Snapshot {
    return {
        location: player.location ? {...player.location} : undefined,
        money: player.money,
        permissions: player.permissions ? [...player.permissions.values] : undefined,
        rotation: player.rotation,
        xp: player.xp,
    };
}

function sameVector(a: Vector | undefined, b: Vector | undefined): boolean {
    if (!a || !b) return a === b;
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

function sameFlags(a: boolean[] | undefined, b: boolean[] | undefined): boolean {
    if (!a || !b) return a === b;
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isEdited(player: Player): boolean {
    const snap = snapshots.get(player);
    if (!snap) return false;
    return player.money !== snap.money ||
        player.xp !== snap.xp ||
        player.rotation !== snap.rotation ||
        !sameVector(player.location, snap.location) ||
        !sameFlags(player.permissions?.values, snap.permissions);
}

function restore(player: Player, players: Player[]): void {
    const snap = snapshots.get(player);
    if (!snap) return;
    player.money = snap.money;
    player.xp = snap.xp;
    player.rotation = snap.rotation;
    player.location = snap.location ? {...snap.location} : undefined;
    if (snap.permissions) {
        player.permissions = {values: [...snap.permissions]};
    } else if (!players.slice(players.indexOf(player) + 1).some((p) => p.permissions)) {
        // Only drop permissions the save did not have while no later player has some,
        // because the exporter cannot leave them out ahead of a player who has them
        player.permissions = undefined;
    }
}

function permissionLabel(i: number): string {
    return i < permissionLabels.length ? permissionLabels[i] : `Permission ${i + 1}`;
}

/**
 * An amount field that formats itself with thousands separators while idle,
 * and reports every valid keystroke through onAmount.
 * @param {Stat} stat
 * @param {function} onAmount
 * @return {object}
 */
function amountInput(stat: Stat, onAmount: (amount: number) => void) {
    const group = el('div', 'input-group');
    const addon = el('span', 'input-group-text');
    if (stat.prefix) {
        addon.textContent = stat.prefix;
    } else {
        addon.append(icon(stat.icon));
    }
    const input = el('input', 'form-control stat-input');
    input.type = 'text';
    input.inputMode = stat.integer ? 'numeric' : 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.id = uniqueId(stat.key);
    group.append(addon, input);
    const error = el('div', 'small text-danger d-none');
    error.setAttribute('role', 'alert');
    const setError = (message?: string) => {
        input.classList.toggle('is-invalid', Boolean(message));
        input.setAttribute('aria-invalid', String(Boolean(message)));
        error.classList.toggle('d-none', !message);
        error.textContent = message ?? '';
    };
    /**
     * Read the field. Returns undefined, and explains why, when it does not hold a usable amount.
     * @return {number | undefined}
     */
    const read = (): number | undefined => {
        const parsed = parseAmount(input.value, stat);
        if (typeof parsed === 'string') {
            setError(parsed);
            return;
        }
        setError();
        return parsed;
    };
    input.addEventListener('input', () => {
        if (input.value.trim() === '') return setError();
        const amount = read();
        if (typeof amount !== 'undefined') onAmount(amount);
    });
    return {error, group, input, read, setError};
}

function statField(stat: Stat, player: Player, onChange: () => void) {
    const wrapper = el('div', 'col-sm-6');
    const set = (amount: number) => {
        if (player[stat.key] === amount) return;
        player[stat.key] = amount;
        onChange();
    };
    const {error, group, input, setError} = amountInput(stat, set);
    const label = el('label', 'form-label fw-semibold mb-1', stat.label);
    label.htmlFor = input.id;
    const hint = el('div', 'small text-body-secondary player-hint');
    // Quick add buttons
    const steps = el('div', 'btn-group btn-group-sm w-100 mt-2');
    steps.setAttribute('role', 'group');
    steps.setAttribute('aria-label', `Add ${stat.label}`);
    for (const [text, amount] of stat.steps) {
        const button = el('button', 'btn btn-quiet', text);
        button.type = 'button';
        button.title = `Add ${formatStat(stat, amount)}`;
        button.addEventListener('click', () => {
            const sum = Math.min(stat.max, player[stat.key] + amount);
            set(stat.integer ? Math.round(sum) : sum);
            sync(true);
        });
        steps.append(button);
    }
    // While focused the field holds the plain number, so it is easy to retype
    let valueAtFocus = player[stat.key];
    input.addEventListener('focus', () => {
        valueAtFocus = player[stat.key];
        input.value = String(Math.round(player[stat.key] * 100) / 100);
        input.select();
    });
    input.addEventListener('blur', () => sync(true));
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            input.blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            set(valueAtFocus);
            input.blur();
        }
    });
    const sync = (force = false) => {
        const original = snapshots.get(player)?.[stat.key];
        const changed = typeof original !== 'undefined' && original !== player[stat.key];
        hint.textContent = changed ? `Was ${formatStat(stat, original)}` : '';
        if (!force && document.activeElement === input) return;
        setError();
        input.value = numberFormat.format(player[stat.key]);
    };
    wrapper.append(label, group, error, steps, hint);
    return {sync, wrapper};
}

function permissionsField(player: Player, count: number, onChange: () => void) {
    const wrapper = el('div', 'mt-3');
    const head = el('div', 'd-flex align-items-center gap-2 mb-1');
    head.append(el('span', 'fw-semibold me-auto', 'Permissions'));
    const grid = el('div', 'permission-grid');
    const inputs: HTMLInputElement[] = [];
    const size = Math.max(count, player.permissions?.values.length ?? 0);
    const write = (values: boolean[]) => {
        const permissions: Permission = {values};
        player.permissions = permissions;
        onChange();
    };
    for (let i = 0; i < size; i++) {
        const check = el('div', 'form-check form-switch mb-0');
        const input = el('input', 'form-check-input');
        input.type = 'checkbox';
        input.setAttribute('role', 'switch');
        input.id = uniqueId('permission');
        input.addEventListener('change', () => write(inputs.map((x) => x.checked)));
        const label = el('label', 'form-check-label', permissionLabel(i));
        label.htmlFor = input.id;
        check.append(input, label);
        grid.append(check);
        inputs.push(input);
    }
    for (const [text, value] of [['Allow all', true], ['Deny all', false]] as [string, boolean][]) {
        const button = el('button', 'btn btn-sm btn-link p-0 text-decoration-none', text);
        button.type = 'button';
        button.addEventListener('click', () => {
            if (inputs.every((x) => x.checked === value)) return;
            write(inputs.map(() => value));
            sync();
        });
        head.append(button);
    }
    const sync = () => inputs.forEach((input, i) => input.checked = player.permissions?.values[i] ?? false);
    wrapper.append(head, grid);
    return {sync, wrapper};
}

function positionField(player: Player, onChange: () => void) {
    const details = el('details', 'mt-3 player-position');
    details.append(el('summary', 'fw-semibold', 'Position'));
    const row = el('div', 'row g-2 mt-1');
    details.append(row);
    const field = (label: string, min?: number, max?: number) => {
        const col = el('div', 'col-6 col-md-3');
        const input = el('input', 'form-control form-control-sm');
        input.type = 'number';
        input.step = 'any';
        input.id = uniqueId('position');
        if (typeof min !== 'undefined') input.min = String(min);
        if (typeof max !== 'undefined') input.max = String(max);
        const lbl = el('label', 'form-label small text-body-secondary mb-0', label);
        lbl.htmlFor = input.id;
        col.append(lbl, input);
        row.append(col);
        return input;
    };
    const readNumber = (input: HTMLInputElement): number | undefined => {
        const n = input.value.trim() === '' ? NaN : Number(input.value);
        const valid = Number.isFinite(n) && input.validity.valid;
        input.classList.toggle('is-invalid', !valid);
        return valid ? n : undefined;
    };
    const syncs: (() => void)[] = [];
    if (player.location) {
        const axes = [field('X'), field('Y'), field('Z')];
        const onInput = () => {
            const [x, y, z] = axes.map(readNumber);
            if (typeof x === 'undefined' || typeof y === 'undefined' || typeof z === 'undefined') return;
            player.location = toFloatingPointVec({x, y, z});
            onChange();
        };
        axes.forEach((input) => input.addEventListener('input', onInput));
        syncs.push(() => {
            const {location} = player;
            if (!location) return;
            [location.x, location.y, location.z].forEach((v, i) => {
                if (document.activeElement === axes[i]) return;
                axes[i].classList.remove('is-invalid');
                axes[i].value = String(Math.round(v * 100) / 100);
            });
        });
    }
    if (typeof player.rotation !== 'undefined') {
        const input = field('Facing (°)', -180, 180);
        input.addEventListener('input', () => {
            const rotation = readNumber(input);
            if (typeof rotation === 'undefined') return;
            player.rotation = rotation;
            onChange();
        });
        syncs.push(() => {
            if (document.activeElement === input || typeof player.rotation === 'undefined') return;
            input.classList.remove('is-invalid');
            input.value = String(Math.round(player.rotation * 100) / 100);
        });
    }
    const sync = () => syncs.forEach((s) => s());
    return {details: syncs.length ? details : undefined, sync};
}

function playerCard(
    player: Player,
    players: Player[],
    isHost: boolean,
    permissionCount: number,
    onChange: () => void,
): Card {
    const name = player.name?.trim() ? player.name.trim() : 'Unnamed player';
    const id = player.id?.trim() ?? '';
    const element = el('div', 'col');
    const card = el('div', 'card player-card h-100');
    const body = el('div', 'card-body');
    card.append(body);
    element.append(card);
    // Header
    const header = el('div', 'd-flex align-items-center gap-3 mb-3');
    const avatar = el('div', 'player-avatar flex-shrink-0', (Array.from(name)[0] ?? '?').toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');
    const who = el('div', 'flex-grow-1 player-who');
    const title = el('div', 'd-flex align-items-center gap-2 flex-wrap');
    const heading = el('h5', 'mb-0 text-truncate', name);
    heading.title = name;
    title.append(heading);
    if (isHost) title.append(el('span', 'badge text-bg-info', 'Host'));
    who.append(title);
    if (id) {
        const sub = el('div', 'small text-body-secondary text-truncate');
        if (/^\d{17}$/.test(id)) {
            const link = el('a', 'link-secondary font-monospace', id);
            link.href = `https://steamcommunity.com/profiles/${id}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = 'Open Steam profile';
            sub.append('Steam ID ', link);
        } else {
            sub.append('ID ', el('span', 'font-monospace', id));
        }
        who.append(sub);
    }
    // Sits on the border of the card, so nothing moves when it appears
    const undo = iconButton('btn btn-sm btn-warning player-undo d-none', 'bi-arrow-counterclockwise', 'Undo edits');
    undo.title = `Put ${name} back the way the save had them`;
    undo.addEventListener('click', () => {
        restore(player, players);
        onChange();
        sync(true);
    });
    header.append(avatar, who);
    card.append(undo);
    body.append(header);
    // Money and XP
    const statRow = el('div', 'row g-3');
    body.append(statRow);
    const syncs: ((force?: boolean) => void)[] = [];
    for (const stat of STATS) {
        const {sync: syncStat, wrapper} = statField(stat, player, onChange);
        statRow.append(wrapper);
        syncs.push(syncStat);
    }
    // Permissions. The exporter can only leave permissions out for players at the end of the list,
    // so a player without permissions is only editable once everyone before them has some.
    const canEditPermissions = players.slice(0, players.indexOf(player)).every((p) => p.permissions);
    if (permissionCount > 0) {
        if (canEditPermissions) {
            const {sync: syncPermissions, wrapper} = permissionsField(player, permissionCount, onChange);
            body.append(wrapper);
            syncs.push(syncPermissions);
        } else {
            body.append(el('div', 'mt-3 small text-body-secondary', 'This save has no permissions for this player.'));
        }
    }
    // Position
    const {details, sync: syncPosition} = positionField(player, onChange);
    if (details) {
        body.append(details);
        syncs.push(syncPosition);
    }
    const sync = (force = false) => {
        const dirty = isEdited(player);
        undo.classList.toggle('d-none', !dirty);
        card.classList.toggle('edited', dirty);
        syncs.forEach((s) => s(force));
    };
    return {element, sync};
}

/**
 * Render the player editor. Edits are written to the railroad as they are
 * made; nothing needs to be confirmed field by field.
 * @param {Studio} studio
 * @param {HTMLElement} container
 */
export function renderPlayers(studio: Studio, container: HTMLElement): void {
    const {players, settings} = studio.railroad;
    for (const player of players) {
        if (!snapshots.has(player)) snapshots.set(player, takeSnapshot(player));
    }
    const permissionCount = Math.max(0, ...players.map((p) => p.permissions?.values.length ?? 0));
    const page = el('div', 'players-page');
    const onChange = () => {
        studio.setMapModified();
        cards.forEach((card) => card.sync());
        syncSummary();
        // A bulk result only describes the latest change
        page.querySelector('.bulk-result')?.replaceChildren();
    };
    const cards = players.map((player, i) => playerCard(
        player,
        players,
        settings.serverOwnerPlayerIndex === i && players.length > 1,
        permissionCount,
        onChange,
    ));
    // Intro, and a summary of what has been edited
    const intro = el('div', 'd-flex align-items-center gap-3 flex-wrap mb-3');
    intro.append(el('div', 'text-body-secondary me-auto',
        `${plural(players.length, 'player')} in this save. Changes apply as you type. ` +
        'When you are done, use the Download button.'));
    const summary = el('div', 'hstack gap-2 d-none');
    const summaryText = el('span', 'badge text-bg-warning');
    const btnUndoAll = iconButton('btn btn-sm btn-quiet', 'bi-arrow-counterclockwise', 'Undo all');
    btnUndoAll.title = 'Put every player back the way the save had them';
    btnUndoAll.addEventListener('click', () => {
        // Last player first, so that permissions are dropped from the end of the list
        [...players].reverse().forEach((player) => restore(player, players));
        onChange();
        cards.forEach((card) => card.sync(true));
    });
    summary.append(summaryText, btnUndoAll);
    intro.append(summary);
    const syncSummary = () => {
        const editedCount = players.filter(isEdited).length;
        summary.classList.toggle('d-none', editedCount === 0);
        summaryText.textContent = `${plural(editedCount, 'player')} edited`;
    };
    page.append(intro);
    // Everyone at once
    if (players.length > 1) {
        page.append(bulkPanel(players, permissionCount, () => {
            onChange();
            cards.forEach((card) => card.sync(true));
        }));
    }
    // Cards
    const grid = el('div', 'row row-cols-1 row-cols-lg-2 row-cols-xxl-3 g-3');
    grid.append(...cards.map((card) => card.element));
    page.append(grid);
    cards.forEach((card) => card.sync(true));
    syncSummary();
    container.replaceChildren(page);
}

function bulkPanel(players: Player[], permissionCount: number, onChange: () => void): HTMLElement {
    const panel = el('div', 'card bg-body-tertiary mb-4');
    const body = el('div', 'card-body');
    panel.append(body);
    const head = el('div', 'd-flex align-items-baseline gap-2 flex-wrap mb-2');
    head.append(
        el('h6', 'mb-0', 'Everyone at once'),
        el('span', 'small text-body-secondary', `Applies to all ${plural(players.length, 'player')}`),
    );
    const row = el('div', 'row g-3 align-items-start');
    const result = el('div', 'small text-success mt-2 bulk-result');
    result.setAttribute('role', 'status');
    body.append(head, row, result);
    for (const stat of STATS) {
        const col = el('div', 'col-md');
        const {error, group, input, read, setError} = amountInput(stat, () => undefined);
        input.placeholder = stat.integer ? 'e.g. 100k' : 'e.g. 250,000';
        const noun = stat.integer ? stat.label : stat.label.toLowerCase();
        const label = el('label', 'form-label small mb-1', `Set everyone's ${noun} to`);
        label.htmlFor = input.id;
        const apply = el('button', 'btn btn-outline-primary', 'Apply');
        apply.type = 'button';
        const run = () => {
            if (input.value.trim() === '') return setError('Enter an amount first');
            const amount = read();
            if (typeof amount === 'undefined') return;
            players.forEach((player) => player[stat.key] = amount);
            input.value = '';
            onChange();
            result.textContent = `Set ${noun} to ${formatStat(stat, amount)} for ` +
                `${plural(players.length, 'player')}.`;
        };
        apply.addEventListener('click', run);
        input.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            run();
        });
        group.append(apply);
        col.append(label, group, error);
        row.append(col);
    }
    if (permissionCount > 0) {
        const col = el('div', 'col-md-auto');
        const label = el('div', 'form-label small mb-1', 'Permissions');
        const allow = iconButton('btn btn-outline-primary', 'bi-unlock', 'Allow everything for everyone');
        allow.addEventListener('click', () => {
            // Players without stored permissions are left alone, see renderPlayers
            const withPermissions = players.filter((p) => p.permissions);
            withPermissions.forEach((p) => p.permissions = {values: (p.permissions?.values ?? []).map(() => true)});
            onChange();
            result.textContent = `Allowed everything for ${plural(withPermissions.length, 'player')}.`;
        });
        col.append(label, allow);
        row.append(col);
    }
    return panel;
}
