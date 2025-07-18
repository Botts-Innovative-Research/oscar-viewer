import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";


export interface NationalViewState {
    endDate: string;
    startDate: string;
    selectedSite: string;

}


const initialState: NationalViewState ={
    startDate: "2020-01-01T08:13:25.845Z",
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    selectedSite: 'Local Node'
}

export const Slice = createSlice({
    name: 'national',
    initialState: initialState,
    reducers:{

        setStartDate: (state, action: PayloadAction<string>) =>{
            state.startDate = action.payload;
        },
        setEndDate: (state, action: PayloadAction<string>) =>{
            state.endDate = action.payload;
        },
        setSelectedSite:(state, action: PayloadAction<string>) => {
            state.selectedSite = action.payload;
        }
    }
})

export const{
    setStartDate,
    setEndDate,
    setSelectedSite
} = Slice.actions;


export const selectStartDate= (state: RootState) => state.national.startDate;
export const selectEndDate = (state: RootState) => state.national.endDate;
export const selectChosenSite = (state: RootState) => state.national.selectedSite;

export default Slice.reducer;

