import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";


export  function createNeutronViewCurve(neutronDatasource: { id: any; }) {
    if (!neutronDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [neutronDatasource.id],
        getValues: (rec: any) => {
            return {x: rec.timestamp, y: rec.neutronGrossCount}
        },
        name: 'Neutron Count',
        maxValues: 25,
        backgroundColor: "#29b6f6",
        lineColor: '#29b6f6',
        xLabel: 'Time',
        yLabel: 'CPS',
        visible: true,
        hidden: false
    });

    return nCurve;
}

export function createThresholdViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let thresholdCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => ({x: rec.timestamp, y: rec.threshold}),
        name: "Threshold (CPS)",
        backgroundColor: "#9b27b0",
        lineColor: '#9b27b0',
        borderWidth: 1,
        visible: true,
        maxValues: 25,
        // yAxisID: 'y',
    });

    return thresholdCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export  function createNSigmaCalcViewCurve(thresholdDatasource: any, gammaDatasource: any) {
    if (!thresholdDatasource) return null;

    let latestGB: number;
    let latestSigma: number;

    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id, thresholdDatasource.id],
        getValues: (rec: any) => {

            if(rec.latestGammaBackground){
                latestGB = rec.latestGammaBackground;
            }
            if(rec.sigma){
                latestSigma = rec.sigma;
            }

            if(rec.gammaGrossCount && latestGB !== undefined){
                // let nSigmaValue: number = (rec.gammaGrossCount - latestGB) / latestSigma
                let nSigmaValue: number = (rec.gammaGrossCount - latestGB) / Math.sqrt(latestGB)
                return {x: rec.timestamp, y: nSigmaValue}
            }

        },
        name: "Gamma (Nσ)",
        // yAxisID: 'y1',
        borderWith: 1,
        visible: true,
        backgroundColor: "#d76b6b",
        lineColor: "#d76b6b",
        maxValues: 25,
    });

    return nCurve;
}

export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => ({ x: rec.timestamp, y: rec.gammaGrossCount}),
        name: "Gamma (CPS)",
        borderWidth: 1,
        backgroundColor: "#f44336",
        lineColor: "#f44336",
        // yAxisID: 'y',
        visible: true,
        // maxValues: 25,
    });

    return gCurve;
}

export  function createThreshSigmaViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => ({ x: rec.timestamp, y: rec.nSigma}),
        name: "Threshold (Nσ)",
        borderWidth: 1,
        backgroundColor: "#9f7fde",
        lineColor: "#9f7fde",
        // yAxisID: 'y1',
        visible: true,
        // maxValues: 25,
    });

    return gCurve;
}

export  function createOccupancyViewCurve(occDatasource: { id: any; }) {
    if (!occDatasource) return null;

    let occCurve = new CurveLayer({
        dataSourceIds: [occDatasource.id],
        getValues: (rec: any, timestamp: any) => ({x: rec.timestamp, y: rec.occupancy}),
        name: "Occupancy",
        hidden: false,
        maxValues: 25,
    });

    return occCurve;
}
