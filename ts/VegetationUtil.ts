import {Railroad} from './Railroad';
import {Studio} from './Studio';

export class VegetationUtil {
    private readonly railroad: Railroad;
    private readonly setMapModified;

    constructor(studio: Studio) {
        this.railroad = studio.railroad;
        this.setMapModified = () => studio.setMapModified();
    }

    async plantAll() {
        const before = this.railroad.vegetation.length;
        if (before === 0) return;
        this.railroad.vegetation = [];
        this.setMapModified();
    }
}
