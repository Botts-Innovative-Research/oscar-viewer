"use client";

import { EventTableData, SelectedEvent } from "types/new-types";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const testData: EventTableData = {
  id: 1,
  secondaryInspection: false,
  laneId: '1', occupancyId: '1',
  startTime: 'XX:XX:XX AM',
  endTime: 'XX:XX:XX AM',
  maxGamma: 25642,
  maxNeutron: 0,
  status: 'Gamma',
  adjudicatedUser: "None",
  adjudicatedCode: 0,
}

export default function DataRow(props: {
  event: SelectedEvent;
}) {
  
  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="center">Secondary Inspection</TableCell>
            <TableCell>Lane ID</TableCell>
            <TableCell>Start Time</TableCell>
            <TableCell>End Time</TableCell>
            <TableCell>Max Gamma Count</TableCell>
            <TableCell>Max Neutron Count</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Adjudicated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow
            key={testData.id}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
            <TableCell align="center">
              {testData.secondaryInspection ? (
                <CheckRoundedIcon />
              ): (
                <CloseRoundedIcon />
              )}
            </TableCell>
            <TableCell>{testData.laneId}</TableCell>
            <TableCell>{testData.startTime}</TableCell>
            <TableCell>{testData.endTime}</TableCell>
            <TableCell>{testData.maxGamma}</TableCell>
            <TableCell>{testData.maxNeutron}</TableCell>
            <TableCell>{testData.status}</TableCell>
            {/** Adjudicated needs to be adjusted and styled when user details are figured out */}
            <TableCell>{testData.adjudicatedUser}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}