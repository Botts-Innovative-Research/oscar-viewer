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
} from "../data/Models";
import {fetchFromObject, findInObject} from "../utils/Utils";
import {getPhysicalSystem} from "./ObservableUtils";
import {ObservableType, Protocols, REALTIME_FUTURE_END, REALTIME_START, Service} from "../data/Constants";
import {fetchObservables} from "../net/ObservablesRequest";
import {colorHash} from "../utils/ColorUtils";
// @ts-ignore
import EllipseLayer from "osh-js/source/core/ui/layer/EllipseLayer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

export async function getObservableEllipses(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await fetchObservables(server, withCredentials, "ellipse")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let ellipseDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let ellipseData = fetchFromObject(result, 'ellipse');

                for (let ellipse of ellipseData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: ellipse.phenomenonTime[0],
                        endPosition: ellipse.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    ellipseDataSource = new SweApi(physicalSystem.name + "-ellipse-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${ellipse.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let ellipseLayer: EllipseLayer = new EllipseLayer({
                    getEllipseID: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            return findInObject(rec, 'frequency | uid | mac-address');
                        }
                    },
                    getPosition: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            let location: any = findInObject(rec, 'location | cep-coords')
                            return {
                                x: findInObject(location, 'lon | x'),
                                y: findInObject(location, 'lat | y'),
                                z: findInObject(location, 'alt | z'),
                            }
                        }
                    },
                    getSemiMajorAxis: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            let major: any = findInObject(rec, 'ellipse-axis-0');
                            if (major == null) {
                                let ellipse: any = findInObject(rec, 'ellipse | cep-ellipse');
                                major = findInObject(ellipse, 'major');
                            }

                            return major; // / OL_MAP_METERS_PER_UNIT;
                        }
                    },
                    getSemiMinorAxis: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            let minor: any = findInObject(rec, 'ellipse-axis-1');
                            if (minor == null) {
                                let ellipse: any = findInObject(rec, 'ellipse | cep-ellipse');
                                minor = findInObject(ellipse, 'minor');
                            }

                            // For OpenLayers need to convert meters to map units
                            return minor; // / OL_MAP_METERS_PER_UNIT;
                        }
                    },
                    getHeight: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            return findInObject(rec, 'height | alt');
                        }
                    },
                    getRotation: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            let rotation: any = findInObject(rec, 'ellipse-angle');
                            if (rotation == null) {
                                let ellipse: any = findInObject(rec, 'ellipse | cep-ellipse');
                                rotation = findInObject(ellipse, 'angle');
                            }
                            return rotation;
                        }
                    },
                    getColor: {
                        // @ts-ignore
                        dataSourceIds: [ellipseDataSource.getId()],
                        handler: function (rec: any) {
                            let term: any = findInObject(rec, 'frequency | uid | mac-address');
                            return colorHash(term, 0.50).rgba;
                        }
                    },
                    color: 'rgba(255,74,22, 0.5)',
                    semiMinorAxis: 100,
                    semiMajorAxis: 100,
                    name: physicalSystem.systemId,
                    id: physicalSystem.name,
                    label: physicalSystem.name,
                    labelOffset: [0, 20],
                    labelColor: 'rgba(255,255,255,1.0)',
                    labelOutlineColor: 'rgba(0,0,0,1.0)',
                    labelBackgroundColor: 'rgba(236,236,236,0.5)',
                    labelSize: 25,
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [ellipseLayer],
                    dataSources: [ellipseDataSource],
                    name: "ELLIPSE",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.SIGINT,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}
