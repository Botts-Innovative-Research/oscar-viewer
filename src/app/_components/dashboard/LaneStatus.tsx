"use client";

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import React, {useContext, useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {EventType} from "osh-js/source/core/event/EventType";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";

import LaneStatusItem from "./LaneStatusItem";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {generateManualTamperCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {removeRealtimeEventSubscription} from "@/lib/data/oscar/RealtimeEventNotification";
import {isTamperControlStream} from "@/lib/data/oscar/Utilities";
import {deriveLaneHealthRows, useLaneHealth, useLaneHealthClock} from "@/lib/data/oscar/useLaneHealth";
import {setAlarmTrigger} from "@/lib/state/EventDataSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {setCurrentLane} from "@/lib/state/LaneViewSlice";

export default function LaneStatus({dataSourcesByLane}: {dataSourcesByLane: Map<string, LaneDSColl>}) {
    const [tamperLaneToClear, setTamperLaneToClear] = useState<string | null>(null);
    const [isClearingTamper, setIsClearingTamper] = useState(false);
    const [clearTamperError, setClearTamperError] = useState<string | null>(null);
    const {lanes, isLoading, thresholdMinutes, refreshLaneHealth} = useLaneHealth();
    const healthClock = useLaneHealthClock(lanes, thresholdMinutes);

    const dispatch = useAppDispatch();
    const router = useRouter();
    const {t} = useLanguage();
    const {laneMapRef, scopedHref} = useContext(DataSourceContext);

    const laneRows = useMemo(
        () => deriveLaneHealthRows(lanes, healthClock, thresholdMinutes),
        [healthClock, lanes, thresholdMinutes],
    );

    // The batched health snapshot supplies all visual state. Keep only the
    // gamma/neutron realtime listeners required for the existing alarm sound.
    useEffect(() => {
        let active = true;
        const subscriptions: Array<{source: any; handler: (message: any) => void}> = [];
        const uniqueSources = new Set<any>();

        dataSourcesByLane.forEach((collection) => {
            [...collection.gammaRT, ...collection.neutronRT].forEach((source) => {
                if (!source || uniqueSources.has(source))
                    return;
                uniqueSources.add(source);
                const handler = (message: any) => {
                    if (active && message?.values?.[0]?.data?.alarmState === "Alarm")
                        dispatch(setAlarmTrigger(true));
                };
                subscriptions.push({source, handler});
                source.subscribe(handler, [EventType.DATA]);
                void Promise.resolve().then(() => source.connect()).catch((error) => {
                    if (active)
                        console.warn("Unable to connect dashboard alarm notification stream", error);
                });
            });
        });

        return () => {
            active = false;
            subscriptions.forEach(({source, handler}) => {
                removeRealtimeEventSubscription(source, handler);
                void Promise.resolve().then(() => source.disconnect()).catch((error) => {
                    console.warn("Unable to disconnect dashboard alarm notification stream", error);
                });
            });
        };
    }, [dataSourcesByLane, dispatch]);

    const handleLaneView = (laneName: string) => {
        dispatch(setCurrentLane(laneName));
        router.push(scopedHref("/lane-view"));
    };

    const handleOpenClearTamper = (event: React.MouseEvent<HTMLButtonElement>, laneName: string) => {
        event.stopPropagation();
        setClearTamperError(null);
        setTamperLaneToClear(laneName);
    };

    const handleCloseClearTamper = () => {
        if (isClearingTamper)
            return;
        setTamperLaneToClear(null);
        setClearTamperError(null);
    };

    const handleConfirmClearTamper = async () => {
        if (!tamperLaneToClear)
            return;

        setIsClearingTamper(true);
        setClearTamperError(null);

        try {
            const laneEntry = laneMapRef.current.get(tamperLaneToClear);
            if (!laneEntry)
                throw new Error(t("unableToFindLane", {lane: tamperLaneToClear}));

            let tamperControl = laneEntry.controlStreams.find(
                (stream: typeof ControlStream) => isTamperControlStream(stream));

            if (!tamperControl) {
                const laneSystemIds = new Set(laneEntry.systems.map(
                    (system: any) => system.properties.id));
                const nodeControlStreams = await laneEntry.parentNode.fetchNodeControlStreams() ?? [];
                tamperControl = nodeControlStreams.find((stream: typeof ControlStream) =>
                    laneSystemIds.has(stream.properties["system@id"]) && isTamperControlStream(stream));
            }

            if (!tamperControl)
                throw new Error(t("noManualTamperControl", {lane: tamperLaneToClear}));

            const response = await sendCommand(
                laneEntry.parentNode,
                tamperControl.properties.id,
                generateManualTamperCommandJSON(false),
            );

            if (!response.ok)
                throw new Error(t("clearTamperCommandFailed", {status: response.status}));

            setTamperLaneToClear(null);
            void refreshLaneHealth();
        } catch (error) {
            console.error("Failed to clear tamper", error);
            setClearTamperError(error instanceof Error ? error.message : t("failedToClearTamper"));
        } finally {
            setIsClearingTamper(false);
        }
    };

    return (
        <Stack justifyContent="start" spacing={1} sx={{p: 1}}>
            <Typography variant="h6">{t("laneStatus")}</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 1,
                    overflowY: "auto",
                    maxHeight: 275,
                    flexGrow: 1,
                }}
            >
                {isLoading && laneRows.length === 0 ? (
                    <Typography color="text.secondary">{t("loading")}</Typography>
                ) : laneRows.map((lane) => (
                    <LaneStatusItem
                        key={lane.laneName}
                        health={lane}
                        onSelect={() => handleLaneView(lane.laneName)}
                        onClearTamper={(event) => handleOpenClearTamper(event, lane.laneName)}
                    />
                ))}
            </Box>
            <Dialog
                open={tamperLaneToClear !== null}
                onClose={handleCloseClearTamper}
                aria-labelledby="clear-tamper-dialog-title"
            >
                <DialogTitle id="clear-tamper-dialog-title">{t("clearTamperQuestion")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t("confirmClearTamper", {lane: tamperLaneToClear ?? ""})}
                    </DialogContentText>
                    {clearTamperError && <Alert severity="error" sx={{mt: 2}}>{clearTamperError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseClearTamper} disabled={isClearingTamper}>{t("cancel")}</Button>
                    <Button
                        onClick={handleConfirmClearTamper}
                        disabled={isClearingTamper}
                        color="error"
                        variant="contained"
                    >
                        {isClearingTamper ? t("clearing") : t("clearTamper")}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
