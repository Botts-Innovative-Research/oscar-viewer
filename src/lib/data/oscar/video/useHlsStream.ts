/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useContext, useEffect, useMemo, useState} from "react";
import {useSelector} from "react-redux";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {INode} from "@/lib/data/osh/Node";
import {generateHLSVideoCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {isHLSVideoControlStream} from "@/lib/data/oscar/Utilities";

/**
 * Ref-counted HLS stream start/stop per control stream. Several consumers can
 * pin the same stream (e.g. a lane-view page and a pinned video widget); the
 * start command goes out on every acquire (idempotent server-side, refreshes
 * the path) but the stop command is only sent when the LAST consumer leaves.
 */
interface HlsEntry {
    count: number;
}

const activeStreams = new Map<string, HlsEntry>();

async function acquireHlsStream(node: INode, controlStreamId: string): Promise<string | null> {
    let entry = activeStreams.get(controlStreamId);
    if (!entry) {
        entry = {count: 0};
        activeStreams.set(controlStreamId, entry);
    }
    entry.count++;

    const response = await sendCommand(node, controlStreamId, generateHLSVideoCommandJSON(true));
    if (!response.ok) {
        console.error("Failed to start HLS stream", controlStreamId);
        return null;
    }
    const responseJson = await response.json();
    return responseJson?.results?.[0]?.data?.streamPath ?? null;
}

function releaseHlsStream(node: INode, controlStreamId: string) {
    const entry = activeStreams.get(controlStreamId);
    if (!entry) return;
    entry.count--;
    if (entry.count <= 0) {
        activeStreams.delete(controlStreamId);
        sendCommand(node, controlStreamId, generateHLSVideoCommandJSON(false))
            .catch((e: unknown) => console.warn("Failed to stop HLS stream", controlStreamId, e));
    }
}

export interface UseHlsStreamResult {
    /** Bucket-relative stream path for HLSVideoComponent, once started. */
    videoSource: string | null;
    /** All HLS video control streams available on the lane. */
    streams: typeof ControlStream[];
    /** The control stream id actually playing. */
    activeStreamId: string | null;
    /** The lane's parent node (auth + endpoint for playback). */
    node: INode | null;
}

/**
 * Enumerate a lane's HLS video control streams and run the start/stop
 * lifecycle for the selected one. `streamId` pins a specific stream;
 * otherwise the first available stream plays.
 */
export function useHlsStream(laneId: string | null, streamId?: string): UseHlsStreamResult {
    const {laneMapRef} = useContext(DataSourceContext);
    const laneMapFromStore = useSelector((state: RootState) => selectLaneMap(state));
    const laneMapSize = laneMapFromStore?.size ?? 0;

    const [videoSource, setVideoSource] = useState<string | null>(null);
    const [streams, setStreams] = useState<typeof ControlStream[]>([]);

    const entry: LaneMapEntry | undefined = laneId ? laneMapRef.current?.get(laneId) : undefined;
    const node: INode | null = entry?.parentNode ?? null;

    useEffect(() => {
        if (!entry) {
            setStreams([]);
            return;
        }
        const videoControlStreams = (entry.controlStreams ?? [])
            .filter((stream: typeof ControlStream) => isHLSVideoControlStream(stream));
        const unique = videoControlStreams.reduce((acc: typeof ControlStream[], stream: typeof ControlStream) => {
            const id = stream.properties?.id;
            if (!id) return acc;
            if (!acc.find((s: typeof ControlStream) => s.properties.id === id)) acc.push(stream);
            return acc;
        }, []);
        setStreams(unique);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laneId, laneMapSize]);

    const activeStreamId = useMemo(() => {
        if (streams.length === 0) return null;
        if (streamId && streams.some((s: typeof ControlStream) => s.properties.id === streamId)) return streamId;
        return streams[0].properties.id as string;
    }, [streams, streamId]);

    useEffect(() => {
        if (!activeStreamId || !node) return;
        let cancelled = false;
        setVideoSource(null);

        acquireHlsStream(node, activeStreamId).then((path) => {
            if (!cancelled && path) setVideoSource(path);
        }).catch((e: unknown) => console.error("HLS stream start failed:", e));

        return () => {
            cancelled = true;
            setVideoSource(null);
            releaseHlsStream(node, activeStreamId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStreamId, node]);

    return {videoSource, streams, activeStreamId, node};
}
