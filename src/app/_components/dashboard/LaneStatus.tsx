"use client";

import {Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography} from '@mui/material';
import LaneStatusItem from './LaneStatusItem';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {setCurrentLane} from '@/lib/state/LaneViewSlice';
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import {setAlarmTrigger} from "@/lib/state/EventDataSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";


export interface LaneStatusProps {
    id: number;
    parentNode: string;
    name: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;
    isGammaAlarm: boolean;
    isNeutronAlarm: boolean;
    isScanning: boolean;
    pulseCount: number;
}

type AlarmSource = 'gamma' | 'neutron' | 'tamper' | 'connection';

export default function LaneStatus(props: { dataSourcesByLane: any, initialLanes: any[] }) {
    const idVal = useRef(1);
    const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);
    const [ackDialog, setAckDialog] = useState<{ laneName: string } | null>(null);

    const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const dispatch = useAppDispatch();
    const router = useRouter();
    const { t } = useLanguage();

    const hasActiveAlarms = useMemo(
        () => statusList.some(l => l.isGammaAlarm || l.isNeutronAlarm),
        [statusList]
    );

    useEffect(() => {
        let sortedLanes = [...props.initialLanes]
            .sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            .map(lane => ({ ...lane, isGammaAlarm: false, isNeutronAlarm: false, isScanning: false, pulseCount: 0 }));
        setStatusList(sortedLanes);

        return () => {
            if (timersRef.current) {
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
                if (state == undefined) return;
                updateStatus(laneName, (state ? 'Online' : 'Offline'), 'connection');
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                const state = message.values[0].data.alarmState;
                if (state == undefined) return;
                if (state === 'Alarm') dispatch(setAlarmTrigger(true));
                updateStatus(laneName, state, 'gamma');
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                const state = message.values[0].data.alarmState;
                if (state == undefined) return;
                if (state === 'Alarm') dispatch(setAlarmTrigger(true));
                updateStatus(laneName, state, 'neutron');
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                const state = message.values[0].data.tamperStatus;
                if (state == undefined) return;
                updateStatus(laneName, (state ? 'Tamper' : 'TamperOff'), 'tamper');
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

    function playBeep(audioCtx: AudioContext, freq: number, duration: number, startTime: number) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    function playAlarmChirp() {
        try {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            playBeep(ctx, 880, 0.12, now);
            playBeep(ctx, 1100, 0.12, now + 0.18);
        } catch (_e) { /* audio unavailable */ }
    }

    useEffect(() => {
        if (!hasActiveAlarms) {
            if (alarmIntervalRef.current !== null) {
                clearInterval(alarmIntervalRef.current);
                alarmIntervalRef.current = null;
            }
            return;
        }
        playAlarmChirp();
        alarmIntervalRef.current = setInterval(playAlarmChirp, 2000);
        return () => {
            if (alarmIntervalRef.current !== null) {
                clearInterval(alarmIntervalRef.current);
                alarmIntervalRef.current = null;
            }
        };
    }, [hasActiveAlarms]);

    function updateStatus(laneName: string, newState: string, source: AlarmSource) {
        const faultKey = `${laneName}-fault`;

        if (newState.includes('Fault') && timersRef.current.has(faultKey)) {
            clearTimeout(timersRef.current.get(faultKey));
            timersRef.current.delete(faultKey);
        }

        setStatusList((prevList) => {
            const existingLane = prevList.find((lane) => lane.name === laneName);

            if (!existingLane) {
                const newLane: LaneStatusProps = {
                    id: idVal.current++,
                    name: laneName,
                    parentNode: '',
                    isOnline: source === 'connection' && newState === 'Online',
                    isTamper: source === 'tamper' && newState === 'Tamper',
                    isFault: newState.includes('Fault'),
                    isGammaAlarm: source === 'gamma' && newState === 'Alarm',
                    isNeutronAlarm: source === 'neutron' && newState === 'Alarm',
                    isScanning: (source === 'gamma' || source === 'neutron') && newState === 'Scan',
                    pulseCount: 1,
                };
                return [newLane, ...prevList];
            }

            const updatedList = prevList.map((laneData) => {
                if (laneData.name !== laneName) return laneData;

                const pulse = { pulseCount: laneData.pulseCount + 1 };

                switch (source) {
                    case 'connection':
                        if (newState === 'Online')
                            return { ...laneData, ...pulse, isOnline: true };
                        if (newState === 'Offline')
                            return { ...laneData, ...pulse, isOnline: false, isFault: false, isTamper: false, isGammaAlarm: false, isNeutronAlarm: false, isScanning: false };
                        break;
                    case 'tamper':
                        if (newState === 'Tamper') return { ...laneData, ...pulse, isTamper: true, isOnline: true };
                        if (newState === 'TamperOff') return { ...laneData, ...pulse, isTamper: false, isOnline: true };
                        break;
                    case 'gamma':
                        if (newState === 'Alarm') return { ...laneData, ...pulse, isGammaAlarm: true, isOnline: true };
                        if (newState === 'Scan') return { ...laneData, ...pulse, isScanning: true, isOnline: true };
                        if (newState === 'Background') return { ...laneData, ...pulse, isScanning: false, isOnline: true };
                        if (newState.includes('Fault')) return { ...laneData, ...pulse, isFault: true, isOnline: true };
                        break;
                    case 'neutron':
                        if (newState === 'Alarm') return { ...laneData, ...pulse, isNeutronAlarm: true, isOnline: true };
                        if (newState === 'Scan') return { ...laneData, ...pulse, isScanning: true, isOnline: true };
                        if (newState === 'Background') return { ...laneData, ...pulse, isScanning: false, isOnline: true };
                        if (newState.includes('Fault')) return { ...laneData, ...pulse, isFault: true, isOnline: true };
                        break;
                }
                return laneData;
            });

            // Fault auto-clears after 10s; gamma/neutron alarms require user acknowledgment
            if (newState.includes('Fault')) {
                timersRef.current.set(faultKey, setTimeout(() => {
                    setStatusList(prev => prev.map(l => l.name === laneName ? { ...l, isFault: false } : l));
                }, 10000));
            }

            return [...updatedList];
        });
    }

    const handleLaneView = (laneName: string) => {
        dispatch(setCurrentLane(laneName));
        router.push("/lane-view");
    };

    const handleLaneClick = (item: LaneStatusProps) => {
        if (item.isGammaAlarm || item.isNeutronAlarm) {
            setAckDialog({ laneName: item.name });
        } else {
            handleLaneView(item.name);
        }
    };

    const handleSilenceAlarm = () => {
        if (!ackDialog) return;
        setStatusList(prev => prev.map(l =>
            l.name === ackDialog.laneName ? { ...l, isGammaAlarm: false, isNeutronAlarm: false } : l
        ));
        setAckDialog(null);
    };

    const ackLane = ackDialog ? statusList.find(l => l.name === ackDialog.laneName) : null;

    return (
        <Stack justifyContent={"start"} spacing={1}>
            <Typography variant="h6">{t('laneStatus')}</Typography>
            <>
                <Box sx={{overflowY: "auto", maxHeight: 275}}>
                    {(
                        <Grid container columns={{sm: 12, md: 24, lg: 36, xl: 48}} spacing={1}>
                            {statusList.map((item) => (
                                <Grid key={item.id} item sm={8} md={8} lg={8} xl={6}>
                                    <div onClick={() => handleLaneClick(item)}>
                                        <LaneStatusItem
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            parentNode={item.parentNode}
                                            isOnline={item.isOnline}
                                            isFault={item.isFault}
                                            isTamper={item.isTamper}
                                            isGammaAlarm={item.isGammaAlarm}
                                            isNeutronAlarm={item.isNeutronAlarm}
                                            isScanning={item.isScanning}
                                            pulseCount={item.pulseCount}
                                        />
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            </>
            <Dialog open={ackDialog !== null} onClose={() => setAckDialog(null)}>
                <DialogTitle>{t('activeAlarm')} — {ackDialog?.laneName}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} sx={{ pt: 1 }}>
                        <Typography>
                            {ackLane?.parentNode} — {ackDialog?.laneName}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            {ackLane?.isGammaAlarm && <Chip label={t('gammaAlarm')} color="error" size="small" />}
                            {ackLane?.isNeutronAlarm && <Chip label={t('neutronAlarm')} color="info" size="small" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {t('silenceInstructions')}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAckDialog(null)}>{t('cancel')}</Button>
                    <Button onClick={() => { handleLaneView(ackDialog!.laneName); setAckDialog(null); }}>
                        {t('viewLane')}
                    </Button>
                    <Button onClick={handleSilenceAlarm} color="error" variant="contained">
                        {t('silenceAlarm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
