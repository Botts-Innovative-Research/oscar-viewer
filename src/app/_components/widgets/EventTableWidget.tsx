"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useState} from "react";
import {useSelector} from "react-redux";
import {GridActionsCellItem, GridColumnVisibilityModel} from "@mui/x-data-grid";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import EventTable from "@/app/_components/event-table/EventTable";
import AdjudicationDialog from "./AdjudicationDialog";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {
    DEFAULT_EVENT_TABLE_COLUMNS,
    EventTableColumnSetting,
    EventTableWidgetConfig,
} from "@/lib/layout/PageConfigTypes";
import {updateWidgetConfig} from "@/lib/state/PageLayoutSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {useLanguage} from "@/app/contexts/LanguageContext";

/**
 * Configurable event/occupancy table. With `adjudicationMode` the table runs
 * in alarm mode and every row gets an inline Adjudicate action.
 */
export function ConfigurableEventTable({page, widget, adjudicationMode}: WidgetProps & { adjudicationMode?: boolean }) {
    const config = widget.config as EventTableWidgetConfig;
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const dispatch = useAppDispatch();
    const {t} = useLanguage();

    const [adjEvent, setAdjEvent] = useState<EventTableData | null>(null);

    const filters = config.filters ?? {lanes: {mode: 'all'}};

    // Toggles made in the grid's own column panel must survive reload: fold
    // them back into the widget's persisted config.
    const handleColumnVisibilityChange = (model: GridColumnVisibilityModel) => {
        const base: EventTableColumnSetting[] = config.columns?.length
            ? config.columns
            : DEFAULT_EVENT_TABLE_COLUMNS.map((c) => ({...c}));
        const next = base.map((col) =>
            model[col.key] !== undefined ? {...col, visible: !!model[col.key]} : col);
        dispatch(updateWidgetConfig({
            pageId: page.id,
            widgetId: widget.id,
            config: {...config, columns: next},
        }));
    };

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
                onColumnVisibilityChange={handleColumnVisibilityChange}
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
