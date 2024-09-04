import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {Datastream} from "@/lib/data/osh/Datastreams";

/**
 * Interface for Event Table data
 */
export interface EventTableData {
  id: number | string; // Unique ID for event
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

export type LaneStatusType = {
  id: number;
  name: string;
  status: string;
}

export interface LaneOccupancyData {
  laneData: LaneMeta,
  occupancyStreams: Datastream[]
}

export interface LaneStatusData{
  laneData: LaneMeta,
  gammaDataStream: Datastream[],
  neutronDataStream: Datastream[],
  tamperDataStream: Datastream[]
}
