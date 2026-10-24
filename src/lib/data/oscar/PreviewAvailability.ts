interface PreviewSelection {
    isOpen: boolean;
    eventData: {laneId?: string} | null;
}

export function shouldClearUnavailablePreview(
    eventPreview: PreviewSelection,
    laneMapReady: boolean,
    readyLaneNames: ReadonlySet<string>,
): boolean {
    if (!laneMapReady || !eventPreview.isOpen || !eventPreview.eventData)
        return false;

    const laneId = eventPreview.eventData.laneId;
    return !laneId || !readyLaneNames.has(laneId);
}
