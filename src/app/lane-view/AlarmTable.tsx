import { Box, Paper, Typography } from "@mui/material";
import EventTable from "../_components/event-table/EventTable";
import { IEventTableData } from "types/new-types";

const testData: IEventTableData[] = [
  { id: 1, secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma', }
];

export default function AlarmTablePage() {
  return (
      <EventTable eventTable={testData} viewSecondary viewMenu />
  );
}