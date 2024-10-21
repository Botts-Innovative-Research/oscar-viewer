import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";

export function createSigmaViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let sigmaCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.sigma}),
        name: "Gamma Sigma",
        backgroundColor: "#ab47bc",
        lineColor: '#ab47bc',
    });

    return sigmaCurve;
}



export function createThresholdViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let thresholdCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.threshold}),
        name: "Gamma Threshold",
        backgroundColor: "#ab47bc",
        lineColor: '#ab47bc',
        maxValues: 20,
    });

    return thresholdCurve;
}

export  function createNeutronViewCurve(neutronDatasource: { id: any; }) {
    if (!neutronDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [neutronDatasource.id],
        getValues: (rec: any, timestamp: any) => {
            if(rec.neutronGrossCount !== undefined){
                return {x: timestamp, y: rec.neutronGrossCount}
            }
            else if(rec.neutronCount1 !== undefined){
                return {x: timestamp, y: rec.neutronCount1 }
            }
        },
        name: 'Neutron Count',
        maxValues: 20,
        backgroundColor: "#29b6f6",
        lineColor: '#29b6f6',
    });

    return nCurve;
}

export  function createGammaSigmaCalcViewCurve(gammaDatasource: { id: any; }, thresholdDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id, thresholdDatasource.id],
        getValues: (rec: any, timestamp: any) => {
            if (rec.gammaGrossCount !== undefined) {
                let nsigma= (rec.gammaGrossCount - rec.threshold)/rec.sigma

                return { x: rec.timestamp, y: nsigma};
            }
            else if (rec.gammaCount1 !== undefined) {

                return { x: rec.timestamp, y: rec.gammaCount1 };
            }
        },
        maxValues: 20,
        name: "Gamma-Sigma",
        backgroundColor: "#f44336",
        lineColor: "#f44336",
    });

    return gCurve;
}
export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any, timestamp: any) => {
            if (rec.gammaGrossCount !== undefined) {

                return { x: timestamp, y: rec.gammaGrossCount };
            }
            else if (rec.gammaCount1 !== undefined) {
                return { x: timestamp, y: rec.gammaCount1 };
            }
        },
        maxValues: 20,
        name: "Gamma Count",
        backgroundColor: "#f44336",
        lineColor: "#f44336",
    });

    return gCurve;
}

export  function createOccupancyViewCurve(occDatasource: { id: any; }) {
    if (!occDatasource) return null;

    let occCurve = new CurveLayer({
        dataSourceIds: [occDatasource.id],
        getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.occupancy}),
        name: "Occupancy"
    });

    return occCurve;
}