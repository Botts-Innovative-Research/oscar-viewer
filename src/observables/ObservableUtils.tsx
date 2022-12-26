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
import {ObservableType} from "../data/Constants";
import {buildVideoStreams} from "./VideoStreamObservables";
import {buildPliMarkers} from "./PliObservables";
import {buildDrapedImagery} from "./DrapedImageryObservable";

export interface IObservableTypeInfo {
    dataStreamId: string,
    physicalSystem: IPhysicalSystem,
    schema: object
}

export async function getObservables(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    let observableTypeInfo: Map<ObservableType, IObservableTypeInfo[]> =
        new Map<ObservableType, IObservableTypeInfo[]>([
            [ObservableType.PLI, []],
            [ObservableType.VIDEO, []],
            [ObservableType.DRAPING, []],
        ]);

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

                let definition: string = findInObject(schemaResponse, 'definition');

                let info: IObservableTypeInfo = {
                    dataStreamId: dataStreamId,
                    physicalSystem: physicalSystem,
                    schema: findInObject(schemaResponse, 'resultSchema')
                }

                if (definition.endsWith('/VideoFrame')) {

                    observableTypeInfo.get(ObservableType.VIDEO).push(info);
                    observableTypeInfo.get(ObservableType.DRAPING).push(info)
                }
                if (definition.endsWith('/Location') ||
                    definition.endsWith('/PlatformLocation') ||
                    definition.endsWith('/SensorLocation')) {

                    observableTypeInfo.get(ObservableType.PLI).push(info)
                    observableTypeInfo.get(ObservableType.DRAPING).push(info)
                }

                if (definition.endsWith('/OrientationQuaternion') ||
                    definition.endsWith('/PlatformOrientation')) {

                    observableTypeInfo.get(ObservableType.PLI).push(info)
                    observableTypeInfo.get(ObservableType.DRAPING).push(info)
                }

                if (definition.endsWith('/GimbalOrientation') ||
                    definition.endsWith('/SensorOrientation')) {

                    observableTypeInfo.get(ObservableType.DRAPING).push(info)
                }
            }
        }
    }

    if (observableTypeInfo.get(ObservableType.PLI).length > 0) {

        observables.push(buildPliMarkers(observableTypeInfo.get(ObservableType.PLI)));
    }

    if (observableTypeInfo.get(ObservableType.VIDEO).length > 0) {

        observables.push(buildVideoStreams(observableTypeInfo.get(ObservableType.VIDEO)));
    }

    if (observableTypeInfo.get(ObservableType.DRAPING).length > 0) {

        observables.push(buildDrapedImagery(observableTypeInfo.get(ObservableType.DRAPING)));
    }

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