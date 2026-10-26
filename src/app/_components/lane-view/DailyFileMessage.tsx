"use client";

import {DailyFileType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import DailyFileItem from "@/app/_components/lane-view/DailyFileItem";
import {setAlarmTrigger} from "@/lib/state/EventDataSlice";
import {EventType} from "osh-js/source/core/event/EventType";

interface MessageProps {
    dataSourcesByLane: LaneDSColl;
}

export default function DailyFileMessage(props: MessageProps) {
    const idVal = useRef(1);
    const [dailyFileMessage, setDailyFileMessage] = useState<DailyFileType>();

    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);

    // const addSubscriptionCallbacks = useCallback(() => {
    //     console.log('he', props.dataSourcesByLane.dailyFileRT)
    //
    //     props.dataSourcesByLane.addSubscribeHandlerToALLDSMatchingName(
    //         "dailyFileRT",
    //         (message: any) => console.log("daily-file MQTT payload", message),
    //     );
    //
    //     props.dataSourcesByLane.addConnectToALLDSMatchingName("dailyFileRT");
    //
    // }, [props.dataSourcesByLane]);

    useEffect(() => {
        const source = props.dataSourcesByLane?.dailyFileRT[0];
        if (!source) return;

        const handler = (msg: any) => {
            console.log("daily-file MQTT payload", msg);
            const state = msg?.values[0].data.result.rapiscanMessage ?? msg?.values[0].data.result.aspectMessage;

            updateMessage(currentLane, state);
        };

        source.subscribe(handler, [EventType.DATA]);

        void source.connect()
            .then(() => console.log("daily-file MQTT connected", source.properties.resource))
            .catch((error: any) => console.error("daily-file MQTT failed", error));

        return () => {
            void source.disconnect();
        };
    }, [props.dataSourcesByLane]);

    async function fetchLatestMessage() {
        const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;

        const datasource = currentLaneDatasources.dailyFileRT[0];
        if (!datasource) return;

        const dsId = datasource.properties.resource.split('/')[2];

        const dsAPI = new DataStreams({
            endpointUrl: `${datasource.properties.endpointUrl}`,
            tls: datasource.properties.tls,
            connectorOpts: datasource.properties.connectorOpts,
            mqttOpts: datasource.properties.mqttOpts,
            streamProtocol: 'mqtt'
        });

        const ds = await dsAPI.getDataStreamById(dsId);
        const latestObservationQuery = await ds.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);
        const latestObservationArray = await latestObservationQuery.nextPage();
        const latestObservation = latestObservationArray[0];

        const initialMsg: DailyFileType = {
            id: -1,
            name: currentLane,
            message: latestObservation.result.rpmMessage;
        }
        setDailyFileMessage(initialMsg);
    }

    useEffect(() => {
        if (props.dataSourcesByLane)
            fetchLatestMessage();

        // addSubscriptionCallbacks();
    }, [props.dataSourcesByLane]);

    function updateMessage(laneName: string, newState: string) {
        const newStatus: DailyFileType = {
            id: idVal.current++,
            name: laneName,
            message: newState,
        }
        setDailyFileMessage(newStatus);
    }

    return (
        <>
            { dailyFileMessage && (
                <DailyFileItem key={dailyFileMessage.id} id={dailyFileMessage.id} name={dailyFileMessage.name} message={dailyFileMessage.message}/>
            )}
        </>

    );
}