"use client";

import {DailyFileType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {
    acquireSharedConnection,
    getRealtimeDataSourceStreamId,
    LaneDSColl,
    type SharedConnectionLease,
} from "@/lib/data/oscar/LaneCollection";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import DailyFileItem from "@/app/_components/lane-view/DailyFileItem";
import {EventType} from "osh-js/source/core/event/EventType";
import {removeRealtimeEventSubscription} from "@/lib/data/oscar/RealtimeEventNotification";

interface MessageProps {
    dataSourcesByLane: LaneDSColl;
}

export default function DailyFileMessage(props: MessageProps) {
    const idVal = useRef(1);
    const [dailyFileMessage, setDailyFileMessage] = useState<DailyFileType>();

    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);

    const updateMessage = useCallback((laneName: string, newState: string) => {
        const newStatus: DailyFileType = {
            id: idVal.current++,
            name: laneName,
            message: newState,
        };
        setDailyFileMessage(newStatus);
    }, []);

    const addSubscriptionCallbacks = useCallback(() => {
        const handler = (msg: any) => {
            const data = msg?.values?.[0]?.data;
            const state = data?.result?.rpmMessage
                ?? data?.rpmMessage
                ?? data?.result?.rapiscanMessage
                ?? data?.rapiscanMessage
                ?? data?.result?.aspectMessage
                ?? data?.aspectMessage;
            if (state !== undefined)
                updateMessage(currentLane, state);
        };

        const subscriptions: Array<{
            source: any;
            handler: (message: any) => void;
            lease: SharedConnectionLease;
        }> = [];
        props.dataSourcesByLane.dailyFileRT.forEach((source) => {
            source.subscribe(handler, [EventType.DATA]);
            const lease = acquireSharedConnection(source);
            subscriptions.push({source, handler, lease});
            void lease.ready.catch((error) => {
                console.warn("Unable to connect daily file stream", error);
            });
        });

        return () => {
            subscriptions.forEach(({source, handler, lease}) => {
                removeRealtimeEventSubscription(source, handler);
                void lease.release().catch((error) => {
                    console.warn("Unable to disconnect daily file stream", error);
                });
            });
        };
    }, [currentLane, props.dataSourcesByLane, updateMessage]);

    async function fetchLatestMessage(isActive: () => boolean) {
        const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;

        const datasource = currentLaneDatasources.dailyFileRT[0];
        if (!datasource) return;

        const dsId = getRealtimeDataSourceStreamId(datasource);
        if (!dsId) return;

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
        const latestObservation = latestObservationArray?.[0];
        const msg = latestObservation?.result?.rpmMessage
            ?? latestObservation?.result?.rapiscanMessage
            ?? latestObservation?.result?.aspectMessage;
        if (!msg) return;

        const initialMsg: DailyFileType = {
            id: -1,
            name: currentLane,
            message: msg
        };
        if (isActive())
            setDailyFileMessage(initialMsg);
    }

    useEffect(() => {
        let active = true;
        if (props.dataSourcesByLane) {
            void fetchLatestMessage(() => active).catch((error) => {
                if (active)
                    console.warn("Unable to fetch latest daily file message", error);
            });
        }

        const removeSubscriptions = addSubscriptionCallbacks();
        return () => {
            active = false;
            removeSubscriptions();
        };
    }, [addSubscriptionCallbacks, props.dataSourcesByLane]);

    return (
        <>
            { dailyFileMessage && (
                <DailyFileItem key={dailyFileMessage.id} id={dailyFileMessage.id} name={dailyFileMessage.name} message={dailyFileMessage.message}/>
            )}
        </>
    );
}
