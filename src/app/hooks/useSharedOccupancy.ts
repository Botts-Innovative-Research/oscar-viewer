import {useEffect, useState} from "react";
import {INode} from "@/lib/data/osh/Node";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {loadSharedOccupancy, SharedOccupancyError} from "@/lib/data/oscar/SharedOccupancy";

export function useSharedOccupancy(id: string | null, source: string | null, nodes: INode[],
                                   lanes: Map<string, LaneMapEntry>, ready: boolean) {
    const key = JSON.stringify([id, source]);
    const [state, setState] = useState<{key: string; event?: EventTableData; error?: string}>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (id === null || !ready) return;
        const controller = new AbortController();
        setState(null);
        if (!id.trim()) {
            setState({key, error: "sharedOccupancyNotFound"});
            return;
        }
        loadSharedOccupancy(id, source, nodes, lanes, controller.signal).then(event => {
            if (!controller.signal.aborted) setState({key, event});
        }).catch(error => {
            if (!controller.signal.aborted) setState({key, error: error instanceof SharedOccupancyError
                ? error.translationKey : "sharedOccupancyLoadFailed"});
        });
        return () => controller.abort();
    }, [key, nodes, lanes, ready, retry]);
    return {
        event: ready && state?.key === key ? state.event : undefined,
        error: ready && state?.key === key ? state.error : undefined,
        loading: id !== null && (!ready || state?.key !== key),
        retry: () => setRetry(value => value + 1),
    };
}
