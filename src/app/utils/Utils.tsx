/*
 * Copyright (c) 2022.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";

/**
 * Retrieves the value of a nested property from the given object
 * @param obj The object being mined for data
 * @param prop The property being mined for
 *
 * @return value The value of the property if it exists in the object
 */
export function fetchFromObject(obj: any, prop: string): any {

    if (typeof obj === 'undefined' || typeof prop === 'undefined' || prop === null) {

        return null;
    }

    let index: number = prop.indexOf('.');

    if (index > -1) {

        return fetchFromObject(obj[prop.substring(0, index)], prop.substr(index + 1));
    }

    return obj[prop];
}

/**
 * Retrieves the value of a nested property from the given object if it is found, null otherwise
 * This method allows for a term to be specified containing multiple candidate keys that may match
 * the field being searched for.
 *
 * Ex:
 *
 *      let value = findInObject(object, 'lon | x')
 *
 * @param record The object being mined for data
 * @param term The property being mined for
 *
 * @return value The value of the property if it exists in the object, null otherwise
 */
export function findInObject(record: any, term: string) {

    let value: any = null;

    let targets: string[] = term.split("|");

    for (let targetIdx = 0; value === null && targetIdx < targets.length; ++targetIdx) {

        let key: string = targets[targetIdx].trim();

        if (Array.isArray(record)) {

            for (const field of record) {

                value = findInObject(field, key);

                if (value !== null) {
                    break;
                }
            }

        } else {

            if (record.hasOwnProperty(key)) {

                value = record[key];

            } else {

                for (const k of Object.keys(record)) {

                    if (typeof record[k] === "object") {

                        value = findInObject(record[k], key);
                    }
                }
            }
        }
    }

    return value;
}

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
        backgroundColor: "#29b6f6",
        lineColor: '#29b6f6',
    });

    return nCurve;
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