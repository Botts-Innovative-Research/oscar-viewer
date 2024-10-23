import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import {useState} from "react";

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
export  function createNeutronViewCurve(neutronDatasource: { id: any; }) {
    if (!neutronDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [neutronDatasource.id],
        getValues: (rec: any, timestamp: any) => {
            return {x: timestamp, y: rec.neutronGrossCount}
        },
        name: 'Neutron Count',
        maxValues: 20,
        backgroundColor: "#29b6f6",
        lineColor: '#29b6f6',
        xLabel: 'Time',
        yLabel: 'CPS',
    });

    return nCurve;
}


export function createThresholdViewCurve(thresholdDatasource: { id: any; }) {
    if (!thresholdDatasource) return null;

    let thresholdCurve = new CurveLayer({
        dataSourceIds: [thresholdDatasource.id],
        getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.threshold}),
        name: "Threshold",
        backgroundColor: "#9b27b0",
        lineColor: '#9b27b0',
        maxValues: 20,
        yLabel: 'CPS',
        borderWidth: 1,

    });

    return thresholdCurve;
}

export  function createNSigmaCalcViewCurve(gammaDatasource: { id: any; }, thresholdDatasource: { id: any; }) {
    let bkgCount = 0;
    let state = ''
    if (!gammaDatasource && !thresholdDatasource) return null;

    let nCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id, thresholdDatasource.id],
        getValues: (rec: any) => {


            if(rec.gammaGrossCount && rec.alarmState){
                bkgCount = rec.gammaGrossCount;
                state = rec.alarmState
            }

            if(rec.threshold && rec.sigma && bkgCount != 0 && state === 'Background'){

                const nsigma = (rec.threshold - bkgCount) / rec.sigma;

                console.log('state', state, 'nsigma', nsigma)

                return { x: rec.timestamp, 'right-y-axis': nsigma};
            }
            else {
                return {x:rec.timestamp, y: 0}
            }
        },
        maxValues: 100,
        name: "NSigma",
        yAxisID: 'right-y-axis',
        borderWith: 1,
        backgroundColor: "#e0bee7",
        lineColor: "#a895ab",

    });

    return nCurve;
}


export  function createGammaViewCurve(gammaDatasource: { id: any; }) {
    if (!gammaDatasource) return null;

    let gCurve = new CurveLayer({
        dataSourceIds: [gammaDatasource.id],
        getValues: (rec: any, timestamp: any) => {
            return { x: timestamp, y: rec.gammaGrossCount};
        },
        maxValues: 20,
        name: "Gamma Count",
        borderWidth: 1,
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