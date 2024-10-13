"use client"




import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import NationalTable from "./NationalTable";
import {Datastream} from "@/lib/data/osh/Datastreams";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {useSelector} from "react-redux";
import  {selectNodes} from "@/lib/state/OSHSlice";
import {EventTableData, NationalTableData, NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";






export default function StatTable(props: {
    startTime: string
    endTime: string


}){


    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");


    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    const [sites, setSites] = useState<INationalTableData[]>([]);
    const idVal = useRef(0);
    const nodes = useSelector(selectNodes);
    const natlTableRef = useRef<NationalTableDataCollection>(new NationalTableDataCollection());


    useEffect(() => {
        // create the site datastruct for each node that exists on the viewer and initialize it
        if(nodes && nodes.length> 0){
            let oscarSites: any[] = []
            nodes.forEach((node: any) =>{
                const newSite ={
                    id: idVal.current++,
                    site: node.name,
                    occupancyCount: 0,
                    gammaAlarmCount: 0,
                    neutronAlarmCount: 0,
                    faultAlarmCount: 0,
                    tamperAlarmCount: 0,
                }
                oscarSites.push(newSite);
            })
            setSites(oscarSites);
        }


    }, [nodes]);


    useEffect(() => {
        //reset sites when start time changes
        setSites((prevSites) => {
            return prevSites.map((site) => ({
                ...site,
                occupancyCount: 0,
                gammaAlarmCount: 0,
                neutronAlarmCount: 0,
                faultAlarmCount: 0,
                tamperAlarmCount: 0,
            }));
        });
        setStartTime(props.startTime)
        setEndTime(props.endTime)
        // let now = new Date();
        // // update start time based on user input
        // if(props.startTime === 'day'){
        //     setStartTime((new Date(Date.now() - 1000 * 60 * 60 * 24)).toISOString());
        // }else if (props.startTime === 'week'){
        //     setStartTime((new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)).toISOString());
        // }else if(props.startTime === 'month'){
        //
        //     let prevMonth = new Date(now.setMonth((now.getMonth() - 1)));
        //     setStartTime(prevMonth.toISOString());
        // }

        // call the datasources to set up the map of systems and datasources
        datasourceSetup();
    }, [laneMapRef.current, props.startTime, props.endTime]);



    const datasourceSetup = useCallback(async () => {
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {
                let idx: number = lane.datastreams.indexOf(ds);

                if (ds.properties.name.includes('Driver - Occupancy')) {
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }
                if (ds.properties.name.includes('Driver - Gamma Count')) {
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }

                if (ds.properties.name.includes('Driver - Neutron Count')) {
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }

                if (ds.properties.name.includes('Driver - Tamper')) {
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }
            }
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current, startTime, endTime]);


    async function fetchObservations(siteName: string, ds: typeof DataStream, timeStart: string, timeEnd: string) {

        let occCount = 0;
        let gammaCount = 0;
        let neutronCount = 0;
        let tamperCount = 0;
        let faultCount = 0;

        let initialRes = await ds.searchObservations(new ObservationFilter({ resultTime: `${timeStart}/${timeEnd}` }), 25000);

        while (initialRes.hasNext()) {
            let obsRes = await initialRes.nextPage();

            obsRes.map((res: any) => {

                if (ds.properties.name.includes('Driver - Neutron Count') && (res.result.alarmState === 'Alarm')) {
                    neutronCount++;
                } else if (ds.properties.name.includes('Driver - Gamma Count')) {
                    if(res.result.alarmState === 'Alarm'){
                        gammaCount++;
                    }
                    else if(res.result.alarmState.includes('Fault')){
                        faultCount++;
                    }
                }else if (ds.properties.name.includes('Driver - Tamper') && res.result.tamperStatus === true) {
                    tamperCount++;

                } else if (ds.properties.name.includes('Driver - Occupancy')) {
                    if(res.result.gammaAlarm === true || res.result.neutronAlarm === true){
                        occCount++
                    }else if(res.result.gammaAlarm === false || res.result.neutronAlarm === false){
                        occCount++
                    }


                }
            })
        }


        setSites((prevSites) => {
            return prevSites.map((site) =>{
                if(site.site === siteName){
                    return{
                        ...site,
                        occupancyCount: site.occupancyCount + occCount,
                        gammaAlarmCount: site.gammaAlarmCount + gammaCount,
                        neutronAlarmCount: site.neutronAlarmCount + neutronCount,
                        tamperAlarmCount: site.tamperAlarmCount + tamperCount,
                        faultAlarmCount: site.faultAlarmCount + faultCount,

                    };

                }
                return site;
            })
        });
    }

    useEffect(() => {
        let tableData = new NationalTableDataCollection();
        tableData.setData(sites);
        natlTableRef.current = tableData;
    }, [sites]);


    return (
        <NationalTable tableData={natlTableRef.current}/>
    )
}


