"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useState} from "react";
import {useSelector} from "react-redux";
import {GridActionsCellItem} from "@mui/x-data-grid";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import EventTable from "@/app/_components/event-table/EventTable";
import AdjudicationDialog from "./AdjudicationDialog";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {EventTableWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {useLanguage} from "@/app/contexts/LanguageContext";

/**
 * Configurable event/occupancy table. With `adjudicationMode` the table runs
 * in alarm mode and every row gets an inline Adjudicate action.
 */
export function ConfigurableEventTable({widget, adjudicationMode}: WidgetProps & { adjudicationMode?: boolean }) {
    const config = widget.config as EventTableWidgetConfig;
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const {t} = useLanguage();

    const [adjEvent, setAdjEvent] = useState<EventTableData | null>(null);

    const filters = config.filters ?? {lanes: {mode: 'all'}};

    return (
        <>
            <EventTable
                tableMode={adjudicationMode ? 'alarmtable' : 'eventlog'}
                laneMap={laneMap}
                viewLane
                viewAdjudicated
                columnSettings={config.columns}
                laneFilter={filters.lanes}
                statusFilter={filters.status}
                adjudicatedFilter={filters.adjudicated}
                dateRange={filters.dateRange}
                tableHeight="100%"
                extraRowActions={adjudicationMode ? (row: EventTableData) => [
                    <GridActionsCellItem
                        key="adjudicate"
                        icon={<GavelRoundedIcon/>}
                        label={t('adjudicate')}
                        title={t('adjudicate')}
                        onClick={() => setAdjEvent(row)}
                    />,
                ] : undefined}
            />
            {adjudicationMode && (
                <AdjudicationDialog
                    open={adjEvent !== null}
                    event={adjEvent}
                    onClose={() => setAdjEvent(null)}
                />
            )}
        </>
    );
}

export default function EventTableWidget(props: WidgetProps) {
    return <ConfigurableEventTable {...props} />;
}
