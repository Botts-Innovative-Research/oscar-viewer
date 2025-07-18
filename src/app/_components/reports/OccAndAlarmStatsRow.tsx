"use client"

import { useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventTableData} from "@/lib/state/EventDataSlice";
import Paper from '@mui/material/Paper';


export default function OccAndAlarmStatsRow({filterByLane, filterBySite}: {filterByLane?: boolean, filterBySite?: boolean}){
    const idVal = useRef(0);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);
    const events = useSelector((state: RootState) => selectEventTableData(state)); //.filter((e: any) => e.laneId === currentLane));

    const counts = useMemo(() => {

        let filteredEvents = events;
        if(filterByLane)
            filteredEvents = events.filter((e: any) => e.laneId === currentLane)

        // if(filterBySite)
        //     filteredEvents = events.filter((e: any) => e.)

        let id = idVal.current++;

        // alarms
        let neutronAlarmCount = 0;
        let neutronGammaAlarmCount = 0;
        let gammaAlarmCount = 0;
        let emlSuppressedCount = 0; //TODO: figure out what this means

        // occupancies
        let totalOccupancyCount = filteredEvents.length;
        let averageSpeed = 0.0; //TODO

        for(const event of filteredEvents) {
            if (event.status === 'Gamma & Neutron') neutronGammaAlarmCount++;
            else if (event.status === 'Gamma') gammaAlarmCount++;
            else if (event.status === 'Neutron') neutronAlarmCount++;
        }

        // calculate daily average based on the start date

        type DailyCount = {[date: string]: { alarms: number , nonalarms: number }}
        const dailyCount : DailyCount = {};

        for(const event of filteredEvents){
            // split and group events by start time
            const [date, time] = event.startTime.split("T");
            const status = event.status; // gamma, neutron , gamma-neutron, none

            if(!dailyCount[date])
                dailyCount[date] = { alarms: 0, nonalarms: 0 } //creates a new date in our map

            // increment the count based off of the status
            // if(status === 'Gamma' || status === 'Gamma & Neutron' || status === 'Neutron'){
            //     dailyCount[date].alarms++;
            // }else {
            //     dailyCount[date].nonalarms++;
            // }
        }

        let dayCount = Object.keys(dailyCount).length
        let dailyOccupancyAverage = dayCount > 0 ? (totalOccupancyCount / dayCount).toFixed(2) : 0.0;

        // total alarming events
        let alarmingEvents = neutronAlarmCount + gammaAlarmCount + neutronGammaAlarmCount;

        //stats
        let alarmRate = totalOccupancyCount > 0 ? (alarmingEvents/ totalOccupancyCount).toFixed(2) : 0.00;
        let emlAlarmRate = 0.0;
        // let emlAlarmRate = emlSuppressedCount/ (emlSuppressedCount + alarmingEvents);

        return {id,
            neutronGammaAlarmCount,
            gammaAlarmCount,
            neutronAlarmCount,
            emlSuppressedCount,
            totalOccupancyCount,
            dailyOccupancyAverage,
            averageSpeed: 0.0,
            alarmRate,
            emlAlarmRate
        }
    }, [events, filterByLane]);


    return (
        <TableContainer component={Paper}>
            <Table sx={{minWidth: 650}} aria-label="simple table">
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                        <TableCell>Gamma</TableCell>
                        <TableCell>Gamma-Neutron</TableCell>
                        <TableCell>Neutron</TableCell>
                        <TableCell>EML Suppressed</TableCell>
                        <TableCell>Total Occupancies</TableCell>
                        <TableCell>Daily Occupancy Avg</TableCell>
                        <TableCell>Speed (Avg)</TableCell>
                        <TableCell>Alarm Rate</TableCell>
                        <TableCell>EML Alarm Rate</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {counts ? (
                        <TableRow key={counts.id}
                                  sx={{'&:last-child td, &:last-child th': { textAlign: "center" }}}>
                            <TableCell>{counts.gammaAlarmCount}</TableCell>
                            <TableCell>{counts.neutronGammaAlarmCount}</TableCell>
                            <TableCell>{counts.neutronAlarmCount}</TableCell>
                            <TableCell>{counts.emlSuppressedCount}</TableCell>
                            <TableCell>{counts.totalOccupancyCount}</TableCell>
                            <TableCell>{counts.dailyOccupancyAverage}</TableCell>
                            <TableCell>{counts.averageSpeed}</TableCell>
                            <TableCell>{counts.alarmRate}</TableCell>
                            <TableCell>{counts.emlAlarmRate}</TableCell>
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


