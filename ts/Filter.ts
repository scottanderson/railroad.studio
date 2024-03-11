export function createFilter<C extends string>(
    categories: readonly C[],
    labels: Record<string, string>,
    onFilter: (category: C, value: boolean) => void,
    options?: [string, string][],
    onOption?: (value: string) => void,
    checked?: { [k: string]: boolean },
    selected?: string,
) {
    const form = document.createElement('form');
    const row = document.createElement('div');
    row.classList.add('row', 'mb-3');
    categories.forEach((c: C) => {
        const col = document.createElement('div');
        col.classList.add('col-auto');
        const formCheck = document.createElement('div');
        formCheck.classList.add('form-check');
        const input = document.createElement('input');
        input.id = `filter-${c}`;
        input.type = 'checkbox';
        input.title = c;
        input.checked = (typeof checked === 'undefined') || checked[c];
        input.classList.add('form-check-input');
        input.addEventListener('click', () => {
            onFilter(c, input.checked);
        });
        formCheck.appendChild(input);
        const label = document.createElement('label');
        label.innerText = labels[c];
        label.classList.add('form-check-label');
        label.setAttribute('for', input.id);
        formCheck.appendChild(label);
        col.appendChild(formCheck);
        row.appendChild(col);
    });
    form.appendChild(row);
    if (options && onOption) {
        const select = document.createElement('select');
        select.classList.add('form-select', 'mb-3');
        for (const [value, text] of options) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        }
        select.value = options[0][0];
        if (typeof selected !== 'undefined') {
            if (options.some(([k]) => k === selected) ) {
                select.value = selected;
            } else {
                onOption(select.value);
            }
        }
        select.addEventListener('change', () => onOption(select.value));
        form.appendChild(select);
    }
    return form;
}
