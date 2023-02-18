export type GizmoDirection =
    | 'x'
    | 'y'
    | 'z'
    | 'none';

export const gizmoDirection = (e: Event): GizmoDirection => {
    const {target} = e;
    if (!(target instanceof SVGPathElement)) return 'none';
    if (target.classList.contains('x')) return 'x';
    if (target.classList.contains('y')) return 'y';
    if (target.classList.contains('z')) return 'z';
    return 'none';
};
