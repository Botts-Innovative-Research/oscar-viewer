import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {Datastream} from "@/lib/data/osh/Datastreams";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {colorCodes} from "@/app/_components/event-preview/AdjudicationSelect";

/**
 * Interface for Event Table data
 */
export interface IEventTableData {
  id: number; // Unique ID for event
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

export interface ILaneViewData {
  id: number; // Unique ID for event
  laneId: string; // Lane ID
  startTime: string;  // Start time of occupancy/event
  endTime: string;  // End time of occupancy/event


}

/**
 * Event type to make request for more details
 * Requires start and end time of event
 */
type SelectedEventOcc = {
  startTime: string;
  endTime: string;
  occupancyId: string;
  laneId: string;
  status: string;
  maxGamma: number;
  maxNeutron: number;
  neutronBkg: number;
}

type Chart={
  gammaSources: typeof SweApi[];
  neutronSources: typeof SweApi[];
  tamperSources: typeof SweApi[];
  occSources: typeof SweApi[];
  chartReady: boolean;
}

type VideoPlayback={
  videoSources: typeof SweApi[];
  videoReady: boolean;
  dataSync: typeof DataSynchronizer;
  addSource: number;
}

type SelectedEvent = {
  startTime: string;
  endTime: string;
}

export type LaneStatusType = {
  id: number;
  name: string;
  status: string;
}



export interface LaneWithLocation{
  laneName: string,
  locationSources: typeof SweApi[],
  status: string
}


export interface LaneStatusItem {
  laneName: string,
  gammaSources: typeof SweApi[],
  neutronSources: typeof SweApi[],
  tamperSources: typeof SweApi[]
}

export interface Comment{
  user: string;
  vehicleId: string;
  notes: string;
  files: File[];
  adjudication: any;
  isotope: any;
  secondaryInspection: boolean;
}