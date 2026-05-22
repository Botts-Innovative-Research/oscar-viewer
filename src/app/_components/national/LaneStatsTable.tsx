import {Box, Table, TableBody, TableCell, TableHead, TableRow, Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {ILaneStat} from "../../../../types/new-types";

interface Props {
    lanes: ILaneStat[];
}

function formatPercent(numerator: number, denominator: number): string {
    if (!denominator) return "—";
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "—";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

function laneDisplayName(laneUid: string, laneMap: Map<string, LaneMapEntry>): string {
    for (const [name, entry] of laneMap) {
        if (entry.laneSystem?.properties?.properties?.uid === laneUid) {
            return name;
        }
    }
    return laneUid;
}

export default function LaneStatsTable({lanes}: Props) {
    const laneMap = useSelector(selectLaneMap);

    if (!lanes || lanes.length === 0) {
        return (
            <Box sx={{padding: 2}}>
                <Typography variant="body2" color="text.secondary">
                    No lane breakdown available for this node.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{padding: 1.5, paddingLeft: 6}}>
            <Typography variant="subtitle2" sx={{marginBottom: 1}}>
                Per-Lane Breakdown
            </Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Lane</TableCell>
                        <TableCell align="right">Occupancies</TableCell>
                        <TableCell align="right">G Alarm</TableCell>
                        <TableCell align="right">N Alarm</TableCell>
                        <TableCell align="right">G Alarm %</TableCell>
                        <TableCell align="right">N Alarm %</TableCell>
                        <TableCell align="right">Total Alarm %</TableCell>
                        <TableCell align="right">% Adjudicated</TableCell>
                        <TableCell align="right">Avg Adj. Time</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {lanes.map((lane) => {
                        const totalAlarms = lane.numGammaAlarms + lane.numNeutronAlarms + lane.numGammaNeutronAlarms;
                        return (
                            <TableRow key={lane.laneId}>
                                <TableCell>{laneDisplayName(lane.laneId, laneMap)}</TableCell>
                                <TableCell align="right">{lane.numOccupancies}</TableCell>
                                <TableCell align="right">{lane.numGammaAlarms}</TableCell>
                                <TableCell align="right">{lane.numNeutronAlarms}</TableCell>
                                <TableCell align="right">{formatPercent(lane.numGammaAlarms, lane.numOccupancies)}</TableCell>
                                <TableCell align="right">{formatPercent(lane.numNeutronAlarms, lane.numOccupancies)}</TableCell>
                                <TableCell align="right">{formatPercent(totalAlarms, lane.numOccupancies)}</TableCell>
                                <TableCell align="right">{formatPercent(lane.numAdjudicated, lane.numOccupancies)}</TableCell>
                                <TableCell align="right">{formatDuration(lane.avgTimeToAdjudicateSec)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Box>
    );
}
