"use client";

import {Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography} from '@mui/material';
import LaneStatusItem from './LaneStatusItem';
import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {setCurrentLane} from '@/lib/state/LaneViewSlice';
import {useAppDispatch, useAppSelector} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import {setAlarmTrigger} from "@/lib/state/EventDataSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {LaneSelection} from "@/lib/layout/PageConfigTypes";
import {useLaneStreams} from "@/lib/data/oscar/streams/useLaneStreams";
import {LaneStreamName} from "@/lib/data/oscar/streams/LaneStreamRegistry";
import {useLaneStatusReconciliation} from "@/lib/data/oscar/streams/useLaneStatusReconciliation";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {applyStatusUpdate, ensureLanes, selectLaneStatusMap, silenceAlarms} from "@/lib/state/LaneStatusSlice";

/** One rendered chip, derived from the persisted per-lane status entry. */
interface RenderedLaneStatus {
    name: string;
    parentNode: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;
    isGammaAlarm: boolean;
    isNeutronAlarm: boolean;
    isScanning: boolean;
    pulseCount: number;
}

const STATUS_STREAMS: LaneStreamName[] = ['connectionRT', 'gammaRT', 'neutronRT', 'tamperRT'];

export default function LaneStatus(props: { lanes?: LaneSelection, hideTitle?: boolean }) {
    const lanes: LaneSelection = props.lanes ?? {mode: 'all'};
    const [ackDialog, setAckDialog] = useState<{ laneName: string } | null>(null);
    // Per-lane liveness pulse — kept in local state (NOT the persisted slice) so
    // frequent heartbeat/background messages don't churn localStorage. Only real
    // status transitions change the persisted slice.
    const [pulses, setPulses] = useState<Record<string, number>>({});

    const audioContextRef = useRef<AudioContext | null>(null);
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { t } = useLanguage();

    const laneStatusMap = useAppSelector(selectLaneStatusMap);

    const bumpPulse = (laneName: string) =>
        setPulses((p) => ({...p, [laneName]: (p[laneName] ?? 0) + 1}));

    const {laneIds} = useLaneStreams(lanes, STATUS_STREAMS, (laneName, stream, message) => {
        switch (stream) {
            case 'connectionRT': {
                const state = message.values[0].data.isConnected;
                if (state == undefined) return;
                dispatch(applyStatusUpdate({laneName, source: 'connection', newState: state ? 'Online' : 'Offline'}));
                bumpPulse(laneName);
                break;
            }
            case 'gammaRT': {
                const state = message.values[0].data.alarmState;
                if (state == undefined) return;
                if (state === 'Alarm') dispatch(setAlarmTrigger(true));
                dispatch(applyStatusUpdate({laneName, source: 'gamma', newState: state}));
                bumpPulse(laneName);
                break;
            }
            case 'neutronRT': {
                const state = message.values[0].data.alarmState;
                if (state == undefined) return;
                if (state === 'Alarm') dispatch(setAlarmTrigger(true));
                dispatch(applyStatusUpdate({laneName, source: 'neutron', newState: state}));
                bumpPulse(laneName);
                break;
            }
            case 'tamperRT': {
                const state = message.values[0].data.tamperStatus;
                if (state == undefined) return;
                dispatch(applyStatusUpdate({laneName, source: 'tamper', newState: state ? 'Tamper' : 'TamperOff'}));
                bumpPulse(laneName);
                break;
            }
        }
    });

    const laneIdsKey = laneIds.join(',');

    // Reconcile persisted fault/tamper/connection against the device's latest
    // observation on load, so a fault cleared while the tab was closed clears.
    useLaneStatusReconciliation(laneIds);

    // Merge the currently-known lanes into the persisted slice (adds new lanes,
    // refreshes parentNode) without wiping live or persisted flags.
    useEffect(() => {
        if (laneIds.length === 0) return;
        const seededLanes = laneIds.map((name) => ({
            name,
            parentNode: laneMapRef.current?.get(name)?.parentNode?.name ?? '',
        }));
        dispatch(ensureLanes({lanes: seededLanes}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laneIdsKey]);

    const statusList: RenderedLaneStatus[] = useMemo(() => {
        return [...laneIds]
            .sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))
            .map((laneName) => {
                const entry = laneStatusMap[laneName];
                const parentNode = laneMapRef.current?.get(laneName)?.parentNode?.name ?? entry?.parentNode ?? '';
                return {
                    name: laneName,
                    parentNode,
                    isOnline: entry?.isOnline ?? false,
                    isTamper: entry?.isTamper ?? false,
                    isFault: (entry?.gammaFault ?? false) || (entry?.neutronFault ?? false),
                    isGammaAlarm: entry?.isGammaAlarm ?? false,
                    isNeutronAlarm: entry?.isNeutronAlarm ?? false,
                    isScanning: entry?.isScanning ?? false,
                    pulseCount: pulses[laneName] ?? 0,
                };
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laneIdsKey, laneStatusMap, pulses]);

    const hasActiveAlarms = useMemo(
        () => statusList.some(l => l.isGammaAlarm || l.isNeutronAlarm),
        [statusList]
    );

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

    const handleLaneView = (laneName: string) => {
        dispatch(setCurrentLane(laneName));
        router.push("/lane-view");
    };

    const handleLaneClick = (item: RenderedLaneStatus) => {
        if (item.isGammaAlarm || item.isNeutronAlarm) {
            setAckDialog({ laneName: item.name });
        } else {
            handleLaneView(item.name);
        }
    };

    const handleSilenceAlarm = () => {
        if (!ackDialog) return;
        dispatch(silenceAlarms({laneName: ackDialog.laneName}));
        setAckDialog(null);
    };

    const ackLane = ackDialog ? statusList.find(l => l.name === ackDialog.laneName) : null;

    return (
        <Stack justifyContent={"start"} spacing={1} sx={{height: '100%', minHeight: 0}}>
            {!props.hideTitle && <Typography variant="h6">{t('laneStatus')}</Typography>}
            <>
                <Box sx={{overflowY: "auto", maxHeight: props.hideTitle ? '100%' : 275, flex: 1}}>
                    {/* Container-driven grid: chips keep a readable minimum width and
                        wrap to more rows as the widget narrows, instead of being
                        compressed by viewport-based breakpoints. */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 1,
                    }}>
                        {statusList.map((item) => (
                            <div key={item.name} onClick={() => handleLaneClick(item)}>
                                <LaneStatusItem
                                    id={item.name}
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
                        ))}
                    </Box>
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
