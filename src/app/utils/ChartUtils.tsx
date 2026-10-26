import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";

interface CurveLabels {
    time?: string;
    neutron?: string;
    gamma?: string;
    threshold?: string;
    gammaNSigma?: string;
}

const DETECTOR_COUNT = 4;
const DETECTOR_COLORS = ['#f44336', '#ff9800', '#4caf50', '#2196f3'];

function asFiniteNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '')
        return undefined;

    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

function sumCountFields(record: any, fieldNames: string[]): number | undefined {
    const values = fieldNames
        .map(fieldName => asFiniteNumber(record?.[fieldName]))
        .filter((value): value is number => value !== undefined);

    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : undefined;
}
function createDetectorViewCurves(
    datasource: { id: string },
    fieldPrefix: string,
    label: string,
    labels: CurveLabels,
) {
    if (!datasource) return [];

    return Array.from({length: DETECTOR_COUNT}, (_, index) => {
        const detector = index + 1;
        const color = DETECTOR_COLORS[index];

        return new CurveLayer({
            dataSourceIds: [datasource.id],
            getValues: (rec: any) => {
                return {
                    x: rec.timestamp,
                    y: rec?.[`${fieldPrefix}${detector}`]
                }
            },
            name: `${label} ${detector}`,
            xLabel: labels.time ?? 'Time',
            yLabel: 'CPS',
            borderWidth: 1.5,
            backgroundColor: color,
            lineColor: color,
            visible: true,
            hidden: false,
            maxValues: 1500,
        });
    });
}

export function getGammaGrossCount(record: any): number | undefined {
    return asFiniteNumber(record?.gammaGrossCount)
        ?? sumCountFields(record, ['gammaCount1', 'gammaCount2', 'gammaCount3', 'gammaCount4'])
        ?? sumCountFields(record, [
            'gammaGrossCount1',
            'gammaGrossCount2',
            'gammaGrossCount3',
            'gammaGrossCount4'
        ]);
}
export function createGammaDetectorViewCurves(gammaDatasource: { id: string; }, labels: CurveLabels = {}) {
    return createDetectorViewCurves(
        gammaDatasource,
        'gammaCount',
        labels.gamma ?? 'Gamma',
        labels,
    );
}

export function getNeutronGrossCount(record: any): number | undefined {
    return asFiniteNumber(record?.neutronGrossCount)
        ?? sumCountFields(record, ['neutronCount1', 'neutronCount2', 'neutronCount3', 'neutronCount4'])
        ?? sumCountFields(record, [
            'neutronGrossCount1',
            'neutronGrossCount2',
            'neutronGrossCount3',
            'neutronGrossCount4'
        ]);
}
export function createNeutronDetectorViewCurves(neutronDatasource: { id: string; }, labels: CurveLabels = {}) {
    return createDetectorViewCurves(
        neutronDatasource,
        'neutronCount',
        labels.neutron ?? 'Neutron',
        labels,
    );
}

export  function createNeutronViewCurve(neutronDatasource: { id: string; }, labels: CurveLabels = {}) {
    if (!neutronDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [neutronDatasource.id],
        getValues: (rec: any) => {
            return {x: rec.timestamp, y: getNeutronGrossCount(rec)}
        },
        name: labels.neutron ?? 'Neutron',
        maxValues: 1500,
        borderWidth: 1.5,
        lineColor: '#29b6f6',
        backgroundColor: '#29b6f6',
        xLabel: labels.time ?? 'Time',
        yLabel: 'CPS',
        visible: true,
        hidden: false
    });

    return nCurve;
}

export function createThresholdViewCurve(thresholdDatasource: { id: string; }, labels: CurveLabels = {}) {
    if (!thresholdDatasource) return null;

    let thresholdCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) =>{
            return {x: rec.timestamp, y: rec.threshold}
        } ,
        name: labels.threshold ?? "Threshold",
        backgroundColor: "rgba(194, 160, 201, 0.3)",
        lineColor: '#9b27b0',
        borderWidth: 1.5,
        visible: true,
        hidden: false,
        xLabel: labels.time ?? 'Time',
        yLabel: 'CPS',
        order: 2,
        fill: 1,
        maxValues: 1500,
    });

    return thresholdCurve;
}
export  function createGammaViewCurve(gammaDatasource: { id: string; }, labels: CurveLabels = {}) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => {
            return ({ x: rec.timestamp, y: getGammaGrossCount(rec)})
        },
        name: labels.gamma ?? "Gamma",
        xLabel: labels.time ?? 'Time',
        yLabel: 'CPS',
        borderWidth: 1.5,
        backgroundColor: "rgba(245, 166, 160, 0.1)",
        lineColor: "#f44336",
        visible: true,
        order: 1,
        fill: 1,
        maxValues: 1500,
    });

    return gCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export function createNSigmaCalcViewCurve(gammaDatasource:  typeof ConSysApi, latestGB: number, labels: CurveLabels = {}) {
    if (!gammaDatasource) {
        return null;
    }

    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => {
            if (latestGB != null) {
                const gammaGrossCount = getGammaGrossCount(rec);
                if (gammaGrossCount !== undefined) {
                    let nSigmaValue: number = (gammaGrossCount - latestGB) / Math.sqrt(latestGB)
                    return {x: rec.timestamp, y: nSigmaValue}
                }
            }
            return {x: rec.timestamp, y: undefined}
        },
        name: labels.gammaNSigma ?? "Gamma Nσ",
        borderWidth: 1.5,
        backgroundColor: "rgba(245, 166, 160, 0.1)",
        lineColor: "#f44336",
        xLabel: labels.time ?? 'Time',
        yLabel: 'Nσ',
        visible: true,
        hidden: false,
        fill: 1,
        order: 0,
        maxValues: 1500,
    });

    return nCurve;
}

export async function getObservations(startTime: string, endTime: string, datastream: any){

    let lastestGammaBackground: number;

    let res = await datastream.searchObservations(new ObservationFilter({resultTime: `${startTime}/${endTime}`}), 1);

    let newObs = await res.nextPage();

    newObs.map((ob: any) =>{
        const lastGB = ob.result.latestGammaBackground;

        if(lastGB != null)
            lastestGammaBackground = lastGB;
    })
    return lastestGammaBackground;
}

export  function createThreshSigmaViewCurve(thresholdDatasource: { id: string; }, labels: CurveLabels = {}) {
    if (!thresholdDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => {
            return { x: rec.timestamp, y: rec.nSigma}
        },
        name: labels.threshold ?? "Threshold",
        xLabel: labels.time ?? 'Time',
        yLabel: 'Nσ',
        borderWidth: 1.5,
        backgroundColor: "rgba(194, 160, 201, 0.3)",
        lineColor: '#9b27b0',
        visible: true,
        hidden: false,
        order: 1,
        fill: 1,
        maxValues: 1500,
    });
    return gCurve;
}
