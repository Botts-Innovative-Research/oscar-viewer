"use client";

import {Checkbox, FormControl, InputLabel, MenuItem, OutlinedInput, Select, SelectChangeEvent} from '@mui/material';
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import ListItemText from "@mui/material/ListItemText";
import {INode} from "@/lib/data/osh/Node";
import {useEffect, useState} from "react";
import {selectNodes} from "@/lib/state/OSHSlice";


export default function LaneSelect(props: {
    onSelect: (value: string[]) => void, // Return selected value
    lane: string[],
    selectedNode: INode
}) {


    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [lanes, setLanes] = useState([]);

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {target: {value},} = event;

        let laneVal = typeof value === 'string' ? value.split(', ') : value;

        if (laneVal.includes("all")) {
            props.onSelect(props.lane.length === lanes.length ? [] : lanes.map(l => l.laneSystem.properties.properties.uid));
        } else {
            props.onSelect(laneVal)
        }

    };

    useEffect(() => {
        let tempLanes: any[] = [];
        if (props.selectedNode) {

            laneMap.forEach(lane => {
                if(props.selectedNode.id == lane.parentNode.id){
                    tempLanes.push(lane);
                }
            })

            setLanes(tempLanes);
        } else {
            setLanes([]);
        }
    }, [props.selectedNode, laneMap]);

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Lane Selector</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Lane Selector"
                multiple
                value= {props.lane}
                onChange={handleChange}
                renderValue={(selected) => selected.join(', ')}
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
                <MenuItem value="all">
                    <Checkbox
                        checked={props.lane.length === lanes.length && lanes.length > 0}
                        indeterminate={
                            props.lane.length > 0 &&
                            props.lane.length < lanes.length
                        }
                    />
                    <ListItemText primary="Select All" />
                </MenuItem>

                {lanes.map((lane: any) => (
                        <MenuItem key={lane.laneSystem.properties.properties.uid} value={lane.laneSystem.properties.properties.uid}>
                            <Checkbox checked={props.lane?.includes(lane.laneSystem.properties.properties.uid)} />
                            <ListItemText primary={lane.laneName} secondary={lane.laneSystem.properties.properties.uid} />
                        </MenuItem>


                    ))
                }
            </Select>
        </FormControl>
    );
}