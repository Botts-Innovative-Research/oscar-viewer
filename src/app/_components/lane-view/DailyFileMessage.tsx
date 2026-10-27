"use client";

import {DailyFileType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
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

    const addSubscriptionCallbacks = useCallback(() => {
        const handler = (msg: any) => {
            const state = msg?.values[0].data.result.rpmMessage;
            const timestamp = msg?.values[0].data.resultTime;
            if (state)
                updateMessage(currentLane, state, timestamp);
        };
        props.dataSourcesByLane.addSubscribeHandlerToALLDSMatchingName("dailyFileRT", handler);
        props.dataSourcesByLane.addConnectToALLDSMatchingName("dailyFileRT");

        return () => {
            props.dataSourcesByLane.addDisconnectToALLDSMatchingName("dailyFileRT")
        }
    }, [props.dataSourcesByLane]);

    async function fetchLatestMessage() {
        const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;
        const datasource = currentLaneDatasources.dailyFileRT[0];
        if (!datasource) return;

        try {
            const dsId = datasource.properties.resource.split('/')[2];

            const dsAPI = new DataStreams({
                endpointUrl: `${datasource.properties.endpointUrl}`,
                tls: datasource.properties.tls,
                connectorOpts: datasource.properties.connectorOpts,
                mqttOpts: datasource.properties.mqttOpts,
                streamProtocol: 'mqtt'
            });

            const ds = await dsAPI.getDataStreamById(dsId);
            const latestObservationQuery = await ds.searchObservations( new ObservationFilter({ order: 'desc' }), 15);
            const latestObservationArray = await latestObservationQuery.nextPage();

            console.log('latest obs', latestObservationArray)
            setDailyFileMessages(latestObservationArray
                .filter((observation: any) => observation?.result?.rpmMessage)
                .map((observation: any, index: number) => ({
                    id: index++,
                    name: currentLane,
                    message: observation.result.rpmMessage,
                    timestamp: observation.resultTime
                })))

        } catch (error) {
            console.error("Failed to fetch initial daily file message", error)
        }
    }

    useEffect(() => {
        if (props.dataSourcesByLane)
            fetchLatestMessage();

        addSubscriptionCallbacks();
    }, [props.dataSourcesByLane]);

    function updateMessage(laneName: string, newState: string, timestamp: string) {
        const newStatus: DailyFileType = {
            id: idVal.current++,
            name: laneName,
            message: newState,
            timestamp: timestamp
        }
        setDailyFileMessages(previous => [newStatus, ...previous].slice(0, 15));
    }

    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-content`}
            >
                <Typography variant="body1">
                    {t('rpmMessage', { message: `${dailyFileMessages[0]?.message},${dailyFileMessages[0]?.timestamp}` })}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Stack direction={"column"} alignItems={"flex-start"} spacing={0.5}>
                    {dailyFileMessages.map(message => (
                        <Stack direction={"row"} spacing={0.5}>
                            <Typography
                                variant="body1"
                                key={message.id}
                            >
                                {`${message.message},${message.timestamp}`}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </AccordionDetails>
        </Accordion>
    )
}