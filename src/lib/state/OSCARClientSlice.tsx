import {createSelector, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {RootState} from "@/lib/state/Store";
import {
    selectDatastreamByOutputType,
    selectDatastreams,
    selectDatastreamsOfSystem,
    selectSystems
} from "@/lib/state/OSHSlice";
import {IDatastream} from "@/lib/data/osh/Datastreams";
import {useSelector} from "react-redux";

enableMapSet();

export interface IOSCARClientState {
    currentUser: string,
    quickActions: [],
    alertDetailIsOpen: boolean,
    alertDetails: {
        currentLane: string,
        startTime: string,
        endTime: string,
    },
    // This should move to a separate slice
    lanes: LaneMeta[],
    alertTimeoutSeconds: number,
    laneMap: Map<string, LaneMapEntry>
}

const initialState: IOSCARClientState = {
    currentUser: '',
    quickActions: [],
    alertDetailIsOpen: false,
    alertDetails: {
        currentLane: '',
        startTime: '',
        endTime: ''
    },
    lanes: [],
    alertTimeoutSeconds: 10,
    laneMap: new Map<string, LaneMapEntry>()
}


export const Slice = createSlice({
    name: 'ClientStateSlice',
    initialState,
    reducers: {
        setCurrentUser: (state, action: PayloadAction<string>) => {
            state.currentUser = action.payload;
        },
        setQuickActions: (state, action: PayloadAction<[]>) => {
            state.quickActions = action.payload;
        },
        setAlertDetailIsOpen: (state, action: PayloadAction<boolean>) => {
            state.alertDetailIsOpen = action.payload;
        },
        setAlertDetails: (state, action: PayloadAction<{
            isOpen: boolean,
            currentLane: string,
            startTime: string,
            endTime: string
        }>) => {
            state.alertDetails = action.payload;
        },
        setLanes: (state, action: PayloadAction<LaneMeta[]>) => {
            state.lanes = action.payload;
        },
        toggleAlertDetails: (state) => {
            state.alertDetailIsOpen = !state.alertDetailIsOpen;
        },
        setAlertDetailsDCurrentLane: (state, action: PayloadAction<string>) => {
            state.alertDetails.currentLane = action.payload;
        },
        setAlertTimeoutSeconds: (state, action: PayloadAction<number>) => {
            state.alertTimeoutSeconds = action.payload;
        },
        setLaneMap: (state, action: PayloadAction<Map<string, LaneMapEntry>>) => {
            state.laneMap = action.payload;
        }
    }
})

export const {
    setCurrentUser,
    setQuickActions,
    setAlertDetails,
    setLanes,
    toggleAlertDetails,
    setAlertDetailsDCurrentLane,
    setAlertTimeoutSeconds,
    setLaneMap
} = Slice.actions;

export const selectCurrentUser = (state: RootState) => state.oscarClientSlice.currentUser;
export const selectLanes = (state: RootState) => state.oscarClientSlice.lanes;
export const selectLaneByName = (laneName: string) => (state: RootState) => {
    // console.info("Lane Name should be: ", laneName, state.oscarClientSlice.lanes);
    return state.oscarClientSlice.lanes.find((lane: { name: string }) => lane.name === laneName);
};
export const selectLaneById = (laneId: string) => (state: RootState) => {
    return state.oscarClientSlice.lanes.find((lane: { id: string }) => lane.id === laneId);
};
export const selectAlertDetails = (state: RootState) => state.oscarClientSlice.alertDetails;
export const selectLaneMap = (state: RootState) => state.oscarClientSlice.laneMap;



// Compound Selectors
export const selectSystemIdsOfLane = (laneId: string) => createSelector(
    [selectLaneById(laneId)],
    (lane) => lane.systemIds
);

export const selectSystemsOfLane = (laneId: string) => createSelector(
    [selectSystemIdsOfLane(laneId), selectSystems],
    (systemIds, systems) => {
        return systems.filter((system: { id: any; }) => systemIds.includes(system.id));
    }
);

export const selectDatastreamsOfLane = (laneId: string) => createSelector(
    [selectSystemsOfLane(laneId), selectDatastreams],
    (systems, datastreams) => {
        // console.log("Found these systems:", systems);
        let datastreamsArr: IDatastream[] = [];
        for(let ds of datastreams.values()) {
            if (systems.find((system: { id: any; }) => system.id === ds.parentSystemId)) {
                datastreamsArr.push(ds);
            }
        }
        return datastreamsArr;
    });
export const selectDatastreamsOfLaneByTypes = (laneId: string, types: string[]) => createSelector(
    [selectDatastreamsOfLane(laneId), selectDatastreamByOutputType(types)],
    (datastreamsLane, datastreamsType) => {
        let dsMap: Map<string, IDatastream[]> = new Map();
        for (let type of types) {
            let datastreams:IDatastream[] = datastreamsType.get(type);
            let dsSubArr: IDatastream[] = [];
            for(let ds of datastreams) {
                if (datastreamsLane.includes(ds)) {
                    dsSubArr.push(ds);
                }
            }
            dsMap.set(type, dsSubArr);
        }
        return dsMap;
    });

export default Slice.reducer;
