"use client";

import {Checkbox, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import ListItemText from "@mui/material/ListItemText";
import {INode} from "@/lib/data/osh/Node";
import {useEffect, useState} from "react";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {OperationalViewLane} from "@/lib/data/oscar/OperationalView";


export default function LaneSelect(props: {
    onSelect: (value: string[]) => void, // Return selected value
    lane: string[],
    selectedNode: INode,
    laneOptions?: OperationalViewLane[],
}) {
    const {t} = useLanguage();


    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [lanes, setLanes] = useState<OperationalViewLane[]>([]);

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {target: {value},} = event;

        let laneVal = typeof value === 'string' ? value.split(', ') : value;

        if (laneVal.includes("all")) {
            props.onSelect(props.lane.length === lanes.length ? [] : lanes.map((lane) => lane.uid));
        } else {
            props.onSelect(laneVal)
        }

    };

    useEffect(() => {
        if (props.laneOptions) {
            setLanes(props.laneOptions);
            return;
        }

        const tempLanes: OperationalViewLane[] = [];
        if (props.selectedNode) {

            laneMap.forEach(lane => {
                if(props.selectedNode.id == lane.parentNode.id){
                    tempLanes.push({
                        name: lane.laneName,
                        uid: lane.laneSystem.properties.properties.uid,
                    });
                }
            })

            setLanes(tempLanes);
        } else {
            setLanes([]);
        }
    }, [props.selectedNode, props.laneOptions, laneMap]);

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">{t('laneSelector')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('laneSelector')}
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
                    <ListItemText primary={t('selectAll')} />
                </MenuItem>

                {lanes.map((lane) => (
                        <MenuItem key={lane.uid} value={lane.uid}>
                            <Checkbox checked={props.lane?.includes(lane.uid)} />
                            <ListItemText primary={lane.name} secondary={lane.uid} />
                        </MenuItem>


                    ))
                }
            </Select>
        </FormControl>
    );
}
