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
import PointMarker from "../assets/models/pointmarker-orient.glb";
// @ts-ignore
import PointMarkerNoOrientation from "../assets/models/pointmarker.glb";

export async function discoverPointMarkers(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await discover(server, withCredentials, "location,orientation")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let locationDataSource: SweApi = null;
                let orientationDataSource: SweApi = null;
                let dataSources: SweApi[] = [];

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let locationData = fetchFromObject(result, 'location');

                for (let location of locationData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: location.phenomenonTime[0],
                        endPosition: location.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    locationDataSource = new SweApi(physicalSystem.name + "-location-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${location.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });

                    dataSources.push(locationDataSource);
                }

                let orientationData: any = fetchFromObject(result, 'orientation');

                // If orientation data is is available build the data source for it
                if (orientationData != null) {

                    for (let orientation of orientationData) {

                        let timePeriod: ITimePeriod = new TimePeriod({
                            id: randomUUID(),
                            beginPosition: orientation.phenomenonTime[0],
                            endPosition: orientation.phenomenonTime[1],
                            isIndeterminateStart: false,
                            isIndeterminateEnd: false
                        });

                        if (timePeriod.beginPosition !== '0') {

                            physicalSystemTime.updateSystemTime(timePeriod);
                        }

                        orientationDataSource = new SweApi(physicalSystem.name + "-orientation-dataSource", {
                            protocol: Protocols.WS,
                            endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                            resource: `/datastreams/${orientation.dataStreamId}/observations`,
                            startTime: REALTIME_START,
                            endTime: REALTIME_FUTURE_END,
                            tls: server.secure
                        });

                        dataSources.push(orientationDataSource);
                    }
                }

                let pointMarkerLayer: PointMarkerLayer;

                // If orientation data source is is not available build the point marker layer without orientation
                if (orientationDataSource == null) {

                    pointMarkerLayer = new PointMarkerLayer({
                        getMarkerId: {
                            // @ts-ignore
                            dataSourceIds: [locationDataSource.getId()],
                            handler: function (rec: any) {
                                let id: string = findInObject(rec, 'id | uid | source');
                                if (id == null) {
                                    id = `${physicalSystem.uuid}`;
                                }
                                return id;
                            }
                        },
                        getLocation: {
                            // @ts-ignore
                            dataSourceIds: [locationDataSource.getId()],
                            handler: function (rec: any) {
                                return {
                                    x: findInObject(rec, 'lon | x | longitude'),
                                    y: findInObject(rec, 'lat | y | latitude'),
                                    z: findInObject(rec, 'alt | z | altitude'),
                                }
                            }
                        },
                        icon: PointMarkerNoOrientation,
                        // iconAnchor: [16, 64],
                        iconSize: [32, 32],
                        color: colorHash(physicalSystem.name).rgba,
                        name: physicalSystem.systemId,
                        label: physicalSystem.name,
                        labelOffset: [0, 20],
                        labelColor: 'rgba(255,255,255,1.0)',
                        labelOutlineColor: 'rgba(0,0,0,1.0)',
                        labelBackgroundColor: 'rgba(236,236,236,0.5)',
                        labelSize: 25,
                        defaultToTerrainElevation: false,
                        zIndex: 1
                    });

                } else {

                    pointMarkerLayer = new PointMarkerLayer({
                        getMarkerId: {
                            // @ts-ignore
                            dataSourceIds: [locationDataSource.getId()],
                            handler: function (rec: any) {
                                let id: string = findInObject(rec, 'id | uid | source');
                                if (id == null) {
                                    id = `${physicalSystem.uuid}`;
                                }
                                return id;
                            }
                        },
                        getLocation: {
                            // @ts-ignore
                            dataSourceIds: [locationDataSource.getId()],
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
                            dataSourceIds: [orientationDataSource.getId()],
                            handler: function (rec: any) {
                                let orientation: any = findInObject(rec, 'heading');
                                if (orientation !== null) {
                                    return {
                                        heading: findInObject(rec, 'heading'),
                                    }
                                } else {
                                    return {
                                        heading: findInObject(rec, 'yaw'),
                                    }
                                }
                            }
                        },
                        icon: PointMarker,
                        // iconAnchor: [16, 64],
                        iconSize: [32, 32],
                        color: colorHash(physicalSystem.name).rgba,
                        name: physicalSystem.systemId,
                        label: physicalSystem.name,
                        labelOffset: [0, 20],
                        labelColor: 'rgba(255,255,255,1.0)',
                        labelOutlineColor: 'rgba(0,0,0,1.0)',
                        labelBackgroundColor: 'rgba(236,236,236,0.5)',
                        labelSize: 25,
                        defaultToTerrainElevation: false,
                        zIndex: 1
                    });
                }

                let polylineLayer = new PolylineLayer({
                    getLocation: {
                        // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
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
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            let id: string = findInObject(rec, 'id | uid | source');
                            if (id == null) {
                                id = `${physicalSystem.uuid}`;
                            }
                            return id;
                        }
                    },
                    color: colorHash(physicalSystem.name, 0.50).rgba,
                    weight: 5,
                    opacity: .5,
                    smoothFactor: 1,
                    maxPoints: 200,
                    zIndex: 0
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [pointMarkerLayer, polylineLayer],
                    dataSources: dataSources,
                    name: "PLI",
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
