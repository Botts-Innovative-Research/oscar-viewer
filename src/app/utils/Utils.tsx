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

export function convertToMap(obj: any){
    if(!obj) return new Map();
    if(obj instanceof Map) return obj;
    return new Map(Object.entries(obj));
}

export function hashString(str: any) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0) / 4294967296;
}