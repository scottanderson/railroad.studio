import {PathArrayAlias, PathCommand} from '@svgdotjs/svg.js';
import {arrow, circle, combine, polyRect, polyRectRel, rect, rectAbs, rotatedRect} from './util-path';
import {Industry} from './Railroad';

export type IndustryTypeNew =
    | IndustryType
    | string;

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
    coaling_tower = 15,
    telegraph_office = 16,
    water_tower_a_red = 20,
    water_tower_a_brown = 21,
    water_tower_a_beige = 22,
    water_tower_a_old = 23,
    water_tower_b_red = 30,
    water_tower_b_brown = 31,
    water_tower_b_beige = 32,
    water_tower_b_old = 33,
    large_engine_house_red = 40,
    large_engine_house_brown = 41,
    large_engine_house_beige = 42,
    large_engine_house_old = 43,
    wood_rick = 44,
}

export function getIndustryType(industry: Industry): IndustryType {
    if (typeof industry.type === 'number') {
        return industry.type;
    }
    switch (industry.type.toLocaleLowerCase()) {
        case 'logcamp': return IndustryType.logging_camp;
        case 'sawmill': return IndustryType.sawmill;
        case 'smelter': return IndustryType.smelter;
        case 'ironworks': return IndustryType.ironworks;
        case 'oilfield': return IndustryType.oil_field;
        case 'refinery': return IndustryType.refinery;
        case 'coalmine': return IndustryType.coal_mine;
        case 'ironoremine': return IndustryType.iron_mine;
        case 'freightdepot': return IndustryType.freight_depot;
        case 'firewooddepot': return IndustryType.firewood_camp;
        // case 'enginehouse_???': return IndustryType.engine_house_lightblue;
        case 'enginehouse_aspen_gold': return IndustryType.engine_house_gold;
        case 'enginehouse_barn_red': return IndustryType.engine_house_red;
        case 'enginehouse_princes_mineral_brown': return IndustryType.engine_house_brown;
        case 'coaltower': return IndustryType.coaling_tower;
        case 'telegraphoffice': return IndustryType.telegraph_office;
        // case 'watertower_???': return IndustryType.water_tower_a_red;
        // case 'watertower_???': return IndustryType.water_tower_a_brown;
        // case 'watertower_???': return IndustryType.water_tower_a_beige;
        // case 'watertower_???': return IndustryType.water_tower_a_old;
        // case 'watertower_???': return IndustryType.water_tower_b_red;
        // case 'watertower_???': return IndustryType.water_tower_b_brown;
        // case 'watertower_???': return IndustryType.water_tower_b_beige;
        // case 'watertower_???': return IndustryType.water_tower_b_old;
        case 'watertower_drgw':
        case 'watertower_kanaskat_style2':
        case 'watertower_1870_style2':
        case 'watertower_1870_style3':
        case 'watertower_1870_style4':
            return IndustryType.water_tower_a_beige; // ???
        // case 'engineshed_?': return IndustryType.large_engine_house_red;
        // case 'engineshed_?': return IndustryType.large_engine_house_brown;
        // case 'engineshed_?': return IndustryType.large_engine_house_beige;
        // case 'engineshed_?': return IndustryType.large_engine_house_old;
        case 'engineshed_style2':
            return IndustryType.large_engine_house_beige; // ??
        case 'woodrick': return IndustryType.wood_rick;
        case 'wheatfarm': return IndustryType.wood_rick; // FIXME
    }
    throw new Error(`Unknown industry type: ${industry.type}`);
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
    [IndustryType.coaling_tower]: 'Coaling Tower',
    [IndustryType.telegraph_office]: 'Telegraph Office',
    [IndustryType.water_tower_a_red]: 'Water Tower A (Red)',
    [IndustryType.water_tower_a_brown]: 'Water Tower A (Brown)',
    [IndustryType.water_tower_a_beige]: 'Water Tower A (Beige)',
    [IndustryType.water_tower_a_old]: 'Water Tower A (Old)',
    [IndustryType.water_tower_b_red]: 'Water Tower B (Red)',
    [IndustryType.water_tower_b_brown]: 'Water Tower B (Brown)',
    [IndustryType.water_tower_b_beige]: 'Water Tower B (Beige)',
    [IndustryType.water_tower_b_old]: 'Water Tower B (Old)',
    [IndustryType.large_engine_house_red]: 'Large Engine House (Red)',
    [IndustryType.large_engine_house_brown]: 'Large Engine House (Brown)',
    [IndustryType.large_engine_house_beige]: 'Large Engine House (Beige)',
    [IndustryType.large_engine_house_old]: 'Large Engine House (Old)',
    [IndustryType.wood_rick]: 'Wood Rick',
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
    [IndustryType.refinery]: ['Crude Oil', 'Steel Pipes', 'Lumber', input4],
    [IndustryType.coal_mine]: ['Beams', 'Rails', input3, input4],
    [IndustryType.iron_mine]: ['Lumber', 'Beams', input3, input4],
    [IndustryType.freight_depot]: input1234,
    [IndustryType.firewood_camp]: input1234,
    [IndustryType.engine_house_lightblue]: input1234,
    [IndustryType.engine_house_gold]: input1234,
    [IndustryType.engine_house_red]: input1234,
    [IndustryType.engine_house_brown]: input1234,
    [IndustryType.coaling_tower]: input1234,
    [IndustryType.telegraph_office]: input1234,
    [IndustryType.water_tower_a_red]: input1234,
    [IndustryType.water_tower_a_brown]: input1234,
    [IndustryType.water_tower_a_beige]: input1234,
    [IndustryType.water_tower_a_old]: input1234,
    [IndustryType.water_tower_b_red]: input1234,
    [IndustryType.water_tower_b_brown]: input1234,
    [IndustryType.water_tower_b_beige]: input1234,
    [IndustryType.water_tower_b_old]: input1234,
    [IndustryType.large_engine_house_red]: input1234,
    [IndustryType.large_engine_house_brown]: input1234,
    [IndustryType.large_engine_house_beige]: input1234,
    [IndustryType.large_engine_house_old]: input1234,
    [IndustryType.wood_rick]: input1234,
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
    [IndustryType.coaling_tower]: output1234,
    [IndustryType.telegraph_office]: output1234,
    [IndustryType.water_tower_a_red]: output1234,
    [IndustryType.water_tower_a_brown]: output1234,
    [IndustryType.water_tower_a_beige]: output1234,
    [IndustryType.water_tower_a_old]: output1234,
    [IndustryType.water_tower_b_red]: output1234,
    [IndustryType.water_tower_b_brown]: output1234,
    [IndustryType.water_tower_b_beige]: output1234,
    [IndustryType.water_tower_b_old]: output1234,
    [IndustryType.large_engine_house_red]: output1234,
    [IndustryType.large_engine_house_brown]: output1234,
    [IndustryType.large_engine_house_beige]: output1234,
    [IndustryType.large_engine_house_old]: output1234,
    [IndustryType.wood_rick]: ['Firewood', 'Firewood', output3, output4],
};

export const gizmoSvgPaths = {
    'x': arrow(true),
    'y': arrow(false),
    'z': circle(0, 0, 100),
};

const engineHouse = {
    'building': rect(0, -500, 2000, 1000),
};

const largeEngineHouse = {
    'building': rect(0, -490, 2100, 980),
};

const waterTower = {
    'building': rect(250, 250, 500, -500),
};

export const industrySvgPaths: Record<IndustryType, Record<string, PathArrayAlias>> = {
    [IndustryType.logging_camp]: {
        'platform': combine(
            rect(530, 1440, 300, 1250),
            rect(2570, -1390, 2360 - 2570, 250 + 1390),
        ),
        'building': combine(
            rect(-150, 580, -630, 950),
            rect(3800, -2500, -600, 2100),
            rect(2400, -4690, -980, 1220),
            rect(2140, -3110, -920, 810),
            rect(2400, -2090, -1540, 2370),
            rect(2380, 660, -1370, 870),
            rect(2610, 2250, -1490, 1940),
            rect(-480, -3680, -370, 660),
            rect(-230, -2500, -610, 620),
            rect(-220, -900, -1060, 1000),
            rect(-150, 580, -630, 950),
        ),
    },
    [IndustryType.sawmill]: {
        'pond': [
            ['M', 2800, 980],
            ['C', 2010, 640, 1600, 500, 1180, 420],
            ['S', 580, 500, -270, 1100],
            ['S', -800, 1420, -1280, 2270],
            ['S', -1330, 3170, -980, 4170],
            ['S', -320, 4910, 570, 5220],
            ['S', 1250, 5940, 2100, 5840],
            ['S', 2640, 5310, 2750, 4360],
            ['Z'],
        ] as PathCommand[],
        'platform': combine(
            rect(-3900, -4000, 300, 4500),
            rect(2600, 600, 300, 4200),
        ),
        'building': combine(
            polyRect(-1000, -2800,
                900, -2600,
                2600, -1600,
                1050, -200,
                300, 1200,
                -200, -200,
                -1000, -1500,
                -3500, -2200,
                -1000,
            ).concat([['Z']]),
        ),
    },
    [IndustryType.smelter]: {
        'platform': combine(
            rect(3400, 600, 300, -4000),
            rect(-3600, 1500, 300, -2050),
            rect(-2900, -1875, 300, -2050),
        ),
        'building': polyRectRel(-550, -4000,
            1500, 1000,
            500, 2575,
            -500, 425,
            -2250, -1700,
            750, -2300),
    },
    [IndustryType.ironworks]: {
        'platform': combine(
            rect(-4000, 2800, 2500, -300),
            rect(-200, 2800, 1200, -300),
            rect(-4530, -2780, 1080, -300),
            rect(-2800, -2780, 4500, -300),
        ),
        'building': polyRectRel(3100, 1300,
            -6800, -2600,
            5800, -1000,
            1000),
    },
    [IndustryType.oil_field]: {
        'platform': combine(
            rect(-3500, 950, 2300, 300),
            rect(-5500, 950, 1200, 300),
            rect(-1400, -800, 1600, 300),
        ),
        'building': combine(
            circle(1250, 1750, 700),
            circle(-250, 1750, 700),
            rect(-3200, 2400, 2050, 750),
            rotatedRect(-5250, 4400, 750, 2000, 10),
            rotatedRect(1740, 3640, 750, 2000, -5),
            rotatedRect(8860, 4150, 750, 2000, -60),
            rotatedRect(-2500, 7150, 750, 2000, -50),
            rect(-3200, -5700, 2000, 750),
            rect(1600, -3550, 2000, 750),
            rect(-5200, -4400, 750, 2000),
        ),
    },
    [IndustryType.refinery]: {
        'platform': combine(
            rect(1750, -2450, 300, 2200),
            rect(-3050, -700, 300, 2200),
            rect(-2450, 2000, 300, 2200),
            rect(-1900, 4750, 300, 1100),
        ),
        'building': combine(
            circle(-2220, 1180, 600),
            circle(-2260, -90, 600),
            rect(-2620, -2370, 1070, 1420),
            rect(-1510, -3470, 980, 1160),
            rect(500, -3000, 1400, 2500),
            rect(-1350, -500, 1850, 900),
            rect(-1400, 1700, 1800, 900),
        ),
    },
    [IndustryType.coal_mine]: {
        'platform': combine(
            rect(-250, 2050, 300, -1050),
            rect(-275, -1050, 300, -2050),
        ),
        'building': combine(
            rect(-180, -230, 2320, 790),
            rect(3320, -180, 1080, 760),
        ),
    },
    [IndustryType.iron_mine]: {
        'platform': combine(
            rect(-200, 200, 300, -400),
            rect(-200, 4600, 300, -3000),
        ),
        'building': combine(
            rotatedRect(650, -1670, 500, 750, 43),
            polyRect(0, -500,
                500, -150,
                2200, 350,
                500, 1500),
        ),
    },
    [IndustryType.freight_depot]: {
        'platform': polyRect(2200, -1000,
            -3300, -700,
            -2300, 1000),
        'building': rectAbs(2100, -900, -2200, 900),
    },
    [IndustryType.firewood_camp]: {
        'building': rect(150, 1000, 950, -1700),
    },
    [IndustryType.engine_house_lightblue]: engineHouse,
    [IndustryType.engine_house_gold]: engineHouse,
    [IndustryType.engine_house_red]: engineHouse,
    [IndustryType.engine_house_brown]: engineHouse,
    [IndustryType.coaling_tower]: {
        'building': rect(50, -900, 600, 600),
    },
    [IndustryType.telegraph_office]: {
        'building': rect(-200, -150, 400, 300),
    },
    [IndustryType.water_tower_a_red]: waterTower,
    [IndustryType.water_tower_a_brown]: waterTower,
    [IndustryType.water_tower_a_beige]: waterTower,
    [IndustryType.water_tower_a_old]: waterTower,
    [IndustryType.water_tower_b_red]: waterTower,
    [IndustryType.water_tower_b_brown]: waterTower,
    [IndustryType.water_tower_b_beige]: waterTower,
    [IndustryType.water_tower_b_old]: waterTower,
    [IndustryType.large_engine_house_red]: largeEngineHouse,
    [IndustryType.large_engine_house_brown]: largeEngineHouse,
    [IndustryType.large_engine_house_beige]: largeEngineHouse,
    [IndustryType.large_engine_house_old]: largeEngineHouse,
    [IndustryType.wood_rick]: {
        'building': rect(-130, -65, 260, 130),
    },
};
