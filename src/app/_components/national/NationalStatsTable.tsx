"use client"

import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {useSelector} from "react-redux";
import  {selectNodes} from "@/lib/state/OSHSlice";
import {AlarmTableData, NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {
    isGammaDatastream,
    isNeutronDatastream,
    isOccupancyDatastream,
    isTamperDatastream
} from "@/lib/data/oscar/Utilities";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {useAppDispatch} from "@/lib/state/Hooks";
import {RootState} from "@/lib/state/Store";
import {selectLaneViewLog} from "@/lib/state/EventDataSlice";
import {selectEndDate, selectStartDate} from "@/lib/state/NationalViewSlice";


export default function StatTable(){

    const dispatch = useAppDispatch();
    const savedStartDate = useSelector((state: RootState) => selectStartDate(state))
    const savedEndDate = useSelector((state: RootState) => selectEndDate(state))

    const [filteredTableData, setFilteredTableData] = useState<AlarmTableData[]>([]);


    const [startTime, setStartTime] = useState(savedStartDate);
    const [endTime, setEndTime] = useState(savedEndDate);


    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    const [sites, setSites] = useState<INationalTableData[]>([]);
    const idVal = useRef(0);
    const nodes = useSelector(selectNodes);
    const natlTableRef = useRef<NationalTableDataCollection>(new NationalTableDataCollection());


    useEffect(() => {
        setStartTime(savedStartDate);
        setEndTime(savedEndDate);
    }, [savedStartDate, savedEndDate]);

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

        setStartTime(savedStartDate)
        setEndTime(savedEndDate)

    }, [nodes, savedStartDate, savedEndDate]);


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

        // call the datasources to set up the map of systems and datasources
        datasourceSetup();
    }, [laneMapRef.current, startTime, endTime]);



    const datasourceSetup = useCallback(async () => {
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {
                let idx: number = lane.datastreams.indexOf(ds);

                if(isNeutronDatastream(ds)){
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }

                if(isGammaDatastream(ds)){
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }

                if(isTamperDatastream(ds)){
                    await fetchObservations(lane.parentNode.name, ds, startTime, endTime);
                }

                if (isOccupancyDatastream(ds)) {
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

                if (isNeutronDatastream(ds) && (res.result.alarmState === 'Alarm')) {
                    neutronCount++;
                }
                else if(isGammaDatastream(ds)){
                    if(res.result.alarmState === 'Alarm'){
                        gammaCount++;
                    }
                    else if(res.result.alarmState.includes('Fault')){
                        faultCount++;
                    }
                }
                else if (isTamperDatastream(ds) && res.result.tamperStatus) {
                    tamperCount++;
                }
                else if (isOccupancyDatastream(ds)) {
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



    // -------------------------------------

    const columns: GridColDef<INationalTableData>[] = [
        {
            field: 'site',
            headerName: 'Site Name',
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'occupancyCount',
            headerName: 'Occupancy',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'gammaAlarmCount',
            headerName: 'Gamma Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'neutronAlarmCount',
            headerName: 'Neutron Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'faultAlarmCount',
            headerName: 'Fault Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'tamperAlarmCount',
            headerName: 'Tamper Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
    ]


    return (
        // <NationalTable tableData={natlTableRef.current}/>

        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={natlTableRef.current.data}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 20,
                        },
                    },
                }}
                pageSizeOptions={[20]}
                slots={{toolbar: CustomToolbar}}
                autosizeOnMount
                autosizeOptions={{
                    expand: true,
                    includeOutliers: true,
                    includeHeaders: false,
                }}
            />
        </Box>
    )
}


