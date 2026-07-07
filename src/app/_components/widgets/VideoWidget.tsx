"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useMemo, useState} from "react";
import {Box, Stack, Typography} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HLSVideoComponent from "@/app/_components/lane-view/HLSVideoComponent";
import {useHlsStream} from "@/lib/data/oscar/video/useHlsStream";
import {VideoWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {useResolvedLane} from "@/app/_components/layout/useResolvedLane";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function VideoWidget({page, widget}: WidgetProps) {
    const config = widget.config as VideoWidgetConfig;
    const {t} = useLanguage();
    const lane = useResolvedLane(page, config.laneSource);

    const pinnedStreamId = config.streamId;
    const [browsedStreamId, setBrowsedStreamId] = useState<string | undefined>(undefined);

    const {videoSource, streams, node, activeStreamId, restartStream} = useHlsStream(lane, pinnedStreamId ?? browsedStreamId);

    const currentIndex = useMemo(() => {
        if (!activeStreamId) return 0;
        const idx = streams.findIndex((s: any) => s.properties.id === activeStreamId);
        return idx >= 0 ? idx : 0;
    }, [streams, activeStreamId]);

    const showArrows = !pinnedStreamId && streams.length > 1;

    if (!lane) {
        return (
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <Typography color="text.secondary">{t('noLaneSelected')}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', minHeight: 0}}>
            {showArrows && (
                <IconButton
                    onClick={() => setBrowsedStreamId(streams[currentIndex - 1]?.properties?.id)}
                    disabled={currentIndex === 0}
                    size="small"
                >
                    <NavigateBeforeIcon/>
                </IconButton>
            )}

            <Stack sx={{flex: 1, minWidth: 0, height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                {videoSource && node ? (
                    <HLSVideoComponent videoSource={videoSource} selectedNode={node} height="100%" onRequestRestart={restartStream}/>
                ) : (
                    <Typography color="text.secondary" variant="body2">
                        {streams.length === 0 ? t('noVideoStream') : t('connectingVideo')}
                    </Typography>
                )}
            </Stack>

            {showArrows && (
                <IconButton
                    onClick={() => setBrowsedStreamId(streams[currentIndex + 1]?.properties?.id)}
                    disabled={currentIndex >= streams.length - 1}
                    size="small"
                >
                    <NavigateNextIcon/>
                </IconButton>
            )}
        </Box>
    );
}
