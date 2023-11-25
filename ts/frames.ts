import {GvasString} from './Gvas';
import {NumericFrameState} from './Railroad';

export const frameTypes = [
    '622D',
    'boxcar',
    'caboose',
    'class70',
    'class70_tender',
    'climax',
    'coach_dsprr_1',
    'cooke260',
    'cooke260_new',
    'cooke260_new_tender',
    'cooke260_tender',
    'cooke280',
    'cooke280_tender',
    'eureka',
    'eureka_tender',
    'flatcar_cordwood',
    'flatcar_hopper',
    'flatcar_logs',
    'flatcar_stakes',
    'flatcar_tanker',
    'glenbrook',
    'glenbrook_tender',
    'handcar',
    'heisler',
    'hopperBB',
    'lima280',
    'lima280_tender',
    'montezuma',
    'montezuma_tender',
    'mosca',
    'mosca_tender',
    'plantationcar_boxcar',
    'plantationcar_flatcar',
    'plantationcar_flatcar_logs',
    'plantationcar_flatcar_stakes',
    'plantationcar_flatcar_stakes_bulkhead',
    'plantationcar_hopper_large',
    'plantationcar_hopper_medium',
    'plantationcar_hopper_small',
    'plantationcar_tanker',
    'plow',
    'porter_040',
    'porter_042',
    'rubybasin',
    'shay',
    'skeletoncar',
    'stockcar',
    'tankcarNCO',
    'tenmile',
    'tweetsie280',
    'tweetsie280_tender',
    'waycar',
] as const satisfies ReadonlyArray<string>;

type FrameType = typeof frameTypes[number];

export const isFrameType = (type: GvasString): type is FrameType =>
    type ? frameTypes.includes(type) : false;

export const frameCategories = ['engine', 'tender', 'freight', 'passenger', 'mow', 'handcar'] as const;

type PRO<K extends string | number | symbol, T> = Partial<Readonly<Record<K, T>>>;

type CategoryFlags = {
    engine: true,
    tender?: undefined,
    coal?: true,
    freight?: undefined,
    passenger?: undefined,
    mow?: undefined,
    handcar?: undefined,
} | {
    engine?: undefined,
    tender: true,
    coal?: true,
    freight?: undefined,
    passenger?: undefined,
    mow?: undefined,
    handcar?: undefined,
} | {
    engine?: undefined,
    tender?: undefined,
    coal?: undefined,
    freight: true,
    passenger?: undefined,
    mow?: undefined,
    handcar?: undefined,
} | {
    engine?: undefined,
    tender?: undefined,
    coal?: undefined,
    freight?: undefined,
    passenger: true,
    mow?: undefined,
    handcar?: undefined,
} | {
    engine?: undefined,
    tender?: undefined,
    coal?: undefined,
    freight?: undefined,
    passenger?: undefined,
    mow: true,
    handcar?: undefined,
} | {
    engine?: undefined,
    tender?: undefined,
    coal?: undefined,
    freight?: undefined,
    passenger?: undefined,
    mow?: undefined,
    handcar: true,
};

export type FrameDefinition = CategoryFlags & {
    length: number,
    width?: number,
    name: string,
    min?: PRO<keyof NumericFrameState, number>,
    max?: PRO<keyof NumericFrameState, number>,
};

export const frameDefinitions: Record<FrameType, FrameDefinition> = {

    '622D': {
        engine: true,
        length: 760,
        name: 'D&RGW Class 48',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 2,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 3,
            tenderFuelAmount: 144,
            tenderWaterAmount: 1600,
        },
    },

    'boxcar': {
        freight: true,
        length: 822.82,
        name: 'Boxcar',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'caboose': {
        length: 679,
        name: 'Bobber Caboose',
        passenger: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 50,
            boilerPressure: 120,
            boilerWaterLevel: 500,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 1,
            markerLightsCenterState: 3,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 10,
            smokestackType: 1,
            tenderFuelAmount: 15,
        },
    },

    'class70': {
        engine: true,
        name: 'D&RG Class 70',
        length: 938.9,
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 100,
            boilerPressure: 130,
            boilerWaterLevel: 6000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            paintType: 3,
            regulatorValue: 1,
            reverserValue: 1,
            headlightType: 3,
            sanderAmount: 100,
            smokestackType: 3,
        },
    },

    'class70_tender': {
        length: 678.81,
        name: 'Class 70 Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 3,
            smokestackType: 1,
            tenderFuelAmount: 1350,
            tenderWaterAmount: 9500,
        },
    },

    'climax': {
        engine: true,
        length: 820,
        name: 'Climax',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 80,
            boilerPressure: 160,
            boilerWaterLevel: 4000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            generatorValveValue: 1,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            headlightType: 1,
            sanderAmount: 100,
            smokestackType: 3,
            tenderFuelAmount: 332,
            tenderWaterAmount: 3000,
        },
    },

    'coach_dsprr_1': {
        passenger: true,
        length: 1420,
        width: 300,
        name: 'Coach DSP&P RR No. 57',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 5,
            smokestackType: 1,
            markerLightsCenterState: 3,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
        },
    },

    'cooke260': {
        engine: true,
        length: 837.83,
        name: 'Cooke Mogul Wood',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 80,
            boilerPressure: 150,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 2,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 3,
        },
    },

    'cooke260_new': {
        coal: true,
        engine: true,
        length: 837.83,
        name: 'Cooke Mogul Coal',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 80,
            boilerPressure: 150,
            boilerWaterLevel: 4500,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 5,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            paintType: 6,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 5,
        },
    },

    'cooke260_new_tender': {
        coal: true,
        length: 641.73,
        name: 'Cooke Mogul Coal Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 6,
            smokestackType: 1,
            tenderFuelAmount: 6000,
            tenderWaterAmount: 9500,
        },
    },

    'cooke260_tender': {
        length: 641.73,
        name: 'Cooke Mogul Wood Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 1,
            tenderFuelAmount: 1460,
            tenderWaterAmount: 9500,
            smokestackType: 1,
        },
    },

    'cooke280': {
        engine: true,
        name: 'Cooke Consolidation',
        length: 870,
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 3,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            paintType: 5,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 4,
        },
    },

    'cooke280_tender': {
        tender: true,
        name: 'Cooke Consolidation Tender',
        length: 625,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 5,
            smokestackType: 1,
            tenderFuelAmount: 1428,
            tenderWaterAmount: 9500,
        },
    },

    'eureka': {
        engine: true,
        length: 802.13,
        name: 'Eureka',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 3,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 1,
        },
    },

    'eureka_tender': {
        length: 497,
        name: 'Eureka Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 1,
            smokestackType: 1,
            tenderFuelAmount: 499,
            tenderWaterAmount: 3800,
        },
    },

    'flatcar_cordwood': {
        freight: true,
        length: 785.6,
        name: 'Flatcar Tier 3',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'flatcar_hopper': {
        freight: true,
        length: 785.6,
        name: 'Hopper',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
    },

    'flatcar_logs': {
        freight: true,
        length: 785.6,
        name: 'Flatcar Tier 1',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'flatcar_stakes': {
        freight: true,
        length: 785.6,
        name: 'Flatcar Tier 2',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'flatcar_tanker': {
        freight: true,
        length: 760,
        name: 'Tanker',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 10,
            smokestackType: 1,
        },
    },

    'glenbrook': {
        engine: true,
        length: 837.83,
        name: 'Glenbrook',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 4,
            paintType: 13,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 5,
        },
    },

    'glenbrook_tender': {
        length: 505,
        name: 'Glenbrook Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 13,
            smokestackType: 1,
            tenderFuelAmount: 798,
            tenderWaterAmount: 3800,
        },
    },

    'handcar': {
        handcar: true,
        length: 220.2,
        name: 'Handcar',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerPressure: 120,
            boilerWaterLevel: 100,
            boilerWaterTemp: 10,
            brakeValue: 1,
            headlightType: 1,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            smokestackType: 1,
            tenderFuelAmount: 20,
        },
    },

    'heisler': {
        engine: true,
        length: 913.73,
        name: 'Heisler',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 80,
            boilerPressure: 160,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 3,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 3,
            tenderFuelAmount: 454,
            tenderWaterAmount: 3000,
        },
    },

    'hopperBB': {
        freight: true,
        length: 720,
        name: 'Carter Brothers Drop-Bottom Hopper',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'lima280': {
        engine: true,
        length: 1080,
        name: 'Lima 2-8-0',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 200,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 8,
            paintType: 2,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 4,
        },
    },

    'lima280_tender': {
        length: 620,
        name: 'Lima 2-8-0 Tender',
        tender: true,
        min: {
            paintType: 1,
        },
        max: {
            brakeValue: 1,
            paintType: 2,
            tenderFuelAmount: 5400,
            tenderWaterAmount: 9000,
        },
    },

    'montezuma': {
        engine: true,
        length: 580,
        name: 'Montezuma',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 2,
            paintType: 2,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 3,
        },
    },

    'montezuma_tender': {
        length: 420,
        name: 'Montezuma Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 2,
            smokestackType: 1,
            tenderFuelAmount: 470,
            tenderWaterAmount: 5900,
        },
    },

    'mosca': {
        engine: true,
        length: 873,
        name: 'Mosca',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 3,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 5,
        },
    },

    'mosca_tender': {
        length: 530,
        name: 'Mosca Tender',
        tender: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
            tenderFuelAmount: 854,
            tenderWaterAmount: 3800,
        },
    },

    'plantationcar_boxcar': {
        freight: true,
        length: 420,
        name: 'EWA Plantation Box Car',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_flatcar': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Cane Flat',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_flatcar_logs': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Logging Flat',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_flatcar_stakes': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Stake Flat',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_flatcar_stakes_bulkhead': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Bulkhead Flat',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_hopper_large': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Lowside Gondola',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_hopper_medium': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Medium Gondola',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_hopper_small': {
        freight: true,
        length: 420,
        name: 'Gregg Sugar Cane Highside Gondola',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plantationcar_tanker': {
        freight: true,
        length: 420,
        name: 'Waualua Agricultural Tank Car',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'plow': {
        length: 610,
        name: 'Snow Plow',
        mow: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            paintType: 4,
            smokestackType: 1,
        },
    },

    'porter_040': {
        engine: true,
        length: 391.2,
        name: 'Porter',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 50,
            boilerPressure: 120,
            boilerWaterLevel: 500,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 2,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 1,
            tenderFuelAmount: 66,
            tenderWaterAmount: 800,
        },
    },

    'porter_042': {
        engine: true,
        length: 461.35,
        name: 'Porter 2',
        min: {
            paintType: 1,
            reverserValue: -1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 50,
            boilerPressure: 120,
            boilerWaterLevel: 500,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 2,
            paintType: 1,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 1,
            tenderFuelAmount: 164,
            tenderWaterAmount: 800,
        },
    },

    'rubybasin': {
        coal: true,
        engine: true,
        length: 853.7,
        name: 'Ruby Basin',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 150,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 6,
            paintType: 5,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 5,
            tenderFuelAmount: 1000,
            tenderWaterAmount: 3785,
        },
    },

    'shay': {
        engine: true,
        length: 800,
        name: 'Shay',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 80,
            boilerPressure: 160,
            boilerWaterLevel: 4000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 3,
            paintType: 3,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 4,
            tenderFuelAmount: 317,
            tenderWaterAmount: 3000,
        },
    },

    'skeletoncar': {
        freight: true,
        length: 600,
        name: 'Skeleton Car',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 6,
            smokestackType: 1,
        },
    },

    'stockcar': {
        freight: true,
        length: 789.9,
        name: 'Stock Car',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 7,
            smokestackType: 1,
        },
    },

    'tankcarNCO': {
        freight: true,
        length: 789.9,
        name: 'Coffin Tank Car',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 5,
            smokestackType: 1,
        },
    },

    'tenmile': {
        engine: true,
        length: 853.7,
        name: 'Tenmile',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 130,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            headlightType: 9,
            paintType: 6,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 9,
            tenderFuelAmount: 3320,
            tenderWaterAmount: 1200,
        },
    },

    'tweetsie280': {
        engine: true,
        length: 878.9,
        name: 'ET&WNC 2-8-0',
        min: {
            headlightType: 1,
            paintType: 1,
            reverserValue: -1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 70,
            boilerPressure: 160,
            boilerWaterLevel: 5000,
            boilerWaterTemp: 110,
            brakeValue: 1,
            compressorAirPressure: 100,
            compressorValveValue: 1,
            generatorValveValue: 1,
            headlightType: 6,
            paintType: 3,
            regulatorValue: 1,
            reverserValue: 1,
            sanderAmount: 100,
            smokestackType: 3,
        },
    },

    'tweetsie280_tender': {
        coal: true,
        tender: true,
        length: 618.8,
        name: 'ET&WNC 2-8-0 Tender',
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            brakeValue: 1,
            headlightType: 1,
            paintType: 3,
            smokestackType: 1,
            tenderFuelAmount: 6000,
            tenderWaterAmount: 9500,
        },
    },

    'waycar': {
        length: 615,
        name: 'DSP&P Waycar',
        passenger: true,
        min: {
            headlightType: 1,
            paintType: 1,
            smokestackType: 1,
        },
        max: {
            boilerFireTemp: 400,
            boilerFuelAmount: 50,
            boilerPressure: 120,
            boilerWaterLevel: 500,
            boilerWaterTemp: 110,
            brakeValue: 1,
            headlightType: 1,
            markerLightsFrontLeftState: 3,
            markerLightsFrontRightState: 3,
            markerLightsRearLeftState: 3,
            markerLightsRearRightState: 3,
            paintType: 13,
            smokestackType: 1,
            tenderFuelAmount: 25,
        },
    },

};

type FrameStateMetadata = {
    name: string | readonly [string, string],
    type?: 'slider' | readonly string[],
    unit?: string | readonly [string, string],
    step?: number,
};

export const frameStateMetadata = {
    boilerFireTemp: {
        name: 'Boiler Fire Temperature',
        type: 'slider',
        unit: 'C',
    },
    boilerFuelAmount: {
        name: 'Boiler Fuel',
        type: 'slider',
    },
    boilerPressure: {
        name: 'Boiler Pressure',
        type: 'slider',
        unit: 'psi',
    },
    boilerWaterLevel: {
        name: 'Boiler Water',
        type: 'slider',
        unit: 'L',
    },
    boilerWaterTemp: {
        name: 'Boiler Water Temperature',
        type: 'slider',
        unit: 'C',
    },
    brakeValue: {
        name: 'Brake',
        type: 'slider',
        step: 0.01,
    },
    compressorAirPressure: {
        name: 'Compressor Air Pressure',
        type: 'slider',
        unit: 'psi',
    },
    compressorValveValue: {
        name: 'Compressor',
        type: 'slider',
        step: 0.01,
    },
    generatorValveValue: {
        name: 'Generator',
        type: 'slider',
        step: 0.01,
    },
    headlightType: {
        name: 'Headlight',
    },
    markerLightsCenterState: {
        name: 'Marker Lights Center',
        type: ['None', 'Green', 'Red', 'White'],
    },
    markerLightsFrontLeftState: {
        name: 'Marker Lights Front Left',
        type: ['None', 'Green', 'Red', 'White'],
    },
    markerLightsFrontRightState: {
        name: 'Marker Lights Front Right',
        type: ['None', 'Green', 'Red', 'White'],
    },
    markerLightsRearLeftState: {
        name: 'Marker Lights Rear Left',
        type: ['None', 'Green', 'Red', 'White'],
    },
    markerLightsRearRightState: {
        name: 'Marker Lights Rear Right',
        type: ['None', 'Green', 'Red', 'White'],
    },
    paintType: {
        name: 'Paint',
    },
    regulatorValue: {
        name: 'Regulator',
        type: 'slider',
        step: 0.01,
    },
    reverserValue: {
        name: 'Reverser',
        type: 'slider',
        step: 0.01,
    },
    sanderAmount: {
        name: 'Sand',
        type: 'slider',
    },
    smokestackType: {
        name: 'Smokestack',
    },
    tenderFuelAmount: {
        name: 'Tender Fuel',
        type: 'slider',
        unit: ['logs', 'coal'],
    },
    tenderWaterAmount: {
        name: 'Tank Water',
        type: 'slider',
        unit: 'L',
    },
} as const satisfies Record<keyof NumericFrameState, FrameStateMetadata>;

export const cargoLimits = {
    boxcar: {
        ['EFreightType::CrateTools']: 32,
        ['EFreightType::None']: 0,
        ['EFreightType::SeedPallet']: 14,
    },
    flatcar_cordwood: {
        ['EFreightType::CordWood']: 8,
        ['EFreightType::None']: 0,
        ['EFreightType::OilBarrel']: 46,
    },
    flatcar_hopper: {
        ['EFreightType::Coal']: 10,
        ['EFreightType::IronOre']: 10,
    },
    flatcar_logs: {
        ['EFreightType::Log']: 6,
        ['EFreightType::None']: 0,
        ['EFreightType::SteelPipe']: 9,
    },
    flatcar_stakes: {
        ['EFreightType::Beam']: 3,
        ['EFreightType::Lumber']: 6,
        ['EFreightType::None']: 0,
        ['EFreightType::Rail']: 10,
        ['EFreightType::RawIron']: 3,
    },
    flatcar_tanker: {
        ['EFreightType::CrudeOil']: 12,
    },
    hopperBB: {
        ['EFreightType::Coal']: 10,
        ['EFreightType::IronOre']: 8,
    },
    plantationcar_boxcar: {
        ['EFreightType::CrateTools']: 12,
        ['EFreightType::CrudeOil']: 15,
        ['EFreightType::None']: 0,
    },
    plantationcar_flatcar: {
        ['EFreightType::CrateTools']: 6,
    },
    plantationcar_flatcar_logs: {
        ['EFreightType::Log']: 5,
        ['EFreightType::None']: 0,
        ['EFreightType::SteelPipe']: 7,
    },
    plantationcar_flatcar_stakes: {
        ['EFreightType::Beam']: 3,
        ['EFreightType::Lumber']: 3,
        ['EFreightType::Rail']: 4,
        ['EFreightType::RawIron']: 3,
    },
    plantationcar_flatcar_stakes_bulkhead: {
        ['EFreightType::CordWood']: 2,
    },
    plantationcar_hopper_large: {
        ['EFreightType::Coal']: 6,
        ['EFreightType::IronOre']: 6,
        ['EFreightType::OilBarrel']: 15,
    },
    plantationcar_hopper_medium: {
        ['EFreightType::Coal']: 3,
        ['EFreightType::IronOre']: 3,
        ['EFreightType::OilBarrel']: 15,
    },
    plantationcar_hopper_small: {
        ['EFreightType::Coal']: 2,
        ['EFreightType::IronOre']: 2,
        ['EFreightType::OilBarrel']: 15,
    },
    plantationcar_tanker: {
        ['EFreightType::CrudeOil']: 2,
    },
    skeletoncar: {
        ['EFreightType::Log']: 5,
    },
    stockcar: {
        ['EFreightType::CrateTools']: 32,
    },
    tankcarNCO: {
        ['EFreightType::CrudeOil']: 8,
    },
} as const satisfies PRO<FrameType, PRO<CargoType, number>>;

export const hasCargoLimits = (type: GvasString): type is keyof typeof cargoLimits =>
    type ? type in cargoLimits : false;

export const cargoTypes = {
    ['EFreightType::Beam']: 'Beams',
    ['EFreightType::Coal']: 'Coal',
    ['EFreightType::CordWood']: 'Cordwood',
    ['EFreightType::CrateTools']: 'Tool Crates',
    ['EFreightType::CrudeOil']: 'Crude Oil',
    ['EFreightType::IronOre']: 'Iron Ore',
    ['EFreightType::Log']: 'Logs',
    ['EFreightType::Lumber']: 'Lumber',
    ['EFreightType::None']: 'None',
    ['EFreightType::OilBarrel']: 'Oil Barrels',
    ['EFreightType::Rail']: 'Rails', // FIXME
    ['EFreightType::RawIron']: 'Raw Iron',
    ['EFreightType::SeedPallet']: 'Seed Pallet',
    ['EFreightType::SteelPipe']: 'Steel Pipes',
} as const satisfies PRO<string, string>;

export const isCargoType = (type: GvasString): type is CargoType =>
    type ? type in cargoTypes : false;

export type CargoType = keyof typeof cargoTypes;
