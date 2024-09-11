export interface SweApiMessage {
    dataSourceId: string,
    type: string,
    values: MessageValue[]
}

interface MessageValue {
    data: ValueData,
    version: number
}

interface ValueData {
    // All data objects have version?
    version: number
}

export interface GammaScanData extends ValueData {
    samplingTime: string,
    alarmState: string,
    gammaGrossCount1: number,
    gammaGrossCount2: number,
    gammaGrossCount3: number,
    gammaGrossCount4: number,
    gammaGrossCountPerInterval1: number,
    gammaGrossCountPerInterval2: number,
    gammaGrossCountPerInterval3: number,
    gammaGrossCountPerInterval4: number,
    timestamp: number
}

export interface NeutronScanData extends ValueData {
    samplingTime: string,
    alarmState: string,
    neutronGrossCount1: number,
    neutronGrossCount2: number,
    neutronGrossCount3: number,
    neutronGrossCount4: number,
    timestamp: number,
}