"use client"

import { useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventTableData, selectLaneViewLog} from "@/lib/state/EventDataSlice";
import Paper from '@mui/material/Paper';
import {selectNodes} from "@/lib/state/OSHSlice";


export default function OccAndAlarmStatsRow({filterByLane}: {filterByLane: boolean}){
    const idVal = useRef(0);

    const nodes = useSelector((state: RootState) => selectNodes(state));
    const events = useSelector((state: RootState) => selectEventTableData(state));

    const faultEvents = useSelector((state: RootState) => selectLaneViewLog(state));


    const counts = useMemo(() => {
        let id = idVal.current++;

        // alarms
        let neutronAlarmCount = 0;
        let gammaNeutronAlarmCount = 0;
        let gammaAlarmCount = 0;

        // occupancies
        let occupancyCount = events.length;

        // faults
        let faultCount = faultEvents.length;

        for(const event of events) {
            if (event.status === 'Gamma & Neutron') gammaNeutronAlarmCount++;
            else if (event.status === 'Gamma') gammaAlarmCount++;
            else if (event.status === 'Neutron') neutronAlarmCount++;
        }


        let siteName = nodes[0].name;

        return {
            id,
            siteName,
            occupancyCount,
            gammaAlarmCount,
            neutronAlarmCount,
            gammaNeutronAlarmCount,
            faultCount,
        }
    }, [events]);


    return (
        <TableContainer component={Paper}>
            <Table sx={{minWidth: 650}} aria-label="simple table">
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                        <TableCell>Site Name</TableCell>
                        <TableCell>Occupancy</TableCell>
                        <TableCell>Gamma Alarms</TableCell>
                        <TableCell>Neutron Alarms</TableCell>
                        <TableCell>Gamma-Neutron Alarms</TableCell>
                        <TableCell>Fault Alarms</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {counts ? (
                        <TableRow key={counts.id}
                                  sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                            <TableCell>{counts.siteName}</TableCell>
                            <TableCell>{counts.occupancyCount}</TableCell>
                            <TableCell>{counts.gammaAlarmCount}</TableCell>
                            <TableCell>{counts.neutronAlarmCount}</TableCell>
                            <TableCell>{counts.gammaNeutronAlarmCount}</TableCell>
                            <TableCell>{counts.faultCount}</TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} align="center">No data available</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}


