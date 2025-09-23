"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";
import {INode} from "@/lib/data/osh/Node";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import OSCARLaneSlice, {selectLanes} from "@/lib/state/OSCARLaneSlice";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";


export default function LaneSelect(props: {
    onSelect: (value: string[] | string) => void,
    lane: any
}) {

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const lanes = useSelector((state: RootState) => selectLanes(state));
    const [selectedLane, setSelectedLane] = useState(null);

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
        setSelectedLane(val);
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Lane Selector</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Lane"
                value= {selectedLane}
                onChange={handleChange}
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
                {
                    lanes.map((item: any) => (
                        <MenuItem key={item.id} value={item.id}>
                            {item.name}
                        </MenuItem>
                    ))
                }
            </Select>
        </FormControl>
    );
}
