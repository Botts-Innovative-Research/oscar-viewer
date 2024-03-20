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

import {IObservable, Observable} from "../data/Models";
import {findInObject} from "../utils/Utils";
import {ObservableType, Protocols, FUTURE_END_TIME, START_TIME, Service} from "../data/Constants";
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
// @ts-ignore
import UGV from "../assets/models/ugv.glb";
// @ts-ignore
import DRONE from "../assets/models/drone.glb";
import {IObservableTypeInfo} from "./ObservableUtils";
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";

export const buildPliMarkers = (observableTypeInfo: IObservableTypeInfo[]): IObservable => {

    let observable: IObservable = null;

    let locationDataSource: SweApi = null;
    let orientationDataSource: SweApi = null;
    let dataSources: SweApi[] = [];

    // Extract a location schema if possible
    let locationInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/Location') ||
                definition.endsWith('/PlatformLocation') ||
                definition.endsWith('/SensorLocation') ||
                definition.endsWith('/GPS');

        } else {

            return false;
        }
    });

    // Extract an orientation schema if possible
    let orientationInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/OrientationQuaternion') || definition.endsWith('/PlatformOrientation');

        } else {

            return false;
        }
    });

    if (locationInfo) {

        let physicalSystem = locationInfo.physicalSystem;

        locationDataSource = new SweApi(locationInfo.physicalSystem.name + "-location-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: physicalSystem.server.address.replace(/^(http|https):\/\//i, '') + Service.API,
            resource: `/datastreams/${locationInfo.dataStreamId}/observations`,
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: physicalSystem.server.secure
        });

        dataSources.push(locationDataSource);

        // If orientation data is available build the data source for it
        if (orientationInfo && orientationInfo.physicalSystem.systemId === locationInfo.physicalSystem.systemId) {

            orientationDataSource = new SweApi(orientationInfo.physicalSystem.name + "-orientation-dataSource", {
                protocol: Protocols.WS,
                endpointUrl: orientationInfo.physicalSystem.server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                resource: `/datastreams/${orientationInfo.dataStreamId}/observations`,
                startTime: START_TIME,
                endTime: FUTURE_END_TIME,
                mode: Mode.REPLAY,
                tls: orientationInfo.physicalSystem.server.secure
            });

            dataSources.push(orientationDataSource);
        }

        let pointMarkerLayer: PointMarkerLayer;

        if (orientationDataSource) {

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
                icon: physicalSystem.name.includes('UGV') ? UGV :
                    physicalSystem.name.includes('UAS') ? DRONE : PointMarker,
                // iconAnchor: [16, 64],
                iconSize: [32, 32],
                color: colorHash(physicalSystem.name).rgba,
                name: physicalSystem.name,
                label: physicalSystem.name,
                labelOffset: [0, 20],
                labelColor: 'rgba(255,255,255,1.0)',
                labelOutlineColor: 'rgba(0,0,0,1.0)',
                labelBackgroundColor: 'rgba(236,236,236,0.5)',
                labelSize: 25,
                defaultToTerrainElevation: false,
                zIndex: 1,
                iconScale: 1
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
                icon: physicalSystem.name.includes('UGV') ? UGV :
                    physicalSystem.name.includes('UAS') ? DRONE : PointMarkerNoOrientation,
                // iconAnchor: [16, 64],
                iconSize: [32, 32],
                color: colorHash(physicalSystem.name).rgba,
                name: physicalSystem.name,
                label: physicalSystem.name,
                labelOffset: [0, 20],
                labelColor: 'rgba(255,255,255,1.0)',
                labelOutlineColor: 'rgba(0,0,0,1.0)',
                labelBackgroundColor: 'rgba(236,236,236,0.5)',
                labelSize: 25,
                defaultToTerrainElevation: false,
                zIndex: 1,
                iconScale: 1
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

        observable = new Observable({
            uuid: randomUUID(),
            layers: [pointMarkerLayer, polylineLayer],
            dataSources: dataSources,
            name: "PLI",
            physicalSystem: physicalSystem,
            sensorHubServer: physicalSystem.server,
            histogram: [],
            type: ObservableType.PLI,
            isConnected: false
        });

        physicalSystem.observables.push(observable);
    }

    return observable;
}
