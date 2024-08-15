"use client";

import EventTable from '../_components/EventTable';
import { EventTableData, SelectedEvent } from 'types/new-types';

const rows: EventTableData[] = [
  { id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
  { id: '2', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxNeutron: 25642, status: 'Neutron' },
  { id: '3', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, maxNeutron: 25642, status: 'Gamma & Neutron' },
];

export default function AlarmTable(props: {
  onRowSelect: (event: SelectedEvent) => void;  // Return start/end time to parent
}) {
  // Callback function to handle the selected row
  const handleSelectedRow = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    props.onRowSelect(event); // Pass to parent component
  };

  return (
    <EventTable onRowSelect={handleSelectedRow} data={rows} />
  );
}