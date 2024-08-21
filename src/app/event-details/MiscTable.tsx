"use client";

import { SelectedEvent } from "types/new-types";
import { Box, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";

export default function MiscTable(props: {
  event: SelectedEvent;
}) {
  
  return (
    <Box>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            <TableRow>
              <TableCell>Count Rate</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Gamma & Neutron Background Count Rate</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Max Gamma Count Rate (cps)</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Speed (kph)</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell>Max Gamma Count Rate (cps)</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Daily Occupancy</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}