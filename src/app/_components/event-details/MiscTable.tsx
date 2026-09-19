"use client";

import {Box, Table, TableBody, TableCell, TableContainer, TableRow} from "@mui/material";
import {useSelector} from "react-redux";

import {useCallback, useContext, useEffect, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {selectEventData, selectSpeed} from "@/lib/state/EventDetailsSlice";
import {isSpeedDataStream} from "@/lib/data/oscar/Utilities";
import { useBreakpoint } from "@/app/providers";
import {useLanguage} from '@/app/contexts/LanguageContext';


export default function MiscTable({currentTime}: {currentTime: string}) {
  const { isMobile } = useBreakpoint();
  const {t} = useLanguage();

  const savedSpeed = useSelector(selectSpeed)
  const eventData = useSelector(selectEventData);
  const laneMapRef = useContext(DataSourceContext).laneMapRef;


  const [speedVal, setSpeedval] = useState<string>(savedSpeed); //maybe put savedSpeed here instead

  const checkForSpeed = useCallback(async () => {
    if (eventData) {
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

        setSpeedval(speed);
        return speed;
      } catch (error) {
        console.error("Failed to load event speed:", error);
      }
    }
  }, [eventData, currentTime]);

  useEffect(() => {
    if(eventData && laneMapRef.current){
      checkForSpeed();
    }
  }, [eventData, laneMapRef]);

  return (
      <Box>
        <TableContainer>
          <Table
            aria-label={t('eventMeasurements')}
            sx={{ minWidth: 500 }}
          >
            <TableBody>
              {!isMobile ? (
                <>
                  <TableRow>
                    <TableCell>{t('maxGammaCountRate')}</TableCell>
                    <TableCell>{eventData?.maxGamma}</TableCell>
                    <TableCell>{t('neutronBackgroundCountRate')}</TableCell>
                      <TableCell>{eventData?.neutronBackground}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('maxNeutronCountRate')}</TableCell>
                    <TableCell>{eventData?.maxNeutron}</TableCell>
                    <TableCell>{t('speedKph')}</TableCell>
                    <TableCell>{speedVal}</TableCell>
                  </TableRow>
                </>
              ) : (
                <>
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
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
  );
}
