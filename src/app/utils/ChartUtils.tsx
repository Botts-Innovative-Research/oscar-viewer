import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";


export  function createNeutronViewCurve(neutronDatasource: { id: any; }) {
    if (!neutronDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [neutronDatasource.id],
        getValues: (rec: any) => {
            return {x: rec.timestamp, y: rec.neutronGrossCount}
        },
        name: 'Neutron',
        maxValues: 50,
        borderWidth: 1.5,
        lineColor: '#29b6f6',
        backgroundColor: '#29b6f6',
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
        getValues: (rec: any) => ({x: rec?.timestamp, y: rec?.threshold}),
        name: "Threshold",
        backgroundColor: "rgba(194, 160, 201, 0.3)",
        lineColor: '#9b27b0',
        borderWidth: 1.5,
        visible: true,
        hidden: false,
        xLabel: 'Time',
        yLabel: 'CPS',
        order: 2,
        fill: 1,
        maxValues: 50,

    });

    return thresholdCurve;
}
export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => ({ x: rec?.timestamp, y: rec?.gammaGrossCount}),
        name: "Gamma",
        borderWidth: 1.5,
        backgroundColor: "rgba(245, 166, 160, 0.1)",
        lineColor: "#f44336",
        visible: true,
        hidden: false,
        xLabel: 'Time',
        yLabel: 'CPS',
        order: 1,
        fill: 1,
        maxValues: 50,

    });

    return gCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export  function createNSigmaCalcViewCurve(thresholdDatasource: any, gammaDatasource: any) {
    console.log("thresh ds", thresholdDatasource)
    console.log("gamma ds", gammaDatasource)
    if (!thresholdDatasource  || !gammaDatasource) return null;

    let latestGB: number;


    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource?.id, thresholdDatasource?.id],
        getValues: (rec: any, timestamp: any) => {

            console.log("NSIGMA RECORD", rec)
            if(rec?.latestGammaBackground) latestGB = rec?.latestGammaBackground;


            console.log('latest gb', latestGB)
            if(rec.gammaGrossCount && latestGB){
                let nSigmaValue: number = (rec?.gammaGrossCount - latestGB) / Math.sqrt(latestGB)

                return {x: timestamp, y: nSigmaValue}
            }

        },
        name: "Gamma",
        borderWith: 1.5,
        backgroundColor: "rgba(245, 166, 160, 0.1)",
        lineColor: "#f44336",
        xLabel: 'Time',
        yLabel: 'Nσ',
        visible: true,
        hidden: false,
        fill: 1,
        order: 0,
        maxValues: 50,
    });

    return nCurve;
}



export  function createThreshSigmaViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any) => ({ x: rec?.timestamp, y: rec?.nSigma}),
        name: "Threshold",
        borderWidth: 1.5,
        backgroundColor: "rgba(194, 160, 201, 0.3)",
        lineColor: '#9b27b0',
        visible: true,
        hidden: false,
        maxValues: 50,
        xLabel: 'Time',
        yLabel: 'Nσ',
        order: 1,
        fill: 1,
    });

    return gCurve;
}
