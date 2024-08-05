"use client";

import { Grid, Pagination, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Image from "next/image";
import { useState } from 'react';

export default function CameraGrid() {
  const maxItems = 6; // Max number of videos per page
  const [page, setPage] = useState(1);  // Page currently selected
  const [startItem, setStartItem] = useState(0);  // Current start of range
  const [endItem, setEndItem] = useState(6); // Current end of range

  // Handle page value change
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    setStartItem(maxItems * (value - 1)); // Set startItem
    setEndItem(maxItems * (value - 1) + maxItems); // Set endItem to offset by maxItems
  };

  // Images for demo camera grid
  const demoImages = [
    {src: "/FrontGateLeft.png", name: "Front Gate Left", status: "alarm", id: 1},
    {src: "/FrontGateRight.png", name: "Front Gate Right", status: "fault", id: 2},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 3},
    {src: "/FerryPOVEntry.png", name: "Ferry POV Entry", status: "none", id: 4},
    {src: "/RearGateLeft.png", name: "Rear Gate Left", status: "none", id: 5},
    {src: "/RearGateRight.png", name: "Rear Gate Right", status: "none", id: 6},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 7},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 8},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 9},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 10},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 11},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
  ]

  return (
    <Grid container padding={2} justifyContent={"start"}>
      {demoImages.slice(startItem, endItem).map((item) => (
        <Grid item key={item.id} xs={2} display={"flex"} direction={"column"} alignItems={"center"}
          sx={{
            "&.MuiGrid-item": 
              {...item.status != "none" ? {
                border: "solid",
                borderWidth: "2px",
                borderColor: (item.status == "alarm" ? "error.main" : "secondary.main"),
                backgroundColor: (item.status == "alarm" ? "errorHighlight" : "secondaryHighlight"),
              } : {},
              padding: "0px",
            },
          }}
        >
          <Image src={item.src} alt="test image" width={0} height={0} sizes={"100vw"} style={{ width: "100%", height: "100%", }} />
          <Typography variant="body2">{item.name}</Typography>
        </Grid>
      ))}
      <Grid item xs={12} display={"flex"} justifyContent={"center"}>
        <Pagination count={Math.ceil(demoImages.length / maxItems)} onChange={handleChange} color="primary" showFirstButton showLastButton />
      </Grid>
    </Grid>
  );
}