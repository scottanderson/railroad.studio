import {Railroad} from './Railroad';
import {Studio} from './Studio';

export class VegetationUtil {
    private readonly railroad: Railroad;
    private readonly setMapModified;
    private readonly setTitle;

    constructor(studio: Studio) {
        this.railroad = studio.railroad;
        this.setMapModified = () => studio.setMapModified();
        this.setTitle = (title: string) => studio.setTitle(title);
    }

    async plantAll() {
        const before = this.railroad.vegetation.length;
        if (before === 0) return;
        this.railroad.vegetation = [];
        this.setMapModified();
        this.setTitle(`Replanted ${before} vegetation`);
    }
}
