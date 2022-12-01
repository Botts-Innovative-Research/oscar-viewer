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
    Observable,
    SensorHubServer,
    TimePeriod
} from "../../data/Models";
import {fetchFromObject} from "../../utils/Utils";
import {getPhysicalSystem} from "./ObservableUtils";
import {fetchObservables} from "../ObservablesRequest";
import {ObservableType, Protocols, REALTIME_FUTURE_END, REALTIME_START, Service} from "../../data/Constants";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

export async function getObservableImages(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await fetchObservables(server, withCredentials, "image")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"];

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null;
                let imageDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let imageData = fetchFromObject(result, 'image');

                for (let image of imageData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: image.phenomenonTime[0],
                        endPosition: image.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    imageDataSource = new SweApi(physicalSystem.name + "-image-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${image.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let uuid = randomUUID();

                // **************************************************
                // DEFER VIEW CREATION UNTIL "container" IS CREATED
                // **************************************************

                let observable: IObservable = new Observable({
                    uuid: uuid,
                    layers: [],
                    dataSources: [imageDataSource],
                    name: "IMAGES",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.IMAGE,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}