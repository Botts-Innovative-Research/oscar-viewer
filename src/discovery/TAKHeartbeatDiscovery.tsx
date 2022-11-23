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
import {fetchFromObject, findInObject} from "../utils/Utils";
import {findPath, getPhysicalSystem} from "./DiscoveryUtils";
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
import TargetMarker from "../icons/target.png";
//@ts-ignore
import {ms} from "milsymbol/src/milsymbol";
//@ts-ignore
import {std2525c} from "milsymbol/src/lettersidc"

import {string} from "prop-types";


export async function discoverTAKHeartbeat(server: SensorHubServer, withCredentials: boolean): Promise<IObservable[]> {

    let observables: IObservable[] = [];

    ms.addIcons(std2525c)
    let milSymbol = new ms.Symbol("SUP*------*****", { size: 30 }).toDataURL();


    await discover(server, withCredentials, "tak_heartbeat")
        .then(discoveryData => {

            let resultSet: any[] = discoveryData["resultSet"]

            for (let result of resultSet) {

                let physicalSystem: IPhysicalSystem = null;
                let physicalSystemTime: IPhysicalSystemTime = null
                let locationDataSource: SweApi = null;

                let systemId = fetchFromObject(result, "systemId");

                physicalSystem = getPhysicalSystem(server, systemId);

                physicalSystemTime = physicalSystem.physicalSystemTime;

                let locationData = fetchFromObject(result, 'tak_heartbeat');

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

                    locationDataSource = new SweApi(physicalSystem.name + "-takheartbeat-dataSource", {
                        protocol: Protocols.WS,
                        endpointUrl: server.address + Service.API,
                        collection: `/datastreams/${location.dataStreamId}/observations`,
                        startTime: REALTIME_START,
                        endTime: REALTIME_FUTURE_END,
                        tls: server.secure
                    });
                }

                let pointMarkerLayer: PointMarkerLayer = new PointMarkerLayer({
                    getMarkerId: {
                        // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            let id: string = findInObject(rec, 'uid');
                            if (id == null) {
                                id = `${physicalSystem.systemId}`;
                            }
                            return id;
                        }
                    },
                    getLocation: {
                        // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            return {
                                x: findInObject(rec, 'lon | x'),
                                y: findInObject(rec, 'lat | y'),
                                z: findInObject(rec, 'alt | z'),
                            }
                        }
                    },
                    // icon: milSymbol,
                    getIcon: {
                        // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            // return '/resources/mil-std-2525/'.concat(findInObject(rec,'icon-ref').toLowerCase(),'.svg');
                            return new ms.Symbol(findInObject(rec,'icon-ref'), {size:30}).toDataURL();
                            // return milSymbol;

                        }
                    },
                    iconAnchor: [24, 20],
                    iconColor: "#FFF",
                    iconSize: [64, 64],
                    getName: {
                        // @ts-ignore
                        dataSourceIds:[locationDataSource.getId()],
                        handler: function (rec: any){
                            return findInObject(rec, 'callsign').trim();
                        }
                    },
                    getLabel: {
                        // @ts-ignore
                        dataSourceIds:[locationDataSource.getId()],
                        handler: function (rec: any){
                            return findInObject(rec, 'callsign');
                        }
                    },
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
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            return {
                                x: findInObject(rec, 'lon | x'),
                                y: findInObject(rec, 'lat | Y'),
                                z: findInObject(rec, 'alt | z'),
                            };
                        }
                    },
                    getPolylineId: {
                        // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any) {
                            let id: string = findInObject(rec, 'id | uid');
                            if (id == null) {
                                id = `${physicalSystem.systemId}`;
                            }
                            return id;
                        }
                    },
                    // color: colorHash(physicalSystem.name, 0.50).rgb,
                    getColor:{
                      // @ts-ignore
                        dataSourceIds: [locationDataSource.getId()],
                        handler: function (rec: any){
                            return colorHash(findInObject(rec, 'uid'), 0.50).rgba
                        }
                    },
                    weight: 10,
                    opacity: .5,
                    smoothFactor: 1,
                    maxPoints: 200
                });

                let observable: IObservable = new Observable({
                    uuid: randomUUID(),
                    layers: [pointMarkerLayer, polylineLayer],
                    dataSources: [locationDataSource],
                    name: "HEARTBEAT",
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
