"use client";

import EventTable from '../components/EventTable';
import { EventTableData } from 'types/new-types';

const rows: EventTableData[] = [
  { id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
  { id: '2', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxNeutron: 25642, status: 'Neutron' },
  { id: '3', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, maxNeutron: 25642, status: 'Gamma & Neutron' },
];

export default function AlarmTable() {
  
  // Callback function to handle the selected row
  const handleSelectedRow = (startTime: string, endTime: string) => {
    console.log(startTime, endTime); // Log the selected row data
  };

  return (
    <EventTable onRowSelect={handleSelectedRow} data={rows} />
  );
}