
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

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
        xLabel: 'Time',
        yLabel: 'CPS',
        order: 1,
        fill: 1,
        maxValues: 50,

    });

    return gCurve;
}

// get latest gamma background from threshold datasource to calc nsigma for chart
export function createNSigmaCalcViewCurve(gammaDatasource: any, latestGB: number) {
    if (!gammaDatasource) {
        return null;
    }

    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any) => {

            if(rec.gammaGrossCount && latestGB != null){

                let nSigmaValue: number = (rec?.gammaGrossCount - latestGB) / Math.sqrt(latestGB)

                return {x: rec?.timestamp, y: nSigmaValue}
            }

        },
        name: "Gamma Nσ",
        borderWidth: 1.5,
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


export async function getObservations(startTime: any, endTime: any, datastream: any){

    let lastestGammaBackground: number;

    let res = await datastream.searchObservations(new ObservationFilter({resultTime: `${startTime}/${endTime}`}),1);
    while(res.hasNext()){
        let newObs = await res.nextPage();

        newObs.map((ob: any) =>{
            const lastGB = ob.result.latestGammaBackground;

            if(lastGB != null)
                lastestGammaBackground = lastGB;
        })
    }
    return lastestGammaBackground;
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


