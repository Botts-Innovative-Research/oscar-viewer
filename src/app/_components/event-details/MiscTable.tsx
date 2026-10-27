"use client";

import {Box, Table, TableBody, TableCell, TableContainer, TableRow, Typography} from "@mui/material";
import {useSelector} from "react-redux";
import React, {useContext, useEffect, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {selectEventData, selectSpeed} from "@/lib/state/EventDetailsSlice";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {isSpeedDataStream} from "@/lib/data/oscar/Utilities";
import {useLanguage} from '@/app/contexts/LanguageContext';


export default function MiscTable({
    eventData: eventDataProp,
    currentTime,
}: {
    eventData?: EventTableData;
    currentTime?: string;
}) {
    const {t} = useLanguage();

    const savedSpeed = useSelector(selectSpeed);
    const selectedEventData = useSelector(selectEventData);
    const eventData = eventDataProp ?? selectedEventData;
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [speedVal, setSpeedval] = useState<string>(savedSpeed || "N/A");

    useEffect(() => {
        let active = true;
        setSpeedval("N/A");
        if (!eventData || !laneMapRef.current) return;
        const checkForSpeed = async () => {
            const lme = laneMapRef.current.get(eventData.laneId);
            if (!lme) {
                console.warn("Cannot load speed: lane entry is unavailable:", eventData.laneId);
                return;
            }

            const speedDS = lme.datastreams.find(ds => isSpeedDataStream(ds));
            if (!speedDS) return;

            try {
                const initialRes = await speedDS.searchObservations(new ObservationFilter({ resultTime: `${eventData?.startTime}/${eventData?.endTime}`}), 10000);

                const speedArr = await initialRes.nextPage();
                const speed = speedArr?.[0]?.result?.speedKPH ?? "N/A";

                if (active) setSpeedval(speed);
            } catch (error) {
                console.error("Failed to load event speed:", error);
            }
        };
        void checkForSpeed();
        return () => { active = false; };
    }, [eventData, currentTime, laneMapRef]);

    return (
        <Box sx={{height: 300, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5">
                {t('occupancyOverview')}
            </Typography>
            <TableContainer>
                <Table
                    aria-label={t('eventMeasurements')}
                    sx={{ minWidth: 500 }}
                >
                    <TableBody>
                        <TableRow>
                            <TableCell>{t('maxGammaCountRate')}</TableCell>
                            <TableCell>{eventData?.maxGamma}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>{t('neutronBackgroundCountRate')}</TableCell>
                            <TableCell>{eventData?.neutronBackground}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>{t('maxNeutronCountRate')}</TableCell>
                            <TableCell>{eventData?.maxNeutron}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>{t('speedKph')}</TableCell>
                            <TableCell>{speedVal}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
