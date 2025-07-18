"use client"

import { useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneViewLog} from "@/lib/state/EventDataSlice";
import Paper from '@mui/material/Paper';


export default function FaultStatsRow({filterByLane, filterBySite}: {filterByLane: boolean, filterBySite?: boolean}){
    const idVal = useRef(0);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);
    const events = useSelector((state: RootState) => selectLaneViewLog(state));

    const counts = useMemo(() => {

        let filteredEvents = events;
        if(filterByLane) filteredEvents = events.filter((e: any) => e.laneId === currentLane);
        // else if(filterBySite) filteredEvents = events.filter((e: any) => e.)

        let gammaHighCount = 0;
        let gammaLowCount = 0;
        let neutronHighCount = 0;
        let tamperCount = 0;
        let extendedOccCount = 0;
        let commCount = 0;
        let camCount = 0;
        let id = idVal.current++;

        for(const event of filteredEvents) {
            if (event.status.includes('Gamma High')) gammaHighCount++;
            else if (event.status.includes('Gamma Low')) gammaLowCount++;
            else if (event.status.includes('Neutron High')) neutronHighCount++;
            else if (event.status === 'Tamper') tamperCount++;
            else if(event.status.includes("Extended Occupancy")) extendedOccCount++;
            else if(event.status.includes("Comm")) commCount++;
            else if(event.status.includes("Camera")) camCount++;
        }

        return {id, gammaHighCount, gammaLowCount, neutronHighCount, tamperCount, extendedOccCount, commCount, camCount }
    }, [events]);

    return (
        <TableContainer component={Paper}>
            <Table sx={{minWidth: 650}} aria-label="simple table">
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                        <TableCell>Gamma High</TableCell>
                        <TableCell>Gamma Low</TableCell>
                        <TableCell>Neutron High</TableCell>
                        <TableCell>Tamper</TableCell>
                        <TableCell>Extended Occupancies</TableCell>
                        <TableCell>Comm</TableCell>
                        <TableCell>Camera</TableCell>

                    </TableRow>
                </TableHead>
                <TableBody>
                    {counts ? (
                        <TableRow key={counts.id}
                                  sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                            <TableCell>{counts.gammaHighCount}</TableCell>
                            <TableCell>{counts.gammaLowCount}</TableCell>
                            <TableCell>{counts.neutronHighCount}</TableCell>
                            <TableCell>{counts.tamperCount}</TableCell>
                            <TableCell>{counts.extendedOccCount}</TableCell>
                            <TableCell>{counts.commCount}</TableCell>
                            <TableCell>{counts.camCount}</TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} align="center">No fault data available</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}


