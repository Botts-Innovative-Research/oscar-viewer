"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Box, Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {useCustomAdjudicationCodes} from "@/app/hooks/useCustomAdjudicationCodes";
import {resolveAdjudicationCode} from "@/lib/data/oscar/adjudication/CustomAdjudicationCodes";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {INode} from "@/lib/data/osh/Node";
import {EventType} from "osh-js/source/core/event/EventType";
import {getDataGridLocaleText, getIntlLocale} from '@/app/utils/LocaleUtils';
import {removeRealtimeEventSubscription} from "@/lib/data/oscar/RealtimeEventNotification";

type LaneMapReference = {current: Map<string, LaneMapEntry>};
type AdjudicationLogSource = {
    lane: LaneMapEntry;
    controlStream: typeof ControlStream;
};

export async function waitForAdjudicationLogSource(
    laneMapRef: LaneMapReference,
    laneId: string,
    options: {attempts?: number; delayMs?: number; cancelled?: () => boolean} = {},
): Promise<AdjudicationLogSource | null> {
    const attempts = options.attempts ?? 120;
    const delayMs = options.delayMs ?? 250;
    const cancelled = options.cancelled ?? (() => false);

    for (let attempt = 0; attempt < attempts && !cancelled(); attempt++) {
        const lane = laneMapRef.current.get(laneId);
        if (lane) {
            let controlStream: typeof ControlStream | undefined = lane.controlStreams
                .find((stream) => isAdjudicationControlStream(stream));
            if (!controlStream) {
                try {
                    const laneSystemIds = new Set(lane.systems.map(
                        (system: any) => system.properties.id));
                    const nodeControlStreams = await lane.parentNode.fetchNodeControlStreams() ?? [];
                    controlStream = nodeControlStreams.find((stream: typeof ControlStream) =>
                        laneSystemIds.has(stream.properties["system@id"]) &&
                        isAdjudicationControlStream(stream));
                } catch {
                    // Discovery may still be hydrating immediately after a reload. Retry below.
                }
            }
            if (controlStream) return {lane, controlStream};
        }
        if (attempt + 1 < attempts && !cancelled()) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return null;
}


function normalizeAdjudicationTimestamp(rawTime?: string): string {
    if (!rawTime) return "";
    const trimmed = String(rawTime).trim();
    const parsedMs = Date.parse(trimmed);
    if (!Number.isNaN(parsedMs)) {
        return new Date(Math.floor(parsedMs / 1000) * 1000).toISOString();
    }
    return trimmed;
}

export function adjudicationLogKey(entry: AdjudicationData): string {
    const isotopes = Array.isArray(entry.isotopes)
        ? entry.isotopes.join(",")
        : String(entry.isotopes ?? "");
    const filePaths = Array.isArray(entry.filePaths)
        ? entry.filePaths.join(",")
        : String(entry.filePaths ?? "");
    return [
        entry.occupancyObsId ?? "",
        normalizeAdjudicationTimestamp(entry.time),
        entry.adjudicationCode?.code ?? "",
        entry.username ?? "",
        entry.feedback ?? "",
        entry.secondaryInspectionStatus ?? "",
        entry.vehicleId ?? "",
        isotopes,
        filePaths,
    ].join("|");
}

export function mergeAdjudicationLogs(
    existing: AdjudicationData[],
    incoming: AdjudicationData[],
): AdjudicationData[] {
    const merged = new Map<string, AdjudicationData>();
    const commandIdToKey = new Map<string, string>();
    for (const item of [...existing, ...incoming]) {
        if (!item) continue;
        const cmdId = item.commandId ? String(item.commandId).trim() : "";
        const contentKey = adjudicationLogKey(item);
        const key = (cmdId && commandIdToKey.get(cmdId)) || contentKey;
        const previous = merged.get(key);
        if (previous) {
            item.id = previous.id;
            if (!item.commandId && previous.commandId) {
                item.commandId = previous.commandId;
            }
        } else if (!item.id) {
            item.id = cmdId || key;
        }
        if (cmdId) {
            commandIdToKey.set(cmdId, key);
        }
        merged.set(key, item);
    }
    return Array.from(merged.values());
}

function buildAdjudicationData(
    reportTime: string,
    occupancyCount: string,
    results: any,
    preferredId?: string,
    commandId?: string,
): AdjudicationData {
    const data = new AdjudicationData(reportTime, occupancyCount, results.occupancyObsId);
    data.setFeedback(results.feedback);
    data.setIsotopes(results.isotopes ?? NaN);
    data.setSecondaryInspectionStatus(results.secondaryInspectionStatus);
    data.setAdjudicationCode(resolveAdjudicationCode(results.adjudicationCode, []));
    data.setVehicleId(results.vehicleId ?? NaN);
    data.setFilePaths(results.filePaths ?? NaN);
    data.setTime(reportTime);
    data.setOccupancyCount(occupancyCount);
    data.setOccupancyObsId(results.occupancyObsId);
    data.setUser(results.username ?? NaN);
    if (commandId) {
        data.commandId = String(commandId);
    }
    data.id = commandId || preferredId || adjudicationLogKey(data);
    return data;
}

export default function AdjudicationLog(props: {
    event: EventTableData;
    node: INode;
    shouldFetch?: boolean;
    onFetchComplete?: () => void;
}) {
    const { language, t } = useLanguage();
    const locale = getIntlLocale(language);
    const {codes: customCodes} = useCustomAdjudicationCodes(props.node ? [props.node] : []);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [adjLog, setAdjLog] = useState<AdjudicationData[]>([]);
    const [filteredLog, setFilteredLog] = useState<AdjudicationData[]>([]);
    const [feedbackDialog, setFeedbackDialog] = useState({
        open: false,
        text: ""
    });
    const [nodeEndpoint, setNodeEndpoint] = useState<string | null>(null);

    const logColumns: GridColDef<AdjudicationData>[] = [
        {
            field: 'occupancyCount',
            headerName: t('occupancyId'),
            minWidth: 100,
            flex: 1,
            type: 'string',
        },
        {
            field: 'time',
            headerName: t('timestamp'),
            minWidth: 140,
            flex: 1,
            type: 'string',
            valueFormatter: (params) => (new Date(params)).toLocaleString(locale, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            }),
        },
        {
            field: 'username',
            headerName: t('user'),
            minWidth: 80,
            flex: 0.8,
            type: 'string',
        },
        {
            field: 'adjudicationCode',
            headerName: t('adjudicationCode'),
            minWidth: 150,
            flex: 1.5,
            valueGetter: (value, row) => {
                const code = row.adjudicationCode.code;
                if (code <= 11)
                    return t(`adjudicationCode.${code}`);
                const custom = customCodes.find(item => item.code === code);
                return custom ? `Code ${code}: ${custom.label}` : `Code ${code}`;
            }
        },
        {
            field: 'feedback',
            headerName: t('feedback'),
            minWidth: 120,
            flex: 1,
            type: 'string',
            renderCell: (params) => {
                const fullText = params.value ?? "";
                const maxLength = 50;

                const truncated = fullText.length > maxLength
                    ? fullText.substring(0, maxLength) + "..."
                    : fullText;

                return (
                    <div style={{ whiteSpace: "normal", wordWrap: "break-word" }}>
                        {truncated}
                        {fullText.length > maxLength && (
                            <button
                                style={{ color: "#1976d2", border: "none", background: "none", cursor: "pointer" }}
                                onClick={() => setFeedbackDialog({ open: true, text: fullText })}
                            >
                                {t('readMore')}
                            </button>
                        )}
                    </div>
                );
            }
        },
        {
            field: 'isotopes',
            headerName: t('isotopes'),
            minWidth: 100,
            flex: 1,
            valueGetter: (value) => {
                if (value === "") return t('unknown');
                else return value;
            }
        },
        {
            field: 'filePaths',
            headerName: t('filePaths'),
            minWidth: 100,
            flex: 1,
            renderCell: (params) => {
                const paths: string[] = Array.isArray(params.value) ? params.value : [];
                if (paths.length === 0) return null;
                return (
                    <span>
                        {paths.map((path, index) =>

                            <React.Fragment key={index}>
                                {index > 0 && ', '}
                                {nodeEndpoint ? (
                                    <a
                                        href={nodeEndpoint + path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#1976d2', textDecoration: 'underline' }}
                                    >
                                        {path.split("\\")[1]}
                                    </a>
                                ) : path}
                            </React.Fragment>
                        )}
                    </span>
                );
            }
        },
        {
            field: 'secondaryInspectionStatus',
            headerName: t('secondaryInspection'),
            minWidth: 120,
            flex: 1,
            valueFormatter: (value) => value ? t(`secondaryInspection.${String(value).toLowerCase()}`) : '',
        },
        {
            field: 'vehicleId',
            headerName: t('vehicleId'),
            minWidth: 80,
            flex: 0.8,
            valueGetter: (value) => {
                if (value === "") return t('unknown');
                else return value;
            }
        },
    ];

    useEffect(() => {
        if (props.node == null || !props.node.address || !props.node.port)
            return;
        const protocol = props.node.isSecure ? 'https://' : 'http://';
        const endpoint =  `${protocol}${props.node.address}:${props.node.port}${props.node.oshPathRoot}${props.node.bucketsEndpoint}/`

        setNodeEndpoint(endpoint)
    }, [props.node]);


    const fetchStatuses = useCallback(async(cancelled: () => boolean) => {
        const source = await waitForAdjudicationLogSource(
            laneMapRef,
            props.event.laneId,
            {cancelled},
        );
        if (!source || cancelled()) {
            if (!cancelled()) console.warn(
                "Cannot load adjudication statuses: lane/control stream is unavailable:",
                props.event.laneId,
            );
            return;
        }
        const commandStatuses = await source.controlStream.searchStatus(
            new ControlStreamFilter({statusCode: "COMPLETED"}),
            100,
        );
        const adjudications: AdjudicationData[] = [];

        while (commandStatuses.hasNext()) {
            const cmdRes = await commandStatuses.nextPage();

            const pageAdjudications = cmdRes.map((obs: any) => {
                if (!obs?.results?.[0]?.data)
                    return null;

                return buildAdjudicationData(
                    obs.reportTime,
                    props.event.occupancyCount,
                    obs.results[0].data,
                    obs.id ?? obs["command@id"],
                    obs["command@id"],
                );
            }).filter((value: AdjudicationData | null): value is AdjudicationData => value !== null);
            adjudications.push(...pageAdjudications);
        }
        if (!cancelled()) setAdjLog((prev) => mergeAdjudicationLogs(prev, adjudications));
    }, [laneMapRef, props.event]);

    useEffect(() => {
        let cancelled = false;
        if (props.event) void fetchStatuses(() => cancelled).catch((error) => {
            if (!cancelled) console.error("Error loading adjudication statuses:", error);
        });
        return () => { cancelled = true; };
    }, [props.event, fetchStatuses]);

    useEffect(() => {
        if (!props.shouldFetch) return;
        let cancelled = false;
        void fetchStatuses(() => cancelled)
            .catch((error) => {
                if (!cancelled) console.error("Error refreshing adjudication statuses:", error);
            })
            .finally(() => {
                if (!cancelled) props.onFetchComplete?.();
            });
        return () => { cancelled = true; };
    }, [props.shouldFetch, props.onFetchComplete, fetchStatuses]);

    useEffect(() => {
        let cancelled = false;
        let controlSource: any = null;

        const handleStatuses = (data: any) => {
            const newAdjData: AdjudicationData[] = [];

            const values = data?.values ?? [];
            for (const value of values) {
                const statusData = value?.data;
                if (!statusData?.results) continue;
                if (statusData.statusCode && statusData.statusCode !== "COMPLETED") continue;

                for (const result of statusData.results) {
                    const results = result?.data;
                    if (!results) continue;

                    newAdjData.push(
                        buildAdjudicationData(
                            statusData.reportTime,
                            props.event.occupancyCount,
                            results,
                            statusData.id ?? statusData["command@id"],
                            statusData["command@id"],
                        ),
                    );
                }
            }
            setAdjLog((prev) => mergeAdjudicationLogs(prev, newAdjData));
        }

        void (async () => {
            const source = await waitForAdjudicationLogSource(
                laneMapRef,
                props.event.laneId,
                {cancelled: () => cancelled},
            );
            if (!source || cancelled) {
                if (!cancelled) console.warn(
                    "Cannot subscribe to adjudication statuses: lane/control stream is unavailable:",
                    props.event.laneId,
                );
                return;
            }
            controlSource = source.lane.createRealTimeConSysApi(source.controlStream);
            if (!controlSource) {
                console.warn("Cannot create rt datasource for adjudication control stream");
                return;
            }
            controlSource.subscribe(handleStatuses, [EventType.DATA]);
            await controlSource.connect();
        })().catch((error) => {
            if (!cancelled) console.error("Error connecting adjudication source:", error);
        });

        return () => {
            cancelled = true;
            if (controlSource) {
                removeRealtimeEventSubscription(controlSource, handleStatuses);
                void Promise.resolve().then(() => controlSource.disconnect()).catch((error) => {
                    console.error("Error disconnecting adjudication source:", error);
                });
            }
        };
    }, [laneMapRef, props.event]);

    useEffect(() => {
        let filteredLog = adjLog.filter((adjData) => adjData?.occupancyObsId ==  props.event.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [adjLog, props.event.occupancyObsId]);


    return (
        <Stack spacing={2} sx={{ width: '100%' }}>
            <Stack direction={"column"} spacing={1}>
                <Typography variant="h5">{t('loggedAdjudications')}</Typography>
            </Stack>
            <Box sx={{ width: '100%' }}>
                <DataGrid
                    localeText={getDataGridLocaleText(language)}
                    rows={filteredLog}
                    columns={logColumns}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 10
                            }
                        }
                    }}
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    disableRowSelectionOnClick={true}
                />
            </Box>
            <Dialog
                open={feedbackDialog.open}
                onClose={() => setFeedbackDialog({ open: false, text: "" })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{t('feedback')}</DialogTitle>
                <DialogContent>
                    <Typography whiteSpace="pre-wrap">
                        {feedbackDialog.text}
                    </Typography>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
