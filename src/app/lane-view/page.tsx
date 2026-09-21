"use client";

import {Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import BackButton from "../_components/BackButton";
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import EventTable from "@/app/_components/event-table/EventTable";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {
    isGammaDataStream,
    isNeutronDataStream,
    isTamperDataStream,
    isThresholdDataStream
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useAppDispatch} from "@/lib/state/Hooks";
import {selectLastToggleState, setToggleState} from "@/lib/state/LaneViewSlice";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import StatusTable from "../_components/lane-view/StatusTable";
import {useLanguage} from "@/app/contexts/LanguageContext";
import RS350BackpackView from "../_components/lane-view/RS350BackpackView";


export default function LaneViewPage() {
    const dispatch = useAppDispatch();
    const { t } = useLanguage();

    const savedToggleState = useSelector(selectLastToggleState)
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const {laneMapRef, readyLaneNames} = useContext(DataSourceContext);

    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);
    const laneReady = Boolean(currentLane && readyLaneNames.has(currentLane));

    const [entry, setEntry] = useState<LaneMapEntry>();
    const [gammaDS, setGammaDS] =  useState<typeof ConSysApi>();
    const [neutronDS, setNeutronDS] =  useState<typeof ConSysApi>();
    const [thresholdDS, setThresholdDS] = useState<typeof ConSysApi>();
    const [tamperDS, setTamperDS] =  useState<typeof ConSysApi>();

    const [dataSourcesByLane, setDataSourcesByLane] = useState<LaneDSColl>(null);
    const [toggleView, setToggleView] = useState(savedToggleState);


    const toggleButtons = [
        <ToggleButton value={"occupancy"} key={"occupancy"} disabled={toggleView == 'occupancy'}>{t('occupancyTable')}</ToggleButton>,
        <ToggleButton value={"fault"} key={"fault"} disabled={toggleView == 'fault'}>{t('faultTable')}</ToggleButton>
    ];

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
        dispatch(setToggleState(newView))
    }

    const collectDataSources = useCallback(async() => {

        if (!laneReady || !currentLane) {
            setEntry(undefined);
            setGammaDS(undefined);
            setNeutronDS(undefined);
            setThresholdDS(undefined);
            setTamperDS(undefined);
            setDataSourcesByLane(null);
            return;
        }

        let laneDsCollection = new LaneDSColl();

        const lane = laneMapRef.current.get(currentLane);

        if (!lane) {
            console.warn("Lane not found for currentLane:", currentLane);
            return;
        }

        setEntry(lane);

        for(let i = 0; i < lane.datastreams.length; i++) {
            const ds = lane.datastreams[i]

            const rtDS = lane.datasourcesRealtime[i];

            if (isGammaDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('gammaRT', rtDS);
                setGammaDS(rtDS)
            }
            if (isNeutronDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('neutronRT', rtDS);
                setNeutronDS(rtDS);
            }
            if (isTamperDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('tamperRT', rtDS);
                setTamperDS(rtDS)
            }
            if (isThresholdDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection?.addDS('gammaTrshldRT', rtDS);
                setThresholdDS(rtDS);
            }
        }

        setDataSourcesByLane(laneDsCollection);

    }, [currentLane, laneMapRef, laneReady]);

    useEffect(() => {
        void collectDataSources();
    }, [collectDataSources]);

    return (
        <Grid container spacing={2} width={"100%"}>

            {/* HEADER */}
            <Grid item container xs={12} spacing={2} alignItems={"center"}>
                <Grid item>
                    <BackButton/>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">
                        {t('laneIdValue', {lane: currentLane})}
                    </Typography>
                </Grid>
            </Grid>

            {entry?.isRS350Backpack ? (
                <RS350BackpackView entry={entry} currentLane={currentLane} laneMap={laneMap}/>
            ) : (
                <>
                    <Grid item xs={12}>
                        {dataSourcesByLane &&
                            <LaneStatus dataSourcesByLane={dataSourcesByLane}/>
                        }
                    </Grid>

                    <Grid item xs={12}>
                        <Media
                            datasources={{
                                gamma: gammaDS,
                                neutron: neutronDS,
                                threshold: thresholdDS,
                            }}
                            currentLane={currentLane}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Paper variant='outlined' sx={{ width: "100%", height: "100%", padding: 0}}>
                            <Grid container sx={{ width: "100%"}}>
                                <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", padding: 2 }}>
                                    <ToggleButtonGroup
                                        size="small"
                                        orientation="horizontal"
                                        onChange={handleToggle}
                                        exclusive
                                        value={toggleView}
                                        sx={{
                                            boxShadow: 1,
                                            '& .MuiToggleButton-root': {
                                                margin: 0.5,
                                                padding: "5px",
                                            },
                                        }}
                                    >
                                        {toggleButtons}
                                    </ToggleButtonGroup>
                                </Grid>
                                <Grid item sx={{ width: "100%", height: 800, display: toggleView === 'occupancy' ? 'block' : 'none' }}>
                                    <EventTable tableMode={'lanelog'} laneMap={laneMap} viewLane viewAdjudicated currentLane={currentLane}/>
                                </Grid>
                                <Grid item sx={{ width: "100%", height: 800, display: toggleView === 'fault' ? 'block' : 'none' }}>
                                    {entry && (
                                        <StatusTable currentLane={currentLane} entry={entry} />
                                    )}
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </>
            )}
        </Grid>
    );
}
