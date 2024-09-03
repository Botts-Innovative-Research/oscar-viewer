"use client";

import {EventTableData, LaneOccupancyData, LaneStatusData, SelectedEvent} from "../../../../types/new-types";
import {useEffect, useRef, useState} from "react";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Protocols} from "@/lib/data/Constants";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";
import {findInObject} from "@/app/utils/Utils";
import EventTable from "./EventTable";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {useSelector} from "react-redux";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {selectLanes} from "@/lib/state/OSCARClientSlice";


interface TableProps{
    onRowSelect: (event:SelectedEvent)=> void;
    tableMode: "eventlog" | "alarmtable";
}

export default function Table({onRowSelect, tableMode}: TableProps){

    const [data, setData] = useState<EventTableData[]>([]); // Data to be displayed, depending on tableMode
    const [eventLog, setEventLog] = useState<EventTableData[]>([]);
    const [occupancyTable, setOccupancyTable] = useState<EventTableData[]>([]);
    const [batchOccupancyTable, setBatchOccupancyTable] = useState<EventTableData[]>([]);
    const idVal = useRef(1);

    const [occupancyBatchDataSources, setBatchOccupancyDataSources] = useState(null);
    const [occupancyDataSources, setOccupancyDataSources] = useState(null);

    let server = `162.238.96.81:8781`;
    let endTime = new Date((new Date().getTime() - 1000000)).toISOString();
    let startTime = "2020-01-01T08:13:25.845Z";

    let filterByAdjudicatedCode = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    const ds : Datastream[] = Array.from(useSelector((state: any) => state.oshSlice.dataStreams.values()));
    const lanes: LaneMeta[] = useSelector(selectLanes);

    const [laneStatus, setLaneStatus] = useState<LaneStatusData[]| null>(null);
    const [laneOccupancy, setLaneOccupancy] = useState<LaneOccupancyData[]>(null);

    // Toggle data to be displayed based on tableMode
    useEffect(() => {
        if (tableMode == "alarmtable") {
            setData(
                ((occupancyTable.concat(batchOccupancyTable)).filter(item =>
                    !filterByAdjudicatedCode.includes(item.adjudicatedCode)))
                .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            );
        }
        else if (tableMode == "eventlog") {
            setData(
                eventLog.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            );
        }
    }, [tableMode, data])

    useEffect(() => {
        if (laneStatus === null && ds.length > 0) {
            let statuses: LaneStatusData[] = [];
            let laneOcc: LaneOccupancyData[] = [];

            lanes.map((lane) => {

                const gammaStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Gamma Count'));
                const neutronStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Neutron Count'));
                const tamperStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Tamper'));
                const occStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Occupancy'));

                const occ: LaneOccupancyData = {
                    laneData: lane,
                    occupancyStreams: occStreams
                };

                const stat: LaneStatusData = {
                    laneData: lane,
                    gammaDataStream: gammaStreams,
                    neutronDataStream: neutronStreams,
                    tamperDataStream: tamperStreams
                };
                statuses.push(stat);
                laneOcc.push(occ);
            });
            setLaneStatus(statuses);
            setLaneOccupancy(laneOcc);
        }
    }, [ds, lanes]);

    useEffect(() => {
        if (laneOccupancy && laneOccupancy.length > 0) {
            if (occupancyBatchDataSources === null) {
                const newBatchSource = laneOccupancy.map((data) => {
                    const batchSource = new SweApi(data.laneData.name, {
                        startTime: startTime,
                        endTime: endTime,
                        tls: false,
                        protocol: Protocols.WS,
                        mode: Mode.BATCH,
                        endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
                        resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
                        connectorOpts: {
                            username: 'admin',
                            password: 'admin',
                        },
                        prefetchBatchSize: 1000000,
                        prefetchBatchDuration: 5000,
                    });
                    batchSource.connect();
                    return batchSource;

                });
                setBatchOccupancyDataSources(newBatchSource);
            }

            if (occupancyDataSources === null) {
                const newOccSource = laneOccupancy.map((data) => {
                    const source = new SweApi(data.laneData.name, {
                        tls: false,
                        protocol: Protocols.WS,
                        mode: Mode.REAL_TIME,
                        endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
                        resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
                        connectorOpts: {
                            username: 'admin',
                            password: 'admin',
                        },
                    });
                    source.connect();
                    return source;
                });
                setOccupancyDataSources(newOccSource);
            }
        }
    }, [laneOccupancy]);

    useEffect(() => {
        if (occupancyBatchDataSources){
            const batchSubscriptions = occupancyBatchDataSources.map((datasource :any) =>{
                datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'batch'), [EventType.DATA]);
            });
        }
    }, [occupancyBatchDataSources]);

    useEffect(() => {
        if (occupancyDataSources){
            const occupancySubscriptions = occupancyDataSources.map((datasource: any) =>{
                datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'realTime'), [EventType.DATA]);
            });
        }
    }, [occupancyDataSources]);

    const handleOccupancyData = (laneName: string, message: any, mode: any) => {

        // @ts-ignore
        const msgVal: any[] = message.values ||[];

        msgVal.forEach((value) => {
            let occupancyCount = findInObject(value, 'occupancyCount'); //number
            let occupancyStart = findInObject(value, 'startTime'); //string
            let occupancyEnd = findInObject(value, 'endTime'); //string
            let gammaAlarm = findInObject(value, 'gammaAlarm'); //boolean
            let neutronAlarm = findInObject(value, 'neutronAlarm'); //boolean
            let maxGamma = findInObject(value, 'maxGamma');
            let maxNeutron = findInObject(value, 'maxNeutron');
            // let adjCode = findInObject(value, 'adjudicationCode');
            let statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : 'No Alarm';

            const newAlarmStatus: EventTableData = {
                id: idVal.current++,
                secondaryInspection: false,
                laneId: laneName,
                occupancyId: occupancyCount,
                startTime: occupancyStart,
                endTime: occupancyEnd,
                maxGamma: maxGamma,
                maxNeutron: maxNeutron,
                status: statusType,
                adjudicatedUser: 'kalyn', // Update useSelector(selectCurrentUser)
                adjudicatedCode: 0  // Update,
            };

            //set alarm table
            if(gammaAlarm || neutronAlarm){
                if(mode === Mode.BATCH){
                    setBatchOccupancyTable(prevState=>[newAlarmStatus, ...prevState.filter(item =>
                        item.occupancyId !== occupancyCount || item.laneId !== laneName)]);
                }
                else if(mode === Mode.REAL_TIME){
                    setOccupancyTable(prevState=>[newAlarmStatus, ...prevState.filter(item=>
                        item.laneId !== laneName || item.occupancyId !== occupancyCount)]);
                }
            }
            //for event log post even if there is not an alarm
            // setEventLog(prevState => [newAlarmStatus,...prevState]); //causes repeats of same occupancy
            setEventLog(prevState => [newAlarmStatus, ...prevState.filter(item => item.occupancyId !== occupancyCount)]);
        });
    }

    const handleSelectedRow = (event: SelectedEvent) => {
        // console.log(event); // Log the selected row data
        onRowSelect(event); // Pass to parent component
    };

    /** Handle return value based on tableMode */
    if (tableMode == "alarmtable") {
        return (
            <EventTable data={data} onRowSelect={handleSelectedRow}/>
        )
    }
    else if (tableMode == "eventlog") {
        return (
            <EventTable viewMenu viewLane viewSecondary viewAdjudicated data={data}/>
        )
    }
    else {
        return (<></>)
    }
}