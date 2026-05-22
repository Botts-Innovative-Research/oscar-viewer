
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

type Props = {
    selectedTimeRangeCounts: INationalTableData[];
};

const columns: { key: keyof INationalTableData; label: string; numeric?: boolean }[] = [
    {key: "site", label: "Node ID"},
    {key: "numGammaAlarms", label: "G Alarm", numeric: true},
    {key: "numNeutronAlarms", label: "N Alarm", numeric: true},
    {key: "numGammaNeutronAlarms", label: "G-N Alarm", numeric: true},
    {key: "numOccupancies", label: "Occupancies", numeric: true},
    {key: "numTampers", label: "Tamper", numeric: true},
    {key: "numGammaFaults", label: "G Faults", numeric: true},
    {key: "numNeutronFaults", label: "N Faults", numeric: true},
    {key: "numFaults", label: "Faults", numeric: true},
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
    const rows = selectedTimeRangeCounts ?? [];

    return (
        <TableContainer sx={{maxHeight: 800, width: "100%"}}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{width: 48}}/>
                        {columns.map((col) => (
                            <TableCell key={col.key} align={col.numeric ? "right" : "left"}>
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} align="center">
                                <Box sx={{padding: 2, color: "text.secondary"}}>No statistics loaded.</Box>
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
