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
import {colorHash} from "../utils/ColorUtils";
// @ts-ignore
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
// @ts-ignore
import PolylineLayer from "osh-js/source/core/ui/layer/PolylineLayer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";
// @ts-ignore
import PointMarker from "../icons/pointmarker.png";
// @ts-ignore
import PointMarkerNoOrientation from "../icons/pointmarker-no-orientation.png";

export async function discoverUnifiedTracks(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await discover(server, withCredentials, "unified_tracks")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let trackDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let trackData = fetchFromObject(result, 'unified_tracks');

                for (let track of trackData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: track.phenomenonTime[0],
                        endPosition: track.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    trackDataSource = new SweApi(physicalSystem.name + "-track-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${track.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let pointMarkerLayer: PointMarkerLayer = new PointMarkerLayer({
                    getLabel: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            let label: string = findInObject(rec, 'transponder_id | imei');
                            if (label != null) {
                                label = 'UNIFIED TRACK: ' + label;
                            } else {
                                label = 'UNIFIED TRACK: Unknown';
                            }
                            return label;
                        }
                    },
                    getMarkerId: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            let id: string = findInObject(rec, 'transponder_id | imei');
                            if (id == null) {
                                id = `${physicalSystem.uuid}`;
                            }
                            return id;
                        }
                    },
                    getLocation: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            return {
                                x: findInObject(rec, 'lon | x | longitude'),
                                y: findInObject(rec, 'lat | y | latitude'),
                                z: findInObject(rec, 'alt | z | altitude'),
                            }
                        }
                    },
                    getOrientation: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            return {
                                heading: findInObject(rec, 'course'),
                            }
                        }
                    },
                    icon: PointMarkerNoOrientation,
                    // iconAnchor: [16, 64],
                    iconSize: [32, 32],
                    // iconColor: colorHash(physicalSystem.name).rgba,
                    getIconColor: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            let label: string = findInObject(rec, 'transponder_id | imei');
                            if (label != null) {
                                label = 'UNIFIED TRACK: ' + label;
                            } else {
                                label = physicalSystem.name;
                            }
                            return colorHash(label).rgba;
                        }
                    },
                    name: physicalSystem.systemId,
                    label: physicalSystem.name,
                    labelOffset: [0, 20],
                    labelColor: 'rgba(255,255,255,1.0)',
                    labelOutlineColor: 'rgba(0,0,0,1.0)',
                    labelBackgroundColor: 'rgba(0,0,0,1.0)',
                    labelSize: 50,
                    defaultToTerrainElevation: false,
                    zIndex: 1
                });

                let polylineLayer = new PolylineLayer({
                    getLocation: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            return {
                                x: findInObject(rec, 'lon | x | longitude'),
                                y: findInObject(rec, 'lat | y | latitude'),
                                z: findInObject(rec, 'alt | z | altitude'),
                            };
                        }
                    },
                    getPolylineId: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            let id: string = findInObject(rec, 'transponder_id | imei');
                            if (id == null) {
                                id = `${physicalSystem.systemId}`;
                            }
                            return id;
                        }
                    },
                    // color: colorHash(physicalSystem.name, 0.50).rgba,
                    getColor: {
                        // @ts-ignore
                        dataSourceIds: [trackDataSource.getId()],
                        handler: function (rec: any) {
                            let label: string = findInObject(rec, 'transponder_id | imei');
                            if (label != null) {
                                label = 'UNIFIED TRACK: ' + label;
                            } else {
                                label = physicalSystem.name;
                            }
                            return colorHash(label, 0.50).rgba;
                        }
                    },
                    weight: 10,
                    opacity: .5,
                    smoothFactor: 1,
                    maxPoints: 200,
                    zIndex: 0
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [pointMarkerLayer, polylineLayer],
                    dataSources: [trackDataSource],
                    name: "UNIFIED TRACKS",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.PLI,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}
