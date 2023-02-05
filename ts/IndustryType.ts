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

export const industryName: Record<IndustryType, string> = {
    [IndustryType.logging_camp]: 'Logging Camp',
    [IndustryType.sawmill]: 'Sawmill',
    [IndustryType.smelter]: 'Smelter',
    [IndustryType.ironworks]: 'Ironworks',
    [IndustryType.oil_field]: 'Oil Field',
    [IndustryType.refinery]: 'Refinery',
    [IndustryType.coal_mine]: 'Coal Mine',
    [IndustryType.iron_mine]: 'Iron Mine',
    [IndustryType.freight_depot]: 'Freight Depot',
    [IndustryType.firewood_camp]: 'Firewood Camp',
    [IndustryType.engine_house_lightblue]: 'Engine House (Blue)',
    [IndustryType.engine_house_gold]: 'Engine House (Gold)',
    [IndustryType.engine_house_red]: 'Engine House (Red)',
    [IndustryType.engine_house_brown]: 'Engine House (Brown)',
    [IndustryType.telegraph_office]: 'Telegraph Office',
};

type FourStrings = [string, string, string, string];
const [input2, input3, input4] = ['Input 2', 'Input 3', 'Input 4'];
const [output2, output3, output4] = ['Output 2', 'Output 3', 'Output 4'];
const input1234: FourStrings = ['Input 1', input2, input3, input4];
const output1234: FourStrings = ['Output 1', output2, output3, output4];

export const industryProductInputLabels: Record<IndustryType, FourStrings> = {
    [IndustryType.logging_camp]: input1234,
    [IndustryType.sawmill]: ['Logs', input2, input3, input4],
    [IndustryType.smelter]: ['Cordwood', 'Iron Ore', input3, input4],
    [IndustryType.ironworks]: ['Raw Iron', 'Coal', 'Lumber', input4],
    [IndustryType.oil_field]: ['Steel Pipes', 'Beams', 'Tool Crates', input4],
    [IndustryType.refinery]: ['Crude Oil', 'Lumber', 'Steel Pipes', input4],
    [IndustryType.coal_mine]: ['Beams', 'Rails', input3, input4],
    [IndustryType.iron_mine]: ['Lumber', 'Beams', input3, input4],
    [IndustryType.freight_depot]: input1234,
    [IndustryType.firewood_camp]: input1234,
    [IndustryType.engine_house_lightblue]: input1234,
    [IndustryType.engine_house_gold]: input1234,
    [IndustryType.engine_house_red]: input1234,
    [IndustryType.engine_house_brown]: input1234,
    [IndustryType.telegraph_office]: input1234,
};

export const industryProductOutputLabels: Record<IndustryType, FourStrings> = {
    [IndustryType.logging_camp]: ['Logs', 'Cordwood', output3, output4],
    [IndustryType.sawmill]: ['Lumber', 'Beams', output3, output4],
    [IndustryType.smelter]: ['Raw Iron', 'Rails', output3, output4],
    [IndustryType.ironworks]: ['Steel Pipes', 'Tool Crates', output3, output4],
    [IndustryType.oil_field]: ['Crude Oil', output2, output3, output4],
    [IndustryType.refinery]: ['Oil Barrel', output2, output3, output4],
    [IndustryType.coal_mine]: ['Coal', output2, output3, output4],
    [IndustryType.iron_mine]: ['Iron Ore', output2, output3, output4],
    [IndustryType.freight_depot]: output1234,
    [IndustryType.firewood_camp]: output1234,
    [IndustryType.engine_house_lightblue]: output1234,
    [IndustryType.engine_house_gold]: output1234,
    [IndustryType.engine_house_red]: output1234,
    [IndustryType.engine_house_brown]: output1234,
    [IndustryType.telegraph_office]: output1234,
};
