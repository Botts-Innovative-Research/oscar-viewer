"use client"

import { useContext, useMemo, useRef, useState } from "react";
import { IFaultStats } from "../../../../types/new-types";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneViewLog} from "@/lib/state/EventDataSlice";



export default function FaultStatsRow(){
    const idVal = useRef(0);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);
    const events = useSelector((state: RootState) => selectLaneViewLog(state).filter((e: any) => e.laneId === currentLane));

    const counts = useMemo(() => {
        let gammaHighCount = 0;
        let gammaLowCount = 0;
        let neutronHighCount = 0;
        let tamperCount = 0;
        let extendedOccCount = 0;
        let commCount = 0;
        let camCount = 0;
        let id = idVal.current++;

        for(const event of events) {
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

    // useEffect(() => {
        // const initFaults: IFaultStats = {
        //     id: idVal.current,
        //     gammaHighCount: 0,
        //     gammaLowCount: 0,
        //     neutronHighCount: 0,
        //     tamperCount: 0,
        //     extendedOccCount: 0,
        //     commCount: 0,
        //     camCount: 0
        // }
        //
        // setFaults(initFaults);
        // call the datasources to set up the map of systems and datasources
    //     datasourceSetup();
    // }, [currentLane]);


    // const datasourceSetup = useCallback(async () => {
    //     let laneDSMap = new LaneDSColl();
    //
    //     let startTime = "2020-01-01T08:13:25.845Z";
    //
    //     const lane = laneMapRef.current.get(currentLane);
    //
    //     if(!lane){
    //         console.warn("Lane not found")
    //         return;
    //     }
    //
    //     for (let ds of lane.datastreams) {
    //         let idx: number = lane.datastreams.indexOf(ds);
    //
    //         if(isNeutronDatastream(ds)){
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //
    //         if(isGammaDatastream(ds)){
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //
    //         if(isTamperDatastream(ds)){
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //
    //         if (isOccupancyDatastream(ds)) {
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //         if(isVideoDatastream(ds)) {
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //         if(isConnectionDatastream(ds)){
    //             await fetchObservations(lane.parentNode.name, ds, startTime);
    //         }
    //     }
    // }, [laneMapRef.current]);


    // async function fetchObservations(siteName: string, ds: typeof DataStream, startTime: string) {
    //
    //     let gammaHighCount = 0;
    //     let gammaLowCount = 0;
    //     let neutronHighCount = 0;
    //     let tamperCount = 0;
    //     let extendedOccCount = 0;
    //     let commCount = 0;
    //     let camCount = 0;
    //
    //     let initialRes = await ds.searchObservations(new ObservationFilter({ resultTime: `${startTime}/now` }), 25000);
    //
    //     while (initialRes.hasNext()) {
    //         let obsRes = await initialRes.nextPage();
    //
    //         obsRes.map((res: any) => {
    //
    //             if (isNeutronDatastream(ds) && (res.result.alarmState === 'Neutron High')) {
    //                 neutronHighCount++;
    //             }
    //             else if(isGammaDatastream(ds)){
    //                 if(res.result.alarmState === 'Gamma High'){
    //                     gammaHighCount++;
    //                 }
    //                 else if(res.result.alarmState.includes('Gamma Low')){
    //                     gammaLowCount++;
    //                 }
    //             }
    //             else if(isTamperDatastream(ds) && res.result.tamperStatus) {
    //                 tamperCount++;
    //             }
    //             else if (isOccupancyDatastream(ds)) {
    //                 let resultTimeLength = res.result.endTime + res.result.startTime
    //                 // extended occupancy is defined as an occupancy lasting longer than 10 minutes
    //                 if(resultTimeLength > 600){
    //                     extendedOccCount++
    //                 }
    //             }
    //             else if(isVideoDatastream(ds)){
    //                 // VIDEO COMMUNICATION DISCONNECTION COUNT
    //                 // think they are looking for disconnections so we will need to add stuff to the backend before this changes
    //                 // camCount++;
    //             }else if(isConnectionDatastream(ds)){
    //                 // RAPISCAN COMMUNICATION DISCONNECTION COUNT
    //             }
    //         })
    //     }
    //
    //
    //     setFaults((prev) => {
    //         return{
    //             ...prev,
    //             gammaHighCount: prev.gammaHighCount + gammaHighCount,
    //             gammaLowCount: prev.gammaLowCount + gammaLowCount,
    //             neutronHighCount: prev.neutronHighCount + neutronHighCount,
    //             tamperCount: prev.tamperCount + tamperCount,
    //             extendedOccCount: prev.extendedOccCount + extendedOccCount,
    //             commCount: prev.commCount + commCount,
    //             camCount: prev.camCount + camCount,
    //         };
    //     });
    //
    // }


    return (
        <TableContainer>
            <Table sx={{minWidth: 650}} aria-label="simple table">
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                        <TableCell>Lane Id</TableCell>
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
                                  sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                            <TableCell>{currentLane}</TableCell>
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


