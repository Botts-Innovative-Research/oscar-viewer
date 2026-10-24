"use client";

import {LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {
    acquireSharedConnection,
    getRealtimeDataSourceStreamId,
    LaneDSColl,
    type SharedConnectionLease,
} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';
import {setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {EventType} from "osh-js/source/core/event/EventType";
import {removeRealtimeEventSubscription} from "@/lib/data/oscar/RealtimeEventNotification";

interface LaneStatusProps {
    dataSourcesByLane: LaneDSColl;
}

export default function LaneStatus(props: LaneStatusProps) {
    const dispatch = useAppDispatch();
    const idVal = useRef(1);
    const [laneStatus, setLaneStatus] = useState<LaneStatusType>();

    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);

    const updateStatus = useCallback((laneName: string, newState: string) => {
        const newStatus: LaneStatusType = {
            id: idVal.current++,
            name: laneName,
            status: newState
        }
        setLaneStatus(newStatus);
        dispatch(setLastLaneStatus(newStatus))
    }, [dispatch]);

    const addSubscriptionCallbacks = useCallback(() => {
        const gammaHandler = (message: any) => {
            const state = message.values?.[0]?.data?.alarmState;
            if (state !== undefined)
                updateStatus(currentLane, state);
        };
        const neutronHandler = (message: any) => {
            const state = message.values?.[0]?.data?.alarmState;
            if (state !== undefined)
                updateStatus(currentLane, state);
        };
        const tamperHandler = (message: any) => {
            if (message.values?.[0]?.data?.tamperStatus)
                updateStatus(currentLane, 'Tamper');
        };

        const subscriptions: Array<{
            source: any;
            handler: (message: any) => void;
            lease: SharedConnectionLease;
        }> = [];
        const subscribe = (sources: any[], handler: (message: any) => void) => {
            sources.forEach((source) => {
                source.subscribe(handler, [EventType.DATA]);
                const lease = acquireSharedConnection(source);
                subscriptions.push({source, handler, lease});
                void lease.ready.catch((error) => {
                    console.warn("Unable to connect lane status stream", error);
                });
            });
        };

        subscribe(props.dataSourcesByLane.gammaRT, gammaHandler);
        subscribe(props.dataSourcesByLane.neutronRT, neutronHandler);
        subscribe(props.dataSourcesByLane.tamperRT, tamperHandler);

        return () => {
            subscriptions.forEach(({source, handler, lease}) => {
                removeRealtimeEventSubscription(source, handler);
                void lease.release().catch((error) => {
                    console.warn("Unable to disconnect lane status stream", error);
                });
            });
        }
    }, [currentLane, props.dataSourcesByLane, updateStatus]);


    async function fetchLatestStatus(isActive: () => boolean) {

        const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;

        // Just use gamma datasource bc all lanes should have it, and gamma "Background" state is the most common
        const gammaDatasource = currentLaneDatasources.gammaRT[0];
        if (!gammaDatasource) return;

        const gammaDataStreamId = getRealtimeDataSourceStreamId(gammaDatasource);
        if (!gammaDataStreamId) return;

        const dsAPI = new DataStreams({
            endpointUrl: `${gammaDatasource.properties.endpointUrl}`,
            tls: gammaDatasource.properties.tls,
            connectorOpts: gammaDatasource.properties.connectorOpts,
            mqttOpts: gammaDatasource.properties.mqttOpts,
            streamProtocol: 'mqtt'
        });

        const gammaDataStream = await dsAPI.getDataStreamById(gammaDataStreamId);
        const latestObservationQuery = await gammaDataStream.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);
        const latestObservationArray = await latestObservationQuery.nextPage();
        const latestObservation = latestObservationArray[0];

        const initialLaneStatus: LaneStatusType = {
            id: -1,
            name: currentLane,
            status: latestObservation.result.alarmState
        }
        if (isActive())
            setLaneStatus(initialLaneStatus);
    }

    useEffect(() => {
        let active = true;
        if (props.dataSourcesByLane) {
            void fetchLatestStatus(() => active).catch((error) => {
                if (active)
                    console.warn("Unable to fetch latest lane status", error);
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
            {laneStatus && (
                <LaneItem key={laneStatus.id} id={laneStatus.id} name={laneStatus.name} status={laneStatus.status}/>
            )}
        </>
    );
}
