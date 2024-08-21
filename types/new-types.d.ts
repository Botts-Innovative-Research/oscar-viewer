/**
 * Interface for Event Table data
 */
export interface EventTableData {
  id: string | number; // Unique ID for event
  secondaryInspection?: boolean;  // Whether or not there has been a secondary inspection performed
  laneId: string; // Lane ID
  occupancyId: string;  // Occupancy ID
  startTime: string;  // Start time of occupancy/event
  endTime: string;  // End time of occupancy/event
  maxGamma?: number; // Max gamma count
  maxNeutron?: number; // Max neutron count
  status: string; // Alarm status -> enum?
  adjudicatedUser?: string; // User ID that adjudicated event
  adjudicatedCode?: number; // Adjudication code for event
}

/**
 * Event type to make request for more details
 * Requires start and end time of event
 */
type SelectedEvent = {
  startTime: string;
  endTime: string;
}

/**
 * Interface for Lane Status Item
 */
export type LaneStatusType = {
  id: number;
  name: string;
  status: string;
}