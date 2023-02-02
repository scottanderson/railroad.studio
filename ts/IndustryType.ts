export enum IndustryType {
    logging_camp = 1,
    sawmill = 2,
    smelter = 3,
    ironworks = 4,
    oil_field = 5,
    refinery = 6,
    coal_mine = 7,
    iron_mine = 8,
    freight_depot = 9,
    firewood_camp = 10,
    engine_house_lightblue = 11,
    engine_house_gold = 12,
    engine_house_red = 13,
    engine_house_brown = 14,
    telegraph_office = 16
}

export function industryName(type: IndustryType): string {
    switch (type) {
        case IndustryType.logging_camp:
            return 'Logging Camp';
        case IndustryType.sawmill:
            return 'Sawmill';
        case IndustryType.smelter:
            return 'Smelter';
        case IndustryType.ironworks:
            return 'Ironworks';
        case IndustryType.oil_field:
            return 'Oil Field';
        case IndustryType.refinery:
            return 'Refinery';
        case IndustryType.coal_mine:
            return 'Coal Mine';
        case IndustryType.iron_mine:
            return 'Iron Mine';
        case IndustryType.freight_depot:
            return 'Freight Depot';
        case IndustryType.firewood_camp:
            return 'Firewood Camp';
        case IndustryType.engine_house_lightblue:
            return 'Engine House (Blue)';
        case IndustryType.engine_house_gold:
            return 'Engine House (Gold)';
        case IndustryType.engine_house_red:
            return 'Engine House (Red)';
        case IndustryType.engine_house_brown:
            return 'Engine House (Brown)';
        case IndustryType.telegraph_office:
            return 'Telegraph Office';
        default:
            throw new Error(`Unknown industry ${type}`);
    }
}

export function industryProductInputLabels(type: IndustryType): [string, string, string, string] {
    switch (type) {
        case IndustryType.logging_camp:
            return ['Input 1', 'Input 2', 'Input 3', 'Input 4'];
        case IndustryType.sawmill:
            return ['Logs', 'Input 2', 'Input 3', 'Input 4'];
        case IndustryType.smelter:
            return ['Cordwood', 'Iron Ore', 'Input 3', 'Input 4'];
        case IndustryType.ironworks:
            return ['Raw Iron', 'Coal', 'Lumber', 'Input 4'];
        case IndustryType.oil_field:
            return ['Steel Pipes', 'Beams', 'Tool Crates', 'Input 4'];
        case IndustryType.refinery:
            return ['Crude Oil', 'Lumber', 'Steel Pipes', 'Input 4'];
        case IndustryType.coal_mine:
            return ['Beams', 'Rails', 'Input 3', 'Input 4'];
        case IndustryType.iron_mine:
            return ['Lumber', 'Beams', 'Input 3', 'Input 4'];
        case IndustryType.freight_depot:
        case IndustryType.firewood_camp:
        case IndustryType.engine_house_lightblue:
        case IndustryType.engine_house_gold:
        case IndustryType.engine_house_red:
        case IndustryType.engine_house_brown:
        case IndustryType.telegraph_office:
            return ['Input 1', 'Input 2', 'Input 3', 'Input 4'];
        default:
            throw new Error(`Unknown industry ${type}`);
    }
}

export function industryProductOutputLabels(type: IndustryType): [string, string, string, string] {
    switch (type) {
        case IndustryType.logging_camp:
            return ['Logs', 'Cordwood', 'Output 3', 'Output 4'];
        case IndustryType.sawmill:
            return ['Lumber', 'Beams', 'Output 3', 'Output 4'];
        case IndustryType.smelter:
            return ['Raw Iron', 'Rails', 'Output 3', 'Output 4'];
        case IndustryType.ironworks:
            return ['Steel Pipes', 'Tool Crates', 'Output 3', 'Output 4'];
        case IndustryType.oil_field:
            return ['Crude Oil', 'Output 2', 'Output 3', 'Output 4'];
        case IndustryType.refinery:
            return ['Oil Barrel', 'Output 2', 'Output 3', 'Output 4'];
        case IndustryType.coal_mine:
            return ['Coal', 'Output 2', 'Output 3', 'Output 4'];
        case IndustryType.iron_mine:
            return ['Iron Ore', 'Output 2', 'Output 3', 'Output 4'];
        case IndustryType.freight_depot:
        case IndustryType.firewood_camp:
        case IndustryType.engine_house_lightblue:
        case IndustryType.engine_house_gold:
        case IndustryType.engine_house_red:
        case IndustryType.engine_house_brown:
        case IndustryType.telegraph_office:
            return ['Output 1', 'Output 2', 'Output 3', 'Output 4'];
        default:
            throw new Error(`Unknown industry ${type}`);
    }
}
