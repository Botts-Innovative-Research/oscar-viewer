"use client";

import {Comment} from "../../../../types/new-types";
import React, {useContext, useEffect, useState} from "react";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import AdjudicationData, {IAdjudicationData} from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Stack, Typography} from "@mui/material";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";

const logColumns: GridColDef<AdjudicationData>[] = [
    {field: 'secondaryInspectionStatus', headerName: 'Secondary Inspection Status', width: 200},
    {
        field: 'adjudicationCode', headerName: 'Adjudication Code', width: 400, valueGetter: (value, row) => {
            console.log("ADJDEt - ", row);
            return row.adjudicationCode.label
        }
    },
    {
        field: 'isotopes', headerName: 'Isotopes', width: 200, valueGetter: (value) => {
            if (value === "") return "N/A";
            else return value;
        }
    },
    {
        field: 'vehicleId', headerName: 'Vehicle ID', width: 200, valueGetter: (value) => {
            if (value === "") return "N/A";
            else return value;
        }
    },
];

export default function AdjudicationLog(props: {
    comments: Comment[];
    event: EventTableData;
    shouldFetch: boolean;
    onFetch: () => void;
}) {

    const adjCodeDescriptions: { [key: number]: string } = {
        1: "Code 1: Contraband Found",
        2: "Code 2: Other",
        3: "Code 3: Medical Isotope Found",
        4: "Code 4: NORM Found",
        5: "Code 5: Declared Shipment of Radioactive Material",
        6: "Code 6: Physical Inspection Negative",
        7: "Code 7: RIID/ASP Indicates Background Only",
        8: "Code 8: Other",
        9: "Code 9: Authorized Test, Maintenance, or Training Activity",
        10: "Code 10: Unauthorized Activity",
        11: "Code 11: Other"
    };

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [laneAdjdatastream, setLaneAdjDatastream] = useState<typeof DataStream>();
    const [adjLog, setAdjLog] = useState<AdjudicationData[]>([]);

    const getAdjudicationStyle = (adjudication: number) => {
        if (adjudication < 3) {
            return {borderColor: "error.dark", color: "error.dark"};
        } else if (adjudication < 6) {
            return {borderColor: "primary.dark", color: "primary.dark"};
        } else if (adjudication < 9) {
            return {borderColor: "success.dark", color: "success.dark"};
        } else {
            return {borderColor: "text.primary", color: "text.primary"};
        }
    };

    async function getLaneAdjDatastream() {
        let laneEntry = laneMapRef.current.get(props.event.laneId);
        let laneDSId = laneEntry.parentNode.laneAdjMap.get(props.event.laneId);
        console.log("[ADJ-Log] Lane Datastream ID: ", laneDSId);
        let adjDs: typeof DataStream = await laneEntry.getAdjudicationDatastream(laneDSId);
        console.log("[ADJ-Log] Lane Adjudication Datastream: ", adjDs);

        setLaneAdjDatastream(adjDs);
        return adjDs;
    }


    async function fetchObservations(ds: typeof DataStream) {
        let observations = await ds.searchObservations(new ObservationFilter({
            resultTime: `${props.event.startTime}/now`
        }), 1000);
        while (observations.hasNext()) {
            let obsRes = await observations.nextPage();
            let adjDataArr = obsRes.map((obs: any) => {
                console.log("[ADJ-Log] Adjudication Datastream Observation: ", obs);
                let data = new AdjudicationData(obs.result.username, obs.result.occupancyId, obs.result.alarmingSystemUid);
                data.setFeedback(obs.result.feedback);
                data.setIsotopes(obs.result.isotopes);
                data.setSecondaryInspectionStatus(obs.result.secondaryInspectionStatus);
                data.setAdjudicationCode(AdjudicationCodes.getCodeObjByLabel(obs.result.adjudicationCode));
                data.setVehicleId(obs.result.vehicleId);
                return data
            });
            console.log("[ADJ-Log] Adjudication Datastream Observations: ", adjDataArr);
            setAdjLog(adjDataArr);
        }
        props.onFetch();
    }

    useEffect(() => {
        getLaneAdjDatastream();
    }, [props.event.laneId]);

    useEffect(() => {
        if (laneAdjdatastream) {
            fetchObservations(laneAdjdatastream);
        }
    }, [laneAdjdatastream]);

    useEffect(() => {
        console.log("[ADJ-Log] Adjudication Log Updated: ", adjLog);
    }, [adjLog]);

    useEffect(() => {
        if (props.shouldFetch) {
            setTimeout(() => {
                console.log("[ADJ-Log] Fetching Adjudication Log due to trigger");
                fetchObservations(laneAdjdatastream);
            }, 10000);
        }
    }, [props.shouldFetch]);

    return (
        <>
            <Stack spacing={2}>
                <Typography variant="h5">Logged Adjudications</Typography>
                <DataGrid
                    rows={adjLog}
                    columns={logColumns}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 10
                            }
                        }
                    }}
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    disableRowSelectionOnClick={true}
                />
            </Stack>
        </>
    );
}
