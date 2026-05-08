"use client";

import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {styled} from "@mui/material/styles";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";


const StatusTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'status',
})<{ status: string }>(({theme, status}) => ({
    color: status === 'Gamma' ? theme.palette.error.contrastText : status === 'Neutron' ? theme.palette.info.contrastText : status === 'Gamma & Neutron' ? theme.palette.secondary.contrastText : 'inherit',
    backgroundColor: status === 'Gamma' ? theme.palette.error.main : status === 'Neutron' ? theme.palette.info.main : status === 'Gamma & Neutron' ? theme.palette.secondary.main : 'transparent',
}));


export default function DataRow({eventData, speed}: {eventData: EventTableData, speed?: string}) {
    return (
        <TableContainer>
            <Table sx={{minWidth: 650}} aria-label="simple table">
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                        <TableCell>Secondary Inspection</TableCell>
                        <TableCell>Lane ID</TableCell>
                        <TableCell>Occupancy ID</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Max Gamma</TableCell>
                        <TableCell>Max Neutron</TableCell>
                        <TableCell>Speed (kph)</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Adjudicated</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {eventData ? (
                        <TableRow key={eventData.id}
                                  sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                            <TableCell>{eventData?.secondaryInspection}</TableCell>
                            <TableCell>{eventData?.laneId}</TableCell>
                            <TableCell>{eventData?.occupancyCount}</TableCell>
                            <TableCell>{eventData?.startTime}</TableCell>
                            <TableCell>{eventData?.endTime}</TableCell>
                            <TableCell>{eventData?.maxGamma}</TableCell>
                            <TableCell>{eventData?.maxNeutron}</TableCell>
                            <TableCell>{speed ?? 'N/A'}</TableCell>
                            <StatusTableCell status={eventData?.status || 'Unknown'}>
                                {eventData?.status || 'Unknown'}
                            </StatusTableCell>
                            <TableCell>{eventData?.adjudicatedIds.length > 0 ? "Yes" : "No"}</TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={10} align="center">No event data available</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}


