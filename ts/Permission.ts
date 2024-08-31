export interface Permission {
    values: boolean[];
}

export const permissionLabels = [
    'Build',
    'Demolish',
    'Industries and Facilities',
    'Purchase',
    'Switches',
    'Vehicles',
    'Remove Vegetation',
    'Rerail',
] as const satisfies ReadonlyArray<string>;

export function permissionToString(value?: Permission) {
    if (typeof value === 'undefined') return 'undefined';
    const {values} = value;
    if (values.every(Boolean)) return 'all';
    if (!values.some(Boolean)) return 'none';
    return values
        .map((v, i) => [v, i < permissionLabels.length ? permissionLabels[i] : `Unknown permission ${i}`])
        .filter(([v]) => v)
        .map(([, l]) => l)
        .join(', ');
}

export function permissionEqual(
    a: Permission | undefined,
    b: Permission | undefined,
): boolean {
    if (typeof a === 'undefined') return typeof b === 'undefined';
    if (typeof b === 'undefined') return false;
    if (a.values.length !== b.values.length) return false;
    return a.values.every((v, i) => v === b.values[i]);
}
