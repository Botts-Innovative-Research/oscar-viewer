"use client";

import { Box, FormControl, Grid, IconButton, InputLabel, ListSubheader, MenuItem, Pagination, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Image from "next/image";
import { useState } from 'react';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function EventPreview(props: {
  event: number
}) {
  const [adjudicated, setAdjudicated] = useState('');

  const handleChange = (event: SelectChangeEvent) => {
    setAdjudicated(event.target.value as string);
  };

  return (
    <Paper variant='outlined' sx={{ height: "100%" }}>
      {props.event !== 0 ? (
        <Stack sx={{ padding: 2 }}>
          <Stack direction={"row"} justifyContent={"space-between"}>
            <Box sx={{ display: "flex" }}>
              <Typography variant="h6">Occupancy ID</Typography>
              <IconButton aria-label="expand" size="small">
                <OpenInFullRoundedIcon fontSize="inherit" />
              </IconButton>
            </Box>
            <IconButton aria-label="close" size="small">
              <CloseRoundedIcon fontSize="inherit" />
            </IconButton>
          </Stack>
          <FormControl size="small">
            <InputLabel id="demo-simple-select-label">Age</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={adjudicated}
              label="Adjudicated"
              onChange={handleChange}
              MenuProps={{
                MenuListProps: {
                  style: {
                    maxHeight: 300
                  }
                }
              }}
            >
              <ListSubheader>Real Alarm</ListSubheader>
              <MenuItem value={1}>Code 1: Contraband Found</MenuItem>
              <MenuItem value={2}>Code 2: Other</MenuItem>
              <ListSubheader>Innocent Alarm</ListSubheader>
              <MenuItem value={3}>Code 3: Medical Isotope Found</MenuItem>
              <MenuItem value={4}>Code 4: NORM Found</MenuItem>
              <MenuItem value={5}>Code 5: Declared Shipment of Radioactive Material</MenuItem>
              <ListSubheader>False Alarm</ListSubheader>
              <MenuItem value={6}>Code 6: Physical Inspection Negative</MenuItem>
              <MenuItem value={7}>Code 7: RIID/ASP Indicates Background Only</MenuItem>
              <MenuItem value={8}>Code 8: Other</MenuItem>
              <ListSubheader>Alarm/Tamper/Fault</ListSubheader>
              <MenuItem value={9}>Code 9: Authorized Test, Maintenence, or Training Activity</MenuItem>
              <ListSubheader>Tamper/Fault</ListSubheader>
              <MenuItem value={10}>Code 10: Unauthorized Activity</MenuItem>
              <ListSubheader>Other</ListSubheader>
              <MenuItem value={11}>Code 11: Other</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      ) : (
        <Image src={"/SiteMap.png"} alt="Site Map" width={0} height={0} sizes={"100vw"} style={{ width: "100%", height: "100%", padding: 10 }} />
      )}
    </Paper>
  );
}