
import {Fragment, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import {
    Box,
    Collapse,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import {KeyboardArrowDown, KeyboardArrowRight} from "@mui/icons-material";
import LaneStatsTable from "./LaneStatsTable";
import {useLanguage} from "@/app/contexts/LanguageContext";

type Props = {
    selectedTimeRangeCounts: INationalTableData[];
};

const columns: { key: keyof INationalTableData; labelKey: string; numeric?: boolean }[] = [
    {key: "site", labelKey: "nodeId"},
    {key: "numGammaAlarms", labelKey: "gAlarm", numeric: true},
    {key: "numNeutronAlarms", labelKey: "nAlarm", numeric: true},
    {key: "numGammaNeutronAlarms", labelKey: "gnAlarm", numeric: true},
    {key: "numOccupancies", labelKey: "occupancies", numeric: true},
    {key: "numTampers", labelKey: "tamper", numeric: true},
    {key: "numGammaFaults", labelKey: "gFaults", numeric: true},
    {key: "numNeutronFaults", labelKey: "nFaults", numeric: true},
    {key: "numFaults", labelKey: "faults", numeric: true},
];

function NodeRow({row}: { row: INationalTableData }) {
    const [open, setOpen] = useState(false);
    const hasLanes = row.lanes && row.lanes.length > 0;

    return (
        <Fragment>
            <TableRow hover>
                <TableCell sx={{width: 48}}>
                    <IconButton
                        aria-label={open ? "collapse row" : "expand row"}
                        size="small"
                        onClick={() => setOpen(!open)}
                        disabled={!hasLanes}
                    >
                        {open ? <KeyboardArrowDown/> : <KeyboardArrowRight/>}
                    </IconButton>
                </TableCell>
                {columns.map((col) => (
                    <TableCell key={col.key} align={col.numeric ? "right" : "left"}>
                        {row[col.key] as React.ReactNode}
                    </TableCell>
                ))}
            </TableRow>
            <TableRow>
                <TableCell colSpan={columns.length + 1} sx={{padding: 0, border: 0}}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <LaneStatsTable lanes={row.lanes ?? []}/>
                    </Collapse>
                </TableCell>
            </TableRow>
        </Fragment>
    );
}

export default function NationalStatsTable({selectedTimeRangeCounts}: Props) {
    const {t} = useLanguage();
    const rows = selectedTimeRangeCounts ?? [];

    return (
        <TableContainer sx={{maxHeight: 800, width: "100%"}}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{width: 48}}/>
                        {columns.map((col) => (
                            <TableCell key={col.key} align={col.numeric ? "right" : "left"}>
                                {t(col.labelKey)}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} align="center">
                                <Box sx={{padding: 2, color: "text.secondary"}}>{t('noStatisticsLoaded')}</Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => <NodeRow key={row.id} row={row}/>)
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
