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

interface Name{
    laneName: string;
    siteName: string;
}

export default function StatTable(props: {

}){
    const [data, setData] = useState<INationalTableData[]>([]);
    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<Name, LaneDSColl>>(new Map<Name, LaneDSColl>());

    const [sites, setSites] = useState<INationalTableData[]>([]);
    const idVal = useRef(0);

    const nodes = useSelector(selectNodes);
    const natlTableRef = useRef<NationalTableDataCollection>(new NationalTableDataCollection());

    const datasourceSetup = useCallback(async () => {
        let laneDSMap = new Map<Name, LaneDSColl>();
        for(let node of nodes){
            for (let [laneid, lane] of laneMapRef.current.entries()) {

                if(node.id === lane.parentNode.id) {
                    laneDSMap.set({laneName: laneid, siteName: node.name}, new LaneDSColl());

                    for (let ds of lane.datastreams) {
                        let idx: number = lane.datastreams.indexOf(ds);
                        let batchDS = lane.datasourcesBatch[idx];
                        let startTime = (new Date(Date.now() - 1000 * 60 * 60 * 24)).toISOString(); //rn only 24 hrs but we can change start time to let userchoose

                        batchDS.properties.startTime = startTime;
                        batchDS.properties.endTime = "now";


                        if (ds.properties.name.includes('Driver - Occupancy')) {
                            await fetchObservations(lane.parentNode.name, ds, startTime, "now");
                        }
                        if (ds.properties.name.includes('Driver - Gamma Count')) {
                            await fetchObservations(lane.parentNode.name, ds, startTime, "now");
                        }

                        if (ds.properties.name.includes('Driver - Neutron Count')) {
                            await fetchObservations(lane.parentNode.name, ds, startTime, "now");
                        }

                        if (ds.properties.name.includes('Driver - Tamper')) {
                            await fetchObservations(lane.parentNode.name, ds, startTime, "now");
                        }
                    }
                    setDataSourcesByLane(laneDSMap);
                }
            }
        }

    }, [laneMapRef.current, nodes]);

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

            // call the datasources to set up the map of systems and datasources
            datasourceSetup();


        }
    }, [laneMapRef.current, nodes]);

    useEffect(() => {


    }, [sites]);



    //Local Node
    // 2786
    // 252
    // 430
    // 0
    // 8

    async function fetchObservations(siteName: string, ds: typeof DataStream, timeStart: string, timeEnd: string) {
        let occCount = 0;
        let gammaCount = 0;
        let neutronCount = 0;
        let tamperCount = 0;
        let faultCount = 0;

        let initialRes = await ds.searchObservations(new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`}), 25000);

        while(initialRes.hasNext()){
            if(ds.properties.name.includes('Driver - Neutron Count')){
                let neutronResult = await initialRes.nextPage();
                neutronResult.forEach((res: any) =>{
                    if(res.result.alarmState === 'Alarm'){
                        neutronCount++;
                    }
                });
            }else if(ds.properties.name.includes('Driver - Gamma Count')){
                let gammaResult = await initialRes.nextPage();
                gammaResult.forEach((res: any) =>{
                    if(res.result.alarmState === 'Alarm'){
                        console.log('gammaAlarm', siteName)
                        gammaCount++;
                    }
                    else if(res.result.alarmState.includes('Fault')){
                        faultCount++;
                    }
                });
            }else if(ds.properties.name.includes('Driver - Tamper')){
                let tamperResult = await initialRes.nextPage();
                tamperResult.forEach((res: any) =>{
                    if(res.result.tamperStatus){
                        tamperCount++;
                    }
                });
            }else if(ds.properties.name.includes('Driver - Occupancy')){
                let occResult = await initialRes.nextPage();
                occResult.forEach((res: any) =>{
                    occCount++;
                })
            }
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
        console.log('hellooooooooo',natlTableRef.current)
    }, [sites]);


    return (
       <NationalTable tableData={natlTableRef.current}/>
    )
}
