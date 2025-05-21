import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";


export interface NationalViewState {
    endDate: string;
    startDate: string;

}


const initialState: NationalViewState ={
    startDate: "2020-01-01T08:13:25.845Z",
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
    }
})

export const{
    setStartDate,
    setEndDate
} = Slice.actions;


export const selectStartDate= (state: RootState) => state.national.startDate;
export const selectEndDate = (state: RootState) => state.national.endDate;

export default Slice.reducer;

