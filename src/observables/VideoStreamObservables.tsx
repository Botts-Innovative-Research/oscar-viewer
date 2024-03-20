/*
 * Copyright (c) 2022-2024.  Botts Innovative Research, Inc.
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
import {ObservableType, Protocols, FUTURE_END_TIME, START_TIME, Service} from "../data/Constants";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";
// @ts-ignore
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer"
import {IObservableTypeInfo} from "./ObservableUtils";
import {findInObject} from "../utils/Utils";
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";

export const buildVideoStreams = (observableTypeInfo: IObservableTypeInfo[]): IObservable => {

    let observable: IObservable = null;

    let videoInfo: IObservableTypeInfo = observableTypeInfo.find(info => {

        let definition = findInObject(info.schema, 'definition');

        if (definition != null && definition != undefined) {

            return definition.endsWith('/VideoFrame');

        } else {

            return false;
        }
    });

    if (videoInfo) {

        let dataSource: SweApi = new SweApi(videoInfo.physicalSystem.name + "-video-dataSource", {
            protocol: Protocols.WS,
            endpointUrl: videoInfo.physicalSystem.server.address.replace(/^(http|https):\/\//i, '') + Service.API,
            resource: `/datastreams/${videoInfo.dataStreamId}/observations`,
            startTime: START_TIME,
            endTime: FUTURE_END_TIME,
            mode: Mode.REPLAY,
            tls: videoInfo.physicalSystem.server.secure,
            responseFormat: 'application/swe+binary'
        });

        let videoDataLayer = new VideoDataLayer({
            dataSourceId: [dataSource.getId()],
            getFrameData: (rec: any) => {
                return rec.img
            },
            getTimestamp: (rec: any) => {
                return rec.timestamp
            }
        });

        observable = new Observable({
            uuid: randomUUID(),
            layers: [videoDataLayer],
            dataSources: [dataSource],
            name: "VIDEO",
            physicalSystem: videoInfo.physicalSystem,
            sensorHubServer: videoInfo.physicalSystem.server,
            histogram: [],
            type: ObservableType.VIDEO,
            isConnected: false
        });

        videoInfo.physicalSystem.observables.push(observable);
    }

    return observable;
}