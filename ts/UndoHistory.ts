// Inspired by https://github.com/mpkelly/undo-redo-ts/blob/2e08e76ad4ba4e6d843dedef4d20072d3bcffd6a/UndoManager.ts

export interface UndoCommand {
    undo: () => boolean;
    redo: () => boolean;
}

export class UndoHistory {
    private commands: UndoCommand[] = [];
    private index = -1;
    private limit: number;

    public constructor(limit = 0) {
        this.limit = limit;
    }

    public add(command: UndoCommand): UndoHistory {
        // Discard orphaned redo history
        this.commands = this.commands.slice(0, this.index + 1);
        // Add the new command
        this.commands.push(command);
        if (this.limit > 0 && this.commands.length > this.limit) {
            // Enforce command length limit
            this.commands.shift();
        } else {
            this.index++;
        }
        return this;
    }

    public redo(): boolean {
        if (this.index >= this.commands.length - 1) {
            console.warn('No redo command');
            return true;
        }
        if (this.commands[this.index + 1].redo()) {
            // Command success
            this.index++;
            return true;
        }
        // Command failed
        console.warn('Redo failed');
        return false;
    }

    public undo(): boolean {
        if (this.index < 0) {
            console.warn('No undo command');
            return true;
        }
        if (this.commands[this.index].undo()) {
            // Command success
            this.index--;
            return true;
        }
        // Command failed
        console.warn('Undo failed');
        return false;
    }
}
