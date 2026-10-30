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
import {EventType} from "osh-js/source/core/event/EventType";
import {removeRealtimeEventSubscription} from "@/lib/data/oscar/RealtimeEventNotification";
import {Stack, Typography} from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

interface MessageProps {
    dataSourcesByLane: LaneDSColl;
}

export default function DailyFileMessage(props: MessageProps) {
    const {t} = useLanguage();
    const idVal = useRef(1);
    const [dailyFileMessages, setDailyFileMessages] = useState<DailyFileType[]>([]);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);

    const updateMessage = useCallback((laneName: string, newState: string, timestamp: string) => {
        const newStatus: DailyFileType = {
            id: idVal.current++,
            name: laneName,
            message: newState,
            timestamp,
        };
        setDailyFileMessages(previous => [newStatus, ...previous].slice(0, 15));
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
            const timestamp = data?.resultTime ?? data?.phenomenonTime ?? "";
            if (state !== undefined && state !== "")
                updateMessage(currentLane, state, timestamp);
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

    const fetchLatestMessage = useCallback(async (isActive: () => boolean) => {
        const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;
        const datasource = currentLaneDatasources.dailyFileRT[0];
        if (!datasource) return;

        const dsId = getRealtimeDataSourceStreamId(datasource)
            || datasource.properties?.resource?.split('/')?.[2];
        if (!dsId) return;

        const dsAPI = new DataStreams({
            endpointUrl: `${datasource.properties.endpointUrl}`,
            tls: datasource.properties.tls,
            connectorOpts: datasource.properties.connectorOpts,
            mqttOpts: datasource.properties.mqttOpts,
            streamProtocol: 'mqtt'
        });

        const ds = await dsAPI.getDataStreamById(dsId);
        const latestObservationQuery = await ds.searchObservations(new ObservationFilter({order: 'desc'}), 15);
        const latestObservationArray = await latestObservationQuery.nextPage();
        if (!isActive() || !Array.isArray(latestObservationArray)) return;

        const messages: DailyFileType[] = latestObservationArray.flatMap((observation: any) => {
            const message = observation?.result?.rpmMessage
                ?? observation?.result?.rapiscanMessage
                ?? observation?.result?.aspectMessage;
            if (!message) return [];
            return [{
                id: idVal.current++,
                name: currentLane,
                message,
                timestamp: observation?.resultTime ?? "",
            }];
        });
        setDailyFileMessages(messages);
    }, [currentLane, props.dataSourcesByLane]);

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
    }, [addSubscriptionCallbacks, fetchLatestMessage, props.dataSourcesByLane]);

    const latestFormatted = dailyFileMessages[0]
        ? `${dailyFileMessages[0].message},${dailyFileMessages[0].timestamp}`
        : "";

    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel-content"
            >
                <Typography variant="body1">
                    {t('rpmMessage', {message: latestFormatted})}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Stack direction="column" alignItems="flex-start" spacing={0.5}>
                    {dailyFileMessages.map(message => (
                        <Stack key={message.id} direction="row" spacing={0.5}>
                            <Typography variant="body1">
                                {`${message.message},${message.timestamp}`}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}
