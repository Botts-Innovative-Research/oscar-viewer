import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";


export function createSigmaViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let sigmaCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => ({x: rec.timestamp, y: rec.sigma}),
        name: "Gamma Sigma",
        backgroundColor: "#ab47bc",
        lineColor: '#ab47bc',
        hidden: false
    });

    return sigmaCurve;
}

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
        hidden: false,
        visible: true,
        maxValues: 25,
    });

    return thresholdCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export  function createNSigmaCalcViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => {
            return {x: rec.timestamp, y: rec.latestGammaBackground}
        },
        name: "NSigma",
        yAxisID: 'nsigma',
        data: {
            dataset: [{
                hidden: true
            }]
        },
        borderWith: 1,
        // backgroundColor: "#e0bee7",
        // lineColor: "#e0bee7",
        visible: false,
        hidden: true,
        maxValues: 25,
    });

    return nCurve;
}

export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => ({ x: rec.timestamp, y: rec.gammaGrossCount}),
        name: "Gamma Count",
        borderWidth: 1,
        backgroundColor: "#f44336",
        lineColor: "#f44336",
        yLabel: 'CPS',
        hidden: false,
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
