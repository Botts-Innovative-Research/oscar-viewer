"use client";

import {Box, Table, TableBody, TableCell, TableContainer, TableRow} from "@mui/material";
import {useSelector} from "react-redux";

import {useCallback, useContext, useEffect, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import {selectEventData, setSpeed} from "@/lib/state/EventDetailsSlice";
import {useAppDispatch} from "@/lib/state/Hooks";

// export default function MiscTable() {
export default function MiscTable({currentTime}: {currentTime: string}) {
  const dispatch = useAppDispatch();

  const laneMapRef = useContext(DataSourceContext).laneMapRef;
  const eventData = useSelector(selectEventData);

  const [speedVal, setSpeedval] = useState<string>("N/A");

  // console.log("currentTime", currentTime)
  const checkForSpeed = useCallback(async () => {
    if (eventData) {
      console.log("CHECKING FOR SPEED EVENT DATA IS NOT NULL", eventData)
      let lme = laneMapRef.current.get(eventData.laneId);

      let speedDS = lme.datastreams.find(ds => ds.properties.observedProperties[0].definition.includes('http://www.opengis.net/def/speed-time'));

      let initialRes = await speedDS.searchObservations(new ObservationFilter({ resultTime: `${eventData?.startTime}/${eventData?.endTime}`}), 25000);

      while(initialRes.hasNext()){
        let speedArr = await initialRes.nextPage();
        // make CSAPI request for speed in different output
        let speed = "N/A";

        speed = speedArr.find((sobs: any) => sobs.resultTime === currentTime)?.result.speedKPH || "N/A";

        setSpeedval(speed);
        dispatch(setSpeed(speed));
        return speed;
      }
    }
  }, [eventData, currentTime]);

  useEffect(() => {
    if(eventData){
      checkForSpeed();
    }
  }, [eventData, laneMapRef]);

  return (
      <Box>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableBody>
              <TableRow>
                <TableCell>Max Gamma Count Rate (cps)</TableCell>
                <TableCell>{eventData?.maxGamma}</TableCell>
                <TableCell>Neutron Background Count Rate</TableCell>
                <TableCell>{eventData?.neutronBackground}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Max Neutron Count Rate (cps)</TableCell>
                <TableCell>{eventData?.maxNeutron}</TableCell>
                <TableCell>Speed (kph)</TableCell>
                <TableCell>{speedVal}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
  );
}