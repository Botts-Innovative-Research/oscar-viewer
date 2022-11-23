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
    IPhysicalSystem,
    IPhysicalSystemTime,
    ITimePeriod,
    IObservable,
    SensorHubServer,
    TimePeriod,
    Observable
} from "../data/Models";
import {fetchFromObject, findInObject} from "../utils/Utils";
import {getPhysicalSystem} from "./DiscoveryUtils";
import {Protocols, REALTIME_FUTURE_END, REALTIME_START, Service, ObservableType} from "../data/Constants";
import {discover} from "../net/DiscoveryRequest";
// @ts-ignore
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

export async function discoverCharts(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await discover(server, withCredentials, "alt_chart")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let dataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let chartData = fetchFromObject(result, 'alt_chart');

                for (let data of chartData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: data.phenomenonTime[0],
                        endPosition: data.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    dataSource = new SweApi(physicalSystem.name + "-chart-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address + Service.API,
                        collection: `/datastreams/${data.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let curveLayer = new CurveLayer({
                    getValues: {
                        dataSourceIds: [dataSource.getId()],
                        handler: (rec: any, timeStamp: any) => {
                            let time: any = findInObject(rec, 'time | Time');
                            if (time == null) {
                                time = timeStamp;
                            }
                            let location: any = findInObject(rec, 'location');
                            let yValues: any = findInObject(location, 'alt | height');
                            return {
                                x: time,
                                y: yValues
                            };
                        }
                    },
                    lineColor: 'rgba(0,220,204,0.5)',
                    backgroundColor: 'rgba(0,220,204,0.5)',
                    fill:true,
                    name: "ALT | HEIGHT"
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [curveLayer],
                    dataSources: [dataSource],
                    name: "CHART",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.CHART,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}
