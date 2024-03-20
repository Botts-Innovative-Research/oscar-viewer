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
import {ObservableType, Protocols, FUTURE_END_TIME, START_TIME, Service} from "../data/Constants";
// @ts-ignore
import {
    Cartesian2,
    Cartesian3,
    Matrix3
} from "@cesium/engine";
// @ts-ignore
import ImageDrapingLayer from "osh-js/source/core/ui/layer/ImageDrapingLayer";
// @ts-ignore
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer"
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";

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

        if (definition != null && definition != undefined) {

            return definition.endsWith('/Location') ||
                definition.endsWith('/PlatformLocation') ||
                definition.endsWith('/SensorLocation');

        } else {

            return false;
        }
    });

    // Extract an orientation schema if possible
    let orientationInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/OrientationQuaternion') ||
                definition.endsWith('/PlatformOrientation');

        } else {

            return false;
        }
    });

    let gimbalInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/GimbalOrientation') ||
                definition.endsWith('/SensorOrientation');

        } else {

            return false;
        }
    });

    let videoInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/VideoFrame');

        } else {

            return false;
        }
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
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: useTls
        });

        dataSources.push(locationDataSource);

        orientationDataSource = new SweApi(physicalSystem.name + "-orientation-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${orientationInfo.dataStreamId}/observations`,
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: useTls
        });

        dataSources.push(orientationDataSource);

        gimbalOrientationDataSource = new SweApi(physicalSystem.name + "-gimbal-orientation-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${gimbalInfo.dataStreamId}/observations`,
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: useTls
        });

        dataSources.push(gimbalOrientationDataSource);

        videoDataSource = new SweApi(physicalSystem.name + "-video-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: endpoint,
            resource: `/datastreams/${videoInfo.dataStreamId}/observations`,
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: useTls,
            responseFormat: 'application/swe+binary'
        });

        dataSources.push(videoDataSource);

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
            cameraModel: {
                camProj: new Matrix3(1.893762, 0.0, 0.5,
                    0.0, 2.525016, 0.5,
                    0.0, 0.0, 1.0),
                camDistR: new Cartesian3(0.0, 0.0, 0.0),
                camDistT: new Cartesian2(0.0, 0.0)
            },
            // cameraModel: {
            //     camProj: new Matrix3(747.963 / 1280., 0.0, 650.66 / 1280.,
            //         0.0, 769.576 / 738., 373.206 / 738.,
            //         0.0, 0.0, 1.0),
            //     camDistR: new Cartesian3(-2.644e-01, 8.4e-02, 0.0),
            //     camDistT: new Cartesian2(-8.688e-04, 6.123e-04)
            // },
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
            layers: [imageDrapingLayer, videoDataLayer],
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
