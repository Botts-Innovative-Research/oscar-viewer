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

import {
    IObservable,
    IPhysicalSystem,
    IPhysicalSystemTime,
    ITimePeriod,
    SensorHubServer,
    TimePeriod
} from "../data/Models";
import {fetchDataStreams} from "../net/DataStreamsRequest";
import {findInObject} from "../utils/Utils";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {fetchDataStreamSchema} from "../net/DataStreamSchemaRequest";
import {buildVideoStreams} from "./VideoStreamObservables";
import {buildPliMarkers} from "./PliObservables";
import {buildDrapedImagery} from "./DrapedImageryObservable";

export interface IObservableTypeInfo {
    dataStreamId: string,
    physicalSystem: IPhysicalSystem,
    schema: object,
    definition: string
}

export async function getObservables(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    let systemObservablesMap: Map<string, IObservableTypeInfo[]> = new Map<string, IObservableTypeInfo[]>();

    let dataStreamsResponse = await fetchDataStreams(server, withCredentials);

    let dataStreamInfo = findInObject(dataStreamsResponse, 'items');

    for (let dataStream of dataStreamInfo) {

        let systemId: string = findInObject(dataStream, 'system@id');

        if (systemId !== null) {

            let physicalSystem = getPhysicalSystem(server, systemId);

            if (physicalSystem !== null) {

                let physicalSystemTime: IPhysicalSystemTime = physicalSystem.physicalSystemTime;

                let phenomenonTime: string[] = findInObject(dataStream, 'phenomenonTime')

                if (phenomenonTime) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: phenomenonTime[0],
                        endPosition: phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }
                }

                let dataStreamId = findInObject(dataStream, 'id');

                let schemaResponse = await fetchDataStreamSchema(server, true, dataStreamId);

                let resultSchema = findInObject(schemaResponse, 'resultSchema');

                let definition = findInObject(schemaResponse, 'definition');

                let info: IObservableTypeInfo = {
                    dataStreamId: dataStreamId,
                    physicalSystem: physicalSystem,
                    schema: resultSchema,
                    definition: definition
                }

                let key: string = (physicalSystem.parentSystemUuid === null) ? physicalSystem.uuid : physicalSystem.parentSystemUuid;

                if(systemObservablesMap.has(key)) {

                    systemObservablesMap.get(key).push(info);

                } else {

                    systemObservablesMap.set(key, [info]);
                }
            }
        }
    }

    let observable: IObservable = null;

    systemObservablesMap.forEach((value:IObservableTypeInfo[], key:string) => {

        observable = buildPliMarkers(value);

        if (observable != null) {

            observables.push(observable);
        }

        observable = buildVideoStreams(value);

        if (observable != null) {

            observables.push(observable);
        }

        observable = buildDrapedImagery(value);

        if (observable != null) {

            observables.push(observable);
        }
    } );

    return observables;
}

/**
 * Finds a path to a given by a specific term within the paths returned from discovery
 * @param paths The set of paths received with the discovery data
 * @param term The term or terms to attempt to match
 *
 * @return value String representing the found path
 */
export function findPath(paths: any, term: string): string {

    let value: string = null;

    let targets: string[] = term.split("|");

    for (let targetIdx = 0; value === null && targetIdx < targets.length; ++targetIdx) {

        let target: string = targets[targetIdx].trim();

        for (let pathInfo of paths) {

            if (pathInfo.name === target) {

                value = pathInfo.path;
                break;
            }
        }
    }

    return value;
}

/**
 * Finds a physical system, if any, belonging to the give server with the given id
 * @param server The server to lookup the physical system in
 * @param systemId The id of the physical system being searched for
 *
 * @return null if no physical system is found, otherwise the physical system object
 */
export function getPhysicalSystem(server: SensorHubServer, systemId: string): IPhysicalSystem {

    let physicalSystem: IPhysicalSystem = null;

    for (let system of server.systems) {

        if (system.systemId === systemId) {

            physicalSystem = system;
            break;
        }
    }

    return physicalSystem;
}