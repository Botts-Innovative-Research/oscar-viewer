export interface ConSysApiMessage {
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
    gammaGrossCount?: number,
    gammaCount1?: number,
    gammaCount2?: number,
    gammaCount3?: number,
    gammaCount4?: number,
    gammaGrossCount1?: number,
    gammaGrossCount2?: number,
    gammaGrossCount3?: number,
    gammaGrossCount4?: number,
    gammaGrossCountPerInterval1: number,
    gammaGrossCountPerInterval2: number,
    gammaGrossCountPerInterval3: number,
    gammaGrossCountPerInterval4: number,
    timestamp: number
}

export interface NeutronScanData extends ValueData {
    samplingTime: string,
    alarmState: string,
    neutronGrossCount?: number,
    neutronCount1?: number,
    neutronCount2?: number,
    neutronCount3?: number,
    neutronCount4?: number,
    neutronGrossCount1?: number,
    neutronGrossCount2?: number,
    neutronGrossCount3?: number,
    neutronGrossCount4?: number,
    timestamp: number,
}
