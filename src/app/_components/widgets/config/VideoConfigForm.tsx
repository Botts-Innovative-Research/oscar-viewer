"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useContext} from "react";
import {FormControl, InputLabel, MenuItem, Select, Stack, Typography} from "@mui/material";
import LaneSourceField from "./LaneSourceField";
import {VideoWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useResolvedLane} from "@/app/_components/layout/useResolvedLane";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {isHLSVideoControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function VideoConfigForm({page, draft, onChange}: WidgetConfigFormProps) {
    const config = draft as VideoWidgetConfig;
    const {t} = useLanguage();
    const {laneMapRef} = useContext(DataSourceContext);

    const lane = useResolvedLane(page, config.laneSource);
    const entry = lane ? laneMapRef.current?.get(lane) : undefined;
    const streams: typeof ControlStream[] = (entry?.controlStreams ?? [])
        .filter((s: typeof ControlStream) => isHLSVideoControlStream(s));

    return (
        <Stack spacing={2}>
            <LaneSourceField
                value={config.laneSource ?? {source: 'page'}}
                onChange={(laneSource) => onChange({...config, laneSource, streamId: undefined})}
            />
            <FormControl size="small" fullWidth disabled={streams.length === 0}>
                <InputLabel id="video-stream-label">{t('videoStream')}</InputLabel>
                <Select
                    labelId="video-stream-label"
                    label={t('videoStream')}
                    value={config.streamId ?? ''}
                    onChange={(e) => onChange({...config, streamId: e.target.value || undefined})}
                    displayEmpty
                >
                    <MenuItem value="">{t('firstAvailableStream')}</MenuItem>
                    {streams.map((s: typeof ControlStream) => (
                        <MenuItem key={s.properties.id} value={s.properties.id}>
                            {s.properties.name ?? s.properties.id}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {streams.length === 0 && (
                <Typography variant="caption" color="text.secondary">{t('noVideoStream')}</Typography>
            )}
        </Stack>
    );
}
