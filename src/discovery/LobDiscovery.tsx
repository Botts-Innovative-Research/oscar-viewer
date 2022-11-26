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
import DefaultMarker from "../osh_icons/DefaultMarker.png";
// @ts-ignore
import LineOfBearingLayer from "../layers/LineOfBearingLayer";

export async function discoverLinesOBearing(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    await discover(server, withCredentials, "line_of_bearing")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let lobDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let lobData = fetchFromObject(result, 'line_of_bearing');

                for (let lob of lobData) {

                    let timePeriod: ITimePeriod = new TimePeriod({
                        id: randomUUID(),
                        beginPosition: lob.phenomenonTime[0],
                        endPosition: lob.phenomenonTime[1],
                        isIndeterminateStart: false,
                        isIndeterminateEnd: false
                    });

                    if (timePeriod.beginPosition !== '0') {

                        physicalSystemTime.updateSystemTime(timePeriod);
                    }

                    lobDataSource = new SweApi(physicalSystem.name + "-lob-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address.replace(/^http[s]*:\/\//i, '') + Service.API,
                        resource: `/datastreams/${lob.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let lineOfBearingLayer: LineOfBearingLayer = new LineOfBearingLayer({
                    getLocation: {
                        // @ts-ignore
                        dataSourceIds: [lobDataSource.getId()],
                        handler: function (rec: any) {
                            let locationArray: any = [];

                            let location: any = findInObject(rec, 'location');
                            let lon: any = findInObject(location, 'lon | x');
                            let lat: any = findInObject(location, 'lat | Y');
                            let alt: any = findInObject(location, 'alt | z');

                            let bearing: any = findInObject(rec, 'az | raw-lob') * Math.PI / 180;

                            // Push the start position as lat, lon, alt
                            locationArray.push({
                                x: lon,
                                y: lat,
                                z: alt == undefined ? 0 : alt
                            });

                            // Convert to radians
                            let startPosRadians = {
                                lat: lat * Math.PI / 180,
                                lon: (lon < 0) ? (360 + lon) * Math.PI / 180 : lon * Math.PI / 180,
                                alt: alt
                            };

                            let distanceKm = 5;
                            let earthRadius = 6371

                            // FOR CESIUM MAPS
                            let computedDistance: number = (distanceKm / 6371);

                            // FOR OL MAPS
                            // let computedDistance: number = (distanceKm * 1000 / earthRadius * 1000) / OL_MAP_METERS_PER_UNIT;

                            // Get new endpoint from start point, distance, and earth's radius
                            let endLatRadians = Math.asin(Math.sin(startPosRadians.lat) * Math.cos(computedDistance) + Math.cos(startPosRadians.lat) * Math.sin(computedDistance) * Math.cos(bearing));
                            let endLonRadians = startPosRadians.lon + Math.atan2(Math.sin(bearing) * Math.sin(computedDistance) * Math.cos(startPosRadians.lat), Math.cos(computedDistance) - Math.sin(startPosRadians.lat) * Math.sin(endLatRadians));

                            // FOR CESIUM MAPS
                            let endPosLon: number = endLonRadians * 180 / Math.PI;

                            if (endPosLon > 180) {

                                endPosLon -= 360;
                            }

                            if (endPosLon < -180) {

                                endPosLon += 360;
                            }

                            let endPos = {
                                lat: endLatRadians * 180 / Math.PI,
                                lon: endPosLon,
                                alt: alt
                            };

                            // Push the end position as lat, lon, alt
                            locationArray.push({
                                x: endPos.lon,
                                y: endPos.lat,
                                z: endPos.alt,
                            });

                            return locationArray;
                        }
                    },
                    getPolylineId: {
                        // @ts-ignore
                        dataSourceIds: [lobDataSource.getId()],
                        handler: function (rec: any) {

                            return findInObject(rec, 'frequency');
                        }
                    },
                    getColor: {
                        // @ts-ignore
                        dataSourceIds: [lobDataSource.getId()],
                        handler: function (rec: any) {
                            return colorHash(findInObject(rec, 'frequency'), 0.80).rgba;
                        }
                    },
                    weight: 5,
                    opacity: 0.5,
                    smoothFactor: 1,
                    maxPoints: 2,
                    clampToGround: false
                });


                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [lineOfBearingLayer],
                    dataSources: [lobDataSource],
                    name: "LOB",
                    physicalSystem: physicalSystem,
                    sensorHubServer: server,
                    histogram: [],
                    type: ObservableType.LOB,
                    isConnected: false
                });

                physicalSystem.observables.push(observable);

                observables.push(observable);
            }
        });

    return observables;
}
