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
        name: "Threshold",
        backgroundColor: "#9b27b0",
        lineColor: '#9b27b0',
        borderWidth: 1,
        visible: true,
        maxValues: 25,
        yLabel: 'CPS'
    });

    return thresholdCurve;
}
export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => ({ x: rec.timestamp, y: rec.gammaGrossCount}),
        name: "Gamma",
        borderWidth: 1,
        backgroundColor: "#f44336",
        lineColor: "#f44336",
        visible: true,
        yLabel: 'CPS',
        maxValues: 25,
    });

    return gCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export  function createNSigmaCalcViewCurve(thresholdDatasource: any, gammaDatasource: any) {
    if (!thresholdDatasource) return null;

    let latestGB: number;

    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id, thresholdDatasource.id],
        getValues: (rec: any, timestamp: any) => {

            if(rec.latestGammaBackground){
                latestGB = rec.latestGammaBackground;
            }

            if(rec.gammaGrossCount && latestGB !== undefined){
                let nSigmaValue: number = (rec.gammaGrossCount - latestGB) / Math.sqrt(latestGB)
                return {x: timestamp, y: nSigmaValue}
            }

        },
        name: "Gamma",
        borderWith: 1,
        visible: true,
        backgroundColor: "#f18787",
        lineColor: "#f18787",
        maxValues: 25,
        yLabel: 'Nσ'
    });

    return nCurve;
}



export  function createThreshSigmaViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => ({ x: rec.timestamp, y: rec.nSigma}),
        name: "Threshold",
        borderWidth: 1,
        backgroundColor: "#b9a3ea",
        lineColor: "#b9a3ea",
        visible: true,
        maxValues: 25,
        yLabel: 'Nσ'
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
