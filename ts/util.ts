export function findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => unknown): number {
    const index = array.slice().reverse().findIndex(predicate);
    return (index >= 0) ? (array.length - 1 - index) : index;
}

export function fp32(n: number): number {
    const float = new Float32Array(1);
    float[0] = n;
    return float[0];
}
