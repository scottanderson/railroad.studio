interface Command {
    name: string;
    action: () => boolean;
}

export class HotkeyManager {
    private static instance: HotkeyManager;

    private commands = new Map<string, Command>();

    public static getInstance() {
        if (!HotkeyManager.instance) {
            HotkeyManager.instance = new HotkeyManager();
        }
        return HotkeyManager.instance;
    }

    private constructor() {
        document.addEventListener('keyup', (e) => {
            const identifier = getEventIdentifier(e);
            const command = this.commands.get(identifier);
            if (!command) return;
            e.preventDefault();
            if (command.action()) return;
            console.warn(`Command ${command.name} (${identifier}) failed`);
        });
    }

    public register(identifier: string, command: Command): boolean {
        const conflict = this.commands.get(identifier);
        if (conflict) {
            console.warn(`Hotkey conflict: ${identifier} already registered to ${conflict.name}`);
            return false;
        }
        this.commands.set(identifier, command);
        console.log(`Registered ${command.name} to ${identifier}`);
        return true;
    }

    // public unregister(identifier: string): boolean {
    //     return this.commands.delete(identifier);
    // }

    // public getRegisteredIdentifiers() {
    //     return this.commands.keys();
    // }

    // public getRegisteredCommand(identifier: string): string | undefined {
    //     return this.commands.get(identifier)?.name;
    // }
}

function getEventIdentifier(e: KeyboardEvent) {
    const identifiers: string[] = [];
    if (e.altKey) identifiers.push('alt');
    if (e.ctrlKey) identifiers.push('ctrl');
    if (e.metaKey) identifiers.push('meta');
    if (e.shiftKey) identifiers.push('shift');
    identifiers.push(e.key === 'Control' ? 'ctrl' : e.key.trim().toLowerCase());
    return identifiers
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(' ');
}
