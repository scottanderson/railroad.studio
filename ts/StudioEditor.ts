import {GvasString, GvasText, gvasToString} from './Gvas';
import {IndustryName, IndustryNames, IndustryType, industryNames, isIndustryName} from './industries';
import {Permission, permissionEqual, permissionLabels, permissionToString} from './Permission';
import {Quaternion} from './Quaternion';
import {Quadruplet} from './Railroad';
import {Rotator} from './Rotator';
import {SplineTrackType} from './SplineTrackType';
import {Studio} from './Studio';
import {Vector} from './Vector';
import {fp32q, fp32r, fp32v, stringToText, textToString} from './util';

export interface InputTextOptions {
    max?: string;
    min?: string;
    step?: string | undefined;
}

export function bootstrapIcon(className: string, label: string) {
    const i = document.createElement('i');
    i.classList.add('bi', className);
    i.setAttribute('role', 'img');
    i.ariaLabel = label;
    return i;
}

export function saveContext(
    studio: Studio,
    input: Node,
    saveAction: () => boolean | void,
    cancelAction: () => boolean,
    formatValue: () => string,
): [Node, () => void, () => void] {
    const pre = document.createElement('pre');
    pre.classList.add('m-0');
    pre.textContent = formatValue();
    pre.addEventListener('click', () => {
        pre.parentElement?.replaceChildren(div);
    });
    // Save
    const btnSave = document.createElement('button');
    btnSave.classList.add('btn', 'btn-success');
    btnSave.appendChild(bootstrapIcon('bi-save', 'Save'));
    const save = () => {
        const stayOpen = saveAction();
        studio.setMapModified();
        pre.textContent = formatValue();
        if (typeof stayOpen === 'boolean' && stayOpen) return;
        // Close the edit control
        div.parentElement?.replaceChildren(pre);
    };
    btnSave.addEventListener('click', save);
    // Cancel
    const btnCancel = document.createElement('button');
    btnCancel.classList.add('btn', 'btn-danger');
    btnCancel.appendChild(bootstrapIcon('bi-x-circle', 'Cancel'));
    const cancel = () => {
        if (cancelAction()) return;
        // Close the edit control
        div.parentElement?.replaceChildren(pre);
    };
    btnCancel.addEventListener('click', cancel);
    // Layout
    const div = document.createElement('div');
    div.classList.add('hstack', 'gap-2');
    div.replaceChildren(input, btnSave, btnCancel);
    return [pre, save, cancel];
}

export function editNumber(
    studio: Studio,
    value: number,
    options: InputTextOptions,
    saveValue: (value: number) => number,
    customFormatValue?: (value: number) => string,
) {
    const formatValue = customFormatValue ? () => customFormatValue(value) : () => {
        const num = Number.isInteger(value) ? String(value) : value.toFixed(2);
        return options.max ? `${num} / ${options.max}` : num;
    };
    const input = document.createElement('input');
    input.type = 'number';
    input.classList.add('form-control');
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    });
    if (options.max) input.max = options.max;
    if (options.min) input.min = options.min;
    if (options.step) input.step = options.step;
    input.pattern = '[0-9]+';
    input.value = String(value);
    const onSave = () => {
        value = Number(input.value);
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        if (Number(input.value) !== value) {
            // Restore the original value
            input.value = String(value);
            return true;
        }
        // Close the edit control
        return false;
    };
    const [pre, save, cancel] = saveContext(studio, input, onSave, onCancel, formatValue);
    return pre;
}

export function editPermissions(
    studio: Studio,
    value: Permission | undefined,
    saveValue: (value: Permission | undefined) => Permission | undefined,
) {
    const formatValue = () => permissionToString(value);
    const vstack = document.createElement('div');
    vstack.classList.add('vstack', 'gap-2');
    const inputs: HTMLInputElement[] = [];
    const fromValue: number = value?.values.length ?? 0;
    const fromKnown = permissionLabels.length;
    for (let i = 0; i < Math.max(fromValue, fromKnown); i++) {
        const hstack = document.createElement('div');
        hstack.classList.add('hstack', 'gap-2');
        const input = document.createElement('input');
        input.id = `permission${i}-${Math.random().toString(36).substr(2, 16)}`;
        input.type = 'checkbox';
        input.title = i < permissionLabels.length ? permissionLabels[i] : `Unknown permission ${i}`;
        input.checked = typeof value !== 'undefined' && value.values[i];
        input.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                save();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
            }
        });
        inputs.push(input);
        const label = document.createElement('label');
        label.setAttribute('for', input.id);
        label.innerText = input.title;
        hstack.replaceChildren(input, label);
        vstack.appendChild(hstack);
    }
    const getValue = (): Permission | undefined => {
        const values = inputs.map((input) => input.checked);
        return {values};
    };
    const onSave = () => {
        value = getValue();
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        const inputValue = getValue();
        if (inputValue !== value) {
            // Restore the original value
            inputs.forEach((input, i) => {
                input.checked = typeof value !== 'undefined' && value.values[i];
            });
            if (permissionEqual(inputValue, getValue())) {
                // No effect. Close the edit control
                return false;
            }
            return true;
        }
        // Close the edit control
        return false;
    };
    const preview = document.createElement('pre');
    preview.classList.add('mb-0');
    preview.textContent = formatValue();
    const form = document.createElement('form');
    form.classList.add('form-group', 'w-100');
    form.replaceChildren(vstack);
    const [pre, save, cancel] = saveContext(studio, form, onSave, onCancel, formatValue);
    return pre;
}

export function editSlider(
    studio: Studio,
    value: number,
    options: InputTextOptions,
    saveValue: (value: number) => number,
    customFormatValue: (value: number) => string,
) {
    const formatValue = () => customFormatValue(value);
    const input = document.createElement('input');
    input.type = 'range';
    input.classList.add('form-range');
    if (options.max) input.max = options.max;
    if (options.min) input.min = options.min;
    if (options.step) input.step = options.step;
    input.value = String(value);
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    });
    const onSave = () => {
        value = Number(input.value);
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        const inputValue = Number(input.value);
        if (inputValue !== value) {
            // Restore the original value
            input.value = String(value);
            if (inputValue === Number(input.value)) {
                // The slider was already as close as possible to the original value. Close the edit control
                return false;
            }
            updatePreview();
            return true;
        }
        // Close the edit control
        return false;
    };
    const preview = document.createElement('pre');
    preview.classList.add('mb-0');
    preview.textContent = formatValue();
    const updatePreview = () => preview.textContent = customFormatValue(Number(input.value));
    input.addEventListener('input', updatePreview);
    const form = document.createElement('form');
    form.classList.add('form-group', 'w-100');
    form.replaceChildren(preview, input);
    const [pre, save, cancel] = saveContext(studio, form, onSave, onCancel, formatValue);
    return pre;
}

export function editString(
    studio: Studio,
    value: GvasString,
    saveValue: (value: GvasString) => void,
) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.title = 'Null';
    checkbox.checked = (value === null);
    let tempValue = value ?? '';
    checkbox.addEventListener('click', () => {
        input.disabled = checkbox.checked;
        if (checkbox.checked) {
            tempValue = input.value;
            input.value = 'null';
        } else {
            input.value = tempValue;
        }
    });
    const input = document.createElement('input');
    input.type = 'text';
    input.disabled = (value === null);
    input.value = value ?? 'null';
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    });
    const onSave = () => {
        value = checkbox.checked ? null : input.value;
        saveValue(value);
    };
    const onCancel = () => {
        const newValue = checkbox.checked ? null : input.value;
        if (newValue !== value) {
            // Restore the original value
            input.disabled = checkbox.checked = (value === null);
            input.value = value ?? 'null';
            tempValue = value ?? '';
            return true;
        }
        // Close the edit control
        return false;
    };
    // Layout
    const form = document.createElement('form');
    form.replaceChildren(checkbox, input);
    const formatValue = () => gvasToString(value);
    const [pre, save, cancel] = saveContext(studio, form, onSave, onCancel, formatValue);
    return pre;
}

export function editText(
    studio: Studio,
    value: GvasText,
    saveValue: (value: GvasText) => void,
) {
    return editString(studio, textToString(value), (value) => saveValue(stringToText(value)));
}

export function editNumbers(
    studio: Studio,
    labels: string[],
    value: number[],
    display: (value: number[]) => string,
    saveValue: (value: number[]) => number[],
    options?: InputTextOptions,
) {
    const formatValue = () => display(value);
    const vstack = document.createElement('div');
    vstack.classList.add('vstack');
    const inputs: HTMLInputElement[] = [];
    value.forEach((_, i) => {
        const input = document.createElement('input');
        inputs.push(input);
        input.type = 'number';
        input.value = String(value[i]);
        input.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                save();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
            }
        });
        if (options) {
            if (options.min) input.min = options.min;
            if (options.max) input.max = options.max;
            if (options.step) input.step = options.step;
        }
        input.pattern = '[0-9]+';
        input.classList.add('form-control');
        const div = document.createElement('div');
        div.classList.add('form-floating', 'mt-1', 'mb-1');
        const label = document.createElement('label');
        label.textContent = labels[i];
        div.replaceChildren(input, label);
        vstack.appendChild(div);
    });
    const onSave = () => {
        value = inputs.map((i) => Number(i.value));
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        if (!value.every((v, i) => String(v) === inputs[i].value)) {
            // Restore the original values
            inputs.forEach((input, i) => input.value = String(value[i]));
            return true;
        }
        // Close the edit control
        return false;
    };
    const [pre, save, cancel] = saveContext(studio, vstack, onSave, onCancel, formatValue);
    return pre;
}

export function editIndustryProducts(
    studio: Studio,
    _type: string,
    labels: Quadruplet<string>,
    values: Quadruplet<number>,
    saveValue: (value: number[]) => number[],
): Node {
    const display = (value: number[]) => {
        const zeroPredicate = (v: number): boolean => v === 0;
        if (value.every(zeroPredicate)) return '[Empty]';
        return String(value).replace(/(,0)+$/g, '');
    };
    const options = {
        min: '0',
        step: '1',
    };
    return editNumbers(studio, labels, values, display, saveValue, options);
}

export function editQuaternion(
    studio: Studio,
    value: Quaternion,
    saveValue: (value: Quaternion) => Quaternion,
) {
    const encode = (v: Quaternion): number[] => [v.x, v.y, v.z, v.w];
    // eslint-disable-next-line sort-keys
    const decode = (t: number[]): Quaternion => fp32q({x: t[0], y: t[1], z: t[2], w: t[3]});
    const display = (t: number[]) => {
        const xZero = t[0] === 0;
        const yZero = t[1] === 0;
        const zZero = t[2] === 0;
        const wZero = t[3] === 0;
        if (xZero && yZero && zZero && wZero) return '0';
        if (t.every(Number.isInteger)) return `{${t[0]},${t[1]},${t[2]},${t[3]}}`;
        return '[Quaternion]';
    };
    const labels = ['x', 'y', 'z', 'w'];
    const save = (t: number[]) => encode(saveValue(decode(t)));
    return editNumbers(studio, labels, encode(value), display, save);
}

export function editRotator(
    studio: Studio,
    value: Rotator,
    saveValue: (value: Rotator) => Rotator,
) {
    const encode = (r: Rotator): number[] => [r.roll, r.yaw, r.pitch];
    // eslint-disable-next-line sort-keys
    const decode = (t: number[]): Rotator => fp32r({roll: t[0], yaw: t[1], pitch: t[2]});
    const display = (t: number[]) => {
        if (t[0] === 0 && t[2] === 0) {
            return Number.isInteger(t[1]) ? String(t[1]) : t[1].toFixed(2);
        }
        return '[Rotator]';
    };
    const labels = ['roll', 'yaw', 'pitch'];
    const save = (t: number[]) => encode(saveValue(decode(t)));
    return editNumbers(studio, labels, encode(value), display, save);
}

export function editVector(
    studio: Studio,
    value: Vector,
    saveValue: (value: Vector) => Vector,
) {
    const encode = (v: Vector): number[] => [v.x, v.y, v.z];
    const decode = (t: number[]): Vector => fp32v({x: t[0], y: t[1], z: t[2]});
    const display = (t: number[]) => {
        const xZero = t[0] === 0;
        const yZero = t[1] === 0;
        const zZero = t[2] === 0;
        if (xZero && yZero && zZero) return '0';
        if (yZero && zZero) return (t[0] > 0) ? `X+${t[0].toFixed(2)}` : `X${t[0].toFixed(2)}`;
        if (xZero && zZero) return (t[1] > 0) ? `Y+${t[1].toFixed(2)}` : `Y${t[1].toFixed(2)}`;
        if (xZero && yZero) return (t[2] > 0) ? `Z+${t[2].toFixed(2)}` : `Z${t[2].toFixed(2)}`;
        if (t.every(Number.isInteger)) return `{${t[0]},${t[1]},${t[2]}}`;
        return '[Vector]';
    };
    const labels = ['x', 'y', 'z'];
    const save = (t: number[]) => encode(saveValue(decode(t)));
    return editNumbers(studio, labels, encode(value), display, save);
}

export function editIndustryName(
    studio: Studio,
    name: IndustryName,
    saveValue: (value: IndustryName) => void,
): Node {
    const save = (value: string) => saveValue(value as IndustryName);
    return editDropdown(studio, name, industryNames, save);
}

export function editIndustryType(
    studio: Studio,
    type: IndustryType,
    saveValue: (value: IndustryType) => void,
): Node {
    const options: {[key: string]: string} = {};
    for (const key of IndustryNames) {
        options[key] = isIndustryName(key) ? industryNames[key] : key;
    }
    const save = (value: string) => saveValue(Number(value) as IndustryType);
    return editDropdown(studio, String(type), options, save);
}

export function editTrackType(
    studio: Studio,
    type: SplineTrackType,
    saveValue: (value: SplineTrackType) => unknown,
): Node {
    const options = Object.fromEntries(
        Object.values(SplineTrackType)
            .map((v) => [v, v]));
    const save = (value: string) => saveValue(value as SplineTrackType);
    return editDropdown(studio, type, options, save);
}

export function editDropdown(
    studio: Studio,
    value: string,
    options: Record<string, string>,
    saveValue: (value: string) => unknown,
): Node {
    const select = document.createElement('select');
    select.classList.add('form-select');
    for (const [value, text] of Object.entries(options)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    select.value = String(value);
    select.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    });
    const onSave = () => {
        value = select.value;
        saveValue(value);
    };
    const onCancel = () => {
        if (select.value !== value) {
            // Restore the original value
            select.value = value;
            return true;
        }
        // Close the edit control
        return false;
    };
    const formatValue = () => (options[value] || 'Unknown');
    const [pre, save, cancel] = saveContext(studio, select, onSave, onCancel, formatValue);
    return pre;
}
