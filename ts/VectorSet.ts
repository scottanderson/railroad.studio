import {Vector} from './Vector';

export class VectorSet {
    private readonly vectors: Set<string>;

    constructor(vectors: Vector[]) {
        this.vectors = new Set(vectors.map(vectorToString));
    }

    add(vector: Vector) {
        this.vectors.add(vectorToString(vector));
    }

    clear() {
        this.vectors.clear();
    }

    delete(vector: Vector) {
        this.vectors.delete(vectorToString(vector));
    }

    has(vector: Vector): boolean {
        return this.vectors.has(vectorToString(vector));
    }

    size(): number {
        return this.vectors.size;
    }
}

function vectorToString(v: Vector): string {
    const getHex = (i: number) => i.toString(16).padStart(2, '0');
    const float = new Float32Array([v.x, v.y, v.z]);
    const view = new DataView(float.buffer);
    return Array(view.byteLength)
        .fill(null)
        .map((_, i) => getHex(view.getUint8(i)))
        .join('');
}
