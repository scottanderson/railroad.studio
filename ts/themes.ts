const LOCAL_STORAGE_KEY = 'bs.prefers-color-scheme';

export const setActiveTheme = (theme: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, theme);
    activateTheme();
};

export const getActiveTheme = () => {
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY) || 'auto';
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = preferDark ? 'dark' : 'light';
    return theme;
};

export const activateTheme = () => {
    const theme = getActiveTheme();
    document.documentElement.setAttribute('data-bs-theme', theme);
    return theme;
};

export const toggleDarkMode = (): void => {
    const activeTheme = getActiveTheme();
    const theme = activeTheme === 'dark' ? 'light' : 'dark';
    setActiveTheme(theme);
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', activateTheme);

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-bs-theme-value]')
        .forEach((toggle) => {
            toggle.addEventListener('click', () => {
                const theme = toggle.getAttribute('data-bs-theme-value');
                if (!theme) {
                    console.warn('Did not find data-bs-theme-value for', toggle);
                    return;
                }
                setActiveTheme(theme);
            });
        });
});
