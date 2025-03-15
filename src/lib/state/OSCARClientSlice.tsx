import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "@/lib/state/Store";

enableMapSet();

export interface IOSCARClientState {
    currentUser: string,
    quickActions: [],
    alertTimeoutSeconds: number,
}




const initialState: IOSCARClientState = {
    currentUser: 'testuser',
    quickActions: [],
    alertTimeoutSeconds: 10,
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

        setAlertTimeoutSeconds: (state, action: PayloadAction<number>) => {
            state.alertTimeoutSeconds = action.payload;
        },

    }
})

export const {
    setCurrentUser,
    setQuickActions,
    setAlertTimeoutSeconds,

} = Slice.actions;

export const selectCurrentUser = (state: RootState) => state.oscarClientSlice.currentUser;



// Compound Selectors
/*export const selectSystemIdsOfLane = (laneId: string) => createSelector(
    [selectLaneById(laneId)],
    (lane) => lane.systemIds
);*/

/*export const selectSystemsOfLane = (laneId: string) => createSelector(
    [selectSystemIdsOfLane(laneId), selectSystems],
    (systemIds, systems) => {
        return systems.filter((system: { id: any; }) => systemIds.includes(system.id));
    }
);*/

/*
export const selectDatastreamsOfLane = (laneId: string) => createSelector(
    [selectSystemsOfLane(laneId), selectDatastreams],
    (systems, datastreams) => {
        // console.log("Found these systems:", systems);
        let datastreamsArr: IDatastream[] = [];
        for (let ds of datastreams.values()) {
            if (systems.find((system: { id: any; }) => system.id === ds.parentSystemId)) {
                datastreamsArr.push(ds);
            }
        }
        return datastreamsArr;
    });
*/



export default Slice.reducer;
