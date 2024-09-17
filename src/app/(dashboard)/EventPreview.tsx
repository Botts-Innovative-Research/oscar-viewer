"use client";

import {Box, IconButton, SelectChangeEvent, Stack, TextField, Typography} from '@mui/material';

import {useContext, useEffect, useState} from 'react';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AdjudicationSelect from '../_components/AdjudicationSelect';
import {SelectedEvent} from 'types/new-types';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import MapComponent from '../_components/maps/MapComponent';



export default function EventPreview(props: { event?: SelectedEvent; }) {
  const [selectedEvent, setSelectedEvent] = useState(
      props.event && props.event.startTime && props.event.endTime ? props.event : null
  );
  const laneMapRef = useContext(DataSourceContext).laneMapRef;
  const eventPreview = useSelector(selectEventPreview);

  const handleAdjudication = (value: string) => {
    console.log(value); // Print adjudication code value
  }

  const handleSelectedMarker = (event: SelectedEvent) => {
    console.log(event);
  };

  useEffect(() => {
    setSelectedEvent(props.event);  // Update selected event on change
  }, [props.event])

  return (
      <Box>
        {eventPreview.isOpen ? (
            <Stack p={1} display={"flex"}>
              <Stack direction={"row"} justifyContent={"space-between"} spacing={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                  <Typography variant="h6">Occupancy ID: {eventPreview.eventData.id}</Typography>
                  <IconButton aria-label="expand">
                    <OpenInFullRoundedIcon fontSize="small"/>
                  </IconButton>
                </Stack>
                <IconButton aria-label="close">
                  <CloseRoundedIcon fontSize="small"/>
                </IconButton>
              </Stack>
              <AdjudicationSelect onSelect={handleAdjudication}/>
              <TextField
                  id="outlined-multiline-static"
                  label="Notes"
                  multiline
                  rows={4}
              />
            </Stack>
        ) : (
            <>
            </>
            // <Box  style={{ width: "100%", height: "100%", padding: 10, overflow: 'hidden'}}>
            //   <MapComponent />
            // </Box>
            // <Image src={"/SiteMap.png"} alt="Site Map" width={0} height={0} sizes={"100vw"} style={{ width: "100%", height: "100%", padding: 10 }} />
        )}
      </Box>
  );
}


