import {clamp} from './math';

export function createPager(
    currentPage: number,
    numItems: number,
    onPageClick: (page: number) => void,
    pageSize = 20,
    displayPages = 7,
) {
    const numPages = Math.ceil(numItems / pageSize);
    if (numPages <= 1) return;
    currentPage = clamp(currentPage, 0, numPages - 1);
    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.classList.add('pagination');
    const page = (i: number, text?: string) => {
        const li = document.createElement('li');
        li.classList.add('page-item');
        if (i === currentPage && !text) {
            li.classList.add('active');
        } else if (i < 0 || i >= numPages) {
            li.classList.add('disabled');
        }
        const a = document.createElement('a');
        a.classList.add('page-link', 'user-select-none');
        a.addEventListener('click', () => {
            currentPage = i;
            onPageClick(currentPage);
        });
        const first = i * pageSize;
        const last = Math.min(numItems, first + pageSize) - 1;
        a.textContent = text ?? `${i + 1}`;
        a.title = `${first}-${last}`;
        li.appendChild(a);
        ul.appendChild(li);
    };
    page(0, 'First');
    page(currentPage - 1, 'Prev');
    const first = Math.max(0, currentPage - Math.floor(displayPages / 2));
    const end = Math.min(numPages, first + displayPages);
    const start = Math.max(0, end - displayPages);
    for (let i = start; i < end; i++) page(i);
    page(currentPage + 1, 'Next');
    page(numPages - 1, 'Last');
    nav.appendChild(ul);
    return nav;
}
