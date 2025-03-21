export {parseGvas} from './parser';
export {gvasToRailroad} from './importer';
export {Studio} from './Studio';

import {Studio} from './Studio';

// Expose `window.studio` in the global context for advanced users to inspect or modify application state.
declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        studio: Studio;
    }
}
