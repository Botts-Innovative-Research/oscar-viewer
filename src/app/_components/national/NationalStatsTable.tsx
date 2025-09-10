
import {useEffect, useRef, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {useSelector} from "react-redux";
import  {selectNodes} from "@/lib/state/OSHSlice";
import { NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";


export default function StatTable(){

    const nodes = useSelector(selectNodes);
    const [sites, setSites] = useState<INationalTableData[]>([]);

    const idVal = useRef(0);
    const natlTableRef = useRef<NationalTableDataCollection>(new NationalTableDataCollection());

    const occObservedProperty = "http://www.opengis.net/def/pillar-occupancy-count";
    const gammaObservedProperty = "http://www.opengis.net/def/gamma-gross-count";
    const neutronObservedProperty = "http://www.opengis.net/def/neutron-gross-count";
    const tamperObservedProperty = "http://www.opengis.net/def/tamper-status";

    useEffect(() => {
        // reset
        setSites([]);
        idVal.current = 0;

        if (nodes && nodes.length > 0) {
            createSiteList(nodes);
        }
    }, [nodes]);



    const createSiteList = async (nodeList: any[]) => {
        const newSites: INationalTableData[] = [];

        for (const node of nodeList) {
            try {
                const siteData = await retrieveObservationsForNode(node);
                newSites.push(siteData);
            } catch (error) {
                console.error(`Error processing node ${node.name}:`, error);
                newSites.push({
                    id: idVal.current++,
                    site: node.name,
                    occupancyCount: 0,
                    gammaAlarmCount: 0,
                    neutronAlarmCount: 0,
                    nonAlarmingCount: 0,
                    tamperAlarmCount: 0,
                    faultAlarmCount: 0,
                    gammaNeutronAlarmCount: 0
                });
            }
        }

        setSites(newSites);
    };

    const retrieveObservationsForNode = async (node: any): Promise<INationalTableData> => {
        let occCount = 0;
        let gammaCount = 0;
        let neutronCount = 0;
        let tamperCount = 0;
        let faultCount = 0;
        let gammaNeutronCount = 0;
        let nonAlarmingCount = 0;

        console.log(`Processing node: ${node.name}`);

        let occFilter = new ObservationFilter({observedProperty: occObservedProperty});
        let gammaFilter = new ObservationFilter({observedProperty: gammaObservedProperty});
        let neutronFilter = new ObservationFilter({observedProperty: neutronObservedProperty});
        let tamperFilter = new ObservationFilter({observedProperty: tamperObservedProperty});

        try {
            let occObservations = await node.fetchObservationsWithFilter(occFilter);
            let gammaObservations = await node.fetchObservationsWithFilter(gammaFilter);
            let neutronObservations = await node.fetchObservationsWithFilter(neutronFilter);
            let tamperObservations = await node.fetchObservationsWithFilter(tamperFilter);

            // occupancy observations
            occObservations.forEach((obs: any) => {
                occCount++;

                if(obs.properties.result.gammaAlarm == true && obs.properties.result.neutronAlarm == true){
                    gammaNeutronCount++
                }else if(obs.properties.result.gammaAlarm == false && obs.properties.result.neutronAlarm == true){
                    neutronCount++;
                }else if(obs.properties.result.gammaAlarm == true && obs.properties.result.neutronAlarm == false){
                    gammaCount++;
                }else{
                    nonAlarmingCount++;
                }
            });


            // gamma observations
            gammaObservations.forEach((obs: any) => {
                if(obs.properties.result.alarmState.includes('Fault')) faultCount++;
            });


            // neutron observations
            neutronObservations.forEach((obs: any) => {
                if(obs.properties.result.alarmState.includes('Fault')) faultCount++;
            });

            // tamper observations
            tamperObservations.forEach((obs: any) => {
                if(obs.properties.result.tamperStatus === true) tamperCount++;
            });
        } catch (error) {
            console.error(`Error fetching observations for node ${node.name}:`, error);
        }

        console.log(`Node ${node.name} - occCount: ${occCount}, gammaCount: ${gammaCount}, neutronCount: ${neutronCount}, gammaNeutronCount: ${gammaNeutronCount}, faultCount: ${faultCount}, tamperCount: ${tamperCount}`);

        return {
            id: idVal.current++,
            site: node.name,
            occupancyCount: occCount,
            gammaAlarmCount: gammaCount,
            neutronAlarmCount: neutronCount,
            nonAlarmingCount: nonAlarmingCount,
            tamperAlarmCount: tamperCount,
            faultAlarmCount: faultCount,
            gammaNeutronAlarmCount: gammaNeutronCount
        };
    };

    useEffect(() => {
        let tableData = new NationalTableDataCollection();
        tableData.setData(sites);
        natlTableRef.current = tableData;
    }, [sites]);

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
            headerName: 'Total Occupancy',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'gammaAlarmCount',
            headerName: 'Gamma Alarm',
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
            field: 'gammaNeutronAlarmCount',
            headerName: 'Gamma-Neutron Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'nonAlarmingCount',
            headerName: 'Non-Alarming Occupancy',
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