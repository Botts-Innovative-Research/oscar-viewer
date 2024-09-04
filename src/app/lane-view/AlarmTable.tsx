import { Box, Paper, Typography } from "@mui/material";
import EventTable from "../_components/event-table/EventTable";
import { EventTableData } from "types/new-types";

const testData: EventTableData[] = [
  { id: 1, secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma', }
];

export default function AlarmTablePage() {
  return (
    <EventTable data={testData} viewSecondary viewMenu />
  );
}