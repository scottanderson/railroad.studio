export function createFilter<C extends string>(
    categories: readonly C[],
    labels: Record<string, string>,
    onFilter: (category: C, value: boolean) => void,
) {
    const form = document.createElement('form');
    const row = document.createElement('div');
    row.classList.add('row');
    categories.forEach((c: C) => {
        const col = document.createElement('div');
        col.classList.add('col-auto');
        const formCheck = document.createElement('div');
        formCheck.classList.add('form-check');
        const input = document.createElement('input');
        input.id = `filter-${c}`;
        input.type = 'checkbox';
        input.title = c;
        input.checked = true;
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
    return form;
}
