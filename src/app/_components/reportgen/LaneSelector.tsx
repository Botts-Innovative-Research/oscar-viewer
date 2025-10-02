"use client";

import {Checkbox, FormControl, InputLabel, MenuItem, OutlinedInput, Select, SelectChangeEvent} from '@mui/material';
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import ListItemText from "@mui/material/ListItemText";


export default function LaneSelect(props: {
    onSelect: (value: string[]) => void,
    lane?: string[]
}) {

    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const handleChange = (event: SelectChangeEvent) => {
        const {target: {value},} = event;

        let laneVal = typeof value === 'string' ? value.split(', ') : value;
        props.onSelect(laneVal)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Lane Selector</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Lane Selector"
                multiple
                value= {Array.isArray(props.lane) ? props.lane : []}
                onChange={handleChange}
                renderValue={(selected) => Array.isArray(selected) ? selected.join(', '): ''}
                MenuProps={{
                    MenuListProps: {
                        style: {
                            maxHeight: 300
                        }
                    }
                }}
                autoWidth
                style={{minWidth: "8em"}}
                sx={{
                    color: "text.primary",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "inherit",
                    },
                    "&.MuiOutlinedInput-notchedOutline": {border: 1},
                    "&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                            borderRadius: "10px"
                        },
                    "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                        },
                }}
            >

                {Array.from(laneMap.entries()).map(([key, value]) => (
                    <MenuItem key={key} value={value.laneSystem.properties.properties.uid}>
                        <Checkbox checked={props.lane?.includes(value.laneSystem.properties.properties.uid)} />
                        <ListItemText primary={key}/>
                    </MenuItem>
                ))}

            </Select>
        </FormControl>
    );
}