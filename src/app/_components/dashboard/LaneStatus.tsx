"use client";

import {Box, Grid, Stack, Typography} from '@mui/material';
import LaneStatusItem from './LaneStatusItem';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {setCurrentLane} from '@/lib/state/LaneViewSlice';
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import {setAlarmTrigger} from "@/lib/state/EventDataSlice";
import {useLanguage} from "@/contexts/LanguageContext";


export interface LaneStatusProps {
    id: number;
    name: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;
}

export default function LaneStatus(props: { dataSourcesByLane: any, initialLanes: any[] }) {
    const idVal = useRef(1);
    const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);

    let timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    let alarmStates = ['Alarm', 'Scan', 'Background']

    const dispatch = useAppDispatch();
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        setStatusList(props.initialLanes);

        return () => {
            if (timersRef.current) {
                // clean up timers
                for (const timeout of timersRef.current.values()) {
                    clearTimeout(timeout);
                }
                timersRef.current.clear();
            }
        };
    }, [props.initialLanes]);

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of props.dataSourcesByLane.entries()) {

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('connectionRT', (message: any) => {
                const state = message.values[0].data.isConnected;


                if (state == undefined)
                    return;
                updateStatus(laneName, (state ? 'Online' : 'Offline'));
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                const state = message.values[0].data.alarmState;

                if (state == undefined)
                    return;

                if (state === 'Alarm')
                    // trigger alarm  for new event
                    dispatch(setAlarmTrigger(true));
                updateStatus(laneName, state);
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                const state = message.values[0].data.alarmState;

                if (state == undefined)
                    return;

                if (state === 'Alarm')
                    // trigger alarm  for new event
                    dispatch(setAlarmTrigger(true));
                updateStatus(laneName, state);
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                const state = message.values[0].data.tamperStatus;

                if (state == undefined)
                    return;
                updateStatus(laneName, (state ? 'Tamper' : 'TamperOff'));
            });

            // connect to only necessary datasources
            laneDSColl.addConnectToALLDSMatchingName('connectionRT');
            laneDSColl.addConnectToALLDSMatchingName('tamperRT');
            laneDSColl.addConnectToALLDSMatchingName('neutronRT');
            laneDSColl.addConnectToALLDSMatchingName('gammaRT');
        }

        return () => {
            for (let [laneName, laneDSColl] of props.dataSourcesByLane.entries()) {
                laneDSColl.addDisconnectToALLDSMatchingName('connectionRT');
                laneDSColl.addDisconnectToALLDSMatchingName('tamperRT');
                laneDSColl.addDisconnectToALLDSMatchingName('neutronRT');
                laneDSColl.addDisconnectToALLDSMatchingName('gammaRT');
            }
        }

    }, [props.dataSourcesByLane]);

    useEffect(() => {
        addSubscriptionCallbacks();
    }, [props.dataSourcesByLane]);


    function updateStatus(laneName: string, newState: string) {
        // clear the existing timer for this lane
        if (timersRef.current.has(laneName)) {
            clearTimeout(timersRef.current.get(laneName));
            timersRef.current.delete(laneName)
        }

        setStatusList((prevList) => {
            let existingLane = prevList.find((lane) => lane.name === laneName)

            if (existingLane) {
                const updatedList = prevList.map((laneData) => {
                    if (laneData.name !== laneName) return laneData;

                    if (newState === 'Tamper') {
                        return {...laneData, isTamper: true, isOnline: true}
                    } else if (newState === 'TamperOff') {
                        return {...laneData, isTamper: false, isOnline: true}
                    } else if (newState === 'Fault - Neutron High' ||
                        newState === 'Fault - Gamma High' ||
                        newState === 'Fault - Gamma Low'
                    ) {
                        return {...laneData, isFault: true, isOnline: true}
                    } else if (newState === 'Clear') {
                        return {...laneData, isFault: false}
                    } else if (newState === 'Online' ||
                        alarmStates.includes(newState)
                    ) {
                        return {...laneData, isFault: false, isOnline: true}
                    } else if (newState === 'Offline' || newState === undefined) {
                        return {...laneData, isOnline: false, isFault: false, isTamper: false}
                    }

                    return laneData;
                });

                // set timer when in fault-alarm states
                if (newState.includes('Fault') || alarmStates.includes(newState)) {
                    const timer = setTimeout(() => {
                        updateStatus(laneName, 'Clear')
                    }, 10000);
                    timersRef.current.set(laneName, timer);
                }


                return [...updatedList];

            } else {
                const newLane: LaneStatusProps = {
                    id: idVal.current++,
                    name: laneName,
                    isOnline: newState === 'Online',
                    isTamper: newState === 'Tamper',
                    isFault: newState.includes('Fault'),
                }
                return [newLane, ...prevList]
            }
        });
    }

    const handleLaneView = (laneName: string) => {
        dispatch(setCurrentLane(laneName));
        router.push("/lane-view");
    }

    return (
        <Stack padding={2} justifyContent={"start"} spacing={1}>
            <Typography variant="h6">{t('laneStatus')}</Typography>
            <>
                <Box sx={{overflowY: "auto", maxHeight: 275, flexGrow: 1}}>
                    {(
                        <Grid container columns={{sm: 12, md: 24, lg: 36, xl: 48}} spacing={1}>
                            {statusList.map((item) => (
                                <Grid key={item.id} item sm={8} md={8} lg={8} xl={6}>
                                    <div onClick={() => handleLaneView(item.name)}>
                                        <LaneStatusItem
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            isOnline={item.isOnline}
                                            isFault={item.isFault}
                                            isTamper={item.isTamper}
                                        />
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            </>
        </Stack>
    );
}