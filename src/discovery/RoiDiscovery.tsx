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
    TimePeriod, Observable
} from "../data/Models";
import {discover} from "../net/DiscoveryRequest";
import {fetchFromObject, findInObject} from "../utils/Utils";
import {getPhysicalSystem} from "./DiscoveryUtils";
import {Protocols, REALTIME_FUTURE_END, REALTIME_START, Service, ObservableType} from "../data/Constants";
import {colorHash} from "../utils/ColorUtils";
// @ts-ignore
import PolygonLayer from "osh-js/source/core/ui/layer/PolygonLayer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

export async function discoverRegionsOfInterest(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await discover(server, withCredentials, "region_of_interest")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let roiDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let roiData = fetchFromObject(result, 'region_of_interest');

                for (let roi of roiData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: roi.phenomenonTime[0],
                        endPosition: roi.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    roiDataSource = new SweApi(physicalSystem.name + "-roi-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${roi.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let polygonLayer: PolygonLayer = new PolygonLayer({
                    getVertices: {
                        // @ts-ignore
                        dataSourceIds: [roiDataSource.getId()],
                        handler: function (rec: any) {
                            let ulc: any = findInObject(rec, 'ulc')
                            let urc: any = findInObject(rec, 'urc')
                            let llc: any = findInObject(rec, 'llc')
                            let lrc: any = findInObject(rec, 'lrc')
                            return [
                                findInObject(ulc, 'lon | x'),
                                findInObject(ulc, 'lat | y'),
                                findInObject(urc, 'lon | x'),
                                findInObject(urc, 'lat | y'),
                                findInObject(lrc, 'lon | x'),
                                findInObject(lrc, 'lat | y'),
                                findInObject(llc, 'lon | x'),
                                findInObject(llc, 'lat | y'),
                            ];
                        }
                    },
                    outlineColor: 'rgb(0,0,0)',
                    outlineWidth: 1,
                    color: colorHash(physicalSystem.name, 0.25).rgba,
                    opacity: 0.25,
                    clampToGround: true,
                    zIndex: 0
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [polygonLayer],
                    dataSources: [roiDataSource],
                    name: "AOI",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.AOI,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}
