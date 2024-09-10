"use client";

import { Typography } from "@mui/material";
import { IEventTableData, SelectedEvent } from "types/new-types";

const testData: IEventTableData = {
  id: '1',
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

export default function Media(props: {
  event: SelectedEvent;
}) {

  return (
    <Typography>Insert content here</Typography>
  );
}
