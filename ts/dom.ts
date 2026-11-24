/**
 * Create an element with a class attribute and, optionally, text content.
 * @param {string} tag
 * @param {string} className
 * @param {string} text
 * @return {HTMLElement}
 */
export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = '',
    text?: string,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text !== 'undefined') element.textContent = text;
    return element;
}

/**
 * Create a decorative Bootstrap icon, hidden from assistive technology.
 * @param {string} name - The icon class, for example 'bi-download'.
 * @return {HTMLElement}
 */
export function icon(name: string): HTMLElement {
    const i = el('i', `bi ${name}`);
    i.setAttribute('aria-hidden', 'true');
    return i;
}
