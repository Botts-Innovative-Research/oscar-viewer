export interface EventTableData {
  id: string; // Unique ID for event
  secondaryInspection: boolean;  // Whether or not there has been a secondary inspection performed
  laneId: string; // Lane ID
  occupancyId: string;  // Occupancy ID
  startTime: string;  // Start time of occupancy/event
  endTime: string;  // End time of occupancy/event
  maxGamma?: number | "N/A"; // Max gamma count
  maxNeutron?: number | "N/A"; // Max neutron count
  status: string; // Alarm status -> enum?
  adjudicatedUser?: string; // User ID that adjudicated event
  adjudicatedCode?: number; // Adjudication code for event
}
