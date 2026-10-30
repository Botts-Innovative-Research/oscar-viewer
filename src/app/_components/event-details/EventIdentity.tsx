"use client";

import {Alert, Button, Stack, Typography} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import React, {useContext, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {buildEventDetailsHref, normalizeEventObservationId} from "@/lib/data/oscar/EventLookup";

export type EventIdentityResolutionState = "resolving" | "failed";

interface EventIdentityProps {
    occupancyUuid?: string | null;
    nodeId?: string | null;
    resolutionState?: EventIdentityResolutionState;
    onRetry?: () => void;
}

async function copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch {
            // Permission and browser policy can reject the modern API even
            // when it is present. Try the legacy copy path before reporting a
            // failure to the operator.
        }
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Copy failed.");
}

export default function EventIdentity({
    occupancyUuid,
    nodeId,
    resolutionState = "resolving",
    onRetry,
}: EventIdentityProps) {
    const {t} = useLanguage();
    const dataSourceContext = useContext(DataSourceContext);
    const [copyStatus, setCopyStatus] = useState<"uuid" | "link" | "error" | null>(null);
    let uuid = "";
    try {
        uuid = normalizeEventObservationId(occupancyUuid);
    } catch {
        // An unresolved identity is expected briefly for newly received live
        // events. Keep export controls unavailable until resolution completes.
    }

    const copyUuid = async () => {
        try {
            await copyText(uuid);
            setCopyStatus("uuid");
        } catch {
            setCopyStatus("error");
        }
    };

    const copyDirectLink = async () => {
        try {
            const path = buildEventDetailsHref(uuid, nodeId);
            const scopedPath = dataSourceContext?.scopedHref(path) ?? path;
            await copyText(new URL(scopedPath, window.location.origin).toString());
            setCopyStatus("link");
        } catch {
            setCopyStatus("error");
        }
    };

    return (
        <Stack
            data-testid="event-identity"
            direction={{xs: "column", md: "row"}}
            spacing={1.5}
            alignItems={{xs: "stretch", md: "center"}}
            justifyContent="space-between"
            sx={{p: 2, borderBottom: 1, borderColor: "divider"}}
        >
            <div>
                <Typography variant="caption" color="text.secondary">
                    {t("occupancyUuid")}
                </Typography>
                <Typography
                    data-testid="event-uuid-value"
                    sx={{fontFamily: "monospace", overflowWrap: "anywhere"}}
                >
                    {uuid || t("unknown")}
                </Typography>
            </div>
            {!uuid && resolutionState === "failed" ? (
                <Alert
                    data-testid="event-uuid-resolution-failed"
                    severity="error"
                    sx={{displayPrint: "none"}}
                    action={onRetry ? (
                        <Button
                            color="inherit"
                            size="small"
                            data-testid="event-uuid-resolution-retry"
                            onClick={onRetry}
                        >
                            {t("retry")}
                        </Button>
                    ) : undefined}
                >
                    {t("occupancyUuidResolutionFailed")}
                </Alert>
            ) : !uuid && (
                <Alert
                    data-testid="event-uuid-export-unavailable"
                    severity="info"
                    sx={{displayPrint: "none"}}
                >
                    {t("occupancyUuidRequiredForExport")}
                </Alert>
            )}
            {uuid && (
                <Stack
                    direction={{xs: "column", sm: "row"}}
                    spacing={1}
                    alignItems={{xs: "stretch", sm: "center"}}
                    sx={{displayPrint: "none"}}
                >
                    <Button data-testid="copy-event-uuid" size="small" startIcon={<ContentCopyRoundedIcon/>} onClick={copyUuid}>
                        {t("copyOccupancyUuid")}
                    </Button>
                    <Button data-testid="copy-event-direct-link" size="small" startIcon={<LinkRoundedIcon/>} onClick={copyDirectLink}>
                        {t("copyDirectLink")}
                    </Button>
                    {copyStatus && (
                        <Typography
                            data-testid="event-copy-status"
                            variant="caption"
                            color={copyStatus === "error" ? "error.main" : "success.main"}
                            role={copyStatus === "error" ? "alert" : "status"}
                        >
                            {t(copyStatus === "uuid"
                                ? "occupancyUuidCopied"
                                : copyStatus === "link" ? "directLinkCopied" : "copyFailed")}
                        </Typography>
                    )}
                </Stack>
            )}
        </Stack>
    );
}
