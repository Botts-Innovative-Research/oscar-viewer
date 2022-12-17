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

import {IObservable, IPhysicalSystem, ISensorHubServer, Observable} from "../data/Models";
import {findInObject} from "../utils/Utils";
import {IObservableTypeInfo} from "./ObservableUtils";
import {ObservableType, Protocols, REALTIME_FUTURE_END, REALTIME_START, Service} from "../data/Constants";
// @ts-ignore
import {Cartesian2, Cartesian3, Matrix3} from "cesium";
import {colorHash} from "../utils/ColorUtils";
// @ts-ignore
import ImageDrapingLayer from "osh-js/source/core/ui/layer/ImageDrapingLayer";
// @ts-ignore
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer"
// @ts-ignore
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";
// @ts-ignore
import Drone from "../assets/models/drone.glb";
// @ts-ignore
import PointMarker from "../assets/models/pointmarker-orient.glb";

export const buildDrapedImagery = (observableTypeInfo: IObservableTypeInfo[]): IObservable => {

    let observable: IObservable = null;

    let locationDataSource: SweApi = null;
    let orientationDataSource: SweApi = null;
    let gimbalOrientationDataSource: SweApi = null;
    let videoDataSource: SweApi = null;
    let dataSources: SweApi[] = [];

    // Extract a location schema if possible
    let locationInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        return definition.endsWith('/Location') || definition.endsWith('PlatformLocation');
    });

    // Extract an orientation schema if possible
    let orientationInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        return definition.endsWith('/OrientationQuaternion') || definition.endsWith('PlatformOrientation');
    });

    let gimbalInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        return definition.endsWith('/GimbalOrientation');
    });

    let videoInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        return definition.endsWith('/VideoFrame');
    });

    if (locationInfo && orientationInfo && gimbalInfo && videoInfo &&
        orientationInfo.physicalSystem.systemId === locationInfo.physicalSystem.systemId &&
        gimbalInfo.physicalSystem.systemId === locationInfo.physicalSystem.systemId) {

        let physicalSystem: IPhysicalSystem = locationInfo.physicalSystem;
        let server: ISensorHubServer = physicalSystem.server;
        let endpoint: string = server.address.replace(/^(http|https):\/\//i, '') + Service.API;
        let useTls: boolean = server.secure;

        locationDataSource = new SweApi(physicalSystem.name + "-location-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${locationInfo.dataStreamId}/observations`,
            startTime: REALTIME_START,
            endTime: REALTIME_FUTURE_END,
            tls: useTls
        });

        dataSources.push(locationDataSource);

        orientationDataSource = new SweApi(physicalSystem.name + "-orientation-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${orientationInfo.dataStreamId}/observations`,
            startTime: REALTIME_START,
            endTime: REALTIME_FUTURE_END,
            tls: useTls
        });

        dataSources.push(orientationDataSource);

        gimbalOrientationDataSource = new SweApi(physicalSystem.name + "-gimbal-orientation-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${gimbalInfo.dataStreamId}/observations`,
            startTime: REALTIME_START,
            endTime: REALTIME_FUTURE_END,
            tls: useTls
        });

        dataSources.push(gimbalOrientationDataSource);

        videoDataSource = new SweApi(physicalSystem.name + "-video-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${videoInfo.dataStreamId}/observations`,
            startTime: REALTIME_START,
            endTime: REALTIME_FUTURE_END,
            tls: useTls,
            responseFormat: 'application/swe+binary'
        });

        dataSources.push(videoDataSource);

        let pointMarkerLayer: PointMarkerLayer = new PointMarkerLayer({
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
            icon: Drone,
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

        let imageDrapingLayer = new ImageDrapingLayer({
            getPlatformLocation: {
                dataSourceIds: [locationDataSource.getId()],
                handler: function (rec: any) {
                    return {
                        x: findInObject(rec, 'lon | x | longitude'),
                        y: findInObject(rec, 'lat | y | latitude'),
                        z: findInObject(rec, 'alt | z | altitude'),
                    };
                }
            },
            getPlatformOrientation: {
                dataSourceIds: [orientationDataSource.getId()],
                handler: function (rec: any) {
                    return {
                        heading: findInObject(rec, 'heading | yaw'),
                        pitch: findInObject(rec, 'pitch'),
                        roll: findInObject(rec, 'roll'),
                    };
                }
            },
            getGimbalOrientation: {
                dataSourceIds: [gimbalOrientationDataSource.getId()],
                handler: function (rec: any) {
                    return {
                        heading: findInObject(rec, 'heading | yaw'),
                        pitch: findInObject(rec, 'pitch'),
                        roll: findInObject(rec, 'roll'),
                    };
                }
            },
            // getCameraModel: {
            //     dataSourceIds: ['DataSource-StaticCameraModel'],
            //     handler: function (rec: any) {
            //         return {
            //             camProj: new Matrix3(747.963 / 1280., 0.0, 650.66 / 1280.,
            //                 0.0, 769.576 / 738., 373.206 / 738.,
            //                 0.0, 0.0, 1.0),
            //             camDistR: new Cartesian3(-2.644e-01, 8.4e-02, 0.0),
            //             camDistT: new Cartesian2(-8.688e-04, 6.123e-04)
            //         };
            //     }
            // },
            // cameraModel: {
            //     camProj: new Matrix3(1.893762, 0.0, 0.5,
            //         0.0, 2.525016, 0.5,
            //         0.0, 0.0, 1.0),
            //     camDistR: new Cartesian3(0.0, 0.0, 0.0),
            //     camDistT: new Cartesian2(0.0, 0.0)
            // },
            cameraModel: {
                camProj: new Matrix3(747.963 / 1280., 0.0, 650.66 / 1280.,
                    0.0, 769.576 / 738., 373.206 / 738.,
                    0.0, 0.0, 1.0),
                camDistR: new Cartesian3(-2.644e-01, 8.4e-02, 0.0),
                camDistT: new Cartesian2(-8.688e-04, 6.123e-04)
            },
        });

        let videoDataLayer = new VideoDataLayer({
            dataSourceId: [videoDataSource.getId()],
            getFrameData: (rec: any) => {
                return rec.img
            },
            getTimestamp: (rec: any) => {
                return rec.timestamp
            }
        });

        observable = new Observable({
            uuid: randomUUID(),
            layers: [pointMarkerLayer, imageDrapingLayer, videoDataLayer],
            dataSources: dataSources,
            name: "DRAPED",
            physicalSystem: physicalSystem,
            sensorHubServer: physicalSystem.server,
            histogram: [],
            type: ObservableType.DRAPING,
            isConnected: false
        });

        physicalSystem.observables.push(observable);
    }

    return observable;
}
