"use client";

import {SelectedEvent} from "types/new-types";
import {Box, Table, TableBody, TableCell, TableContainer, TableRow} from "@mui/material";
import {useSelector} from "react-redux";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {useCallback, useContext, useEffect, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";

export default function MiscTable({currentTime}: {currentTime: string}) {

  const laneMapRef = useContext(DataSourceContext).laneMapRef;
  const eventPreview = useSelector(selectEventPreview);
  const eventData: EventTableData = eventPreview.eventData;

  const [speedVal, setSpeedval] = useState<string>("N/A");

  const checkForSpeed = useCallback(async () => {
    if (eventData) {
      let lme = laneMapRef.current.get(eventData.laneId);
      console.log("Speed LaneMapEntry: ", lme, eventPreview);
      console.log("Speed Current Time", currentTime);

      let speedDS = lme.datastreams.find(ds => ds.properties.outputName === "speed");
      let speedRes = await speedDS.searchObservations(new ObservationFilter(
          {resultTime: `${eventData.startTime}/${eventData.endTime}`}
      ), 10000);
      let speedArr: any[] = await speedRes.nextPage();

      // make CSAPI request for speed in different output
      let speed = "N/A";
      console.log("Speed not implemented yet", speedDS);
      if (speedArr.length > 0) {
        speed = speedArr.find(obs => obs.resultTime === currentTime)?.result.speedKPH || "N/A";
        console.log("Speed: ", speed, speedArr, currentTime);
      }
      setSpeedval(speed);
      return speed;
    }
  }, [eventPreview, currentTime]);

  useEffect(() => {
    checkForSpeed();
  }, [checkForSpeed]);

  return (
      <Box>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableBody>
              <TableRow>
                <TableCell>Max Gamma Count Rate (cps)</TableCell>
                <TableCell>{eventData.maxGamma}</TableCell>
                <TableCell>Neutron Background Count Rate</TableCell>
                <TableCell>{eventData.neutronBackground}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Max Neutron Count Rate (cps)</TableCell>
                <TableCell>{eventData.maxNeutron}</TableCell>
                <TableCell>Speed (kph)</TableCell>
                <TableCell>{speedVal}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
  );
}