// import {createSlice, PayloadAction} from "@reduxjs/toolkit";
// import {RootState} from "@/lib/state/Store";
//
// export interface EventDetailsState {
//     eventDetailsState: {
//         laneName: string | null;
//         startTime: string | null;
//         endTime: string | null;
//
//         gamma: any[];
//         neutron: any[];
//         threshold: any[];
//         video: any[];
//
//     }
// }
// const initState: EventDetailsState ={
//     eventDetailsState: null,
// }
//
// export const EventSlice = createSlice({
//     name: 'EventDetailsSlice',
//     initialState: initState,
//     reducers:{
//         setEventDetailsState: (state, action: PayloadAction<any>)=>{
//             state.eventDetailsState = action.payload;
//         }
//     }
// })
//
// export const{
//     setEventDetailsState
// } = EventSlice.actions;
//
// export const selectEventPreviewState= (state: RootState) => state.eventPreviewState;
//
// export default EventSlice.reducer;