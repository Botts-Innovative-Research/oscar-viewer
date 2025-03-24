"use client";

import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {styled, Theme} from "@mui/material/styles";
import {selectEventData} from "@/lib/state/EventDetailsSlice";


const StatusTableCell = styled(TableCell)(({theme, status}: { theme: Theme, status: string }) => ({
    color: status === 'Gamma' ? theme.palette.error.contrastText : status === 'Neutron' ? theme.palette.info.contrastText : status === 'Gamma & Neutron' ? theme.palette.secondary.contrastText : 'inherit',
    backgroundColor: status === 'Gamma' ? theme.palette.error.main : status === 'Neutron' ? theme.palette.info.main : status === 'Gamma & Neutron' ? theme.palette.secondary.main : 'transparent',
}));


export default function DataRow() {
    const eventData = useSelector(selectEventData);

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
                            <TableCell>{eventData?.occupancyId}</TableCell>
                            <TableCell>{eventData?.startTime}</TableCell>
                            <TableCell>{eventData?.endTime}</TableCell>
                            <TableCell>{eventData?.maxGamma}</TableCell>
                            <TableCell>{eventData?.maxNeutron}</TableCell>
                            <StatusTableCell status={eventData?.status || 'Unknown'}>
                                {eventData?.status || 'Unknown'}
                            </StatusTableCell>
                            <TableCell>{eventData.isAdjudicated ? "Yes" : "No"}</TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} align="center">No event data available</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

