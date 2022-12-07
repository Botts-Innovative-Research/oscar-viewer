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
import {fetchFromObject, findInObject} from "../../utils/Utils";
import {getPhysicalSystem} from "./ObservableUtils";
import {ObservableType, Protocols, REALTIME_FUTURE_END, REALTIME_START, Service} from "../../data/Constants";
import {fetchObservables} from "../ObservablesRequest";
import {Cartesian2, Cartesian3, Matrix3} from "cesium";
import {colorHash} from "../../utils/ColorUtils";
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
import Drone from "../../assets/models/drone.glb";
// @ts-ignore
import PointMarker from "../../assets/models/pointmarker-orient.glb";

export async function getObservableDrapedImagery(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await fetchObservables(server, withCredentials, "location,orientation,sensor_orientation,video")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let locationDataSource: SweApi = null;
                let orientationDataSource: SweApi = null;
                let gimbalOrientationDataSource: SweApi = null;
                let videoDataSource: SweApi = null;
                let dataSources: SweApi[] = [];

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let locationData = fetchFromObject(result, 'location');

                if (locationData != null) {

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
                            endpointUrl: server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                            resource: `/datastreams/${location.dataStreamId}/observations`,
                            startTime: REALTIME_START,
                            endTime: REALTIME_FUTURE_END,
                            tls: server.secure
                        });

                        dataSources.push(locationDataSource);
                    }
                }

                let orientationData: any = fetchFromObject(result, 'orientation');

                // If orientation data is available build the data source for it
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
                            endpointUrl: server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                            resource: `/datastreams/${orientation.dataStreamId}/observations`,
                            startTime: REALTIME_START,
                            endTime: REALTIME_FUTURE_END,
                            tls: server.secure
                        });

                        dataSources.push(orientationDataSource);
                    }
                }

                let gimbalOrientationData: any = fetchFromObject(result, 'sensor_orientation');

                // If orientation data is available build the data source for it
                if (gimbalOrientationData != null) {

                    for (let gimbalOrientation of gimbalOrientationData) {

                        let timePeriod: ITimePeriod = new TimePeriod({
                            id: randomUUID(),
                            beginPosition: gimbalOrientation.phenomenonTime[0],
                            endPosition: gimbalOrientation.phenomenonTime[1],
                            isIndeterminateStart: false,
                            isIndeterminateEnd: false
                        });

                        if (timePeriod.beginPosition !== '0') {

                            physicalSystemTime.updateSystemTime(timePeriod);
                        }

                        gimbalOrientationDataSource = new SweApi(physicalSystem.name + "-sensor-orientation-dataSource", {
                            protocol: Protocols.WS,
                            endpointUrl: server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                            resource: `/datastreams/${gimbalOrientation.dataStreamId}/observations`,
                            startTime: REALTIME_START,
                            endTime: REALTIME_FUTURE_END,
                            tls: server.secure
                        });

                        dataSources.push(gimbalOrientationDataSource);
                    }
                }

                let videoData = fetchFromObject(result, 'video');

                if (videoData != null) {

                    let encoding: string = "H264";

                    for (let video of videoData) {

                        encoding = video['encoding'];

                        let timePeriod: ITimePeriod = new TimePeriod({
                            id: randomUUID(),
                            beginPosition: video.phenomenonTime[0],
                            endPosition: video.phenomenonTime[1],
                            isIndeterminateStart: false,
                            isIndeterminateEnd: false
                        });

                        if (timePeriod.beginPosition !== '0') {

                            physicalSystemTime.updateSystemTime(timePeriod);
                        }

                        if (encoding === 'JPEG') {

                            videoDataSource = new SweApi(physicalSystem.name + "-image-dataSource", {
                                protocol: Protocols.WS,
                                endpointUrl: server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                                resource: `/datastreams/${video.dataStreamId}/observations`,
                                startTime: REALTIME_START,
                                endTime: REALTIME_FUTURE_END,
                                tls: server.secure,
                                responseFormat: 'application/swe+binary'
                            });

                        } else {

                            videoDataSource = new SweApi(physicalSystem.name + "-video-dataSource", {
                                protocol: Protocols.WS,
                                endpointUrl: server.address.replace(/^(http|https):\/\//i, '') + Service.API,
                                resource: `/datastreams/${video.dataStreamId}/observations`,
                                startTime: REALTIME_START,
                                endTime: REALTIME_FUTURE_END,
                                tls: server.secure,
                                responseFormat: 'application/swe+binary'
                            });
                        }

                        dataSources.push(videoDataSource);
                    }
                }

                if (locationDataSource && orientationDataSource && gimbalOrientationDataSource && videoDataSource) {

                    let pointMarkerLayer = new PointMarkerLayer({
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

                    let observable: IObservable = new Observable({
                        uuid: randomUUID(),
                        layers: [pointMarkerLayer, imageDrapingLayer, videoDataLayer],
                        dataSources: dataSources,
                        name: "DRAPED",
                        physicalSystem: physicalSystem,
                        sensorHubServer: server,
                        histogram: [],
                        type: ObservableType.DRAPING,
                        isConnected: false
                    });

                    physicalSystem.observables.push(observable);

                    observables.push(observable);
                }
            }
        });

    return observables;
}
